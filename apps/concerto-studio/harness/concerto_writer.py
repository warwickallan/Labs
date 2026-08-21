"""concerto_writer.py — the DISCIPLINED write path for the Concerto harness.

For the first year of this project the harness was read-only BY CONSTRUCTION
(concerto_adapter.WRITE_CAPABILITY = False, no write method anywhere). That
was the right default while we were only ever discovering configuration.

Warwick has deliberately changed the brief (2026-08-20): Claude is to make
configuration changes when asked. Reversing a founding safety property is
not something to do quietly, so this module makes the reversal EXPLICIT,
NARROW and AUDITED:

1. WRITE IS OFF UNLESS THE HUMAN TURNS IT ON.
   Writes are gated by `writeEnabled: true` in harness.config.json — a file
   Claude never edits. No config file, or the flag false/absent → every
   write is refused, exactly as before. The flag is read PER REQUEST, so it
   can be revoked mid-session without a restart.

2. EVERY CHANGE IS ONE AUDITED OPERATION.
   record the BEFORE state (by reading the live form) → apply the change →
   verify the AFTER state → return an audit record carrying { before, after,
   revert }. A change that cannot be verified is reported as FAILED with the
   before-state intact; it never claims success it did not confirm.

3. TYPED OPERATIONS ONLY — no free-form "press this button".
   Each operation is a named, understood configuration edit. Anything else
   is refused. This keeps the write surface small enough to reason about.

4. DRY RUN IS FREE AND DEFAULT-SAFE.
   Every operation supports apply=False: it records the before-state and the
   exact planned change and returns WITHOUT saving. The work-order pipeline
   dry-runs first, then applies.

The browser session itself remains read-only for crawling; writes only ever
flow through this module, one recorded operation at a time.
"""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

WRITER_VERSION = "0.3"
_CONFIG = Path(__file__).resolve().parent / "harness.config.json"

# The server hot-reloads THIS module on every /execute so an operation fix
# never costs a restart (= a re-login). Extend the same courtesy to the
# crawlers: reload() mutates the module objects in place, so the server's
# existing references pick up capture fixes too. (server.py also reloads
# them per crawl from 0.3 — this covers servers started before that.)
try:
    import importlib as _importlib
    from crawlers import helpdesk as _helpdesk_crawler, orders as _orders_crawler
    _importlib.reload(_helpdesk_crawler)
    _importlib.reload(_orders_crawler)
except Exception:  # crawler reload is a convenience, never a write blocker
    pass


class WriteRefused(RuntimeError):
    """A write was requested while writing is not enabled, or an operation
    was malformed. Distinct from a write that was attempted and failed."""


class WriteFailed(RuntimeError):
    """A write was attempted but could not be verified. The instance may or
    may not have changed — the audit record says exactly what was seen."""


_warned: set[str] = set()


def _warn_once(msg: str) -> None:
    """Warn on stderr the first time a given problem is seen. write_enabled()
    runs on every request, so an unconditional warning would flood the log."""
    if msg not in _warned:
        _warned.add(msg)
        print(f"harness: {msg}", file=sys.stderr, flush=True)


def write_enabled() -> bool:
    """True only if the human has opted in via harness.config.json. Read
    fresh every call so the permission can be granted or revoked without a
    restart, and so Claude editing the model can never flip it.

    Any problem still yields False — the gate fails closed — but a config
    that exists and cannot be read is announced, so a corrupt file is not
    mistaken for a deliberate opt-out."""
    if not _CONFIG.exists():
        return False
    try:
        cfg = json.loads(_CONFIG.read_text(encoding="utf-8"))
    except UnicodeDecodeError as e:
        _warn_once(
            f"{_CONFIG.name} exists but is not UTF-8 ({e.encoding}: {e.reason}). "
            "Writing stays disabled. A PowerShell '>' redirect writes UTF-16; "
            "rewrite the file as UTF-8 without a BOM."
        )
        return False
    except json.JSONDecodeError as e:
        _warn_once(
            f"{_CONFIG.name} exists but is not valid JSON (line {e.lineno} "
            f"col {e.colno}: {e.msg}). Writing stays disabled."
        )
        return False
    except OSError as e:
        _warn_once(f"{_CONFIG.name} exists but could not be read ({e}). "
                   "Writing stays disabled.")
        return False
    if not isinstance(cfg, dict):
        _warn_once(f"{_CONFIG.name} must contain a JSON object, got "
                   f"{type(cfg).__name__}. Writing stays disabled.")
        return False
    return cfg.get("writeEnabled") is True


