# E-008 — Action record view: RH04. Assign to contractor

- Captured: 2026-08-18 by opening the RH04 row from Helpdesk admin → Actions
  (read-only record view with an Update button — **Update/Save never
  pressed**; the full Add/Edit configurator inventory remains OPEN, Phase 2d).
- Confidence: VERIFIED — OBSERVED.

## Summary fields shown (verbatim label → value)

| Field | Value |
| --- | --- |
| Action | RH04. Assign to contractor |
| Resulting status | With Contractor - R |
| Resulting type | Reactive |
| Status | Web page only |
| PPM/Non PPM | Non planned only |
| Supplier assignment | Yes |
| Statuses in which this action can be selected | With Helpdesk, With Maintenance Team - R, With Contractor - R |
| Who can carry out this action | Both lead and sub operatives |

Agrees exactly with E-005/E-006/E-007 for RH04.

## Sections on the record view (each with an add button — none used)

- **Custom fields** (ADD CUSTOM FIELD)
- **Standard phrases** — "Standard phrases will appear only on the
  Orchestrate app." (ADD STANDARD PHRASE)
- **Questionnaires** — "Questionnaire headers available for this action on
  Orchestrate." (ADD QUESTIONNAIRE)
- **Document slots to appear on the action form** — "These document slots
  will be displayed in the action entry form" (ADD DOCUMENT SLOT)
- **Tags to add and remove** — "Tags can be automatically associated or
  removed from jobs." (ADD/REMOVE TAGS)
  - Tags to be added to the job: **01. Awaiting acceptance**
  - Tags to be removed from the job: **02. Supplier rejected**

## New concepts evidenced

- Actions carry **tag automation** (add/remove tags on execution) — RH04
  adds "01. Awaiting acceptance" and removes "02. Supplier rejected".
  Plausibly how Tag/Auto (T*) actions interact with jobs — INFERRED, not
  proven (U-009).
- "Status: Web page only" — an action-level surface/availability setting
  distinct from mobile flags (meaning INFERRED from the label; the
  values this field can take are not yet enumerated).
- "Resulting type: Reactive" — actions can set/carry a Helpdesk Type,
  consistent with RH01 "New Reactive Task" creating Reactive jobs from the
  default status (INFERRED).
- Orchestrate (the mobile app) is named as the surface for standard phrases
  and questionnaires; matches the "Mobile : Orchestrate only" badge on LM05
  (E-005).
