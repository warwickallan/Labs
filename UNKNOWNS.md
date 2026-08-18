# Unknowns register — Concerto Vanilla Discovery

Prioritised, append-as-discovered. An UNKNOWN here is a first-class result,
not a failure. Do not spend hours resolving items that will never be needed
to build a customer Helpdesk.

Priorities: **BLOCKING** (prevents a future automated customer build) ·
**IMPORTANT** (materially affects understanding) · **NICE TO KNOW**.

---

## Resolved

- **U-001 — "With AMO" status matched neither Type filter.** Resolved
  2026-08-18 by Warwick: it is his own non-Vanilla addition to the TEST
  system. Excluded from the Vanilla baseline everywhere.
- **U-006 — Do archived actions exist?** Resolved 2026-08-18: the Archived
  actions filter returns zero records; the 50 live actions are the complete
  set (E-006).
- **U-008 — Meaning of "suppressed / hidden" in the Action map.** Resolved
  structurally 2026-08-18: the action form carries explicit "Suppress this
  action" and "Hide this action from the user options" checkboxes (E-009).
  Which of the two the map keys on remains minor residual unknown.
- **U-010 — Configurator field inventory.** Resolved 2026-08-18: all 211
  controls of the Add/Edit Action form inventoried with DOM ids and full
  option lists (E-009). Conditional-UI mapping (which controls toggle
  which) remains open as U-014.
- **U-011 — Remaining admin tabs.** Resolved at list level 2026-08-18: all
  43 tabs visited (E-010, E-011, E-012). Add/Edit forms of non-Action
  objects not yet inventoried (U-015).
- **U-003 — Operative statuses shared?** RESOLVED 2026-08-18: the Add form
  has no Type field at all — operative statuses are structurally
  type-agnostic (E-013).
- **U-013 — Expiry mechanism.** RESOLVED structurally 2026-08-18: expiry is
  configured on the Status object (`target_days` + `status_expiry_action_id`
  over all 50 actions); Status rules are hub-conditional remaps instead
  (E-013, E-014). Runtime firing behaviour still needs the EXPERIMENT phase.
- **U-014 — Conditional UI.** Substantially resolved: the resulting-status
  list is filtered server-side at form render from the SAVED Resulting
  type; no client-side dynamic dependency observed (E-014). Full
  postback-dependency mapping deferred.
- **U-015 — Non-Action Add/Edit inventories.** Substantially resolved:
  9 further configurators inventoried (Status 51 controls, Operative status
  4, Tag 7, Response category 31, Helpdesk job type 57, Status rule 5,
  Email rule 10, Appointment rule 5, Action group 3, Classification 31,
  Working time 10) (E-013, E-014). Residual small forms listed in E-014.

## Open

*(U-005 resolved 2026-08-18, second session: RE05 "Raise Order" carries
"Action to be triggered against the original job" = RH03b. Quote Ordered —
the quote engine fires RH03b, moving the job to With Contractor - R.
E-016. Runtime confirmation = experiment E3.)*

## U-002 — How do jobs terminate via Cancelled? [IMPORTANT]

- **Question:** Only "Closed" carries the Complete flag; "Cancelled" does
  not. Does a cancelled job count as open? What closes it?
- **Current evidence:** E-003 (flags), E-005 (G003 → Cancelled; only G001
  available from Cancelled).
- **Confidence:** UNKNOWN.
- **Safest experiment:** cancel a disposable ZZ TEST job in the EXPERIMENT
  phase and observe its open/closed reporting state.
- **Blocks automated build:** no.

## U-004 — What does "Not allocated" mean for an action? [IMPORTANT]

- **Question:** RH03b, T09, T06, LM01 sit under "Not allocated" in the
  grouped view. Unreachable? Fired by tags/quotes/other modules?
- **Current evidence:** E-005; E-007 (T06/T09 have user-selects edges, RH03b
  a sets edge, so they are not inert).
- **Confidence:** UNKNOWN.
- **Safest experiment:** inspect each action's record view (read-only) for
  its "Statuses in which this action can be selected" field.
- **Blocks automated build:** no.

## U-007 — Unreachability warnings vs drawn edges [NICE TO KNOW]

- **Question:** The Action map warns "New PPM" and "Business Case - R" are
  unreachable, yet draws PH01→New PPM and T07→Business Case - R sets-edges.
  What does its reachability logic count?
- **Current evidence:** E-007 (verbatim warning + edge list).
- **Confidence:** UNKNOWN.
- **Safest experiment:** none needed; ask Concerto support or read map help.
- **Blocks automated build:** no.

## U-009 — Tag automation semantics [IMPORTANT]

- **Question:** RH04 adds tag "01. Awaiting acceptance" and removes
  "02. Supplier rejected". How do tags trigger Tag/Auto (T*) actions — e.g.
  does T02 Accepted fire when the supplier accepts, clearing the tag?
- **Current evidence:** E-008; Tags tab exists (E-002); T-actions in E-005.
- **Confidence:** UNKNOWN (mechanism INFERRED).
- **Safest experiment:** read the Tags and Helpdesk rules tabs and each
  T-action record view (read-only).
- **Blocks automated build:** yes — the reactive contractor loop appears to
  run on tags.

## U-012 — Action "Constraints" semantics [IMPORTANT]

- **Question:** The configurator's Constraints section lists the 18 mobile
  actions as checkboxes (all unticked for RH04). Constrains what, exactly —
  ordering? mutual exclusion? prerequisites?
- **Current evidence:** E-009.
- **Confidence:** UNKNOWN.
- **Safest experiment:** inspect a mobile action (e.g. GM04) in Edit mode —
  its Constraints ticks may reveal the pattern; help text if any.
- **Blocks automated build:** yes (mobile flows).

## U-013 — Status-expiry / timed-transition mechanism [IMPORTANT]

- **Question:** The map legend includes "Auto-fires on status expiry", but
  no action-form field configures expiry. Status rules (Name · Hub ·
  Original status · Status to be changed to) is the likely home — and is
  empty in Vanilla. Is that the whole mechanism?
- **Current evidence:** E-007, E-009, E-010.
- **Confidence:** INFERRED (Status rules = the expiry/transition surface).
- **Safest experiment:** open Status rules → Add New and inventory the
  blank configurator (authorised, then Cancel).
- **Blocks automated build:** no for Vanilla (empty), yes for customers.

## U-014 — Conditional UI map of the action configurator [IMPORTANT]

- **Question:** Which controls show/hide/enable others (e.g. Resulting
  type → filters the resulting-status list, observed E-009)?
- **Safest experiment:** vary unsaved controls in an open form and record
  appear/disappear behaviour (authorised; classify as structural UI truth).
- **Blocks automated build:** partially — needed to enter config reliably.

## U-015 — Add/Edit forms of non-Action objects [IMPORTANT]

- **Question:** Field-level inventories for Status, Operative status, Tag,
  Response category, Quote action, Helpdesk job type, Email template, etc.
  (list-level only so far).
- **Safest experiment:** open each object's record/Add form read-only and
  inventory (authorised, Cancel after).
- **Blocks automated build:** yes — these are the remaining build surfaces.
