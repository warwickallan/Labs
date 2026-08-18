# E-002 — Helpdesk admin: parent structure, Helpdesk Types, configuration tabs

- Captured: 2026-08-18 from `content/helpdesk_admin.aspx`.
- Method: accessibility-tree read (text capture).
- Confidence: VERIFIED — OBSERVED unless marked otherwise.

## Helpdesk Types

The page-level Search has a **Type** combobox with exactly these options:

| Option | Value (GUID) |
| --- | --- |
| *(blank / all)* | `00000000-0000-0000-0000-000000000000` (selected by default) |
| Reactive | `ba98cba4-bb06-4347-a70a-86555149cb7c` |
| Planned | `cf54e0a3-359e-4df3-bdfc-e53ba614f441` |

→ The Helpdesk Types that exist are **Reactive** and **Planned** — no others.
(VERIFIED — OBSERVED at the Helpdesk admin level. Whether every tab's records
are partitioned by this Type filter is not yet verified per tab.)

## Configuration tabs (verbatim, in on-screen order — 43 tabs)

Action groups · Actions · Approvers · Areas · Assignees · Audit bandings ·
Audit status · CAPEX codes · Call types · Contact methods · Classifications ·
Complaint status · Email rules · Email templates · FM task types ·
Helpdesk job types · Helpdesk rules · Hubs · Non working days ·
Notes/Warnings · Operatives and sites · Quote actions · Quote categories ·
Quote priorities · Quote processes · Quote roles · Quote rules ·
Quote Request status · Quote status · Response categories · Roles ·
Root causes · SLA fail reasons · Satisfaction surveys · Short titles ·
Status rules · Statuses · Tags · Trading affected · Working time ·
Action routes/Overrides · Appointment rules · Operative statuses

Observations:

- **Statuses**, **Operative statuses**, **Actions**, **Action groups**,
  **Status rules** and **Action routes/Overrides** are separate top-level
  tabs — job statuses and operative statuses are structurally distinct
  concepts in the UI (consistent with the brief's warning).
- Page controls: "Add new", "Delete selected", Search (Type + Data), tab
  strip, paginated table. Add/Delete were NOT used (DISCOVER MODE).

## Action groups tab (default tab) — 8 records

1. Reactive Helpdesk Tasks
2. Planned Helpdesk Tasks
3. General Mobile
4. Lead Mobile
5. Mobile Reactive
6. Mobile Planned
7. General Actions
8. Tag/Auto Actions

(Names only; group membership/purpose not yet inspected — INFERRED that these
group actions for UI/mobile surfaces, unproven.)
