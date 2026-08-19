# Vanilla Orders — Discovery Report (structural)

**Captured 2026-08-19** from `content/order_admin.aspx` (evidence
EO-001..EO-003 in `evidence/orders-admin/`); machine-readable:
[`model/VANILLA-ORDERS.json`](../model/VANILLA-ORDERS.json); Helpdesk↔Orders
edges: [`model/CROSS-DOMAIN-RELATIONSHIPS.json`](../model/CROSS-DOMAIN-RELATIONSHIPS.json).
Read-only throughout; nothing persisted.

## Inventory

**32 tabs; 7 populated, 25 empty.** Populated: Order Status (11, all
records read: codes, semantic flags, device/portal visibility,
AFP/invoice gates), Priority (7, incl. duplicate-'Default' anomaly
VO-001; only P1 carries deadlines), Order Types (2: Purchase order
default; Stock Order with budget+project bindings), Budget Categories
(11: CAP/PM/RM/STK with nominal codes; RM (MECH) default; lumpsum on
PM/RM only), **Supplier Actions (13, all records read — the cross-domain
engine)**, Invoice types (1 stub), Hazards (3 field names). Every
fee/approval/rule/nominal surface ships EMPTY — the Vanilla pattern from
Helpdesk repeats.

## The supplier lifecycle (structural)

Awaiting acceptance (default) → SP01 Accept (→T02) / SP02 Reject
(→Cancelled, fires T03) → SP03 Appointment (→AMO, fires T04) → SP04 Start
(→In progress, fires T05) ⇄ SP05 Hold (→On hold, fires T06) / SP06 Return
visit → SP07 completions (→Work complete; fire RH10/RH11/PH06/PH07;
Complete&Quote enters the quote engine) → BC01 Cost uplift (fires T07).
Constraint chains (SP06 needs SP04+SP05; completions need SP04) mirror the
mobile GM pattern. **Every T-action trigger source is now structurally
resolved.**

## Unknowns / issues

- VO-001 duplicate 'Default' priority records (one empty).
- UO-001 order approval-level source not in Orders Admin (feeds
  Awaiting Order Approval - R via the status unapproved-orders flag).
- UO-002 SP02 availability/show-before-accepted contradiction.
- PPM references recorded (PPM visit statuses, PPM Supplier Review
  Actions schema, statutory scoping) — **no PPM crawl performed**.

## Gates

Order Status / Priority / Order Types / Budget Categories / Supplier
Actions: **SCHEMA + VANILLA VALUES COMPLETE** (Budget Category schema
completed in EO-006). Behaviour: NOT verified
(E2). Supplier-portal operational surface: not yet discovered — proposed
next programme below.

## Update (2026-08-19, post-report)

Supplier Portal operational discovery IS COMPLETE (EO-005): order ref =
parent job ref + "/n"; portal rendering formula validated on order
00000040/1; VI-009 (broken acceptance loop) found and precisely diagnosed
(SP01/ORC10 portal visibility; SP02 portal visibility + availability).
ALL 32 Orders Add-form schemas captured (EO-006), including Budget
Category (13 controls, CIS pairing). Gates: all five priority families
SCHEMA + VALUE complete.

## Proposed next programme (historical wording below; portal discovery is done)

1. **Supplier Helpdesk operational discovery** (read-only): supplier
   portal (`supplier_portal.aspx`) + contractor app surfaces as the
   operational projection of Supplier Actions — same method as the
   Helpdesk runtime discovery (E-019..E-021).
2. **E2 (contractor/order/tag engine)** — now fully specified: ZZ TEST
   supplier; drive SP01→SP03→SP04→SP07 from the portal; verify each fired
   Helpdesk action, tag moves, and the G003/T03 arbitration.
