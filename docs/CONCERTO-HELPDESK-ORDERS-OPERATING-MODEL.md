# Concerto Helpdesk + Orders — the operating model

Written 2026-08-19 for a cold technical reader. Every claim is graded:
**[CONFIG]** configuration truth (read in Admin) · **[OPS]** operational
presentation truth (seen in the runtime UI) · **[PASSIVE]** behaviour
passively observed · **[VERIFIED]** controlled-experiment verified ·
**[INFERRED]** · **[UNKNOWN]**. Evidence ids (E-*, EO-*) resolve via the
model provenance and `evidence/`.

## 1. The five surfaces

1. **Helpdesk Admin** (`helpdesk_admin.aspx`) — one page, 43 tabs;
   configures the Helpdesk domain. 18 tabs (all rule/automation surfaces)
   ship EMPTY in Vanilla. [CONFIG]
2. **Orders Admin** (`order_admin.aspx`) — 32 tabs; configures the Orders
   domain. 25 tabs ship EMPTY. [CONFIG]
3. **Operational Helpdesk** (`helpdesk2.aspx`) — where staff work jobs:
   type tabs → status tabs → job grid → job record. [OPS]
4. **Supplier Portal** (`supplier_portal.aspx`) — the supplier's
   projection of orders (and of the parent jobs). [OPS]
5. **Orchestrate / contractor app** — the mobile surface; visibility is
   configured but the device itself was NOT tested this engagement.
   **PPM Scheduler** is referenced everywhere (visit statuses, statutory
   scoping, PPM disciplines, "Statutory PPM" works-order type) but is an
   explicitly UNMAPPED future domain.

## 2. Core Helpdesk objects (what controls what)

- **Helpdesk Job Type** (Reactive default / Planned): the top-level
  operational partition. Each record binds: its statuses (+ default
  status), its Response Categories, its creation action ("Default action
  when a user enters a request": RH01 / PH01), tab order, and even the
  Raise-button text. Planned literally hides its add button ("**DO NOT
  USE**") — Planned jobs come from the PPM side or the list-toolbar
  ACTIONS→PH01. [CONFIG, VERIFIED for RH01 creation]
- **Status** (13): the job state machine nodes. Per-record flags carry the
  semantics: default (With Helpdesk), complete (Closed only),
  cancelled-representation + orders-cancelled destination (Cancelled),
  work-complete+timesheet (Work Complete - R), locked/no-orders (WMT-R),
  order-approval holding (AOA-R via its unapproved-orders flag),
  raise-order button visibility, workforce/dashboard display, and the
  **two-gate mobile flag** (below). Status also owns the (unused in
  Vanilla) expiry mechanism: target_days + expiry action. [CONFIG;
  transitions VERIFIED in E1]
- **Action** (50): the transitions and the automation carriers. Each
  action: availability-per-status, resulting type/status (or
  user-selects), tag add/remove lists, email flags, prompts, assignment
  behaviours (team/operative/supplier), order-side effects (cancel orders,
  set order status, order-status *triggers*), mobile/portal surfacing
  (hide_from_use vs is_handheld), constraints (prerequisite actions),
  timers, role restrictions, per-action default order projects. Rendering
  = available-in-status ∖ hidden ∖ wrong-PPM-type, grouped by Action
  group on the job toolbar. [CONFIG; core lifecycle VERIFIED]
- **Classification** (16 parents + 74 children, ALL Reactive-typed): the
  reporter's fault taxonomy (wizard tiles; admin cascading selects that
  autofill the short title). Schema can wire default urgency, asset
  types, budget category/heading, Helpdesk Process, order type — **all
  unwired in every Vanilla record** (VI-006). Children hold explicit
  values; cascade is a write-time push, not inheritance. [CONFIG/OPS]
- **Response Category** (6 = the SLA table): P1–P4 (2/24/48/72h response;
  1/3/5/7d repair) + Planned + By agreement, computed on the Working-time
  clock (Standard hours Mon–Fri 08:30–17:30). Type-bound; P1 links to
  Order Priority "Priority 1" and is workspace-scoped. **No default** —
  and the reporter wizard never asks — so wizard-raised jobs have NO SLA
  (VI-005; VERIFIED). The admin quick-add form REQUIRES urgency.
  **SLA arithmetic VERIFIED** (out-of-hours raise → clock-exact targets).

### The two-gate Orchestrate visibility model [CONFIG]

An action reaches the mobile operative only when BOTH gates open:
**(1) the Action's** `is_handheld` + app-mode (and its lead/sub,
job-type, constraints filters); **(2) the Status's** "Will jobs in this
status appear on the mobile app" — TRUE only for With Maintenance Team
and With Maintenance Team - R. The dedicated GM/LM/PM/RM workflow actions are
allocated to those working statuses; broader mobile-capable actions
(e.g. G001) have wider availability but are only PRACTICALLY exposed
on-device while the job is in WMT/WMT-R — the status gate creates the
effective intersection.

