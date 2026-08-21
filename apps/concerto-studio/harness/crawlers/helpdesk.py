"""Helpdesk Admin crawler (READ-ONLY).

Two phases per the banked discovery discipline:

1. CAPTURE — navigate, harvest grids/forms, keep the RAW artifacts
   (grid rows, labelled form dumps, sectioned checkbox states) in the
   snapshot for inspection. Every form open ends in CANCEL.
2. INTERPRET — pure functions turning raw capture into the
   VANILLA-HELPDESK.json (v2) shape. Interpretation failures are LOUD:
   the family lands in `notCrawled` with the reason; nothing is silently
   guessed.

List projection and record truth are kept separate (lesson 2): the action
list matrix is captured AND each action's Edit form + record VIEW is read
individually with name-match verification.
"""

from __future__ import annotations

import re

CRAWLER_VERSION = "0.2"

# Tab labels as evidenced (E-002). If Concerto renames them, click_tab
# raises StructureError — loud, not quiet.
# Instances name the same tab differently (NPL says 'Statuses' where the
# reference instance says 'Job statuses'). Candidates are tried in order and
# the FIRST that exists wins; unrelated words are never accepted.
TAB_STATUSES = ("Job statuses", "Statuses", "Job status")
TAB_ACTIONS = ("Actions",)
TAB_OPERATIVE = ("Operative statuses", "Operative status")
TAB_JOB_TYPES = ("Helpdesk job types", "Job types")
# Some instances (NPL) open the Actions tab in a Diagram sub-view; the GUID
# grid the harvest needs lives behind a 'Full list' sub-tab (nbsp label —
# click_tab's key folding handles it).
TAB_ACTIONS_FULL_LIST = ("Full list",)

GRID_GUID_COUNT_JS = """() =>
    Array.from(document.querySelectorAll('input[id^="pbl_form_"]'))
        .filter(cb => /^pbl_form_[0-9a-f-]{36}_0$/i.test(cb.id)).length"""


CLICK_TAB_JS = """(labels) => {
    const norm = t => (t || '').replace(/\\u00a0/g, ' ').trim().toLowerCase();
    const want = labels.map(norm);
    const sel = '.nav-link, .nav-tabs a, .nav-tabs button, ul.nav a, [role=tab]';
    for (const b of document.querySelectorAll(sel)) {
        if (want.includes(norm(b.innerText))) { b.click(); return norm(b.innerText); }
    }
    return null;
}"""


def _click_tab_js(session, labels):
    """Click a tab by DOM .click() inside ONE page evaluation. The adapter's
    click_tab waits for Playwright actionability, and NPL's tab strip
    re-renders continuously — the located button detaches mid-wait and the
    click times out. A native click is atomic with its own query, so churn
    between renders cannot strand it. Returns the folded label clicked, or
    None if no tab matched (caller decides how loud to be)."""
    return session.page.evaluate(CLICK_TAB_JS, list(labels))


# Harvest action rows as an ordered LIST so duplicate display names survive
# (NPL carries two 'RH02. Assign to Maintenance team' records — a dict keyed
# by name silently drops one). Duplicates get a ' #n' suffix in the capture
# key; the bare name is still used to verify the opened form.
HARVEST_GRID_LIST_JS = """() => {
    const out = [];
    for (const cb of document.querySelectorAll('input[id^="pbl_form_"]')) {
        const m = cb.id.match(/^pbl_form_([0-9a-f-]{36})_0$/i);
        if (!m) continue;
        const row = cb.closest('tr');
        if (!row) continue;
        const own = cb.closest('td');
        const cells = Array.from(row.querySelectorAll('td'))
            .filter(td => td !== own)
            .map(td => td.innerText.trim());
        const name = cells.find(c => c && c.length > 1 && !/^(select( record| all)?|options)$/i.test(c));
        if (name) out.push({name: name, guid: m[1]});
    }
    return out;
}"""


def _harvest_guid_list(session) -> list[tuple[str, str, str]]:
    """-> [(captureKey, bareName, guid)] with duplicate names suffixed."""
    rows = session.page.evaluate(HARVEST_GRID_LIST_JS) or []
    seen: dict[str, int] = {}
    out = []
    for r in rows:
        name = r["name"]
        seen[name] = seen.get(name, 0) + 1
        key = name if seen[name] == 1 else f"{name} #{seen[name]}"
        out.append((key, name, r["guid"]))
    return out


