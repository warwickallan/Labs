"""Build model/VANILLA-HELPDESK.json from the captured evidence.

Deterministic: the data literals below are transcriptions of the evidence
files named in EVIDENCE (E-001..E-008, captured 2026-08-18). Re-running
always produces the same model. The model grows only from this evidence —
no invented fields.

Confidence shorthand used here:
  OBS  = "VERIFIED — OBSERVED"     (directly visible in the UI)
  STR  = "VERIFIED — STRUCTURAL"   (derived from the system's own filter/
                                    map rendering, cross-checked)
  INF  = "INFERRED"
"""

from __future__ import annotations

import datetime as _dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "model" / "VANILLA-HELPDESK.json"

OBS = "VERIFIED — OBSERVED"
STR = "VERIFIED — STRUCTURAL"
INF = "INFERRED"

EVIDENCE = [
    ("E-001", "evidence/helpdesk-admin/001-helpdesk-menu-navigation.md", "Helpdesk main-menu structure"),
    ("E-002", "evidence/helpdesk-admin/002-helpdesk-admin-structure.md", "Helpdesk admin: Types, 43 config tabs, action groups"),
    ("E-003", "evidence/reactive-helpdesk/statuses/001-statuses-tab-inventory.md", "Job status inventory with Type attribution"),
    ("E-004", "evidence/reactive-helpdesk/operative-statuses/001-operative-statuses-inventory.md", "Operative status inventory"),
    ("E-005", "evidence/reactive-helpdesk/actions/001-actions-by-status-simple-list.md", "Status → available actions grouped view"),
    ("E-006", "evidence/reactive-helpdesk/actions/002-actions-full-list-matrix.md", "Action attribute matrix (50 records)"),
    ("E-007", "evidence/reactive-helpdesk/actions/003-action-status-map.md", "Action/status map: edges, warnings, legend"),
    ("E-008", "evidence/reactive-helpdesk/action-configurator/001-rh04-summary-view.md", "RH04 record view: summary fields, tag automation"),
    ("E-009", "evidence/reactive-helpdesk/action-configurator/002-rh04-edit-form-inventory.md", "Add/Edit Action configurator: 211 controls, options, GUIDs"),
    ("E-010", "evidence/helpdesk-admin/003-workflow-config-tabs.md", "Status rules/Helpdesk rules/Roles/Job types/Working time/Appointment rules/Action routes"),
    ("E-011", "evidence/helpdesk-admin/004-quote-family-tabs.md", "Quote family: processes, actions, statuses, categories, priorities"),
    ("E-012", "evidence/helpdesk-admin/005-reference-data-tabs.md", "Reference-data and empty tabs; crawl completion"),
    ("E-013", "evidence/helpdesk-admin/006-add-forms-core-objects.md", "Blank Add forms: Status, Operative status, Tag, Response category"),
    ("E-014", "evidence/helpdesk-admin/007-add-forms-batch2-and-gm05.md", "Add forms batch 2; GM05 edit view; conditional-UI finding"),
    ("E-015", "evidence/reactive-helpdesk/actions/004-per-action-config-all-50.md", "Per-action configuration: all 50 action forms read individually"),
    ("E-016", "evidence/helpdesk-admin/008-quote-action-configurator.md", "Quote action configurator + RE05: the quote-to-job bridge (U-005)"),
    ("E-017", "evidence/helpdesk-admin/009-residual-value-reads.md", "Residual values: tags, templates, roles, routes, quote process, SLA records"),
    ("E-018", "evidence/helpdesk-admin/010-classification-taxonomy.md", "Nested classification taxonomy (16 parents, ~85 children)"),
]

DISCOVERY_PHASE = (
    "Structural baseline VANILLA-HELPDESK-STRUCTURAL-v1: all 43 tabs crawled, "
    "14 configurator schemas + all 50 action configs + record values captured. "
    "Controlled EXPERIMENT phase not started."
)