## 3. Core Orders objects

- **Order Status** (11): AWA(default) → Accepted → AMO → In progress ⇄ On
  hold → Work complete / CAC → Closed; + Pending quote, In review,
  Cancelled. Flags carry: device availability (AMO/IPR/On hold),
  contractor-portal visibility, operative/supplier-only restriction
  (IPR/WCO), AFP/invoice gates (prevent-application/-invoices),
  completion semantics, remedial-prompt action. Schema also offers
  journal/consumable defaults, PPM-review status pair,
  final-application/invoice-recall setters — unused in Vanilla. [CONFIG]
- **Order Priority** (7): only P1 carries deadlines (2h/1d);
  duplicate-"Default" records anomaly (VO-001). Helpdesk RC P1 → Order P1;
  RH07 pushes helpdesk priority onto orders. [CONFIG]
- **Order Type** (2): Purchase order (default) / Stock Order (consumable,
  budget+project bound). The "default type for PPM orders" capability is
  unticked on both. [CONFIG]
- **Budget Category** (11): CAP/PM/RM/STK × discipline with nominal codes;
  RM (MECH) default; the same vocabulary Classifications and Quote actions
  reference. [CONFIG]
- **Supplier Action** (13; 114-control configurator): the supplier-side
  transitions. Each: availability per ORDER status, when-to-show
  (before/after acceptance), portal/toolbar/contractor-app visibility,
  tri-state field prompts, PPM visit setters, quote-engine entry,
  signatures/timers/operative-status layer (mirroring Helpdesk mobile
  options), constraints (SP-series prerequisites), special role flags
  (THE portal accept / reject / AFP action), **and a direct "Resulting
  action on the helpdesk status" link**. [CONFIG]

## 4. The cross-domain loop (the heart of the system)

```
Helpdesk job (With Helpdesk)
  → RH04 Assign to contractor            [VERIFIED to the line above; RH04 itself CONFIG — E1 never ran RH04]
      job → With Contractor - R; ORDER RAISED as <jobref>/1
      order status = Awaiting acceptance (default); tag 01 added
  → Supplier Portal shows order (parent job status/type visible)
  → SP01 Accept        → order Accepted    → fires T02 (tag 01→02)
    SP02 Reject        → order Cancelled   → fires T03 (job → With Helpdesk, tag 02.Supplier rejected)
  → SP03 Appointment   → order AMO         → fires T04 (tag →03)
  → SP04 Start/ORC10/SP06 → order In progress → fire T05 (tag →04)
  → SP05 Hold          → order On hold     → fires T06 (user-selects return)
  → SP07 Work complete → order Work complete → fires RH10 (job → Work Complete - R, tag →08)
    SP07 Complete&Quote → …               → fires RH11 + enters quote engine
    SP07 PPM variants  → …                → fire PH06/PH07 (+ PPM visit statuses)
  → BC01 Cost uplift   →                  → fires T07 (job → Business Case - R)
  → G004 Close (helpdesk side; also triggered by orders→Closed)
```

