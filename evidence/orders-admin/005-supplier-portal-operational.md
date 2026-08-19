# EO-005 — Supplier Portal operational surface (read-only; no action executed)

- Captured: 2026-08-19, `content/supplier_portal.aspx`, session org
  "A Supplier LTD". Layer: OPERATIONAL PRESENTATION TRUTH.

## Landing (supplier dashboard)

Summary tiles: PPM/FM activities (1 overdue · 1 within 2 weeks · 3 within
3 months) · Orders and invoices (13 live · 0 quote requests awaiting
submission · £250.00 unpaid invoice value · 0 certificates awaiting
invoice). Sections: **Orders (13) · Invoices (1) · Messages from client**.

## THE IDENTITY LINK (Warwick's steer)

**Order number = `<parent Helpdesk job ref>/<sequence>`.** Job 00000040
(With Contractor - R, from our E1-era data) IS order 00000040/1 here; PPM
jobs 46/29 (With Contractor) are orders 46/1, 29/1. The grid shows
**Parent job status** and **Parent job type** columns, and the search
filters expose ALL 13 Helpdesk statuses + both types to the supplier —
the portal is the supplier-side projection of the same jobs. Recorded as
cross-domain edge X-018.

## List surface

Status tabs: All live orders 3 · **Waiting to be acknowledged by you 2** ·
Complete on site 8 · Complete orders · Cancelled orders · All orders 13.
Filters: works-order type (All/Planned/Reactive/**Remedial**) · order
status · application status (made/none/disputed) · parent job status ·
parent job type · order number · date + target-response ranges. Columns:
Order number · Description (site/block/project/activity + asbestos
warning) · Order date · Order Priority · Response and Completion
required/actual · Status · Parent job status · Application · Invoiced ·
Bus. case · Operative(s) · Appointment. Colour KEY: Unapproved/Approved/
Cancelled/Complete-on-site/Closed/Queried/Applied-for-payment.

Row Options menu (utility only): Audit trail/detail · Notes and messages ·
Remedials · Print order · **Add an invoice** · Attachments. No SP-actions
at row level.

## Order detail surface

Header: order number/date/current status/location(+More detail)/block/
priority/date acknowledged/response+completion required/classification/
**asbestos banner**/activity name with **Statutory** badge (order 46/1 =
"Thermostatic Mixing Valve (TMV) Functional Test : May"). Sections: Notes
and Activities · Associated Equipment/Assets · Invoices and Applications ·
Guidance. Reactive order 40/1 additionally: originator + email,
**Appointments block** (window + operative avatar).

## The supplier ACTION surface = toolbar ACTIONS dropdown

- Order 00000040/1 (**Appointment Made/Operative Assigned**): ACTIONS =
  **SP05. Place on hold · SP07. Complete & Quote · SP07. Work complete**
  (+ the ever-present Add an invoice at row level). Exactly matches
  configuration: available-in-AMO ∩ portal-visible (SP03 absent — only
  available in Accepted; SP04/SP06 absent — contractor-app-only).
  **Rendering formula validated on the Orders side.**
- Order 00000046/1 (**Awaiting acceptance**, Planned/statutory): ACTIONS =
  **"Add an invoice" ONLY — no Accept, no Reject, no Acknowledge.**

## VO-002 — THE BROKEN ACCEPTANCE LOOP [CONFIGURATION DEFECT — structural]

SP01 Accept job and SP02 Reject job carry the special role flags ("Is this
the supplier portal accept/acknowledge action" / "…reject action") and
show-before-acceptance, **but neither has "Show this action on the
supplier portal" set** (EO-002 record reads; ORC10 Acknowledge likewise).
Operational consequence observed: an Awaiting-acceptance order offers NO
acceptance action; orders 46/1 and 29/1 have sat in Awaiting acceptance
since May; the "Waiting to be acknowledged by you (2)" tab has no
acknowledge affordance. **Warwick confirmed this matches his experience
("I can never get this to work myself").** This is the Vanilla defect
blocking the supplier loop — and it is precisely what experiment E2 would
have hit. Suggested correction (NOT applied): tick portal visibility on
SP01/SP02 (and ORC10) or use disposable ZZ copies during E2.