# ---- statuses (E-003). type: R / P / both. "With AMO" excluded: user-declared non-Vanilla addition.
STATUSES = [
    # name, type, sort, default, complete
    ("New PPM", "P", 10, False, False),
    ("With Helpdesk", "R", 10, True, False),
    ("With Maintenance Team", "P", 20, False, False),
    ("With Maintenance Team - R", "R", 20, False, False),
    ("Awaiting Order Approval - R", "R", 25, False, False),
    ("With Contractor", "P", 30, False, False),
    ("With Contractor - R", "R", 30, False, False),
    ("Quote Requested - R", "R", 55, False, False),
    ("Business Case - R", "R", 56, False, False),
    ("PPM Complete", "P", 60, False, False),
    ("Work Complete - R", "R", 60, False, False),
    ("Closed", "both", 70, False, True),
    ("Cancelled", "both", 110, False, False),
]

OPERATIVE_STATUSES = [
    "Called away", "Waiting for parts", "Paused", "In progress",
    "Finished shift (pause)", "On site", "On break", "Travelling", "Complete",
]

# ---- actions (E-006): code -> (name, button group, ppm, job type, flags)
ACTIONS = {
    "G001": ("Add a note, photo or document", "General Actions", "All jobs", "All jobs", ["attachments"]),
    "G002": ("Permit to work request", "General Actions", "All jobs", None, []),
    "G003": ("Cancel job", "General Actions", "All jobs", None, ["email_supplier", "email_originator", "admin_only"]),
    "G004": ("Close job", "General Actions", "All jobs", None, ["email_originator", "admin_only", "status_complete"]),
    "G005": ("Stock request", "General Actions", "All jobs", "All jobs", []),
    "G006": ("Consumable order", "General Actions", "All jobs", None, []),
    "GM01": ("Accept job", "General Mobile", "All jobs", "All jobs", []),
    "GM02": ("Start Travel", "General Mobile", "All jobs", "All jobs", ["start_clock"]),
    "GM03": ("Stop Travel", "General Mobile", "All jobs", "All jobs", ["stop_clock"]),
    "GM04": ("Start job", "General Mobile", "All jobs", "All jobs", ["start_clock"]),
    "GM05": ("Place Job on hold", "General Mobile", "All jobs", "All jobs", ["stop_clock", "pause_status:Paused"]),
    "GM06": ("Take off hold", "General Mobile", "All jobs", "All jobs", ["start_clock", "pause_status:Restart"]),
    "GM07": ("Complete Time on job", "General Mobile", "All jobs", "All jobs", []),
    "LM01": ("Stock request", "Lead Mobile", "All jobs", "All jobs", []),
    "LM02": ("Consumable order", "Lead Mobile", "All jobs", "All jobs", []),
    "LM03": ("Assign/Change Lead", "Lead Mobile", "Non-planned only", "All jobs", []),
    "LM04": ("Request assistance", "Lead Mobile", "All jobs", "All jobs", []),
    "LM05": ("Assign to Contractor", "Lead Mobile", "Non-planned only", "All jobs", ["supplier_assignment", "email_supplier", "orchestrate_only"]),
    "PH01": ("New PPM", "Planned Helpdesk Tasks", "Planned only", None, []),
    "PH02": ("Assign to maintenance team", "Planned Helpdesk Tasks", "Planned only", None, ["resource_team_assignment"]),
    "PH02a": ("Bulk assign to team", "Planned Helpdesk Tasks", "Planned only", None, ["resource_team_assignment"]),
    "PH02b": ("Assign operative", "Planned Helpdesk Tasks", "Planned only", None, ["resource_assignment"]),
    "PH03": ("Assign to contractor", "Planned Helpdesk Tasks", "Planned only", None, ["supplier_assignment", "email_supplier"]),
    "PH04": ("Place on hold", "Planned Helpdesk Tasks", "Planned only", None, []),
    "PH05": ("Take off hold", "Planned Helpdesk Tasks", "Planned only", None, []),
    "PH06": ("PPM complete", "Planned Helpdesk Tasks", "Planned only", None, []),
    "PH07": ("PPM Complete - with remedials", "Planned Helpdesk Tasks", "Planned only", None, []),
    "PM01": ("PPM complete", "Mobile Planned", "Planned only", "All jobs", ["stop_clock"]),
    "PM02": ("PPM Complete - with Remedials", "Mobile Planned", "Planned only", "Single operative job", ["stop_clock"]),
    "RH01": ("New Reactive Task", "Reactive Helpdesk Tasks", "Non-planned only", None, ["default_for_user", "default_for_helpdesk", "email_originator"]),
    "RH02": ("Assign to Maintenance team", "Reactive Helpdesk Tasks", "Non-planned only", None, ["resource_team_assignment", "email_originator"]),
    "RH03": ("Assign Operative", "Reactive Helpdesk Tasks", "Non-planned only", None, ["resource_team_assignment", "resource_assignment"]),
    "RH03b": ("Quote Ordered", None, "All jobs", None, []),
    "RH04": ("Assign to contractor", "Reactive Helpdesk Tasks", "Non-planned only", None, ["supplier_assignment", "email_supplier"]),
    "RH05": ("Approve Order", "Reactive Helpdesk Tasks", "Non-planned only", None, []),
    "RH06": ("Quote Request", "Reactive Helpdesk Tasks", "Non-planned only", None, []),
    "RH07": ("Amend SLA", "Reactive Helpdesk Tasks", "All jobs", None, ["email"]),
    "RH08": ("Place On Hold", "Reactive Helpdesk Tasks", "Non-planned only", None, ["admin_only"]),
    "RH09": ("Take off hold", "Reactive Helpdesk Tasks", "Non-planned only", None, []),
    "RH10": ("Work Complete", "Reactive Helpdesk Tasks", "Non-planned only", None, []),
    "RH11": ("Work Complete - Follow up", "Reactive Helpdesk Tasks", "Non-planned only", None, []),
    "RM01": ("Work Complete - no further work required", "Mobile Reactive", "Non-planned only", "All jobs", ["email_originator", "stop_clock"]),
    "RM02": ("Work Complete - Follow up", "Mobile Reactive", "Non-planned only", "All jobs", ["stop_clock"]),
    "T02": ("Accepted", "Tag/Auto Actions", "All jobs", None, []),
    "T03": ("Rejected", "Tag/Auto Actions", "All jobs", None, []),
    "T04": ("Appointment Made/Operative Assigned", "Tag/Auto Actions", "All jobs", None, []),
    "T05": ("In progress", "Tag/Auto Actions", "All jobs", None, []),
    "T06": ("On hold", "Tag/Auto Actions", "All jobs", None, []),
    "T07": ("Cost uplift request", "Tag/Auto Actions", "All jobs", None, []),
    "T09": ("AFP approved", "Tag/Auto Actions", "All jobs", None, []),
}

