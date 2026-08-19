# Vanilla issues / anomaly register — Concerto Helpdesk

Durable register of places where Vanilla itself appears incomplete,
inconsistent, unreachable or broken. **Nothing here is repaired during
discovery** — the broken state is preserved as evidence. Categories:

CONFIRMED DEFECT · STRONG ANOMALY · CONFIGURATION INCONSISTENCY ·
UNREACHABLE STATE · POSSIBLE DEFECT — NEEDS EXPERIMENT · UNKNOWN

Intended to be turned by Warwick into an evidence-backed report to the
owner of Vanilla.

---

## VI-001 — "New PPM" status is unreachable [UNREACHABLE STATE]

- **Configuration area:** Statuses / Actions (Planned).
- **Observed state:** The Action map's own validation reports: *"New PPM" is
  unreachable — no live action moves jobs into it.* The only sets-edge into
  it is PH01 (New PPM), which is itself only available FROM New PPM
  (circular).
- **Expected/normal state:** An entry status should be settable by the
  job-creation path (as RH01 does for With Helpdesk, which is the flagged
  default status).
- **Why it appears problematic:** Planned jobs seemingly cannot arrive in
  their nominal entry status via any live action.
- **Operational consequence:** Unknown — PPM jobs may be created by the PPM
  scheduler outside the action system (unproven).
- **Evidence:** E-007 (verbatim warning + edge reconstruction).
- **Confidence:** VERIFIED — OBSERVED (the warning); interpretation open.
- **Reproduction:** Helpdesk admin → Actions → ACTION MAP → warnings badge.
- **Suggested correction:** None yet — needs understanding of how PPM jobs
  are born (future experiment).
- **Correction verified?** No.
- **Update (E-010):** Helpdesk job types names **PH01. New PPM** as
  Planned's "Default Action when adding new" — so New PPM is reached at job
  creation, a path the map's reachability check evidently ignores.
  Downgraded to: *unreachable via status-allocated actions only; the
  warning itself is the residual anomaly.*

## VI-002 — "Business Case - R" status is unreachable and a dead end [UNREACHABLE STATE]

- **Configuration area:** Statuses / Actions (Reactive).
- **Observed state:** Map warning: *"Business Case - R" is unreachable — no
  live action moves jobs into it* — despite T07 (Cost uplift request,
  Tag/Auto group) carrying a sets-edge → Business Case - R and being listed
  as available from With Contractor - R and Work Complete - R. The status
  also offers **zero** actions out (E-005), so any job that did arrive
  could not leave via the action system.
- **Why it appears problematic:** Either the warning logic excludes
  tag/auto actions (then the warning is misleading), or T07 genuinely
  cannot fire (then the status is doubly dead). Both are anomalous.
- **Operational consequence:** Cost-uplift workflow appears unusable as
  shipped.
- **Evidence:** E-005, E-006, E-007.
- **Confidence:** STRONG ANOMALY (the contradiction itself is observed).
- **Reproduction:** Action map warnings; Actions grouped view.
- **Suggested correction:** Needs the T-action firing mechanism understood
  first (U-009); then either give the status exit actions or remove it.
- **Correction verified?** No.
- **UPDATE (2026-08-19, reconciled against a newer Vanilla deployment) —
  RE-CLASSIFIED: VISUALISER / ACTION-MAP LIMITATION, not a dead end.**
  Business Case - R has no *Helpdesk Action* exit because its lifecycle is
  controlled by the dedicated hard-coded **Business Cases** engine
  (Helpdesk menu → Business Cases → Awaiting approval / Approved /
  Rejected; `ContractJobHelpdeskHome.aspx`). A cost uplift (supplier-side
  BC01) creates a business case; approval/rejection happens in that module
  and advances the job — no Helpdesk-operative action on the status is
  required or expected. The Action map cannot see this cross-engine
  lifecycle, hence the "unreachable/dead-end" appearance. The historical
  structural observation stands; the *interpretation* is corrected. Runtime
  behaviour of the approval→return transition is engine-driven and was NOT
  independently runtime-verified here — do not claim beyond the observed
  module structure.

## VI-003 — "Quote Requested - R" has no exit actions [POSSIBLE DEFECT — NEEDS EXPERIMENT]

