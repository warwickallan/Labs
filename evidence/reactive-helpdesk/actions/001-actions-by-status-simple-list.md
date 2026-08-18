# E-005 — Actions tab (default grouped view): status → available actions map

- Captured: 2026-08-18, Helpdesk admin → Actions tab, default grouped view
  (view options on the tab: Diagram / Simple list / Full list).
- Method: DOM extraction of `.action-box-holder` groups (JS inspection).
- Confidence: VERIFIED — OBSERVED (this is the system's own rendering of
  action availability per status, including the resulting status where the
  action sets one, plus attribute badges).
- Search filters available on this tab: Type (Reactive/Planned), Status,
  Action group, PPM/Non PPM, Mobile/Non mobile, Live/Archived (default
  "Live actions"). A **FIND/REPLACE** button exists — never used.

Format below: `CODE. Name → resulting status  [badges]`. Where no “→”, the
group view showed no resulting status for that action (meaning currently
UNKNOWN: could be "stays in status", "user selects", or "no status change" —
to be resolved from the action edit screens / Action map).

## Not allocated (5)

- G002. Permit to work request
- RH03b. Quote Ordered → With Contractor - R
- T09. AFP approved
- T06. On hold
- LM01. Stock request [Mobile]

## New PPM (7)

- G001. Add a note, photo or document [Mobile]
- G003. Cancel job → Cancelled
- PH01. New PPM → New PPM [PPM only]
- PH02. Assign to maintenance team → With Maintenance Team [PPM only]
- PH03. Assign to contractor → With Contractor [Supplier assignment; PPM only]
- PH04. Place on hold [PPM only]
- PH02a. Bulk assign to team → With Maintenance Team [PPM only]

## With Helpdesk (8)

- G001. Add a note, photo or document [Mobile]
- RH01. New Reactive Task → With Helpdesk [Non-PPM only]
- G003. Cancel job → Cancelled
- RH04. Assign to contractor → With Contractor - R [Supplier assignment; Non-PPM only]
- RH02. Assign to Maintenance team → With Maintenance Team - R [Non-PPM only]
- PH05. Take off hold [PPM only]
- RH06. Quote Request → Quote Requested - R [Non-PPM only]
- RH07. Amend SLA

## With Maintenance Team (24)

- G001. Add a note, photo or document [Mobile]
- G003. Cancel job → Cancelled
- GM04. Start job [Mobile; Start clock]
- GM01. Accept job [Mobile]
- GM05. Place Job on hold [Mobile; Stop clock]
- GM06. Take off hold [Mobile; Start clock]
- PH03. Assign to contractor → With Contractor [Supplier assignment; PPM only]
- PH04. Place on hold [PPM only]
- PH05. Take off hold [PPM only]
- PH06. PPM complete → PPM Complete [PPM only]
- PH07. PPM Complete - with remedials → PPM Complete [PPM only]
- PM01. PPM complete → PPM Complete [Mobile; PPM only; Stop clock]
- PM02. PPM Complete - with Remedials → PPM Complete [Mobile; Single operative; PPM only; Stop clock]
- RH06. Quote Request → Quote Requested - R [Non-PPM only]
- T05. In progress
- PH02b. Assign operative → With Maintenance Team [Resource assignment; PPM only]
- GM02. Start Travel [Mobile; Start clock]
- GM03. Stop Travel [Mobile; Stop clock]
- LM03. Assign/Change Lead [Mobile; Non-PPM only]
- LM04. Request assistance [Mobile]
- LM02. Consumable order [Mobile]
- G005. Stock request [Mobile]
- GM07. Complete Time on job [Mobile]
- G006. Consumable order

## With Maintenance Team - R (24)