# mobile availability per the grouped-view badges (E-005): actions badged Mobile
MOBILE = {"G001", "G005", "GM01", "GM02", "GM03", "GM04", "GM05", "GM06", "GM07",
          "LM01", "LM02", "LM03", "LM04", "LM05", "PM01", "PM02", "RM01", "RM02"}

# ---- availability: status -> action codes (E-005 grouped view, = map's 93 avail edges + G002 any-status)
AVAILABILITY = {
    "New PPM": ["G001", "G003", "PH01", "PH02", "PH03", "PH04", "PH02a"],
    "With Helpdesk": ["G001", "RH01", "G003", "RH04", "RH02", "PH05", "RH06", "RH07"],
    "With Maintenance Team": ["G001", "G003", "GM04", "GM01", "GM05", "GM06", "PH03", "PH04", "PH05",
                               "PH06", "PH07", "PM01", "PM02", "RH06", "T05", "PH02b", "GM02", "GM03",
                               "LM03", "LM04", "LM02", "G005", "GM07", "G006"],
    "With Maintenance Team - R": ["G001", "RM01", "G003", "RH04", "GM04", "GM01", "RH08", "GM05", "GM06",
                                   "RM02", "RH10", "RH11", "RH03", "T05", "GM02", "GM03", "LM03", "LM04",
                                   "LM02", "G005", "GM07", "G006", "RH07", "LM05"],
    "Awaiting Order Approval - R": ["RH05"],
    "With Contractor - R": ["G001", "G003", "RH04", "RH08", "RH09", "RH10", "RH11", "T02", "T04", "T03",
                             "T05", "T07", "RH07"],
    "With Contractor": ["G001", "G003", "PH03", "PH04", "PH05", "PH06", "PH07", "T04", "T05"],
    "Quote Requested - R": [],
    "Business Case - R": [],
    "PPM Complete": ["G004", "G001"],
    "Work Complete - R": ["G004", "G001", "T07"],
    "Closed": ["G001"],
    "Cancelled": ["G001"],
}
ANY_STATUS = ["G002"]  # E-007: "Any status — no availability restriction"
NOT_ALLOCATED = ["RH03b", "T09", "T06", "LM01"]  # E-005 "Not allocated" minus G002