def _require_enabled():
    if not write_enabled():
        raise WriteRefused(
            "Writing is not enabled. To allow configuration changes, set "
            '"writeEnabled": true in apps/concerto-studio/harness/harness.config.json '
            "(Claude never edits this file). Remove or set it false to revoke."
        )


# --------------------------------------------------------------------------
# form primitives (operate on whatever record form the adapter has opened)
# --------------------------------------------------------------------------

_SECTION_LINK = "statuses in which this action can be taken"
_SECTION_USER = "select which statuses can be selected"


def _read_section(page, target) -> dict:
    """Tick-state of one status section ({status: bool}). `target` is the
    section's label prefix (_SECTION_LINK or _SECTION_USER); the OTHER section
    resets the bucket so ticks never bleed between the two."""
    return page.evaluate(
        """(args) => {
            const [target, link, user] = args;
            const norm = t => (t||'').replace(/\\u00a0/g,' ').trim();
            const out = {};
            let bucket = null;
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
            let n;
            while (n = walker.nextNode()) {
                if ((n.tagName==='LABEL'||n.tagName==='LEGEND') && n.childElementCount===0) {
                    const t = norm(n.innerText).toLowerCase();
                    if (t.indexOf(target) === 0) bucket = 'target';
                    else if (t.indexOf(link) === 0 || t.indexOf(user) === 0) bucket = 'other';
                    else if (t.length > 28) bucket = null;
                }
                if (n.tagName==='INPUT' && n.type==='checkbox' && bucket==='target') {
                    const row = norm((n.closest('div,li,td')||{}).innerText).slice(0,45);
                    if (row) out[row] = n.checked;
                }
            }
            return out;
        }""",
        [target, _SECTION_LINK, _SECTION_USER],
    )


def _read_link_statuses(page) -> dict:
    return _read_section(page, _SECTION_LINK)


def _set_section(page, target, desired: dict) -> list:
    """Tick/untick rows in one status section to match `desired`."""
    return page.evaluate(
        """(args) => {
            const [target, desired, link, user] = args;
            const norm = t => (t||'').replace(/\\u00a0/g,' ').trim();
            const toggled = [];
            let bucket = null;
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
            let n;
            while (n = walker.nextNode()) {
                if ((n.tagName==='LABEL'||n.tagName==='LEGEND') && n.childElementCount===0) {
                    const t = norm(n.innerText).toLowerCase();
                    if (t.indexOf(target) === 0) bucket = 'target';
                    else if (t.indexOf(link) === 0 || t.indexOf(user) === 0) bucket = 'other';
                    else if (t.length > 28) bucket = null;
                }
                if (n.tagName==='INPUT' && n.type==='checkbox' && bucket==='target') {
                    const row = norm((n.closest('div,li,td')||{}).innerText).slice(0,45);
                    if (row in desired && n.checked !== desired[row]) {
                        n.click();
                        toggled.push(row + ' -> ' + (desired[row] ? 'ticked' : 'unticked'));
                    }
                }
            }
            return toggled;
        }""",
        [target, desired, _SECTION_LINK, _SECTION_USER],
    )


def _set_link_statuses(page, desired: dict) -> list:
    return _set_section(page, _SECTION_LINK, desired)


def _press_save(page) -> bool:
    """Press the form's SAVE button. Returns True if a save control was found
    and clicked. THIS is the line that was forbidden for a year; it lives
    here, behind write_enabled(), and nowhere else."""
    n = page.evaluate(
        """() => {
            const norm = t => (t||'').replace(/\\u00a0/g,' ').trim().toLowerCase();
            const btns = [...document.querySelectorAll('button,a,input[type=button],input[type=submit]')]
                .filter(b => b.offsetParent && /^save$/.test(norm(b.innerText||b.value)));
            if (!btns.length) return false;
            btns[0].click();
            return true;
        }"""
    )
    if n:
        page.wait_for_timeout(2500)
    return bool(n)


