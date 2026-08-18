# E-003 — Statuses tab: full job-status inventory with Type attribution

- Captured: 2026-08-18, Helpdesk admin → Statuses tab.
- Method: DOM table extraction (JS inspection); Type attribution by running
  the page's own Type search filter (Reactive, then Planned) — read-only
  queries, no records touched.
- Confidence: VERIFIED — OBSERVED for names/flags/sort; VERIFIED — STRUCTURAL
  for Type attribution (derived from the page's own filter results).

## Unfiltered (14 records) — columns: Status / Default / Sort / Complete

| Status | Default | Sort | Complete |
| --- | --- | --- | --- |
| With AMO | | 0 | |
| New PPM | | 10 | |
| With Helpdesk | ✔ (STATUS_DEFAULT icon) | 10 | |
| With Maintenance Team | | 20 | |
| With Maintenance Team - R | | 20 | |
| Awaiting Order Approval - R | | 25 | |
| With Contractor | | 30 | |
| With Contractor - R | | 30 | |
| Quote Requested - R | | 55 | |
| Business Case - R | | 56 | |
| PPM Complete | | 60 | |
| Work Complete - R | | 60 | |
| Closed | | 70 | ✔ (STATUS_COMPLETE icon) |
| Cancelled | | 110 | |

## Type = Reactive (9 records)

With Helpdesk (default) · With Maintenance Team - R · Awaiting Order
Approval - R · With Contractor - R · Quote Requested - R · Business Case - R ·
Work Complete - R · Closed (complete) · Cancelled

## Type = Planned (6 records)

New PPM · With Maintenance Team · With Contractor · PPM Complete ·
Closed (complete) · Cancelled

## Derived set arithmetic (VERIFIED — STRUCTURAL)

- Reactive-only (7): With Helpdesk, With Maintenance Team - R, Awaiting
  Order Approval - R, With Contractor - R, Quote Requested - R,
  Business Case - R, Work Complete - R.
- Planned-only (4): New PPM, With Maintenance Team, With Contractor,
  PPM Complete.
- **Shared across both types (2): Closed, Cancelled** — single records
  matching both Type filters (9 + 6 = 15 hits over 14 records).
- **Matching neither filter (1): With AMO** — appears unfiltered only.
  → UNKNOWN; registered as U-001.

## Notes

- The "- R" suffix on Reactive-specific statuses is a naming convention in
  this tenant's data, not proven system behaviour (INFERRED).
- Only "Closed" carries the Complete flag; "Cancelled" does not — question
  for later: how cancelled jobs terminate (U-002).
- Internal identifiers, descriptions, colours, timers and restrictions are
  not visible in the list view; requires per-status edit-screen inspection.