# ---- sets-job-status edges (E-006 Resulting status column ≡ E-007 sets edges)
SETS = {
    "G003": "Cancelled", "G004": "Closed", "LM05": "With Contractor - R",
    "PH01": "New PPM", "PH02": "With Maintenance Team", "PH02a": "With Maintenance Team",
    "PH02b": "With Maintenance Team", "PH03": "With Contractor", "PH06": "PPM Complete",
    "PH07": "PPM Complete", "PM01": "PPM Complete", "PM02": "PPM Complete",
    "RH01": "With Helpdesk", "RH02": "With Maintenance Team - R", "RH03": "With Maintenance Team - R",
    "RH03b": "With Contractor - R", "RH04": "With Contractor - R", "RH05": "With Contractor - R",
    "RH06": "Quote Requested - R", "RH10": "Work Complete - R", "RH11": "Work Complete - R",
    "RM01": "Work Complete - R", "RM02": "Work Complete - R", "T03": "With Helpdesk",
    "T07": "Business Case - R",
}

# ---- user-selects-status edges (E-007, 15 edges)
SELECTS = {
    "GM01": ["With Maintenance Team", "With Maintenance Team - R"],
    "GM04": ["With Maintenance Team", "With Maintenance Team - R"],
    "LM03": ["With Maintenance Team", "With Maintenance Team - R"],
    "PH05": ["With Maintenance Team", "With Contractor", "With Helpdesk"],
    "T06": ["With Maintenance Team", "With Contractor", "With Maintenance Team - R", "With Contractor - R"],
    "T09": ["PPM Complete", "Work Complete - R"],
}


def status_entry(name, sort, default, complete, shared):
    e = {
        "name": name,
        "isDefault": default,
        "ordering": sort,
        "confidence": OBS,
        "evidence": ["E-003"],
    }
    notes = []
    if complete:
        notes.append('Flagged "Complete" in the Statuses tab (the only one).')
    if shared:
        notes.append("Returned by both the Reactive and Planned Type filters (single record).")
        e["confidence"] = STR
    if notes:
        e["notes"] = " ".join(notes)
    return e


def action_entry(code, type_letter):
    name, group, ppm, jobtype, flags = ACTIONS[code]
    e = {
        "name": f"{code}. {name}",
        "code": code,
        "active": True,
        "applicability": ppm,
        "mobileAvailable": code in MOBILE,
        "confidence": OBS,
        "evidence": ["E-005", "E-006", "E-007"],
    }
    if code in SELECTS:
        e["userSelectsResultingStatus"] = True
    notes = []
    if group:
        notes.append(f"Button group: {group}.")
    else:
        notes.append("No button group assigned.")
    if jobtype:
        notes.append(f"Job type: {jobtype}.")
    if flags:
        notes.append("Flags: " + ", ".join(flags) + ".")
    if code in NOT_ALLOCATED:
        notes.append("Not allocated to any status in the grouped view (U-004).")
    if code == "G002":
        notes.append("Available in any status (no availability restriction) per the Action map.")
    if code == "RH04":
        notes.append(
            "Record view (E-008): Resulting type Reactive; Status 'Web page only'; "
            "who can carry out: both lead and sub operatives; adds tag "
            "'01. Awaiting acceptance', removes tag '02. Supplier rejected'."
        )
        e["evidence"].append("E-008")
    e["notes"] = " ".join(notes)
    return e


