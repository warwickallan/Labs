# EO-001 — Orders Admin: Order Status (complete: list + all 11 records)

- Captured: 2026-08-19, `content/order_admin.aspx` → Status tab (default).
  Read-only; forms cancelled. Confidence: VERIFIED — OBSERVED.
- Orders Admin has **32 tabs** (list in EO-000 section of the discovery
  report); toolbar Add new / Delete selected (untouched).

## All 11 Vanilla Order Statuses (record-level values)

| Status | Code | Colour | Sort | Semantic flag | Device | Other flags |
| --- | --- | --- | --- | --- | --- | --- |
| Awaiting acceptance | AWA | Amber | 10 | **Default** | — | prevent application ✓; hub dashboard ✓ |
| Accepted | — | Dark blue | 20 | — | — | prevent application+invoices ✓ |
| Appointment Made/Operative Assigned | AMO | Light green | 30 | — | ✓ mobile | prevent application+invoices ✓; contractor view ✓ |
| In progress | IPR | Green | 40 | **In-progress status** | ✓ mobile | goods-received page ✓; prevent application+invoices ✓; **restricted to operatives and suppliers** ✓; contractor view ✓ |
| On hold | — | Dark red | 50 | **On-hold status** | ✓ mobile | prevent application+invoices ✓; contractor view ✓ |
| Pending quote | PQU | Purple | 60 | **Quote-pending status** | — | prevent application+invoices ✓ |
| Work complete | WCO | Green | 70 | **Complete on site/Goods received** | — | **restricted to operatives and suppliers** ✓; remedials prompt action "Complete work" |
| Complete - awaiting certificate | CAC | Yellow | 80 | **Complete on site/Goods received** | — | |
| In review | IRE | Dark red | 90 | — | — | prevent application ✓ |
| Closed | CLO | Dark gray/black | 100 | **Complete status** | — | |
| Cancelled | CXL | Dark gray/black | 110 | **Cancelled status** | — | |

All 11: "Include on Hub dashboard" ✓. **No status carries Final AFP**
(column exists, all blank). Prevent-AFP = "Prevent application" flag.

## Semantics established (structural)

- Terminal states: Closed (complete flag) and Cancelled (cancelled flag);
  Work complete / CAC are the site-completion pair (goods-received).
- Device (Orchestrate) order statuses: AMO, In progress, On hold — the
  supplier/operative working set; In progress + Work complete are
  additionally **restricted to operatives and suppliers** (helpdesk-side
  users presumably cannot set them directly — POSSIBLE ROLE FILTER).
- AFP/invoice gating is per-status (prevent application / prevent
  invoices) — the commercial pipeline only opens at completion statuses.
- "Orders in this status will appear in the contractor view" = supplier
  portal visibility flag (AMO/IPR/On hold).

## Cross-domain reconciliation (Orders side of known Helpdesk edges)

The trigger statuses named by Helpdesk actions (E-015) are all here:
Awaiting acceptance (→RH04 loop start, DEFAULT order status — a new order
is born awaiting acceptance), Accepted (→T02), Appointment Made (→T04),
Cancelled (→G003), Closed (→G004). Recorded as edges in
model/CROSS-DOMAIN-RELATIONSHIPS.json.
