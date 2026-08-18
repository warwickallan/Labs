# E-022 — Per-status record values: the complete status flag matrix

- Captured: 2026-08-19. All 13 Vanilla status records opened in Edit view
  (read-only, cancelled unsaved). "With AMO" excluded as always.
- Confidence: VERIFIED — OBSERVED (structural). Non-default values only;
  everything unlisted is unticked/blank/0.

## The mobile-visibility answer (Warwick's question)

**"Will jobs in this status appear on the mobile app" is TRUE for exactly
two statuses: With Maintenance Team and With Maintenance Team - R.**
All eleven others are FALSE. → Orchestrate's job download set = the two
maintenance-team working statuses, one per Helpdesk Type — completing the
two-flag mobile model (action `is_handheld` × status `is_operative_status`).

## Full matrix (non-default values per record)

| Status | Type | Sort | Mobile app | Other flags set |
| --- | --- | --- | --- | --- |
| New PPM | Planned | 10 | — | *(nothing else)* |
| With Helpdesk | Reactive | 10 | — | Default status ✓ · workforce page ✓ · raise-order button ✓ |
| With Maintenance Team | Planned | 20 | **✓** | raise-order button ✓ |
| With Maintenance Team - R | Reactive | 20 | **✓** | workforce page ✓ · **locked (no invoices/orders) ✓** · client dashboard buttons ✓ · *(raise-order button NOT set)* |
| Awaiting Order Approval - R | Reactive | 25 | — | cannot have application ✓ · locked ✓ · **"if an order is raised above approval level, the job will [move here]" ✓** |
| With Contractor | Planned | 30 | — | raise-order button ✓ |
| With Contractor - R | Reactive | 30 | — | workforce page ✓ · raise-order button ✓ |
| Quote Requested - R | Reactive | 55 | — | raise-order button ✓ |
| Business Case - R | Reactive | 56 | — | *(nothing else)* |
| PPM Complete | Planned | 60 | — | raise-order button ✓ |
| Work Complete - R | Reactive | 60 | — | **work complete/complete-on-site ✓** · timesheet ✓ · raise-order button ✓ |
| Closed | Reactive+Planned | 70 | — | **sets jobs to closed ✓** · raise-order button ✓ |
| Cancelled | Reactive+Planned | 110 | — | **represents cancelled tickets ✓ · orders-cancelled move jobs here ✓** · workforce page ✓ · cannot have application ✓ · raise-order button ✓ |

## New structural findings

1. **OD-001 driver CONFIRMED:** the row-menu "Raise order" presence matches
   `show_add_order_button` exactly — set on WH/WC-R/etc., NOT set on
   WMT-R (and New PPM, Business Case - R). OD-001 upgraded from candidate
   to confirmed structural mapping.
2. **How jobs enter Awaiting Order Approval - R:** the status's own
   `unapproved_orders` flag — an order raised above the approval level
   moves the job here (plus RH05 exits it on approval). Another
   cross-engine path invisible to the Action map.
3. WMT-R is **locked** (no invoices/orders raised while with the team) —
   commercial guard on the working status.
4. Work Complete - R carries the work-complete flag and adds jobs to the
   timesheet; Closed alone carries the closed flag; Cancelled is the
   cancelled-ticket state and the destination when orders are cancelled
   (`is_cancelled_order`).
5. Type attribution per record matches the frozen model exactly
   (Closed/Cancelled ticked for both types).
6. No status sets expiry (`target_days`=0 everywhere) and none carries
   security-role ticks — consistent with the empty automation layer.
