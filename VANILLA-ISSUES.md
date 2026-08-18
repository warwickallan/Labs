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

## VI-005 — No default Response category (SLA) [CONFIGURATION INCONSISTENCY]

- **Configuration area:** Response categories.
- **Observed state:** Six SLA rows (P1 2h/1d · P2 24h/3d · P3 48h/5d ·
  P4 72h/7d · Planned 0/0 · By agreement 0/0, all on Standard hours) —
  **none flagged Default**, though the table has a Default column and most
  other status-like tables set one.
- **Why it appears problematic:** New jobs may have no SLA unless a
  classification/call-type supplies one — and every Classification's
  Urgency column is also blank (E-012).
- **Operational consequence:** Possibly SLA-less reactive jobs by default.
  POSSIBLE DEFECT — NEEDS EXPERIMENT.
- **Evidence:** E-012.
- **Correction verified?** No.

## VI-006 — Classification/SLA wiring absent [CONFIGURATION INCONSISTENCY]

- **Configuration area:** Classifications, FM task types.
- **Observed state:** All 16 classifications are Reactive-typed with blank
  Urgency and zero values; FM task types (which map task type → Response
  category) is empty.
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