# --------------------------------------------------------------------------
# typed operations
# --------------------------------------------------------------------------

def set_action_availability(session, op: dict, apply: bool = False) -> dict:
    """Ensure an action is available in exactly the given statuses (ticks in
    'Statuses in which this action can be taken').

    op = { action_guid, action_name, add:[status...], remove:[status...] }
    (add/remove are the intended changes; other rows are left untouched.)
    """
    _require_enabled()
    guid = op["action_guid"]
    name = op.get("action_name", guid)
    add = op.get("add", []) or []
    remove = op.get("remove", []) or []

    session.goto_admin("helpdesk_admin.aspx")
    session.click_tab(("Actions",))
    session.nav_form_view(guid, name)
    session.page.wait_for_timeout(800)

    before = _read_link_statuses(session.page)
    desired = dict(before)
    for s in add:
        desired[s] = True
    for s in remove:
        desired[s] = False

    audit = {
        "op": "set_action_availability", "action": name, "guid": guid,
        "before": {k: v for k, v in before.items() if k in add or k in remove},
        "intended": {"add": add, "remove": remove},
        "revert": {"op": "set_action_availability", "action_guid": guid, "action_name": name,
                   "add": [s for s in remove if before.get(s)],
                   "remove": [s for s in add if not before.get(s)]},
    }

    if not apply:
        audit["status"] = "DRY-RUN"
        session.cancel_form()
        return audit

    toggled = _set_link_statuses(session.page, desired)
    saved = _press_save(session.page)
    if not saved:
        audit["status"] = "FAILED"
        audit["reason"] = "no SAVE control found on the form; nothing was saved"
        session.cancel_form()
        return audit

    # verify by re-opening
    session.click_tab(("Actions",))
    session.nav_form_view(guid, name)
    session.page.wait_for_timeout(600)
    after = _read_link_statuses(session.page)
    ok = all(after.get(s) is True for s in add) and all(after.get(s) is False for s in remove)
    audit["after"] = {k: v for k, v in after.items() if k in add or k in remove}
    audit["toggled"] = toggled
    audit["status"] = "APPLIED" if ok else "UNVERIFIED"
    session.cancel_form()
    if not ok:
        raise WriteFailed(f"{name}: availability change did not verify — {audit['after']}")
    return audit


def delete_action(session, op: dict, apply: bool = False) -> dict:
    """Delete an action via the Full-list DELETE SELECTED control.
    op = { action_guid, action_name, revert_record } — revert_record is the
    full form snapshot needed to recreate it, stored in the audit."""
    _require_enabled()
    guid = op["action_guid"]
    name = op.get("action_name", guid)

    session.goto_admin("helpdesk_admin.aspx")
    session.click_tab(("Actions",))
    # Full list has the row checkboxes + DELETE SELECTED
    session.click_tab(("Full list",))
    session.page.wait_for_timeout(1500)

    present = session.page.evaluate(
        "(g) => !![...document.querySelectorAll('input[id^=\"pbl_form_\"]')].find(c => c.id.indexOf(g) !== -1)",
        guid,
    )
    audit = {
        "op": "delete_action", "action": name, "guid": guid,
        "present_before": bool(present),
        "revert": {"op": "recreate_action", "note": "recreate from the recorded form config",
                   "record": op.get("revert_record")},
    }
    if not present:
        audit["status"] = "FAILED"
        audit["reason"] = "row not found on Full list — already gone or renamed"
        return audit
    if not apply:
        audit["status"] = "DRY-RUN"
        return audit

    # tick the row, press DELETE SELECTED, confirm
    session.page.evaluate(
        """(g) => {
            const cb = [...document.querySelectorAll('input[id^="pbl_form_"]')].find(c => c.id.indexOf(g) !== -1);
            if (cb && !cb.checked) cb.click();
        }""",
        guid,
    )
    session.page.wait_for_timeout(400)
    # Concerto confirms deletion with a NATIVE window.confirm() dialog.
    # Playwright auto-dismisses (Cancel) native dialogs by default, which
    # silently cancels the delete — so a one-shot ACCEPT handler is armed
    # just before pressing DELETE SELECTED. It also answers a possible
    # follow-up "deleted" alert, then detaches so it can never affect a
    # later operation.
    _dialogs = {"seen": 0}

    def _accept(dialog):
        _dialogs["seen"] += 1
        try:
            dialog.accept()
        except Exception:
            pass

    session.page.on("dialog", _accept)
    try:
        pressed = session.page.evaluate(
            """() => {
                const norm = t => (t||'').replace(/\\u00a0/g,' ').trim().toLowerCase();
                const b = [...document.querySelectorAll('button,a')].find(x => x.offsetParent && /delete selected/.test(norm(x.innerText)));
                if (!b) return false; b.click(); return true;
            }"""
        )
        session.page.wait_for_timeout(2500)
    finally:
        try:
            session.page.remove_listener("dialog", _accept)
        except Exception:
            pass
    audit["confirmDialogs"] = _dialogs["seen"]

    if not pressed:
        audit["status"] = "FAILED"
        audit["reason"] = "DELETE SELECTED control not found"
        return audit

    still = session.page.evaluate(
        "(g) => !![...document.querySelectorAll('input[id^=\"pbl_form_\"]')].find(c => c.id.indexOf(g) !== -1)",
        guid,
    )
    audit["present_after"] = bool(still)
    audit["status"] = "APPLIED" if not still else "UNVERIFIED"
    if still:
        raise WriteFailed(f"{name}: still present after delete")
    return audit