def relationships_for(type_letter, statuses_of_type):
    rels = []
    sset = set(statuses_of_type)
    for status, codes in AVAILABILITY.items():
        if status not in sset:
            continue
        for code in codes:
            rels.append({
                "kind": "action-available-in-status",
                "action": f"{code}. {ACTIONS[code][0]}",
                "fromStatus": status,
                "confidence": OBS,
                "evidence": ["E-005", "E-007"],
            })
    for code, target in sorted(SETS.items()):
        if target in sset:
            rels.append({
                "kind": "action-sets-job-status",
                "action": f"{code}. {ACTIONS[code][0]}",
                "toStatus": target,
                "confidence": OBS,
                "evidence": ["E-006", "E-007"],
            })
    for code, targets in sorted(SELECTS.items()):
        for target in targets:
            if target in sset:
                rels.append({
                    "kind": "action-user-selects-status",
                    "action": f"{code}. {ACTIONS[code][0]}",
                    "toStatus": target,
                    "confidence": STR,
                    "evidence": ["E-007"],
                })
    return rels


def build():
    r_statuses = [s for s in STATUSES if s[1] in ("R", "both")]
    p_statuses = [s for s in STATUSES if s[1] in ("P", "both")]

    # actions attributed per type by PPM applicability; All-jobs actions in both
    def type_actions(letter):
        want = {"R": ("Non-planned only", "All jobs"), "P": ("Planned only", "All jobs")}[letter]
        return [c for c in ACTIONS if ACTIONS[c][2] in want]

    types = []
    for letter, tname, guid in (
        ("R", "Reactive", "ba98cba4-bb06-4347-a70a-86555149cb7c"),
        ("P", "Planned", "cf54e0a3-359e-4df3-bdfc-e53ba614f441"),
    ):
        st = r_statuses if letter == "R" else p_statuses
        types.append({
            "name": tname,
            "confidence": OBS,
            "evidence": ["E-002"],
            "notes": f"Type filter GUID {guid}. Actions attributed to this type by their "
                     "PPM/Non-PPM applicability (All-jobs actions appear under both types) — "
                     "attribution rule is structural, not a system statement.",
            "statuses": [status_entry(n, sort, d, c, t == "both") for (n, t, sort, d, c) in st],
            "operativeStatuses": [
                {"name": n, "confidence": OBS, "evidence": ["E-004"],
                 "notes": "Same 9 records returned under both Type filters; whether genuinely "
                          "shared or filter-ignored is U-003."}
                for n in OPERATIVE_STATUSES
            ],
            "actions": [action_entry(c, letter) for c in sorted(type_actions(letter))],
            "relationships": relationships_for(letter, [s[0] for s in st]),
            "defaults": ([{
                "statement": "RH01. New Reactive Task is flagged 'Default for user' and "
                             "'Default for helpdesk'; With Helpdesk is the default job status.",
                "confidence": OBS, "evidence": ["E-003", "E-006"],
            }] if letter == "R" else []),
            "unknowns": {
                "R": ["U-002", "U-003", "U-004", "U-005", "U-007", "U-008", "U-009", "U-010"],
                "P": ["U-003", "U-007", "U-008", "U-010"],
            }[letter],
        })

    model = {
        "metadata": {
            "modelVersion": 1,
            "environment": "https://warwick.concertodemo.co.uk",
            "mode": "DISCOVER",
            "generatedAt": _dt.date.today().isoformat(),
            "notes": (
                f"Built by scripts/build_model.py from evidence "
                f"{EVIDENCE[0][0]}..{EVIDENCE[-1][0]} ({len(EVIDENCE)} files; "
                "Concerto build 2026.08.9968-main). 'With AMO' status excluded: "
                f"user-declared non-Vanilla addition. {DISCOVERY_PHASE} "
                "GUIDs referenced via model/IDENTITIES.json are "
                "environment-specific observed identities, not portable keys."
            ),
        },
        "sharedConfiguration": [
            {
                "statement": "Helpdesk Types are exactly Reactive and Planned; one Helpdesk admin "
                             "page with 43 configuration tabs serves both.",
                "confidence": OBS, "evidence": ["E-002"],
            },
            {
                "statement": "Statuses 'Closed' and 'Cancelled' are single records shared by both "
                             "Helpdesk Types (returned by both Type filters).",
                "confidence": STR, "evidence": ["E-003"],
            },
            {
                "statement": "The 9 operative statuses are common to both Type filters "
                             "(shared, or the filter does not apply — U-003).",
                "confidence": STR, "evidence": ["E-004"],
            },
            {
                "statement": "No action has any operative-status relationship and nothing "
                             "auto-fires on status expiry in Vanilla (Action map renders zero "
                             "such edges; Operative status column blank on all 50 actions).",
                "confidence": OBS, "evidence": ["E-006", "E-007"],
            },
            {
                "statement": "Action map warnings: 'New PPM' and 'Business Case - R' are "
                             "unreachable — no live action moves jobs into them (system's own "
                             "validation; anomaly vs drawn edges recorded as U-007).",
                "confidence": OBS, "evidence": ["E-007"],
            },
            {
                "statement": "8 action groups exist: Reactive Helpdesk Tasks, Planned Helpdesk "
                             "Tasks, General Mobile, Lead Mobile, Mobile Reactive, Mobile "
                             "Planned, General Actions, Tag/Auto Actions.",
                "confidence": OBS, "evidence": ["E-002"],
            },
            {
                "statement": "Helpdesk job types tab defines the two Types with per-type "
                             "job-creation default actions: Reactive→RH01 (default type), "
                             "Planned→PH01.",
                "confidence": OBS, "evidence": ["E-010"],
            },
            {
                "statement": "Rule/automation surfaces are EMPTY in Vanilla: Status rules, "
                             "Helpdesk rules, Appointment rules, Action routes/Overrides, "
                             "Email rules, Quote rules, plus Approvers, Areas, Assignees, "
                             "Audit bandings, CAPEX codes, FM task types, Hubs, Non working "
                             "days, Notes/Warnings, SLA fail reasons, Short titles, Trading "
                             "affected.",
                "confidence": OBS, "evidence": ["E-010", "E-011", "E-012"],
            },
            {
                "statement": "SLA table (Response categories): P1 2h/1d, P2 24h/3d, P3 48h/5d, "
                             "P4 72h/7d, Planned 0/0, By agreement 0/0 — all on 'Standard "
                             "hours' (Mon-Fri 08:30-17:30); no default flagged (VI-005).",
                "confidence": OBS, "evidence": ["E-010", "E-012"],
            },
            {
                "statement": "A parallel quote workflow exists: 1 process ('Standard process'), "
                             "8 RE-actions, 5 quote-request statuses, 2 quote statuses, "
                             "2 categories, 3 priorities. Its bridge back to job statuses is "
                             "unevidenced (U-005).",
                "confidence": OBS, "evidence": ["E-011"],
            },
            {
                "statement": "20 typed tags (Helpdesk/Order/QuoteRequest) mirror the order-status "
                             "and T-action vocabularies; actions can add/remove tags and be "
                             "order-status-triggered (RH04 triggers on 'Awaiting acceptance').",
                "confidence": OBS, "evidence": ["E-008", "E-009", "E-012"],
            },
        ],
        "helpdeskTypes": types,
        "evidence": [
            {"id": eid, "path": path, "capturedAt": "2026-08-18", "description": desc}
            for (eid, path, desc) in EVIDENCE
        ],
    }
    OUT.write_text(json.dumps(model, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    n_rel = sum(len(t["relationships"]) for t in types)
    print(f"wrote {OUT.name}: {len(types)} types, "
          f"{sum(len(t['statuses']) for t in types)} status entries, "
          f"{sum(len(t['actions']) for t in types)} action entries, {n_rel} relationships")


if __name__ == "__main__":
    build()
