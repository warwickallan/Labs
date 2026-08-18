# E-012 — Remaining admin tabs: reference data and empties (crawl completion)

- Captured: 2026-08-18 via per-tab list views (read-only), unfiltered.
- Confidence: VERIFIED — OBSERVED.
- With E-002/E-003/E-004/E-005/E-006/E-010/E-011 this completes a list-level
  visit of **all 43 Helpdesk admin tabs**.

## Populated tabs

| Tab | Count | Records / notes |
| --- | --- | --- |
| Audit status | 5 | Audit pending (default) · No audit feasible/required · Audit in progress · Pass · Fail |
| Call types | 3 | Reactive (default) · Remedial · Planned (cols: category/Suppress/Default) |
| Contact methods | 5 | In person · Self service · Email · Telephone (default) · Remedial Action |
| Classifications | 16 | All Helpdesk type = Reactive; Urgency blank on every row; Mandate/Average £0.00; Planned hours 0. (Alarms, Boilers, Building Fabric, Car Park, Electrical, External structures, Fire Extinguishers, Fire Systems, Lifts, Lighting Systems, Main Supply, Meters, Plumbing, Pool Plant, Security Systems, Ventilation) |
| Complaint status | 2 | New complaint (default) · Closed (closed-flag) |
| Email templates | 5 | Originator: new request / progress / completes · Quote declined · Quote submitted (all Subject blank in list) |
| Operatives and sites | 4 | 06. Supplier (0 sites) · 03.Operative (Electrician) (1 site) · Warwick Allan (0) · Andrew Austerberry (0) |
| Response categories | 6 | **The SLA table** — P1: 2h response/1d repair · P2: 24h/3d · P3: 48h/5d · P4: 72h/7d · Planned: 0/0 · By agreement: 0/0. All on "Standard hours" working pattern. **No row is flagged Default.** |
| Root causes | 20 | 15 captured (pagination): Electrical Defect, Accidental Damage, Storm Damage, Mechanical Failure, Life Expired Asset, Loss of Power, Aborted Call, PPM - Remedial, Mechanical Defect, Vandalism, Fire Safety, Cancelled by User at Source, Safety, No Fault Found, Building Defect (+5 unpaged) |
| Satisfaction surveys | 1 | Type Reactive → questionnaire "Satisfaction Survey" |
| Tags | 20 | Typed **Helpdesk/Order/QuoteRequest**: 01. Awaiting acceptance · 01. Team assigned · 02. Job accepted · 02. Supplier rejected · 03. Appointment made/Operative assigned · 03. Engineer assigned · 04. In progress · 05. On hold · 06. Cost uplift awaiting approval · 07. Follow up required/Remedials · 08. Awaiting AFP/invoicing · 09. AFP approved · Parts/Stock required · Travelling (Helpdesk); CU01/CU02 cost uplift (Order); Q1–Q4 (QuoteRequest) |

## Empty tabs (columns as shown)

| Tab | Columns |
| --- | --- |
| Approvers | Name · Nr sites |
| Areas | Area |
| Assignees | Name · Nr sites |
| Audit bandings | From · To · Percentage to audit |
| CAPEX codes | Name · Code |
| Email rules | Workspace · Action · Response category · Job Category · Person to email · Trading status · Role to email · Send to budget manager · Email subject |
| FM task types | Task type · Response category · Suppress |
| Hubs | Name |
| Non working days | Date |
| Notes/Warnings | Site · Notes |
| SLA fail reasons | SLA fail reason · Archive |
| Short titles | Helpdesk short title |
| Trading affected | Description |

## Observations

- The **tag names mirror the order statuses and T-action names** (Awaiting
  acceptance, Appointment made/Operative assigned, In progress, On hold,
  AFP approved…): three coordinated vocabularies — order statuses (E-009),
  tags, and T Tag/Auto actions — evidently implement the contractor loop.
  Structural correlation only; runtime unproven.
- Duplicate tag numbering exists (two "01.", two "02.", two "03." tags) —
  the pairs serve contractor (supplier) vs maintenance-team (operative)
  flows by name; noted as a potential confusion source, not a defect.
- **No default Response category** — every other status-like table has a
  default flag set somewhere; the SLA table does not (VI-005).
- FM task types empty but its columns reference Response category —
  a type→SLA mapping surface that Vanilla leaves unwired (VI-006).
