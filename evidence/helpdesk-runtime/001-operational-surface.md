# E-019 — Operational Helpdesk surface: landing, Reactive/Planned, filters, columns

- Captured: 2026-08-19, `content/helpdesk2.aspx`, read-only (job counts
  verified identical before/after the whole session: Reactive 16 /
  Planned 19 — nothing persisted).
- Confidence: VERIFIED — OBSERVED. Layer: OPERATIONAL PRESENTATION TRUTH.

## Landing structure

Two Type tabs with counts: **Reactive (16) · Planned (19)** — the two
Helpdesk job types (E-010) are the top-level operational navigation.

**Reactive toolbar:** RAISE JOB · RAISE A NEW QUOTE REQUEST · PRINT
SELECTED JOB TICKETS.
**Planned toolbar:** RAISE A NEW QUOTE REQUEST · PRINT SELECTED JOB
TICKETS · **ACTIONS** (menu contains exactly **PH01. New PPM**) — there is
**no RAISE JOB** on Planned; PH01 via the list toolbar is the manual
Planned creation route (matches PH01 as the type's creation default,
E-010/E-015).

**Status tabs (Reactive):** With Helpdesk 2 · With Maintenance Team - R 2 ·
Awaiting Order Approval - R 0 · With Contractor - R 3 · Quote
Requested - R 0 · Business Case - R 0 · Work Complete - R 5 · Closed 2 ·
Cancelled 0 — plus **All records · Resources · Messages**.
**Status tabs (Planned):** New PPM 3 · With Maintenance Team 3 · With
Contractor 2 · PPM Complete 11 · Closed 0 · Cancelled 0 + same three
extras. → Tab sets exactly match the frozen per-type status model
(Closed/Cancelled shown under both).

## Search panel → configuration-source mapping

| Filter field | Source family (evidence) |
| --- | --- |
| Job reference / description / Short title / Originator / Supplier ref / Order number | free text |
| Allocated to resource team · Team | Workforce teams (Electrical Team, Maintenance Team) — outside Helpdesk admin |
| Allocated to operative | Users/workforce (the Operatives-and-sites people appear) |
| Currently with | user picker |
| **Response time** | **Response categories** — and it is TYPE-FILTERED: Reactive tab lists By agreement + P1–P4; Planned tab lists ONLY "Planned" (validates per-record Type ticks, E-017) |
| Site / Client / Caller-originator | Sites/Clients admin |
| Type of works order | All · Planned · Reactive · **Statutory PPM** — a value with no Helpdesk-admin source (candidate: PPM/scheduler config) — STRUCTURAL CANDIDATE only |
| Contractor | Suppliers |
| **PPM discipline** | Building Fabric · Cleaning · Electrical · Fire · Grounds · Mechanical · Plumbing & Water · Security — vocabulary NOT found in Helpdesk admin (candidate: PPM scheduler/site admin) — UNKNOWN source |
| **Operative status** | the 9 operative statuses (E-004) verbatim |
| Date from/to | dates |
| **Tag** | the 14 Helpdesk-type tags (E-017) — Order/QuoteRequest tags correctly absent |
| **Call type** | Call types (Reactive/Planned/Remedial, E-012) |

## Grid columns (both types)

Ref · UPRN/Name (site : block + classification path, e.g. "Boilers : Gas
Condensing Boiler" — the nested taxonomy operationally) · Raised ·
Originator · Status · Call type · Response Date (Required/Actual) ·
Completion (Required/Actual) · Currently with · Assigned to · **Last
Action** (e.g. "RH01. New Reactive Task").

Observed data point: job 00000051 has NO response/completion dates (raised
without urgency — VI-005/VI-006 consequence visible operationally); job
00000050 has Priority 2 with computed targets (raised Tue 11 Aug 11:56 →
response Fri 14 Aug 08:57 = 24 working hours on Standard hours — the SLA
clock engine visibly at work).
