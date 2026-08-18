# E-014 — Add-form inventories batch 2; GM05 Edit view; conditional-UI finding

- Captured: 2026-08-18. All forms opened blank (Add) or unsaved (Edit) and
  **cancelled/discarded without saving**. Session ended in a server-side
  logout while the GM05 form was open unsaved — the logout discards
  unsaved form state, so nothing persisted.
- Confidence: VERIFIED — OBSERVED unless marked.

## Helpdesk job type (Add) — 57 controls

Type* · Estimate required · Goods-schedule selection · Default type ·
Suppress · Is standard helpdesk job · Show on Helpdesk Mobile app ·
Default for remedial items + remedial job-number prefix · **Default action
when a user enters a request** (select, all 51 actions) · **FixMy entry
action** (select) + FixMy manager (user picker) · Tab order* · Contract
task order created · Show PPM start date · **Audit frequency (every n
closed jobs)** · Allow tenant/contact selection · **Job-number prefix
override** · External-helpdesk availability · Department in user list ·
Hide 'Add new record' button · Button text* ("Add a new record") · Print
button text* · Site-home icon (Person/Shopping cart) ·
**Per-status checkboxes (all 13 statuses, GUID ids) — the Type→Status
binding** · **Default status** (select of all 13) · Site scoping (ids or
region select: "LUT - Site specific - Region", "North West") · Helpdesk
role checkbox · **Operative-role checkboxes** (project-style roles with
GUIDs: Executive Sponsor, Maintenance Operative (Standard), Project Board,
Project Manager, Role Default, Senior Responsible Owner (SRO), Senior
Supplier, Senior User, Works Manager) · **Response-category checkboxes**
(the 6 SLA rows, GUIDs harvested) · Report template (select, empty).

Response-category GUIDs: Planned cf848abc-09f0-450c-ba07-dfd1c10dad5? (id
truncated at capture width), By agreement bb6f15fc-…, P1 f9166d52-…, P2
12ef2fa0-…, P3 ddc7f1b2-…, P4 7f593747-… (full values recapturable).

## Status rule (Add) — 5 controls

Rule name* · Status job is in now* (13 statuses) · Status to move job to*
(13) · Only do this if job is assigned to hub* (empty — no hubs in
Vanilla) · Suppress.
→ **Status rules are hub-conditional status remaps, not expiry timers.**
Expiry lives on the Status object (E-013). U-013 fully resolved
structurally.

## Email rule (Add) — 10 controls

Action to trigger alert* (all 51 actions) · Specific response category
(6 SLA rows) · Specific job category (= Call types: Reactive/Planned/
Remedial) · Who raised the job (All / by administrators / online by
customers) · Workspace limit · Role on site to email (blank/Unspecified) ·
Specific user · Send to budget manager · Site scoping · Email subject.
→ Email rules are **action-triggered notifications** with filters.

## Appointment rule (Add) — 5 selects

Helpdesk type · Initial/Resulting helpdesk status (13) · Initial/Resulting
order status (11). → On-appointment status remapping per type.

## Action group (Add) — 3 controls

Group name* · Button display order* (default 1) · Suppress.

## Classification (Add) — 31 controls

Name* · Archive · Sort* · Font Awesome icon · Guidance note · External
helpdesk availability · Hide from FixMy · Show on mobile app · Mandate* ·
Is H&S issue · Marks job 'equipment not working' · **Default Urgency
(select of the 6 Response categories — the classification→SLA wiring that
Vanilla leaves blank, VI-006)** · External page Call Type · Portfolio ·
Asset type (283 options!) + sub type · Helpdesk Process (Green asset/Red
Asset) · AFP must have doc · **Helpdesk Job Type*** (Reactive/Planned) ·
Working pattern ("WORKING PATTERN Default") · Public-page action ·
Budget category (11: CAP/PM/RM/STK codes) · Budget heading (Planned
Maintenance/Reactive Maintenance/Stock) · Responsibility user · Codes 1–3 ·
Order Type (Purchase order/Stock Order) · Average liability* · Planned
hours* · Cascade to child classes.

## Working time (Add) — 10 controls

Title* · Work all day · Start/End time (hh:mm selects; defaults
08:00–18:00) · Start/End day (Mon–Fri defaults) · Out of hours ·
**"Set start and end time for each day" (`is_complex_pattern`)** —
per-day patterns exist.

## GM05. Place Job on hold — Edit view (225 controls; non-default values)

- Group: General Mobile; **Hide this action from the user options = TRUE**
  (the mobile pattern behind the Action map's 26 "suppressed/hidden";
  refines U-008: mobile actions use `hide_from_use`, not `suppress`).
- Available in: With Maintenance Team ✓, With Maintenance Team - R ✓.
- No resulting status; **"Sets the on hold or off hold job status" = "Will
  put the job on hold"**; asks off-hold return date = TRUE; mandatory
  notes = TRUE.
- Mobile: appears on device = TRUE; both web app and Orchestrate;
  operative message = TRUE; hide signature = TRUE; **Pause/restart =
  "Pause job for operative"**; include in app audit trail = TRUE.
- Defaults: timer = **Stop timer on job**; timesheet category Default.
- **Constraints: GM01. Accept job ✓ and GM04. Start job ✓** — constraints
  reference other actions; reading as "prerequisite actions before this one
  is offered" is INFERRED (U-012 semantics still to verify by experiment).
- Form control count differs from RH04 (225 vs 211) — form composition
  varies by action configuration (structural).

## Conditional-UI probe (U-014)

With GM05's Resulting type blank, the resulting-status select offered all
13 statuses; a **client-side change of Resulting type to Planned did NOT
re-filter the list** (and was restored to blank immediately). RH04's form,
whose saved Resulting type is Reactive, offered only the 9 Reactive
statuses + the keep-if-compatible option. → The status list is filtered
**server-side at form render from the saved Resulting type**; no dynamic
client-side dependency was observed. VERIFIED — STRUCTURAL. (Deeper
dependency mapping would require postbacks — deferred.)

## Residual small forms not inventoried (deliberate, low impact)

Roles, Quote action/process/status/request-status, Action route/Override,
Call type, Contact method, Audit status, Complaint status, Root cause,
Email template body editor, and per-record Edit views of non-Action
objects. Recorded as remaining gaps in the completion report.