def rename_status(session, op: dict, apply: bool = False) -> dict:
    """Rename a job status. op = { status_guid, from, to }.
    Concerto updates all references automatically when a status is renamed."""
    _require_enabled()
    guid = op["status_guid"]
    frm = op["from"]
    to = op["to"]

    session.goto_admin("helpdesk_admin.aspx")
    session.click_tab(("Statuses", "Job statuses"))
    session.nav_form_view(guid, frm)
    session.page.wait_for_timeout(800)

    # Identify the name field by its VALUE (== the from-name), not a label
    # guess: the field is labelled 'Status*' on some builds, 'Name' on others,
    # but its value is always the current status name.
    before = session.page.evaluate(
        """(frm) => {
            const norm = t => (t||'').replace(/\\u00a0/g,' ').trim();
            const want = norm(frm).toLowerCase();
            for (const i of document.querySelectorAll('input[type=text]')) {
                if (norm(i.value).toLowerCase() === want) return norm(i.value);
            }
            return null;
        }""",
        frm,
    )
    audit = {
        "op": "rename_status", "guid": guid, "before": before, "intended": to,
        "revert": {"op": "rename_status", "status_guid": guid, "from": to, "to": frm},
    }
    if before is None or before.strip().lower() != frm.strip().lower():
        audit["status"] = "FAILED"
        audit["reason"] = f"form shows {before!r}, expected {frm!r} — not renaming"
        session.cancel_form()
        return audit
    if not apply:
        audit["status"] = "DRY-RUN"
        session.cancel_form()
        return audit

    session.page.evaluate(
        """(args) => {
            const [frm, to] = args;
            const norm = t => (t||'').replace(/\\u00a0/g,' ').trim();
            for (const i of document.querySelectorAll('input[type=text]')) {
                if ((i.value||'').trim().toLowerCase() === frm.trim().toLowerCase()) {
                    i.value = to;
                    i.dispatchEvent(new Event('input', {bubbles:true}));
                    i.dispatchEvent(new Event('change', {bubbles:true}));
                }
            }
        }""",
        [frm, to],
    )
    saved = _press_save(session.page)
    if not saved:
        audit["status"] = "FAILED"
        audit["reason"] = "no SAVE control found"
        session.cancel_form()
        return audit

    session.click_tab(("Statuses", "Job statuses"))
    session.nav_form_view(guid, to)
    session.page.wait_for_timeout(600)
    after = session.page.evaluate(
        """(to) => {
            const norm = t => (t||'').replace(/\\u00a0/g,' ').trim();
            const want = norm(to).toLowerCase();
            for (const i of document.querySelectorAll('input[type=text]')) {
                if (norm(i.value).toLowerCase() === want) return norm(i.value);
            }
            return null;
        }""",
        to,
    )
    audit["after"] = after
    audit["status"] = "APPLIED" if (after and after.strip().lower() == to.strip().lower()) else "UNVERIFIED"
    session.cancel_form()
    if audit["status"] != "APPLIED":
        raise WriteFailed(f"status rename did not verify: form shows {after!r}")
    return audit


