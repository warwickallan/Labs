# EO-003 — Orders Admin: crawl completion (all 32 tabs visited)

- Captured: 2026-08-19, read-only. Confidence: VERIFIED — OBSERVED.

## Populated tabs (7)

Status (11) · Priority (7) · Order types (2) · Budget categories (11) ·
Supplier actions (13) — all in EO-001/EO-002 — plus:

- **Invoice types (1):** "Cash purchases" (columns: Invoice type ·
  Excluded from interface · Default — no flags set).
- **Hazards (3):** field list "Hazards", "Persons at Risk", "Risk level"
  (a permit/hazard field-set surface).

## Empty tabs (25) — schema columns recorded

Terms (Order terms) · Teams (Order team) · Fees (Fee name/Number of fee
scales) · Fee rules matrix (Fee/Buyback/Budget Category) · Basis of
estimate · Standard phrases (Order phrase) · Discounts (Supplier/Discount)
· Custom fields · **Approval escalation** (Person raising order · approvers
1–4 · optional AFP approvers ×3 · Category of order · Budget heading —
the order/AFP approval chain surface, EMPTY in Vanilla) · Cancellation
reasons · Internal codes (Project ref/Project/Code/Internal) ·
Application approval rules (Rule/Supplier) · Customers (Code/Customer) ·
Sales nominals (Purchase/Income/Fee/Department codes) · Sales departments ·
Supplier groups · **Order approval workflow** (Order type/Workspace/Site —
EMPTY) · Invoice rules · Cost code validation CVRs (6-part ranges) ·
Cost code validation parts · Agency · Site Code · Invoice addresses ·
**PPM Supplier Review Actions** (Action · Resulting supplier review status
· Resulting order status · Resulting PPM status · remedials availability ·
review visibility · Copy certs to PPM · notes/documents — a PPM-review
action engine, EMPTY in Vanilla; PPM-source reference recorded, no PPM
crawl performed) · Project order outcomes.

**Pattern repeat:** as with Helpdesk, every rules/approval/fee surface is
EMPTY in Vanilla; the shipped configuration is exactly the five families
plus two reference stubs. Order approvals therefore run on defaults (the
approval-level mechanism referenced by Awaiting Order Approval - R's
unapproved-orders flag is presumably a system/site-level value — its
source was NOT found in Orders Admin; recorded as unknown UO-001).
