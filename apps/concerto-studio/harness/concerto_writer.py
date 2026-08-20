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
import time
from pathlib import Path

WRITER_VERSION = "0.1"
_CONFIG = Path(__file__).resolve().parent / "harness.config.json"


class WriteRefused(RuntimeError):
    """A write was requested while writing is not enabled, or an operation
    was malformed. Distinct from a write that was attempted and failed."""


class WriteFailed(RuntimeError):
    """A write was attempted but could not be verified. The instance may or
    may not have changed — the audit record says exactly what was seen."""


def write_enabled() -> bool:
    """True only if the human has opted in via harness.config.json. Read
    fresh every call so the permission can be granted or revoked without a
    restart, and so Claude editing the model can never flip it."""
    try:
        cfg = json.loads(_CONFIG.read_text(encoding="utf-8"))
        return cfg.get("writeEnabled") is True
    except Exception:
        return False


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


def _read_link_statuses(page) -> dict:
    """The current tick-state of the 'Statuses in which this action can be
    taken' section: {status_name: bool}. This IS the before-state for an
    availability edit."""
    return page.evaluate(
        """(sec) => {
            const norm = t => (t||'').replace(/\\u00a0/g,' ').trim();
            const out = {};
            let bucket = null;
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
            let n;
            while (n = walker.nextNode()) {
                if ((n.tagName==='LABEL'||n.tagName==='LEGEND') && n.childElementCount===0) {
                    const t = norm(n.innerText).toLowerCase();
                    if (t.indexOf(sec) === 0) bucket = 'link';
                    else if (t.indexOf('select which statuses can be selected') === 0) bucket = 'other';
                    else if (t.length > 28) bucket = null;
                }
                if (n.tagName==='INPUT' && n.type==='checkbox' && bucket==='link') {
                    const row = norm((n.closest('div,li,td')||{}).innerText).slice(0,45);
                    if (row) out[row] = n.checked;
                }
            }
            return out;
        }""",
        _SECTION_LINK,
    )


def _set_link_statuses(page, desired: dict) -> list:
    """Tick/untick rows in the Link-to-Statuses section to match `desired`
    {status_name: bool}. Returns the list of rows actually toggled."""
    return page.evaluate(
        """(args) => {
            const [sec, desired] = args;
            const norm = t => (t||'').replace(/\\u00a0/g,' ').trim();
            const toggled = [];
            let bucket = null;
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
            let n;
            while (n = walker.nextNode()) {
                if ((n.tagName==='LABEL'||n.tagName==='LEGEND') && n.childElementCount===0) {
                    const t = norm(n.innerText).toLowerCase();
                    if (t.indexOf(sec) === 0) bucket = 'link';
                    else if (t.indexOf('select which statuses can be selected') === 0) bucket = 'other';
                    else if (t.length > 28) bucket = null;
                }
                if (n.tagName==='INPUT' && n.type==='checkbox' && bucket==='link') {
                    const row = norm((n.closest('div,li,td')||{}).innerText).slice(0,45);
                    if (row in desired && n.checked !== desired[row]) {
                        n.click();
                        toggled.push(row + ' -> ' + (desired[row] ? 'ticked' : 'unticked'));
                    }
                }
            }
            return toggled;
        }""",
        [_SECTION_LINK, desired],
    )


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
    session.nav_form_view(guid, name.split(". ")[-1] if ". " in name else name)
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
    session.nav_form_view(guid, name.split(". ")[-1] if ". " in name else name)
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
    pressed = session.page.evaluate(
        """() => {
            const norm = t => (t||'').replace(/\\u00a0/g,' ').trim().toLowerCase();
            const b = [...document.querySelectorAll('button,a')].find(x => x.offsetParent && /delete selected/.test(norm(x.innerText)));
            if (!b) return false; b.click(); return true;
        }"""
    )
    session.page.wait_for_timeout(900)
    # a confirmation dialog may appear — accept it
    session.page.evaluate(
        """() => {
            const norm = t => (t||'').replace(/\\u00a0/g,' ').trim().toLowerCase();
            const b = [...document.querySelectorAll('button,a')].find(x => x.offsetParent && /^(ok|yes|confirm|delete)$/.test(norm(x.innerText)));
            if (b) b.click();
        }"""
    )
    session.page.wait_for_timeout(2000)

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

    before = session.page.evaluate(
        """() => {
            const norm = t => (t||'').replace(/\\u00a0/g,' ').trim();
            for (const i of document.querySelectorAll('input[type=text]')) {
                const lab = norm((i.closest('div,td')||{}).innerText).toLowerCase();
                if (/status/.test(lab) && (i.value||'').trim()) return i.value.trim();
            }
            return null;
        }"""
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
        """() => {
            for (const i of document.querySelectorAll('input[type=text]')) {
                if ((i.value||'').trim()) { const l=(i.closest('div,td')||{}).innerText||''; if(/status/i.test(l)) return i.value.trim(); }
            }
            return null;
        }"""
    )
    audit["after"] = after
    audit["status"] = "APPLIED" if (after and after.strip().lower() == to.strip().lower()) else "UNVERIFIED"
    session.cancel_form()
    if audit["status"] != "APPLIED":
        raise WriteFailed(f"status rename did not verify: form shows {after!r}")
    return audit


OPERATIONS = {
    "set_action_availability": set_action_availability,
    "delete_action": delete_action,
    "rename_status": rename_status,
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