def set_user_selectable(session, op: dict, apply: bool = False) -> dict:
    """Tick/untick statuses in the 'Select which statuses can be selected when
    carrying out this action' section — the user-selectable list, distinct
    from Link-to-Statuses. op = { action_guid, action_name, add:[], remove:[] }.
    Used to finish corrections like T06 (its four ticks belonged in
    Link-to-Statuses, not here)."""
    _require_enabled()
    guid = op["action_guid"]
    name = op.get("action_name", guid)
    add = op.get("add", []) or []
    remove = op.get("remove", []) or []

    session.goto_admin("helpdesk_admin.aspx")
    session.click_tab(("Actions",))
    session.nav_form_view(guid, name)
    session.page.wait_for_timeout(800)

    before = _read_section(session.page, _SECTION_USER)
    desired = dict(before)
    for s in add:
        desired[s] = True
    for s in remove:
        desired[s] = False

    audit = {
        "op": "set_user_selectable", "action": name, "guid": guid,
        "before": {k: v for k, v in before.items() if k in add or k in remove},
        "intended": {"add": add, "remove": remove},
        "revert": {"op": "set_user_selectable", "action_guid": guid, "action_name": name,
                   "add": [s for s in remove if before.get(s)],
                   "remove": [s for s in add if not before.get(s)]},
    }
    if not apply:
        audit["status"] = "DRY-RUN"
        session.cancel_form()
        return audit

    toggled = _set_section(session.page, _SECTION_USER, desired)
    saved = _press_save(session.page)
    if not saved:
        audit["status"] = "FAILED"
        audit["reason"] = "no SAVE control found; nothing was saved"
        session.cancel_form()
        return audit
    session.click_tab(("Actions",))
    session.nav_form_view(guid, name)
    session.page.wait_for_timeout(600)
    after = _read_section(session.page, _SECTION_USER)
    ok = all(after.get(s) is True for s in add) and all(after.get(s) is False for s in remove)
    audit["after"] = {k: v for k, v in after.items() if k in add or k in remove}
    audit["toggled"] = toggled
    audit["status"] = "APPLIED" if ok else "UNVERIFIED"
    session.cancel_form()
    if not ok:
        raise WriteFailed(f"{name}: user-selectable change did not verify — {audit['after']}")
    return audit


# --------------------------------------------------------------------------
# create operations (writer 0.3) — the NEW-HELPDESK build path
# --------------------------------------------------------------------------

_ADD_LABELS = ["add new", "add", "new", "create", "+"]


def _click_add(page) -> str | None:
    """Click the tab's add-record control (JS-native, nbsp-folded). Returns
    the label clicked, or None — the caller fails LOUDLY, never guesses."""
    return page.evaluate(
        """(labels) => {
            const norm = t => (t||'').replace(/\\u00a0/g,' ').trim().toLowerCase();
            const cands = [...document.querySelectorAll('button,a,input[type=button]')]
                .filter(b => b.offsetParent);
            for (const want of labels) {
                const hit = cands.find(b => norm(b.innerText || b.value) === want);
                if (hit) { hit.click(); return want; }
            }
            return null;
        }""",
        _ADD_LABELS,
    )


def _set_input_by_label(page, label_re: str, value: str) -> bool:
    """Set a text input identified by its LABEL (create forms are empty, so
    the rename trick of finding a field by VALUE cannot work here)."""
    return bool(page.evaluate(
        """(args) => {
            const [re, value] = args;
            const rx = new RegExp(re, 'i');
            const norm = t => (t||'').replace(/\\u00a0/g,' ').trim();
            for (const inp of document.querySelectorAll('input[type=text],input:not([type]),textarea')) {
                let label = '';
                if (inp.id) { const l = document.querySelector('label[for="' + inp.id + '"]'); if (l) label = norm(l.innerText); }
                if (!label) { const w = inp.closest('label'); if (w) label = norm(w.innerText); }
                if (!label) { const td = inp.closest('td,div'); if (td && td.previousElementSibling) label = norm(td.previousElementSibling.innerText); }
                if (rx.test(label)) {
                    inp.value = value;
                    inp.dispatchEvent(new Event('input', {bubbles: true}));
                    inp.dispatchEvent(new Event('change', {bubbles: true}));
                    return true;
                }
            }
            return false;
        }""",
        [label_re, value],
    ))


