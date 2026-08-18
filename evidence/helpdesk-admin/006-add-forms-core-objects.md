# E-013 — Blank Add-form inventories: Status, Operative status, Tag, Response category

- Captured: 2026-08-18. Each Add/New form opened, inventoried, **Cancelled
  without saving**. `*` = required marker on label. Defaults are the blank
  form's initial values (= system defaults for new records).
- Confidence: VERIFIED — OBSERVED (structure/defaults). Runtime unproven.

## Status (Add) — 51 controls (`pbl_form_*`)

- Status* (text) · Status colour* (select: Transparent[default], Red,
  Orange, Light Yellow, Light Green, Light Blue, Gray, Green, Blue)
- Behaviour flags (all default false unless noted): Sets jobs to closed
  (`status_complete`) · Sets jobs to work complete/complete on site
  (`is_work_complete`) · Allow projects selected at this stage · Orders
  cancelled move jobs to this stage (`is_cancelled_order`) · Represents
  cancelled tickets (`is_cancelled`) · Appears on mobile app
  (`is_operative_status`) · Display on workforce page · Appears on external
  helpdesk · Hide tab from 'Helpdesk customer' role · Ready for
  invoice/application · Show application certificate status · Cannot have
  application raised · Commercial application issued · Operationally
  complete · Bulk update allowed (`is_bulk`) · Locked (no invoices/orders)
  · Added to timesheet · Requires rating · Unapproved orders hold job ·
  Show in client dashboard buttons · Show in overdue activity search ·
  Customer invoice issued · Can be recalled · Show original target dates ·
  **Show raise-order button (default TRUE)** · Default status · Suppress ·
- Sort order* (text, 0) · FiXMy message (textarea) ·
- **Expiry mechanism (answers U-013):** "Number of days allowed in this
  status (leave as 0 to allow s…)" (`target_days`, number, 0) + "Action to
  be performed if target date is missed" (`status_expiry_action_id`,
  select, 51 options = blank + all 50 actions).
- Show in resource planner · External label ·
- **Type applicability: Reactive / Planned checkboxes** (multi-select —
  explains Closed/Cancelled being shared: both ticked on those records).
- **Per-security-role checkboxes** (the 14 roles) — per-status role
  visibility/restriction (semantics unproven).

## Operative status (Add) — 4 controls

Status name* · Colour* (13-colour vocabulary, default Red: Red, Dark red,
Amber, Yellow, Green, Light green, Gray, Blue, Dark blue, Purple, Dark
gray/black, Pink, Brown) · Show jobs with this status on device (**default
TRUE**) · Archive.
→ **No Type field exists — operative statuses are structurally
type-agnostic. U-003 RESOLVED (genuinely shared).** No default flag either.

## Tag (Add) — 7 controls

Type* (select: Helpdesk / Order / Quote request) · Name* · Colour* (same
13-colour vocabulary, default Red) · Hide the tag on entry of job or quote
· Suppress · Is out of hours · **"Matching phrase in description of new job
will assign this tag" (`TextMatch`, text)** — description-text
auto-tagging exists as a capability (unused by the 20 Vanilla tags so far
as list view shows; per-record check pending).

## Response category (Add) — 31 controls

Response category* · External label · Description · Response required
description · Target dates entered manually · Type of response period
(select: "Specifiy hours and days" [sic, product typo] / End of month) ·
Initial response days*/hours* + fixed time hh:mm selects · Permanent repair
days*/hours* + fixed time hh:mm · Display order* · Suppress · Default
record · **Is used for external users (default TRUE)** · Allow selection
when raising a quote job · Working hours* (select: blank / Standard hours)
· **Allow target out of hours (default TRUE)** · **Default job to
retrospective (`is_force_retro`, default TRUE)** · **Adjust target if
arrival earlier (default TRUE)** · Different completion working hours
(`set_clock`) · Status colour (blank/Blue/Green/Orange/Red/Yellow) ·
Optional workspace · Supplier (per-supplier SLA override) · Prevent
non-admin job save · Warning message for non-admins · **Type applicability:
Reactive / Planned checkboxes**.

## Cross-object patterns emerging

- Type applicability is a per-record multi-checkbox (Status, Response
  category) or a single required select (Tag: Helpdesk/Order/QuoteRequest
  domain rather than helpdesk type).
- Two distinct colour vocabularies: job-status colours (9, incl.
  Transparent) vs operative-status/tag colours (13).
- Required fields are marked `*` on labels.
- The colour select defaulting to "Red" (tags/op-statuses) and several
  behavioural defaults (retro TRUE etc.) are the create-time defaults a
  rebuild must replicate.
