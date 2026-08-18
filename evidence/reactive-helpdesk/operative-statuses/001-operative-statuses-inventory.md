# E-004 — Operative statuses tab: inventory

- Captured: 2026-08-18, Helpdesk admin → Operative statuses tab.
- Method: DOM table extraction; Type filter cross-check (Reactive, Planned).
- Confidence: VERIFIED — OBSERVED for the list; see note on Type behaviour.

## Records (9) — list shows a Name column only

1. Called away
2. Waiting for parts
3. Paused
4. In progress
5. Finished shift (pause)
6. On site
7. On break
8. Travelling
9. Complete

## Type-filter behaviour

The same 9 records are returned unfiltered, with Type=Reactive, and with
Type=Planned. This means either (a) operative statuses are shared across
Helpdesk Types, or (b) the Type filter simply does not apply to this tab.
**The list view cannot distinguish these — UNKNOWN (registered as U-003).**

## Notes

- Job statuses and operative statuses are separate admin tabs with different
  columns (job statuses: Default/Sort/Complete; operative statuses: Name
  only) — structurally distinct concepts. VERIFIED — OBSERVED.
- No default flag, purpose, or mobile relevance visible in the list; needs
  per-record edit-screen inspection.
- Names strongly suggest mobile-operative workflow states (Travelling,
  On site, On break, Finished shift…) — INFERRED only.