def _tick_by_label(page, label_re: str, on: bool) -> bool:
    return bool(page.evaluate(
        """(args) => {
            const [re, on] = args;
            const rx = new RegExp(re, 'i');
            const norm = t => (t||'').replace(/\\u00a0/g,' ').trim();
            for (const cb of document.querySelectorAll('input[type=checkbox]')) {
                let label = '';
                if (cb.id) { const l = document.querySelector('label[for="' + cb.id + '"]'); if (l) label = norm(l.innerText); }
                if (!label) { const w = cb.closest('label'); if (w) label = norm(w.innerText); }
                if (!label) { const td = cb.closest('td,div'); if (td && td.previousElementSibling) label = norm(td.previousElementSibling.innerText); }
                if (rx.test(label)) { if (cb.checked !== on) cb.click(); return true; }
            }
            return false;
        }""",
        [label_re, on],
    ))


def _select_by_label(page, label_re: str, option_text: str) -> bool:
    return bool(page.evaluate(
        """(args) => {
            const [re, want] = args;
            const rx = new RegExp(re, 'i');
            const norm = t => (t||'').replace(/\\u00a0/g,' ').trim();
            for (const sel of document.querySelectorAll('select')) {
                let label = '';
                if (sel.id) { const l = document.querySelector('label[for="' + sel.id + '"]'); if (l) label = norm(l.innerText); }
                if (!label) { const td = sel.closest('td,div'); if (td && td.previousElementSibling) label = norm(td.previousElementSibling.innerText); }
                if (!rx.test(label)) continue;
                const opt = [...sel.options].find(o => norm(o.text) === want);
                if (!opt) return false;
                sel.value = opt.value;
                sel.dispatchEvent(new Event('change', {bubbles: true}));
                return true;
            }
            return false;
        }""",
        [label_re, option_text],
    ))


def _grid_has_name(page, name: str) -> bool:
    return bool(page.evaluate(
        """(name) => {
            const norm = t => (t||'').replace(/\\u00a0/g,' ').trim();
            return [...document.querySelectorAll('td')].some(td => norm(td.innerText) === name);
        }""",
        name,
    ))


def create_status(session, op: dict, apply: bool = False) -> dict:
    """Create a NEW job status.
    op = { name, types:[Reactive|Planned...], sortOrder, suppress, isDefaultFor:[...] }
    Revert = delete the status (recorded as a recipe; delete_status is not a
    writer op yet)."""
    _require_enabled()
    name = op["name"]
    types = op.get("types") or ["Reactive"]

    session.goto_admin("helpdesk_admin.aspx")
    session.click_tab(("Job statuses", "Statuses", "Job status"))
    session.page.wait_for_timeout(1200)

    audit = {
        "op": "create_status", "object": name,
        "params": {k: op.get(k) for k in ("name", "types", "sortOrder", "suppress", "isDefaultFor")},
        "revert": {"op": "delete_status", "note": "delete the created status (manual/recipe — no writer op yet)", "name": name},
    }
    if _grid_has_name(session.page, name):
        audit["status"] = "FAILED"
        audit["reason"] = f"a status named {name!r} already exists"
        return audit
    if not apply:
        audit["status"] = "DRY-RUN"
        return audit

    clicked = _click_add(session.page)
    if not clicked:
        audit["status"] = "FAILED"
        audit["reason"] = f"no add-record control found (tried {_ADD_LABELS}); page structure unknown — not guessing"
        return audit
    session.page.wait_for_timeout(1500)

    filled = _set_input_by_label(session.page, r"^status\\b|^name\\b", name)
    if not filled:
        audit["status"] = "FAILED"
        audit["reason"] = "could not find the name field on the create form"
        session.cancel_form()
        return audit
    if op.get("sortOrder") is not None:
        _set_input_by_label(session.page, r"sort|order", str(op["sortOrder"]))
    for t in ("Reactive", "Planned"):
        _tick_by_label(session.page, rf"^{t}\\b", t in types)
    if op.get("suppress"):
        _tick_by_label(session.page, r"suppress", True)
    for t in op.get("isDefaultFor") or []:
        _tick_by_label(session.page, r"default", True)

    saved = _press_save(session.page)
    if not saved:
        audit["status"] = "FAILED"
        audit["reason"] = "no SAVE control found; nothing was saved"
        session.cancel_form()
        return audit

    session.click_tab(("Job statuses", "Statuses", "Job status"))
    session.page.wait_for_timeout(1200)
    ok = _grid_has_name(session.page, name)
    audit["status"] = "APPLIED" if ok else "UNVERIFIED"
    if not ok:
        raise WriteFailed(f"create_status {name!r}: saved but the status is not in the grid")
    return audit


