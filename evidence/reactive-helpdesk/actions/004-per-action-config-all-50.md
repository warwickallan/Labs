# E-015 — Per-action configuration: all 50 actions read individually (Edit forms, unsaved)

- Captured: 2026-08-18 (second signed-in session). Method: batched
  `form_view` navigation per action GUID; each form read and left unsaved;
  only NON-DEFAULT values recorded (baseline select defaults and the icon
  picker omitted). GUID source: `RenderActionSummaryConst` onclick handlers
  (all 50 name→GUID pairs harvested; RH04/GM05 detail in E-009/E-014).
- Confidence: VERIFIED — OBSERVED (configuration truth; runtime unproven).

Notation: **avail:** statuses ticked as available-in · **→** resulting
status (**⇒type** resulting type) · **user-select:** user-selectable
statuses · **trigger:** order-status/event trigger · flags verbatim-ish.
"(keep)" = "(Keep existing job status if compatible with new type…)".
"hidden" = Hide-from-user-options ✓.

## General Actions

- **G001 Add a note/photo/document** — avail: ALL 10 non-AOA statuses
  (incl. Closed, Cancelled; not Awaiting Order Approval - R, not Quote
  Requested - R/Business Case - R). Mandatory notes; document attachment;
  note in supplier portal; note-count inclusion flag; on mobile.