All edges above are **[CONFIG]** (both sides read; X-001..X-018 in
`model/CROSS-DOMAIN-RELATIONSHIPS.json`); none is behaviourally verified
yet — that is exactly experiment E2. Reverse-direction listeners exist on
Helpdesk actions (G003 fires on orders→Cancelled, G004 on orders→Closed,
RH04 on orders→Awaiting acceptance, RH05 on order approval, T09 on AFP
approval); where a supplier event could fire two candidates the
"use-this-action-first" importance flag arbitrates [INFERRED].
Order identity: **order ref = parent job ref + "/n"** [OPS].
Quote path: RH06 → Quote Requested - R → RE01…RE05 → RE05 fires RH03b →
With Contractor - R [CONFIG]. Approval path: order above approval level →
job held in AOA-R (status flag) → RH05 on approval [CONFIG; approval-level
source UNKNOWN, UO-001].

## 5. Why order 00000040/1 works and the Awaiting-acceptance ones don't

Portal action rendering = availability(order status) ∩ portal-visibility ∩
acceptance-state ∩ PPM-scope. 40/1 sits in AMO where SP05/SP07×2 are
available AND portal-visible → menu renders them. 46/1 & 29/1 sit in
Awaiting acceptance, where the configured actions are SP01/SP02/ORC10 —
**none of which is portal-visible** (they carry the accept/reject ROLE
flags but not the "Show this action on the supplier portal" flag).
**Precision on SP02:** it has TWO independent gaps — no portal visibility
AND its status-availability tick is "In progress" (not Awaiting
acceptance) despite when-to-show="before accepted" (UO-002). SP01's
availability IS correct (AWA); its only gap is portal visibility. ORC10 is
available in AWA+AMO but not portal-visible. So the acceptance loop is
dead on arrival: **VI-009/VO-002, CONFIGURATION DEFECT (structural),
operationally confirmed** — 40/1 simply passed the gate in April; the accepting route is
UNKNOWN (not evidenced).

## 6. Creation routes (three, all different)

1. **Reporter wizard** (Reactive RAISE JOB → "Raise a job"): site →
   duplicate check → block → location* → classification parent→child tiles
   → description* → photo → H&S → access* → CONFIRM. Collects NO
   urgency/triage → jobs arrive WITHOUT SLA. [OPS+VERIFIED]
2. **Admin quick-add modal** ("Enter helpdesk ticket details", also
   reachable from the Helpdesk list): full triage — site/block/room/
   caller, cascading classification (+auto short title), call type,
   contact method, **Urgency* required**, tags (visible-on-entry only),
   locked Action-taken=RH01 with "Status will be set to" caption.
   [OPS+VERIFIED]
3. **Planned**: list toolbar ACTIONS → PH01 (no wizard — hidden by Job
   Type config). PPM-scheduler-originated creation: UNKNOWN domain.

## 7. Known Vanilla defects and quirks (registers hold detail)

VI-002 Business Case - R has no exit actions · VI-004 code gaps/RH03b
groupless · VI-005 no default SLA + VI-006 classification wiring entirely
unset (proven across all 90 records) · VI-007 grouped-view/form
mismatches · VI-008 all five email templates empty (+"Email failed to
send" PASSIVE observation) · **VI-009/VO-002 broken supplier acceptance
loop** · VO-001 duplicate Default order priorities · UO-001 approval-level
source unknown · duplicate tag numbering (01/02/03 pairs serve
supplier vs team flows).

## 8. What is verified vs structural

**CONTROLLED VERIFIED (E0/E1, `model/VERIFIED-BEHAVIOURS.json`):** tag
TextMatch auto-attach; RH01/RH02/RH03/RH10/G004/G003 transitions; SLA
clock arithmetic; tag-ladder automation; action-surface rendering;
wizard-vs-admin SLA difference. **Everything cross-domain is [CONFIG]
only** — E2 (blocked: VI-009 + authorisation) is designed to verify it.