def _wait_for_grid(session, timeout_s: float) -> int:
    """Wait until at least one GUID row-checkbox is rendered; return the
    count (0 on timeout — the caller decides whether that is a finding).
    Lives here, not on the adapter, so a crawler hot-reload is enough to
    pick up a fix without restarting the harness (= no re-login)."""
    waited = 0.0
    while waited < timeout_s:
        n = session.page.evaluate(GRID_GUID_COUNT_JS)
        if n:
            return n
        session.page.wait_for_timeout(500)
        waited += 0.5
    return 0


def _open_actions(session, raw: dict, initial: bool = False) -> None:
    """Open the Actions tab AND make sure the GUID grid is on screen.
    NPL renders Diagram | Simple list | Full list sub-views with Diagram
    active by default — no grid, no row checkboxes, nothing to harvest.
    Only the Full list sub-view carries the pbl_form_<guid>_0 checkboxes.

    Tab clicks are JS-native (_click_tab_js): the adapter's actionability
    wait times out against NPL's continuously re-rendering strip. On
    re-entry (after a form CANCEL) a visible grid means the list survived
    the round-trip — clicking again would only reset NPL to the Diagram
    sub-view and cost the Full-list dance every record."""
    if not initial and _wait_for_grid(session, 3):
        return
    if _click_tab_js(session, TAB_ACTIONS) is None:
        raw["warnings"].append("actions: no 'Actions' tab matched by JS click")
    session.page.wait_for_timeout(800)
    if _wait_for_grid(session, 6):
        return
    if _click_tab_js(session, TAB_ACTIONS_FULL_LIST) is None:
        # No sub-tab = a plain-grid instance that is just slow; keep waiting.
        raw["warnings"].append("actions: no grid after 6s and no 'Full list' sub-tab")
    if not _wait_for_grid(session, 20):
        raw["warnings"].append("actions: GUID grid never rendered — harvest will be empty")

SECTIONED_CHECKBOXES_JS = """() => {
    const out = [];
    let section = '';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
        const el = walker.currentNode;
        const tag = el.tagName;
        if (/^H[1-6]$/.test(tag) || tag === 'LEGEND' ||
            (tag === 'DIV' && /section|panel|group/i.test(el.className || '') === false && false)) {
            const t = el.innerText ? el.innerText.trim().split('\\n')[0] : '';
            if (t && t.length < 120) section = t;
        }
        if (tag === 'INPUT' && el.type === 'checkbox') {
            let label = '';
            if (el.id) {
                const l = document.querySelector('label[for="' + el.id + '"]');
                if (l) label = l.innerText.trim();
            }
            if (!label) {
                const wrap = el.closest('label');
                if (wrap) label = wrap.innerText.trim();
            }
            if (!label) {
                const td = el.closest('td,div');
                if (td && td.previousElementSibling) label = td.previousElementSibling.innerText.trim();
            }
            out.push({section: section, label: label, checked: el.checked, name: el.name || el.id || ''});
        }
    }
    return out;
}"""