- **G002 Permit to work request** — avail: NONE ticked (renders as "Any
  status" in map). Is-permit-request. Otherwise defaults.
- **G003 Cancel job** → Cancelled — avail: New PPM, WH, WMT, WMT-R, WC,
  WC-R. Cancels orders; admin-only; **trigger: orders→Cancelled**; sets all
  non-cancelled orders→Cancelled; sets PPM visits→Aborted visit; removes
  operative assignees; mandatory notes; emails supplier + originator.
- **G004 Close job** → Closed — avail: PPM Complete, Work Complete - R.
  Admin-only; **trigger: orders→Closed**; emails originator. (Is-complete
  flag per E-006.)
- **G005 Stock request** — avail: WMT, WMT-R. Is-stock-request; mobile;
  importance=use-first; **routes to G001**.
- **G006 Consumable order** — avail: WMT, WMT-R. Consumable-order prompt;
  importance=use-first.

## General Mobile (all hidden, on-device, app-audit-trail)

- **GM01 Accept job** — avail: WMT, WMT-R; user-select: WMT, WMT-R. Sets
  actual response date; hide signature; once-per-job;
  **acknowledge=acknowledged**.
- **GM02 Start Travel** — avail: WMT, WMT-R. Client-app audit trail;
  once-per-job; **travel=Start**; timer=Start; timesheet cat
  "Timesheetcategory Default"; importance=use-first; routes to G001;
  **constraint: GM01**.
- **GM03 Stop Travel** — avail: WMT, WMT-R. Once-per-job; **travel=Stop**;
  timer=Stop; timesheet Default; **constraint: GM02**.
- **GM04 Start job** — avail + user-select: WMT, WMT-R. Actual response
  date; can add remedial; once-per-job; timer=Start; **constraint: GM01**.
- **GM05 Place Job on hold** (E-014) — avail: WMT, WMT-R; hold=on;
  off-hold date prompt; mandatory notes; operative message; pause=Pause;
  timer=Stop; **constraints: GM01, GM04**.
- **GM06 Take off hold** — avail: WMT, WMT-R; hold=off; operative message;
  pause=Restart; timer=Start; **constraints: GM01, GM04, GM05**.
- **GM07 Complete Time on job** — avail: WMT, WMT-R; **who: Sub operative
  only**; once-per-job; importance=use-first; **constraints: GM01, GM04**.

## Lead Mobile (all hidden, on-device, lead-operative-only except LM02)

- **LM01 Stock request** — avail: WMT, WMT-R (grouped view had shown it
  "Not allocated" — discrepancy noted, see anomalies). Stock-request;
  client-app audit trail; importance=use-first.
- **LM02 Consumable order** — avail: WMT, WMT-R. Consumable prompt;
  operative message; importance=use-first.
- **LM03 Assign/Change Lead** — avail: WMT, WMT-R; Non-planned only;
  operative message; can select lead operative.
- **LM04 Request assistance** — avail: WMT, WMT-R; resource mode
  "Select operatives to request".
- **LM05 Assign to Contractor** ⇒Reactive → With Contractor - R — avail:
  WMT-R; Non-planned only; **Orchestrate only**; removes operative
  assignees; supplier prompt; emails supplier; attach order PDF.

## Planned Helpdesk Tasks

- **PH01 New PPM** ⇒Planned → New PPM — avail: New PPM; Planned only;
  hidden. (The creation default for Planned jobs per E-010.)
- **PH02 Assign to maintenance team** ⇒Planned → WMT — avail: New PPM;
  bulk; resource-team request.
- **PH02a Bulk assign to team** ⇒Planned → WMT — avail: New PPM; bulk;
  resource-team request. (Config-identical to PH02 per this view.)
- **PH02b Assign operative** ⇒Planned → WMT — avail: WMT; bulk; resource
  assignment; **"Is resource selection mandatory" ✓** (a field not seen
  ticked elsewhere); emails operatives; importance=use-first.
- **PH03 Assign to contractor** → With Contractor — avail: New PPM, WMT,
  WC; Planned only; sets PPM visits→**Ordered**; supplier prompt; emails
  supplier; attach order; **orders project "(00002) Planned Maintenance"**.
- **PH04 Place on hold** — avail: New PPM, WMT, WC; hold=on; off-hold date.
- **PH05 Take off hold** — avail + user-select: WH(!), WMT, WC; hold=off.
  (Availability from With Helpdesk is odd for a Planned-only action —
  matches map; anomaly noted VI-007.)
- **PH06 PPM complete** → PPM Complete — avail: WMT, WC; prompts response
  + completion dates.
- **PH07 PPM Complete - with remedials** ⇒Planned → PPM Complete — avail:
  WMT, WC; PPM visits→**Complete - Remedial**; document-select prompt;
  response+completion prompts; can add remedial.

## Mobile Planned (hidden, on-device, signature required)

- **PM01 PPM complete** → PPM Complete — avail: WMT; actual work-complete
  date; PPM visits→Complete; timer=Stop; **constraints: GM01, GM04**.
- **PM02 PPM Complete - with Remedials** ⇒Planned → PPM Complete — avail:
  WMT; PPM visits→Complete - Remedial; can add remedial; single-operative
  jobs only; timer=Stop; **constraints: GM01, GM04**.

## Reactive Helpdesk Tasks

- **RH01 New Reactive Task** ⇒Reactive → With Helpdesk — hidden;
  **appears when adding a new job ✓**; avail: WH; mandatory notes; emails
  originator; **default for standard users AND helpdesk operatives**.
- **RH02 Assign to Maintenance team** ⇒Reactive → WMT-R — avail: WH;
  resource-team request; emails originator.
- **RH03 Assign Operative** ⇒Reactive → WMT-R — avail: WMT-R; resource +
  resource-team assignment; emails operatives; can select lead operative.
- **RH03b Quote Ordered** ⇒Reactive → With Contractor - R — hidden; **no
  availability, no group, no trigger visible** — how it fires remains
  UNKNOWN (U-005).
- **RH04 Assign to contractor** (E-009) ⇒Reactive → WC-R — avail: WH,
  WMT-R, WC-R; supplier prompt; emails supplier; attach order; **trigger:
  orders→Awaiting acceptance**; tags +01. Awaiting acceptance /
  −02. Supplier rejected; orders project "(00001) Reactive Maintenance".
- **RH05 Approve Order** ⇒Reactive → WC-R — avail: AOA-R; order-approval
  prompt; **"occurs when an order is approved to a supplier" ✓** (auto on
  approval).
- **RH06 Quote Request** ⇒Reactive → Quote Requested - R — avail: WH, WMT;
  is-quote-request (displays quote form).
- **RH07 Amend SLA** ⇒Reactive → (keep) — avail: WH, WMT-R, WC-R;
  mandatory notes; new urgency/priority selectable; **"Will update the
  order priority to associated helpdesk priority" ✓**; emails selected
  users; importance=use-first.
- **RH08 Place On Hold** ⇒Reactive → (keep) — avail: WMT-R, WC-R;
  admin-only; hold=on; off-hold date; **orders→On hold**.
- **RH09 Take off hold** ⇒Reactive → (keep) — avail: WC-R; hold=off;
  **orders→In progress**.
- **RH10 Work Complete** ⇒Reactive → Work Complete - R — avail: WMT-R,
  WC-R; response+completion prompts.
- **RH11 Work Complete - Follow up** — identical to RH10 in captured
  config (difference presumably tag/remedial semantics not visible here).

## Mobile Reactive (hidden, on-device, lead-only, signature, once-per-job)

- **RM01 Work Complete - no further work required** ⇒Reactive → WC-R —
  avail: WMT-R; actual work-complete date; root cause on app; no completion
  prompts on completion action; linked-equipment availability prompt;
  emails originator; timer=Stop; **constraints: GM01, GM04**.
- **RM02 Work Complete - Follow up** ⇒Reactive → WC-R — as RM01 but with
  can-add-remedial instead of no-completion-prompts, no originator email;
  **constraints: GM01, GM04**.

## Tag/Auto Actions (all hidden)

- **T02 Accepted** — avail: WC-R; **trigger: orders→Accepted**.
- **T03 Rejected** ⇒Reactive → With Helpdesk — avail: WC-R; **no visible
  trigger** (supplier-portal rejection presumed — UNKNOWN).
- **T04 Appointment Made/Operative Assigned** — avail: WC, WC-R;
  **trigger: orders→Appointment Made/Operative Assigned**.
- **T05 In progress** — avail: WMT, WMT-R, WC, WC-R; importance=use-first;
  **no visible trigger** (UNKNOWN).
- **T06 On hold** — avail + user-select (per map): WMT, WMT-R, WC, WC-R;
  importance=use-first; no visible trigger.
- **T07 Cost uplift request** ⇒Reactive → Business Case - R — avail: WC-R,
  Work Complete - R; importance=use-first; no visible trigger (order
  contract-notification "Cost uplift" relationship suspected via
  `contract_job_typeid` — not set here; UNKNOWN).
- **T09 AFP approved** — avail: PPM Complete, Work Complete - R;
  **trigger: "occurs when an application for payment is approved" ✓**.

## New/updated findings

1. **Order-status trigger map (structural):** orders→Awaiting acceptance
   fires RH04 · Accepted→T02 · Appointment Made→T04 · Cancelled→G003 ·
   Closed→G004; order approval fires RH05; AFP approval fires T09.
   T03/T05/T06/T07/RH03b have **no visible trigger** — the residual
   mystery of the auto layer (updates U-005/U-009).
2. **Constraint chains** encode the mobile workflow order: Accept →
   Travel/Start → Hold/Complete (GM01 ← GM02/GM04; GM02 ← GM03;
   GM01+GM04 ← GM05/GM06/GM07/PM*/RM*).
3. **Action routing** in Vanilla: G005 and GM02 route to G001 (note
   capture) — the only routing uses.
4. Per-action **default order projects**: Reactive (00001) vs Planned
   (00002) maintenance projects.
5. **Anomalies:** LM01 shows avail WMT/WMT-R in its form yet sat under
   "Not allocated" in the grouped view (VI-007 candidate — grouped-view
   rendering vs form truth); PH05 (Planned-only) is available from the
   Reactive-only status With Helpdesk (VI-007); RH10 vs RH11 configs are
   indistinguishable in captured fields; PH02 vs PH02a likewise.
