# Controlled Experiment Programme — Vanilla Helpdesk (proposed, NOT authorised)

> **Rev 2 (2026-08-19), after operational-surface discovery E-019..E-021:**
> E1 job creation uses the Raise Job wizard (site → block → classification
> tiles → describe → H&S → access details → CONFIRM) — it collects NO
> urgency, so E1 doubles as the first half of E6 (wizard-raised job should
> have no SLA targets; verify, then apply RH07 Amend SLA to add one).
> Planned creation (E1-P extension) uses the Planned list toolbar ACTIONS →
> PH01, NOT a wizard — treat separately. E2's email observation has a head
> start: "Email failed to send" is already passively recorded on RH01
> (OD-006); E2 must capture the failure mode. Actions are invoked from
> either the row Options menu or the in-job group buttons (equivalent sets,
> E-020) — use the in-job surface for evidence-richer timelines.

Prepared 2026-08-18 against structural baseline `VANILLA-HELPDESK-STRUCTURAL-v1`.
**Authorisation state (2026-08-19, post-E1): E0 and E1 are COMPLETE and
closed. E2-E6 are NOT authorised. Stop point held; the next step requires
Warwick's explicit word.**

Governing rule (Warwick's wording): **Never modify Vanilla configuration.
Disposable ZZ TEST configuration/master-data fixtures may be created only
where explicitly required by an authorised experiment.** (Correction: E4
is NOT the only experiment touching configuration — E0 creates a persisted
disposable ZZ TEST Tag with TextMatch. Several experiments create
disposable jobs/suppliers/fixtures.)

Behaviour evidence has two grades: **BEHAVIOUR — PASSIVELY OBSERVED**
(footprints found in situ, e.g. the Priority-2 SLA computation and the
RH01 "Email failed to send" timeline entry) and **BEHAVIOUR — CONTROLLED
VERIFIED** (a controlled experiment). Only the latter closes a behaviour
gate. Global rules for every experiment:

- All records created are `ZZ TEST`-prefixed (site, jobs, supplier,
  operative) and are the ONLY records touched. **No Vanilla configuration
  is modified — ever.** Where an experiment nominally needs a config change
  (E4), a disposable ZZ-prefixed config object is created instead and
  deleted afterwards only with separate approval.
- Email containment: any ZZ TEST supplier/user uses a non-routable address
  (e.g. `zz-test.example.invalid (RFC-2606-reserved .invalid TLD)`) so nothing escapes; where the platform
  queues mail, capture the queue evidence rather than delivery.
- One controlled variable per step; before/after state captured to an
  `evidence/experiments/` file per experiment; each run appends to
  SESSION_LOG and pushes to GitHub.
- Failure = any observation contradicting the structural model → recorded
  in VANILLA-ISSUES/UNKNOWNS, never "fixed" silently.

## E0 — Tag TextMatch behaviour — **COMPLETE (2026-08-19, evidence/experiments/E0-textmatch.md)**

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

## E1 — Core Reactive lifecycle + Cancelled — **COMPLETE (2026-08-19, evidence/experiments/E1-reactive-lifecycle.md)**

- **Objects:** ZZ TEST site; ZZ TEST job A (lifecycle), job B (cancel).
- **Initial:** both jobs raised via RH01 (default action) → With Helpdesk.
  (As executed: creation used the ADMIN QUICK-ADD modal, not the reporter
  wizard — see evidence/experiments/E1-reactive-lifecycle.md.)
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

## E2 — Contractor/order/tag trigger engine — **AWAITING AUTHORITY (do not begin)**

- **Objects:** ZZ TEST job; ZZ TEST supplier (non-routable email).
- **Initial:** job at With Helpdesk.
- **Variables:** RH04 assign supplier (order raised, → WC-R, tag 01 added);
  then drive the ORDER through statuses: Awaiting acceptance → Accepted →
  Appointment Made → In progress → Work complete, one change at a time
  (via the supplier-portal/order surfaces).
- **Expected (structural — E2 is now VERIFICATION of a fully mapped
  mechanism, not exploration):** Supplier Actions fire the linked Helpdesk
  actions directly (SP01→T02, SP02→T03, SP03→T04, ORC10/SP04/SP06→T05,
  SP05→T06; completions→RH10/RH11; EO-002/X-001..X-008); order statuses
  and tag ladder move as configured; RH05 fires on order approval.
  **PRECONDITION: VI-009 — the portal cannot reach SP01/SP02 as shipped;
  Warwick must first choose the 4-field Vanilla fix or ZZ TEST clones.**
- **Observe:** which T-actions appear in the job timeline after each order
  transition; tag add/remove; any emails.
- **Success:** the structural trigger map behaves as modelled.
  **Resolves:** BEHAVIOUR gate for the cross-domain auto layer; VI-009
  operational confirmation; GM05/GM06 tag inversion check (VI-010).

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

## E4 — Status target/expiry behaviour (needs a disposable ZZ config object, like E0)

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