- G001. Add a note, photo or document [Mobile]
- RM01. Work Complete - no further work required → Work Complete - R [Mobile; Non-PPM only; Stop clock]
- G003. Cancel job → Cancelled
- RH04. Assign to contractor → With Contractor - R [Supplier assignment; Non-PPM only]
- GM04. Start job [Mobile; Start clock]
- GM01. Accept job [Mobile]
- RH08. Place On Hold [Non-PPM only]
- GM05. Place Job on hold [Mobile; Stop clock]
- GM06. Take off hold [Mobile; Start clock]
- RM02. Work Complete - Follow up → Work Complete - R [Mobile; Non-PPM only; Stop clock]
- RH10. Work Complete → Work Complete - R [Non-PPM only]
- RH11. Work Complete - Follow up → Work Complete - R [Non-PPM only]
- RH03. Assign Operative → With Maintenance Team - R [Resource assignment; Non-PPM only]
- T05. In progress
- GM02. Start Travel [Mobile; Start clock]
- GM03. Stop Travel [Mobile; Stop clock]
- LM03. Assign/Change Lead [Mobile; Non-PPM only]
- LM04. Request assistance [Mobile]
- LM02. Consumable order [Mobile]
- G005. Stock request [Mobile]
- GM07. Complete Time on job [Mobile]
- G006. Consumable order
- RH07. Amend SLA
- LM05. Assign to Contractor → With Contractor - R [Mobile : Orchestrate only; Supplier assignment; Non-PPM only]

## Awaiting Order Approval - R (1)

- RH05. Approve Order → With Contractor - R [Non-PPM only]

## With Contractor - R (13)

- G001. Add a note, photo or document [Mobile]
- G003. Cancel job → Cancelled
- RH04. Assign to contractor → With Contractor - R [Supplier assignment; Non-PPM only]
- RH08. Place On Hold [Non-PPM only]
- RH09. Take off hold [Non-PPM only]
- RH10. Work Complete → Work Complete - R [Non-PPM only]
- RH11. Work Complete - Follow up → Work Complete - R [Non-PPM only]
- T02. Accepted
- T04. Appointment Made/Operative Assigned
- T03. Rejected → With Helpdesk
- T05. In progress
- T07. Cost uplift request → Business Case - R
- RH07. Amend SLA

## With Contractor (9)

- G001. Add a note, photo or document [Mobile]
- G003. Cancel job → Cancelled
- PH03. Assign to contractor → With Contractor [Supplier assignment; PPM only]
- PH04. Place on hold [PPM only]
- PH05. Take off hold [PPM only]
- PH06. PPM complete → PPM Complete [PPM only]
- PH07. PPM Complete - with remedials → PPM Complete [PPM only]
- T04. Appointment Made/Operative Assigned
- T05. In progress

## Quote Requested - R (0)

*(no actions listed)*

## Business Case - R (0)

*(no actions listed)*

## PPM Complete (2)

- G004. Close job → Closed
- G001. Add a note, photo or document [Mobile]

## Work Complete - R (3)

- G004. Close job → Closed
- G001. Add a note, photo or document [Mobile]
- T07. Cost uplift request → Business Case - R

## Closed (1)

- G001. Add a note, photo or document [Mobile]

## Cancelled (1)

- G001. Add a note, photo or document [Mobile]

## Observations

- Group headings match the Statuses tab except: **"Not allocated" appears
  (actions not available from any status?) and "With AMO" is absent.**
  (VERIFIED — OBSERVED for the headings; interpretation of "Not allocated"
  is INFERRED — registered as U-004.)
- Badge vocabulary observed: Mobile, "Mobile : Orchestrate only",
  Start clock, Stop clock, PPM only, Non-PPM only, Supplier assignment,
  Resource assignment, Single operative.
- Action code prefixes (INFERRED naming convention): G* general, GM* general
  mobile, LM* lead mobile, PH* planned helpdesk, PM* planned mobile,
  RH* reactive helpdesk, RM* reactive mobile, T* tag/auto. Matches the 8
  Action groups (E-002) — unproven; verify per-action.
- Statuses "Quote Requested - R" and "Business Case - R" have **no**
  available actions in this view — how jobs leave them is UNKNOWN (U-005;
  possibly via Quote actions / timers / auto actions).