- **Configuration area:** Statuses / Actions / Quote* tabs (Reactive).
- **Observed state:** RH06 (Quote Request) moves jobs INTO Quote
  Requested - R, but the status offers zero actions (E-005). RH03b ("Quote
  Ordered" → With Contractor - R) exists but is allocated to no status
  ("Not allocated", E-005).
- **Why it appears problematic:** Jobs entering the quote path have no
  visible way forward in the action system; the obvious candidate exit
  action (RH03b) is unallocated. Plausibly the Quote workflow (Quote
  actions/processes/rules tabs) advances the job — unproven.
- **Operational consequence:** If the quote workflow does not fire RH03b,
  quoted jobs strand.
- **Evidence:** E-005, E-006; quote tabs listed in E-002.
- **Confidence:** POSSIBLE DEFECT — NEEDS EXPERIMENT.
- **Reproduction:** Actions grouped view → Quote Requested - R group.
- **Suggested correction:** TBD after Quote-family discovery (U-005).
- **Correction verified?** No.
- **Update (E-016): DOWNGRADED to by-design + visualiser limitation.**
  RE05 "Raise Order" fires RH03b against the parent job (quote engine →
  With Contractor - R). RH03b is machine-fired, hence unallocated. The
  residual issue is only that the Action map does not render quote-engine
  firings. Runtime confirmation = experiment E3.
- **UPDATE (2026-08-19, reconciled against a newer Vanilla deployment) —
  CONFIRMED by-design; VISUALISER / ACTION-MAP LIMITATION.** A newer Vanilla
  deployment carries a coherent quote engine (RE01 Issue → RE02 Quotes
  received → RE03 Send back → RE04 Select / RE04a Approve → RE05 Raise Order
  → RE06 Complete; RE07 Cancel → Quote request cancelled). **RE05 "Raise
  Order" was read directly: "Action to be triggered against the original job
  linked to the quote" = "Quote Ordered" (RH03b)** → returns the job to
  With Contractor - R with the order raised. So the ordinary Helpdesk Action
  map's apparent dead-end is an incomplete projection of a cross-engine
  workflow, not a defect. Structural evidence preserved; interpretation
  corrected. (Config-observed; the runtime firing itself remains E3.)

## VI-005 — No default Response category (SLA) [CONFIGURATION INCONSISTENCY]

- **Configuration area:** Response categories.
- **Observed state:** Six SLA rows (P1 2h/1d · P2 24h/3d · P3 48h/5d ·
  P4 72h/7d · Planned 0/0 · By agreement 0/0, all on Standard hours) —
  **none flagged Default**, though the table has a Default column and most
  other status-like tables set one.
- **Why it appears problematic:** New jobs may have no SLA unless a
  classification/call-type supplies one — and every Classification's
  Urgency column is also blank (E-012).
- **Operational consequence:** CONFIRMED (E0/E1/B-010): reporter-wizard
  jobs arrive with NO SLA targets; only the admin quick-add route (which
  REQUIRES urgency) applies one. Severity upgraded from possible to
  demonstrated for the wizard path.
- **Evidence:** E-012.
- **Correction verified?** No.

## VI-006 — Classification/SLA wiring absent [CONFIGURATION INCONSISTENCY]

- **Configuration area:** Classifications, FM task types.
- **Observed state:** ALL 90 classification records (16 parents + 74
  children, E-023) are Reactive-typed with blank urgency and zero values
  at BOTH levels; resource grids empty (EO-006); FM task types empty.
- **Why it appears problematic:** The classification layer exists but is
  unwired to SLAs — consistent with VI-005.
- **Evidence:** E-012.
- **Confidence:** CONFIGURATION INCONSISTENCY.
- **Correction verified?** No.

## VI-004 — Action naming/sequence gaps [CONFIGURATION INCONSISTENCY]

- **Configuration area:** Actions.
- **Observed state:** Codes jump: no T01, T08 (T02–T09 present); RH03b
  exists beside RH03; PH02a/PH02b beside PH02. RH03b has **no button
  group** (blank Button group column — the only such action).
- **Why it appears problematic:** Suggests iterative manual editing of
  Vanilla rather than a clean baseline; the missing button group means
  RH03b may render nowhere.
- **Evidence:** E-006.
- **Confidence:** VERIFIED — OBSERVED (the state); INFERRED (the cause).
- **Correction verified?** No.

## VI-007 — Grouped-view / form-truth mismatches [CONFIGURATION INCONSISTENCY]

- **Configuration area:** Actions.
- **Observed state (E-015):** LM01's Edit form ticks With Maintenance Team
  and With Maintenance Team - R, yet the grouped Actions view lists LM01
  under "Not allocated". PH05 (Planned-only) is available from the
  Reactive-only status With Helpdesk. RH10 vs RH11, and PH02 vs PH02a, are
  indistinguishable in every captured configuration field.
- **Why it appears problematic:** view/form disagreement suggests either a
  rendering defect or an additional hidden condition; duplicate-config
  actions suggest copy-editing leftovers in Vanilla.
- **Evidence:** E-005, E-015.
- **Confidence:** CONFIGURATION INCONSISTENCY (observed); causes unknown.
- **Correction verified?** No.

## VI-008 — All email templates are empty shells [APPARENTLY UNWIRED CONFIGURATION]

- **Configuration area:** Email templates.
- **Observed state:** All five templates (originator new/progress/
  completes, Quote declined, Quote submitted) have empty subject AND empty
  body (E-017). Merge-tag vocabulary exists ({date raised} … {link}).
- **Why it appears problematic:** Actions carry email flags (originator/
  supplier/operative) but the content templates are blank — despatched
  emails would be empty or fall back to unknown system defaults.
- **Operational consequence:** PARTIALLY OBSERVED (passive): RH01's email
  attempt logged 'Email failed to send' on the job timeline (OD-006,
  B-012). Whether empty templates or SMTP absence causes the failure is
  still unproven (E2 observes).
- **Evidence:** E-012, E-017.
- **Confidence:** APPARENTLY UNWIRED CONFIGURATION.
- **Correction verified?** No.

## VI-009 / VO-002 — Supplier acceptance loop is broken in Vanilla [CONFIGURATION DEFECT (structural) + operational confirmation]

- **Configuration area:** Orders Admin -> Supplier actions; Supplier portal.
- **Observed state:** SP01 Accept / SP02 Reject (and ORC10 Acknowledge)
  carry the portal accept/reject role flags but NOT "Show this action on
  the supplier portal". Operationally an Awaiting-acceptance order offers
  only "Add an invoice" - no accept/reject/acknowledge anywhere; demo
  orders have sat in Awaiting acceptance since May; the "Waiting to be
  acknowledged (2)" tab has no acknowledge affordance. Warwick confirms
  this matches his lived experience of the portal.
- **Why it appears problematic:** the entire supplier lifecycle
  (SP01->T02 ... SP07->RH10) is unreachable from its entry point; every
  downstream cross-domain trigger is dead on arrival.
- **Operational consequence:** contractor loop cannot start from the
  portal; jobs strand in With Contractor(-R) / orders in Awaiting
  acceptance.
- **Evidence:** EO-002 (record flags), EO-005 (operational proof).
- **Confidence:** CONFIGURATION DEFECT (structural) - behavioural
  confirmation would be E2's first finding.
- **Precision (final sweep):** SP01's status availability IS correct
  (Awaiting acceptance); its only gap is portal visibility. **SP02 has TWO
  independent gaps**: no portal visibility AND availability ticked only
  for "In progress" (not Awaiting acceptance) despite
  show-before-accepted (UO-002). ORC10: available AWA+AMO, not
  portal-visible. A one-checkbox fix repairs SP01/ORC10; SP02 needs the
  availability tick corrected too.
- **Suggested correction (NOT applied):** portal visibility on SP01+ORC10;
  portal visibility + AWA availability on SP02 - or ZZ TEST clones for E2.
- **Correction verified?** No.
- **UPDATE (2026-08-19) — VI-009 PERSISTS IN CURRENT VANILLA and was
  corrected in an implementation project (read-back verified).** A newer
  Vanilla deployment reproduced the defect: **SP01** — Awaiting-acceptance
  availability correct, portal visibility OFF; **SP02** — portal visibility
  OFF *and* availability set to "In progress" instead of "Awaiting
  acceptance". That deployment has **no ORC10** (see versioning note), so
  the acceptance entry relies solely on SP01/SP02, making the defect fully
  blocking. Corrected there by: SP01 portal visibility ON; SP02 portal
  visibility ON + availability moved to Awaiting acceptance (In progress
  removed). Both re-opened and read back as applied — **PASS**. So VI-009 is
  a **persistent, genuine current-Vanilla defect** (unlike VI-002/VI-003
  which reconcile to visualiser limitations). The correction is the minimal
  set of supplier-action field changes above. (Customer-specific identifiers
  are held privately in the implementation project, not in this repo.)

## VI-010 — GM06 "Take off hold" tag automation appears inverted [CONFIGURATION INCONSISTENCY]

- **Configuration area:** Helpdesk Actions (tags).
- **Observed state:** GM06 has IDENTICAL tag automation to GM05: adds
  "05. On hold", removes "04. In progress" (E-024 definitive re-read).
  Its purpose implies the inverse.
- **Operational consequence:** jobs taken off hold would keep/gain the
  on-hold tag. Runtime effect untested (E5 territory).
- **Evidence:** E-023, E-024.
- **Correction verified?** No.