def capture(session, progress) -> dict:
    """Returns the raw capture for the Helpdesk domain."""
    raw: dict = {"warnings": []}
    session.goto_admin("helpdesk_admin.aspx")

    # ---- statuses: full grid + per-record form reads --------------------
    session.click_tab(TAB_STATUSES)
    _wait_for_grid(session, 15)
    raw["statusHeaders"] = session.grid_headers()
    raw["statusRows"] = session.grid_rows()
    guids = session.harvest_grid_guids()
    raw["statusGuids"] = guids
    raw["statusForms"] = {}
    names = list(guids.keys())
    progress("Statuses", 0, len(names))
    for i, name in enumerate(names):
        session.nav_form_view(guids[name], name)
        raw["statusForms"][name] = {
            "fields": session.read_form_fields(),
            "sectioned": session.page.evaluate(SECTIONED_CHECKBOXES_JS),
        }
        session.cancel_form()
        session.click_tab(TAB_STATUSES)
        progress("Statuses", i + 1, len(names))

    # ---- operative statuses (list-level; type-agnostic per U-003) -------
    session.click_tab(TAB_OPERATIVE)
    raw["operativeRows"] = session.grid_rows()
    progress("Operative statuses", 1, 1)

    # ---- job types (2 records) -------------------------------------------
    session.click_tab(TAB_JOB_TYPES)
    _wait_for_grid(session, 15)
    jt_guids = session.harvest_grid_guids()
    raw["jobTypeGuids"] = jt_guids
    raw["jobTypeForms"] = {}
    progress("Helpdesk Job Types", 0, len(jt_guids))
    for i, (name, guid) in enumerate(jt_guids.items()):
        session.nav_form_view(guid, name)
        raw["jobTypeForms"][name] = {
            "fields": session.read_form_fields(),
            "sectioned": session.page.evaluate(SECTIONED_CHECKBOXES_JS),
        }
        session.cancel_form()
        session.click_tab(TAB_JOB_TYPES)
        progress("Helpdesk Job Types", i + 1, len(jt_guids))

    # ---- actions: list matrix + per-record Edit form + record VIEW ------
    _open_actions(session, raw, initial=True)
    raw["actionHeaders"] = session.grid_headers()
    raw["actionRows"] = session.grid_rows()
    harvested = _harvest_guid_list(session)
    a_guids = {key: guid for key, _bare, guid in harvested}
    raw["actionGuids"] = a_guids
    raw["actionForms"] = {}
    raw["actionViews"] = {}
    progress("Actions", 0, len(harvested))
    for i, (key, bare, guid) in enumerate(harvested):
        session.nav_form_view(guid, _bare_name(bare))
        raw["actionForms"][key] = {
            "fields": session.read_form_fields(),
            "sectioned": session.page.evaluate(SECTIONED_CHECKBOXES_JS),
        }
        session.cancel_form()
        _open_actions(session, raw)
        try:
            session.nav_record_view(guid, _bare_name(bare))
            raw["actionViews"][key] = session.body_text()
        except Exception as exc:  # record view optional in v1 — warn, not fail
            raw["warnings"].append(f"action record view failed for {key}: {exc}")
        _open_actions(session, raw)
        progress("Actions", i + 1, len(harvested))

    return raw


def _bare_name(display: str) -> str:
    """'RH04. Assign to contractor' -> the form's Name field usually holds
    the bare name; accept either by trying the full display first."""
    return display


