# E-010 — Workflow-related admin tabs: Status rules, Helpdesk rules, Roles, Helpdesk job types, Working time, Appointment rules, Action routes/Overrides

- Captured: 2026-08-18 via the per-tab list views (read-only), unfiltered.
- Confidence: VERIFIED — OBSERVED.

## Status rules — EMPTY

Columns: Name · Hub · Original status · Status to be changed to.
**Zero records in Vanilla.** This is evidently where automatic status
transitions (the map's "auto-fires on status expiry" concept) would be
configured — none exist, consistent with zero auto-fire edges in E-007.

## Helpdesk rules — EMPTY

Columns: Name only. Zero records.

## Roles — 1 record

Columns: Role · Default · Archive. Single record: **Helpdesk role**
(no default flag, not archived; GUID a855dfca-… per E-009). Distinct from
the 14 security roles listed in the action configurator's Roles section.

## Helpdesk job types — 2 records (the Helpdesk Types themselves)

Columns: Helpdesk job type · Default Action when adding new · Suppress ·
Default.

| Type | Default action when adding new | Default |
| --- | --- | --- |
| Reactive | RH01. New Reactive Task | ✔ (default_helpdesk_type) |
| Planned | PH01. New PPM | |

→ **Explains VI-001:** New PPM is reached via PH01 as Planned's job-creation
default — a path the Action map's reachability warning evidently does not
count. VI-001 downgraded from "unreachable" to "unreachable via
status-allocated actions only".

## Working time — 1 record

Columns: Title · Start time · End time · All day · Day from · Day to · Out
of hours. Record: **Standard hours, 08:30–17:30, Monday–Friday**, not
all-day, not out-of-hours.

## Appointment rules — EMPTY

Columns: Helpdesk type · Inital helpdesk status · Resulting helpdesk
status · Inital order status · Resulting order status. ("Inital" spelling
is the product's own.) Zero records.

## Action routes/Overrides — EMPTY

Columns: Resulting action · Type · Priority · Workspace. Zero records.
(Per-action routing also exists inside the action configurator —
`ruletype` "Route when supplier assigned", E-009.)
