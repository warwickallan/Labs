# E-007 — "Action / status map" visualiser (Helpdesk admin → ACTION MAP button)

- Captured: 2026-08-18. Modal titled "Action / status map".
- Header counts: default view "24 actions · 13 statuses · 9 operative
  statuses"; with **Show suppressed / hidden** ticked: "50 actions · 13
  statuses · 9 operative statuses".
- Filters: All types / PPM & non-PPM / Mobile & non-mobile; text filter;
  Show suppressed/hidden toggle.
- Method: geometric reconstruction of the SVG edge layer
  (`.ham-edge-avail|sets|select` path endpoints matched to node positions;
  best-fit offset residual = 0, i.e. every edge matched a node exactly).
  Cross-checked against E-005/E-006 — availability lists agree.
- Confidence: VERIFIED — OBSERVED (the map is the system's own rendering);
  VERIFIED — STRUCTURAL for the reconstructed edge list.

## Legend (verbatim — confirms six distinct relationship kinds)

Available in status · Sets job status · User selects status ·
Sets operative status · User selects operative status ·
Auto-fires on status expiry

## Edge counts with all 50 actions shown

| Kind | Count |
| --- | --- |
| Available in status | 93 |
| Sets job status | 25 |
| User selects status | 15 |
| Sets operative status | **0** |
| User selects operative status | **0** |
| Auto-fires on status expiry | **0** |

→ **In Vanilla, no action has any operative-status relationship and nothing
auto-fires on status expiry** (as rendered by this map; consistent with the
blank Operative status column across all 50 rows in E-006).

## "User selects status" edges (the map's dashed edges — 15)

| Action | User can select |
| --- | --- |
| GM01. Accept job | With Maintenance Team, With Maintenance Team - R |
| GM04. Start job | With Maintenance Team, With Maintenance Team - R |
| LM03. Assign/Change Lead* | With Maintenance Team, With Maintenance Team - R |
| PH05. Take off hold | With Maintenance Team, With Contractor, With Helpdesk |
| T06. On hold | With Maintenance Team, With Contractor, With Maintenance Team - R, With Contractor - R |
| T09. AFP approved | PPM Complete, Work Complete - R |

\* Lead Mobile action label truncated during reconstruction; identified as
LM03 by position/group — VERIFIED — STRUCTURAL, re-check on its edit screen.

## "Sets job status" edges (25) — agrees with the Resulting status column of E-006

G003→Cancelled · G004→Closed · LM05→With Contractor - R · PH01→New PPM ·
PH02→With Maintenance Team · PH02a→With Maintenance Team ·
PH02b→With Maintenance Team · PH03→With Contractor · PH06→PPM Complete ·
PH07→PPM Complete · PM01→PPM Complete · PM02→PPM Complete ·
RH01→With Helpdesk · RH02→With Maintenance Team - R ·
RH03→With Maintenance Team - R · RH03b→With Contractor - R ·
RH04→With Contractor - R · RH05→With Contractor - R ·
RH06→Quote Requested - R · RH10→Work Complete - R · RH11→Work Complete - R ·
RM01→Work Complete - R · RM02→Work Complete - R · T03→With Helpdesk ·
T07→Business Case - R

## Availability additions beyond the grouped view (suppressed actions shown)

- G002. Permit to work request is marked **"Any status"** ("No availability
  restriction") — the map renders it via an "Any status" chip node.
- Mobile actions (GM/LM/PM/RM groups) are the bulk of the 26
  suppressed/hidden actions in the default map view. What "suppressed /
  hidden" means precisely is not defined on-screen (U-008).

## Warnings (verbatim, from the map's own validation)

> 2 warnings — Checked against all live statuses and actions, regardless of
> the filters above. Click a warning to highlight it.
> - "New PPM" is unreachable — no live action moves jobs into it
> - "Business Case - R" is unreachable — no live action moves jobs into it

Anomaly: the map itself draws sets-edges PH01→New PPM and T07→Business
Case - R, yet declares both statuses unreachable. Possible explanations
(unproven): PH01 is only available FROM New PPM (circular), and T07/tag
actions may not count as reachability sources; or the warning logic ignores
certain action classes. Registered as U-007.

## Map layout note

The map shows the 13 statuses (both Helpdesk Types; "With AMO" — the user's
non-Vanilla addition — is excluded by the map as well), all actions with
group/PPM/mobile badges, resulting statuses, and the 9 operative statuses in
the right column (no edges reach them in Vanilla).