def create_action(session, op: dict, apply: bool = False) -> dict:
    """Create a NEW helpdesk action (name + resulting status only — its
    availability and user-selectable sections are then set through the
    existing set_action_availability / set_user_selectable ops, so the whole
    build composes from already-audited operations).
    op = { name, resultingStatus, buttonGroup, mobileAvailable }"""
    _require_enabled()
    name = op["name"]

    session.goto_admin("helpdesk_admin.aspx")
    session.click_tab(("Actions",))
    session.click_tab(("Full list",))
    session.page.wait_for_timeout(1500)

    audit = {
        "op": "create_action", "object": name,
        "params": {k: op.get(k) for k in ("name", "resultingStatus", "buttonGroup", "mobileAvailable")},
        "revert": {"op": "delete_action", "action_name": name,
                   "note": "delete_action needs the GUID — harvest it from the grid after creation"},
    }
    if _grid_has_name(session.page, name):
        audit["status"] = "FAILED"
        audit["reason"] = f"an action named {name!r} already exists"
        return audit
    if not apply:
        audit["status"] = "DRY-RUN"
        return audit

    clicked = _click_add(session.page)
    if not clicked:
        audit["status"] = "FAILED"
        audit["reason"] = f"no add-record control found (tried {_ADD_LABELS}); page structure unknown — not guessing"
        return audit
    session.page.wait_for_timeout(1500)

    filled = _set_input_by_label(session.page, r"^action\\b|^name\\b|^title\\b", name)
    if not filled:
        audit["status"] = "FAILED"
        audit["reason"] = "could not find the name field on the create form"
        session.cancel_form()
        return audit
    if op.get("resultingStatus"):
        set_ok = _select_by_label(session.page, r"resulting.*status|status.*result", op["resultingStatus"])
        audit["resultingStatusSet"] = bool(set_ok)
    if op.get("mobileAvailable"):
        _tick_by_label(session.page, r"mobile", True)

    saved = _press_save(session.page)
    if not saved:
        audit["status"] = "FAILED"
        audit["reason"] = "no SAVE control found; nothing was saved"
        session.cancel_form()
        return audit

    session.click_tab(("Actions",))
    session.click_tab(("Full list",))
    session.page.wait_for_timeout(1500)
    ok = _grid_has_name(session.page, name)
    audit["status"] = "APPLIED" if ok else "UNVERIFIED"
    if not ok:
        raise WriteFailed(f"create_action {name!r}: saved but the action is not in the Full list")
    return audit


OPERATIONS = {
    "set_action_availability": set_action_availability,
    "set_user_selectable": set_user_selectable,
    "delete_action": delete_action,
    "rename_status": rename_status,
    "create_status": create_status,
    "create_action": create_action,
}


def execute(session, op: dict, apply: bool = False) -> dict:
    """Dispatch one typed operation. Refuses unknown ops and disabled writes.
    Returns the audit record; raises WriteRefused / WriteFailed on trouble."""
    _require_enabled()
    kind = op.get("op")
    fn = OPERATIONS.get(kind)
    if not fn:
        raise WriteRefused(f"unknown operation {kind!r}; known: {sorted(OPERATIONS)}")
    started = time.time()
    audit = fn(session, op, apply=apply)
    audit["durationMs"] = int((time.time() - started) * 1000)
    audit["apply"] = apply
    audit["writerVersion"] = WRITER_VERSION
    return audit