def interpret(raw: dict, not_crawled: list) -> dict:
    """raw capture -> helpdeskTypes[] in the VANILLA-HELPDESK v2 shape.
    Interpretation is deliberately conservative; anything ambiguous lands
    in not_crawled with a reason."""
    warnings = list(raw.get("warnings", []))

    status_names = list(raw.get("statusGuids", {}).keys())
    statuses_by_type: dict[str, list] = {"Reactive": [], "Planned": []}
    defaults: dict[str, str] = {}
    for name in status_names:
        form = raw["statusForms"].get(name, {})
        checked = {c["label"].strip() for c in form.get("sectioned", []) if c["checked"]}
        types = [t for t in ("Reactive", "Planned") if t in checked]
        if not types:
            warnings.append(f"status {name!r}: no type tick interpreted — attributing to neither")
        is_default = any(re.search(r"default", lbl, re.I) for lbl in checked)
        # "Suppress status from use" hides a status from use — a real captured
        # property the views must honour (never draw a suppressed status).
        checks = form.get("fields", {}).get("checks", {})
        suppressed = any(
            v and re.search(r"suppress.*from use|suppress status", str(lbl), re.I)
            for lbl, v in checks.items()
        )
        sort = None
        for lbl, val in form.get("fields", {}).get("inputs", {}).items():
            if re.search(r"sort|order", lbl, re.I) and str(val).strip().isdigit():
                sort = int(str(val).strip())
                break
        for t in types:
            statuses_by_type[t].append({"name": name, "isDefault": is_default, "ordering": sort if sort is not None else 0, "suppressed": suppressed})
            if is_default:
                defaults[t] = name

    actions = []
    availability: list = []
    sets: list = []
    selects: list = []
    for display, form in raw.get("actionForms", {}).items():
        m = re.match(r"^([A-Z]+\d+[a-z]?)\.\s*(.*)$", display)
        code = m.group(1) if m else display
        sectioned = form.get("sectioned", [])
        fields = form.get("fields", {})

        # availability vs user-select: status-name checkboxes grouped by
        # their section heading
        avail_statuses, select_statuses, unattributed = [], [], []
        for c in sectioned:
            if not c["checked"]:
                continue
            label = c["label"].strip()
            if label not in status_names:
                continue
            sec = (c.get("section") or "").lower()
            if "select" in sec:
                select_statuses.append(label)
            elif "status" in sec or "available" in sec:
                avail_statuses.append(label)
            else:
                unattributed.append(label)
        if unattributed:
            # conservative: treat as availability but record the doubt
            avail_statuses.extend(unattributed)
            warnings.append(f"action {display!r}: {len(unattributed)} status tick(s) attributed to availability without a clear section heading")

        resulting = None
        resulting_type = None
        for lbl, val in fields.get("selects", {}).items():
            if re.search(r"resulting.*status", lbl, re.I) and val and val in status_names:
                resulting = val
            if re.search(r"resulting.*type", lbl, re.I) and val:
                resulting_type = val
        hidden = any(c["checked"] and re.search(r"hide", c["label"], re.I) for c in sectioned)

        actions.append({
            "name": display, "code": code, "hidden": hidden,
            "resultingType": resulting_type,
            "availableIn": sorted(set(avail_statuses)),
            "resultingStatus": resulting,
            "userSelectableStatuses": sorted(set(select_statuses)),
        })
        for s in sorted(set(avail_statuses)):
            availability.append((display, s))
        if resulting:
            sets.append((display, resulting))
        for s in sorted(set(select_statuses)):
            selects.append((display, s))

    if not actions:
        not_crawled.append({"family": "Helpdesk actions", "reason": "no action forms captured"})
    if not status_names:
        not_crawled.append({"family": "Helpdesk statuses", "reason": "no status grid captured"})

    operative = [r[1] if len(r) > 1 else r[0] for r in raw.get("operativeRows", []) if r and any(x for x in r)]

    def type_block(tname: str):
        st = statuses_by_type[tname]
        st_names = {s["name"] for s in st}
        rels = []
        for a, s in availability:
            if s in st_names:
                rels.append({"kind": "action-available-in-status", "action": a, "fromStatus": s,
                             "confidence": "VERIFIED — OBSERVED", "evidence": ["CRAWL"]})
        for a, s in sets:
            if s in st_names:
                rels.append({"kind": "action-sets-job-status", "action": a, "toStatus": s,
                             "confidence": "VERIFIED — OBSERVED", "evidence": ["CRAWL"]})
        for a, s in selects:
            if s in st_names:
                rels.append({"kind": "action-user-selects-status", "action": a, "toStatus": s,
                             "confidence": "VERIFIED — OBSERVED", "evidence": ["CRAWL"]})
        return {
            "name": tname,
            "confidence": "VERIFIED — OBSERVED",
            "evidence": ["CRAWL"],
            "statuses": [dict(s, confidence="VERIFIED — OBSERVED", evidence=["CRAWL"]) for s in st],
            "operativeStatuses": [{"name": n, "confidence": "VERIFIED — OBSERVED", "evidence": ["CRAWL"]} for n in operative],
            "actions": [_action_entry(a) for a in actions if _action_in_type(a, st_names)],
            "relationships": rels,
            "defaults": [], "unknowns": [],
        }

    return {
        "helpdeskTypes": [type_block("Reactive"), type_block("Planned")],
        "warnings": warnings,
        "identities": {
            "statuses": raw.get("statusGuids", {}),
            "actions": raw.get("actionGuids", {}),
        },
    }


def _action_in_type(a: dict, st_names: set) -> bool:
    return (not a["availableIn"] and not a["resultingStatus"]) or \
        any(s in st_names for s in a["availableIn"]) or \
        (a["resultingStatus"] in st_names if a["resultingStatus"] else False)


def _action_entry(a: dict) -> dict:
    e = {
        "name": a["name"], "code": a["code"], "active": True,
        "applicability": "UNKNOWN — not interpreted by crawler v1",
        "mobileAvailable": False,
        "buttonGroup": None,
        "availableIn": a["availableIn"],
        "hidden": a["hidden"],
        "confidence": "VERIFIED — OBSERVED",
        "evidence": ["CRAWL"],
        "notes": "",
    }
    if a["resultingStatus"]:
        e["resultingStatus"] = a["resultingStatus"]
    if a["resultingType"]:
        e["resultingType"] = a["resultingType"]
    if a["userSelectableStatuses"]:
        e["userSelectableStatuses"] = a["userSelectableStatuses"]
        e["userSelectsResultingStatus"] = True
    return e
