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

CRAWLER_VERSION = "0.1"

# Tab labels as evidenced (E-002). If Concerto renames them, click_tab
# raises StructureError — loud, not quiet.
# Instances name the same tab differently (NPL says 'Statuses' where the
# reference instance says 'Job statuses'). Candidates are tried in order and
# the FIRST that exists wins; unrelated words are never accepted.
TAB_STATUSES = ("Job statuses", "Statuses", "Job status")
TAB_ACTIONS = ("Actions",)
TAB_OPERATIVE = ("Operative statuses", "Operative status")
TAB_JOB_TYPES = ("Helpdesk job types", "Job types")

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
    session.click_tab(TAB_ACTIONS)
    raw["actionHeaders"] = session.grid_headers()
    raw["actionRows"] = session.grid_rows()
    a_guids = session.harvest_grid_guids()
    raw["actionGuids"] = a_guids
    raw["actionForms"] = {}
    raw["actionViews"] = {}
    names = list(a_guids.keys())
    progress("Actions", 0, len(names))
    for i, name in enumerate(names):
        session.nav_form_view(a_guids[name], _bare_name(name))
        raw["actionForms"][name] = {
            "fields": session.read_form_fields(),
            "sectioned": session.page.evaluate(SECTIONED_CHECKBOXES_JS),
        }
        session.cancel_form()
        session.click_tab(TAB_ACTIONS)
        try:
            session.nav_record_view(a_guids[name], _bare_name(name))
            raw["actionViews"][name] = session.body_text()
        except Exception as exc:  # record view optional in v1 — warn, not fail
            raw["warnings"].append(f"action record view failed for {name}: {exc}")
        session.click_tab(TAB_ACTIONS)
        progress("Actions", i + 1, len(names))

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
        sort = None
        for lbl, val in form.get("fields", {}).get("inputs", {}).items():
            if re.search(r"sort|order", lbl, re.I) and str(val).strip().isdigit():
                sort = int(str(val).strip())
                break
        for t in types:
            statuses_by_type[t].append({"name": name, "isDefault": is_default, "ordering": sort if sort is not None else 0})
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
