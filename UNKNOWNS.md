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

## Open

## U-002 — How do jobs terminate via Cancelled? [IMPORTANT]

- **Question:** Only "Closed" carries the Complete flag; "Cancelled" does
  not. Does a cancelled job count as open? What closes it?
- **Current evidence:** E-003 (flags), E-005 (G003 → Cancelled; only G001
  available from Cancelled).
- **Confidence:** UNKNOWN.
- **Safest experiment:** cancel a disposable ZZ TEST job in the EXPERIMENT
  phase and observe its open/closed reporting state.
- **Blocks automated build:** no.

## U-003 — Are operative statuses shared across Helpdesk Types? [IMPORTANT]

- **Question:** The same 9 records return under both Type filters — genuinely
  shared, or is the filter ignored on that tab?
- **Current evidence:** E-004.
- **Confidence:** UNKNOWN (shared is INFERRED).
- **Safest experiment:** open one operative-status record read-only and look
  for a Type field.
- **Blocks automated build:** no (but affects model shape).

## U-004 — What does "Not allocated" mean for an action? [IMPORTANT]

- **Question:** RH03b, T09, T06, LM01 sit under "Not allocated" in the
  grouped view. Unreachable? Fired by tags/quotes/other modules?
- **Current evidence:** E-005; E-007 (T06/T09 have user-selects edges, RH03b
  a sets edge, so they are not inert).
- **Confidence:** UNKNOWN.
- **Safest experiment:** inspect each action's record view (read-only) for
  its "Statuses in which this action can be selected" field.
- **Blocks automated build:** no.

## U-005 — How do jobs leave "Quote Requested - R" and "Business Case - R"? [BLOCKING]

- **Question:** Neither status offers any action in the grouped view, yet
  RH03b (Quote Ordered) → With Contractor - R exists unallocated, and the
  Quote* admin tabs (Quote actions/rules/status…) suggest a parallel quote
  workflow.
- **Current evidence:** E-005, E-002 (quote tabs), E-007.
- **Confidence:** UNKNOWN.
- **Safest experiment:** read the Quote actions / Quote rules / Helpdesk
  rules tabs (read-only) and the RH03b/T-actions record views.
- **Blocks automated build:** yes — a customer Reactive workflow cannot be
  reproduced without knowing how the quote path advances jobs.

## U-007 — Unreachability warnings vs drawn edges [NICE TO KNOW]

- **Question:** The Action map warns "New PPM" and "Business Case - R" are
  unreachable, yet draws PH01→New PPM and T07→Business Case - R sets-edges.
  What does its reachability logic count?
- **Current evidence:** E-007 (verbatim warning + edge list).
- **Confidence:** UNKNOWN.
- **Safest experiment:** none needed; ask Concerto support or read map help.
- **Blocks automated build:** no.

## U-008 — What does "suppressed / hidden" mean in the Action map? [IMPORTANT]

- **Question:** 26 of 50 actions (mostly mobile groups) appear only when
  "Show suppressed / hidden" is ticked. Which config field drives this?
- **Current evidence:** E-007.
- **Confidence:** UNKNOWN.
- **Safest experiment:** compare a suppressed action's record view with a
  visible one (read-only) — candidate: the RH04 "Status: Web page only"
  field (E-008).
- **Blocks automated build:** yes — visibility rules are part of a faithful
  customer build.

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

## U-010 — Configurator field inventory not yet performed [BLOCKING]

- **Question:** What does every tab/section/control of the Add/Edit Action
  screen contain (Phase 2d)? Also: enumerate values of the action "Status"
  field (seen: "Web page only"), timers/expiry, role restrictions,
  note/file requirements, bulk availability.
- **Current evidence:** E-008 (record-view summary only; Update button not
  yet followed into the edit form).
- **Confidence:** UNKNOWN.
- **Safest experiment:** open the Update form read-only next session and
  inventory every control without saving.
- **Blocks automated build:** yes — the configurator is where a customer
  build would be entered.

## U-011 — Remaining admin tabs uninventoried [IMPORTANT]

- **Question:** 40 of 43 Helpdesk admin tabs (Status rules, Helpdesk rules,
  Helpdesk job types, Roles, Working time, Appointment rules, Email rules,
  SLA-related tabs, Quote* family, …) have not been opened. Which contain
  Vanilla configuration that participates in the Reactive workflow?
- **Current evidence:** E-002 (tab list only).
- **Confidence:** UNKNOWN.
- **Safest experiment:** read each tab's list view (read-only), prioritising
  Status rules, Helpdesk rules, Roles, Working time, Helpdesk job types.
- **Blocks automated build:** yes for Status rules/Helpdesk rules; unknown
  for the rest.
