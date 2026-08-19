# EO-006 — Orders Admin: complete Add-form schemas for ALL remaining tabs

- Captured: 2026-08-19 (rotate-correction pass). Every Orders Admin tab
  exposing Add/New opened blank, inventoried, CANCELLED. With EO-004
  (Status 34 / Priority 20 / Order Type 10 / Supplier Action 114) this
  makes **all 32 Orders configurators schema-complete**. Hazards exposes
  no Add form (fixed field-set of 3). Confidence: VERIFIED — OBSERVED.

## Budget Category (13 controls) — closes the Warwick priority-five gap

Name* · Code · Code 2 · **Secondary ledger code** · Default · Suppress ·
**Type [Works / Fees / F&E / Other / Land]** · Workspace · **Category
[Either expenditure or income / Income / Expenditure]** · rate/unit/qty
input · lumpsum input · **Is this a CIS code** · **Non CIS version of this
category** (select of the 11 categories). → CIS pairing + ledger typing
capability, unused in Vanilla.

## Approval/commercial engines (empty in Vanilla, now schema-known)

- **Approval escalation (10):** Order Budget category · Budget heading ·
  user raising · **approver 1* + optional 2nd/3rd/4th** · AFP approver +
  optional 2nd/3rd. → per-person, budget-scoped approval chains.
- **Order approval workflow (4):** Order type* · Workspace · Site ·
  Archive. (Header row per workflow; presumably detail after save —
  residual: unsaved form shows only the header fields.)
- **Application approval rules (1):** Rule* select — exactly two rule
  types: "Applications with automated SOR items only will be auto
  approved" / "Selecting this root cause will cancel the order".
- **Invoice rules (4):** rule type [Auto Certify / Prevent certification]
  · value threshold · CIS check · audit-trail name.
- **PPM Supplier Review Actions (11):** Action* · resulting supplier
  review status [Passed/Pending] · resulting order status (11) · resulting
  PPM action status (8) · availability vs review status · availability vs
  remedials · attach app-created PPM certs · notes/documents · sort ·
  suppress. → a full review-action engine, PPM-facing, empty in Vanilla.

## Reference configurators

Terms (3: name/workspace/suppress) · Teams (4: +code) · Fees (5: +no-fee
flag) · Fee rules matrix (4: Fee*/Buyback*/Budget category*/suppress —
Fee+Buyback selects empty until Fees exist) · Basis of estimate (6: +fixed
quotation, default) · Standard phrases (5: name/text/paste-below/suppress/
workspace) · Invoice types (6: +cost code, excluded-from-interfaces,
default) · Discounts (3: supplier/percent/suppress) · **Custom fields
(9): workspace* · field name · prompt* · mandatory · SHOW ON SUPPLIER
PORTAL FORM · sort · type [Text/Numeric/Date/Memo/Dropdown/Currency/
Heading] · dropdown options · suppress** · Cancellation reasons (2) ·
Internal codes (3: project/code/internal-supplier flag) · Customers (6:
name/code/invoice address/suppress/multi-client per-site invoicing/
material uplift %) · Sales nominals (7: description/code/fee code/income
code/department*/default-for-materials) · Sales departments (3) ·
Supplier groups (3: name/suppliers/suppress) · Agency (1: code) · Site
Code (1: code) · Invoice addresses (6: display name*/line1*/address*/
code/consumable-orders availability/suppress) · Cost code validation CVRs
(12: 6 from/to ranges) · parts (2) · Project order outcomes (2).

## Also closed this pass

Classification **'resource' expander grids: EMPTY in Vanilla** (a
"Resource ADD NEW" child grid with no rows per classification).
