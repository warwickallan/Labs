# Controlled Experiment Programme — Vanilla Helpdesk (proposed, NOT authorised)

Prepared 2026-08-18 against structural baseline `VANILLA-HELPDESK-STRUCTURAL-v1`.
**No experiment may run until Warwick explicitly approves entering
EXPERIMENT mode.** Global rules for every experiment:

- All records created are `ZZ TEST`-prefixed (site, jobs, supplier,
  operative) and are the ONLY records touched. **No Vanilla configuration
  is modified — ever.** Where an experiment nominally needs a config change
  (E4), a disposable ZZ-prefixed config object is created instead and
  deleted afterwards only with separate approval.
- Email containment: any ZZ TEST supplier/user uses a non-routable address
  (e.g. `zz-test@invalid.local`) so nothing escapes; where the platform
  queues mail, capture the queue evidence rather than delivery.
- One controlled variable per step; before/after state captured to an
  `evidence/experiments/` file per experiment; each run appends to
  SESSION_LOG and pushes to GitHub.
- Failure = any observation contradicting the structural model → recorded
  in VANILLA-ISSUES/UNKNOWNS, never "fixed" silently.

## E0 — Tag TextMatch behaviour (smallest, isolates one mechanism)

- **Objects:** 1 ZZ TEST site; 1 ZZ TEST tag (`ZZ TEST textmatch`,
  Type=Helpdesk, TextMatch="zzmatchphrase"); 1 ZZ TEST job.
- **Initial state:** tag exists, no jobs reference it.
- **Variable:** raise one job whose description contains "zzmatchphrase".
- **Expected (structural):** tag auto-attaches to the new job (E-013 field
  semantics).
- **Observe:** job's tag list on creation; whether matching is
  substring/case-sensitive; whether later description edits re-trigger.
- **Containment:** tag is ZZ-named and deleted after (separate approval).
- **Success:** tag attaches ⇒ capability confirmed (Vanilla leaves it
  unused — E-017). **Resolves:** TextMatch behaviour gate.

## E1 — Core Reactive lifecycle + separate Cancelled case

- **Objects:** ZZ TEST site; ZZ TEST job A (lifecycle), job B (cancel).
- **Initial:** both jobs raised via RH01 (default action) → With Helpdesk.
- **Variables (A, one per step):** RH02 → WMT-R; RH03 assign ZZ operative;
  RH10 → Work Complete - R; G004 → Closed. (B): G003 Cancel.
- **Expected:** status transitions per E-015; RH01/RH02 email originator
  (contained address); G004 marks complete (status_complete); B lands in
  Cancelled with orders cancelled.
- **Observe:** per-step job status, tags, timeline entries, emails queued,
  SLA target dates (links to E6), **whether Cancelled counts as
  open/closed in searches/reports (U-002)**.
- **Success:** all transitions match the model. **Resolves:** U-002;
  BEHAVIOUR gate for statuses/actions core.

## E2 — Contractor/order/tag trigger engine

- **Objects:** ZZ TEST job; ZZ TEST supplier (non-routable email).
- **Initial:** job at With Helpdesk.
- **Variables:** RH04 assign supplier (order raised, → WC-R, tag 01 added);
  then drive the ORDER through statuses: Awaiting acceptance → Accepted →
  Appointment Made → In progress → Work complete, one change at a time
  (via the supplier-portal/order surfaces).
- **Expected (structural):** order at Accepted fires T02; Appointment Made
  fires T04; tags 01/02/03/04 move per the numbered ladder; RH05 fires on
  order approval; T03 fires on supplier rejection (its trigger is not
  visible in config — this experiment identifies it); T05/T06 firing
  sources identified.
- **Observe:** which T-actions appear in the job timeline after each order
  transition; tag add/remove; any emails.
- **Success:** trigger map confirmed/completed. **Resolves:** U-009
  residual; T03/T05/T06 trigger sources; VI-002 reachability logic;
  BEHAVIOUR gate for the auto layer.

## E3 — Quote→original-job bridge runtime confirmation

- **Objects:** ZZ TEST job; ZZ TEST supplier.
- **Initial:** job at With Helpdesk.
- **Variables:** RH06 Quote Request (→ Quote Requested - R); RE01 issue;
  submit ZZ quote; RE04 select; **RE05 Raise Order**.
- **Expected (structural, E-016):** RE05 → quote request Quote complete;
  order raised; **RH03b fires against the job → With Contractor - R**;
  Q-tags cleared; remedials (none) unaffected.
- **Observe:** job status after RE05; RH03b in timeline; T07 path from
  WC-R (Cost uplift → Business Case - R) as an optional extension, incl.
  **how a job leaves Business Case - R** (VI-002's dead-end).
- **Success:** job exits Quote Requested - R exactly as modelled.
  **Resolves:** U-005 BEHAVIOUR gate; updates VI-002/VI-003.

## E6 — SLA / default-urgency behaviour (run before E4/E5; informs issue report)

- **Objects:** ZZ TEST site; 3 ZZ jobs.
- **Variables:** raise job 1 with NO classification/urgency; job 2 with a
  classification (blank urgency — Vanilla state); job 3 with explicit
  Priority 2.
- **Expected:** unknown — Vanilla has no default Response category
  (VI-005) and classifications carry no urgency (VI-006).
- **Observe:** target/response dates each job receives (none? error?
  fallback?); which SLA fields populate; P1's order-priority link effect.
- **Success:** defaulting behaviour documented. **Resolves:** VI-005/VI-006
  operational consequence; BEHAVIOUR gate for Response categories.

## E5 — Orchestrate/mobile Constraints enforcement

- **Objects:** ZZ TEST job assigned to a ZZ TEST operative with Orchestrate
  access (Warwick's demo operative "03.Operative (Electrician)" only if
  Warwick confirms it is disposable — otherwise create ZZ operative).
- **Initial:** job at WMT-R, operative assigned (via E1 path).
- **Variables:** attempt GM05 (hold) BEFORE GM01/GM04; then GM01 Accept;
  then GM04 Start; then GM05.
- **Expected (structural):** GM05 unavailable until GM01+GM04 done
  (constraints = prerequisites, U-012 inference); operative statuses and
  pause/travel clocks per E-015.
- **Observe:** action availability on device per step; operative-status
  record changes; timer/timesheet rows.
- **Success:** constraint semantics proven. **Resolves:** U-012;
  mobile-layer BEHAVIOUR gate.

## E4 — Status target/expiry behaviour (only experiment needing config — ZZ object)

- **Objects:** **ZZ TEST status** (`ZZ TEST expiry`, Reactive, target_days
  = 1, expiry action = G001 note) + ZZ action to enter it, or — if
  creating statuses is deemed too invasive — DEFER to a dedicated approval.
- **Variables:** move a ZZ job into the ZZ status; advance/wait past
  target.
- **Expected:** expiry action fires when target_days elapse (E-013 fields).
- **Observe:** firing time semantics (calendar vs working days), timeline
  entry, whether repeated.
- **Containment:** the ZZ status is suppressed+deleted afterwards (with
  approval); Vanilla statuses untouched.
- **Success:** expiry engine understood. **Resolves:** U-013 BEHAVIOUR
  gate; the Action map's "auto-fires on status expiry" concept.

## Order of execution (value ÷ risk)

E0 → E1 → E2 → E3 → E6 → E5 → E4.

## Standing STOP conditions during experiments

Any unexpected email despatch beyond containment; any effect touching a
non-ZZ record; any Vanilla configuration change; any ambiguity about
reversibility → stop, record, ask Warwick.
