# Session log — Concerto Vanilla Discovery

Append-only. One entry per working session, newest first. Purpose: a fresh
session (or Warwick) can see at a glance what happened, where the evidence
is, and what was left open — without any conversation history. Keep entries
factual and short; deep detail belongs in the linked docs and commit bodies.

---

## 2026-08-19 — Status-record matrix read (E-022, read-only)

All 13 Vanilla status records opened/cancelled: 'Will jobs in this status
appear on the mobile app' is TRUE only for With Maintenance Team and
With Maintenance Team - R - the status side of the two-flag Orchestrate
model confirmed. Bonuses: OD-001 confirmed (raise-order button flag
matches row menus exactly); AOA-R entry mechanism = status
unapproved-orders flag; WMT-R locked; WC-R work-complete+timesheet;
Cancelled is the orders-cancelled destination; no expiry or role ticks on
any status. Evidence: evidence/helpdesk-admin/011-status-records-matrix.md.
E2/E5 not begun.

## 2026-08-19 (checkpoint) — Durability/reorientation convergence before E2

Warwick-directed rotate-grade checkpoint without clearing. Added
CURRENT_STATE.md as the single short-lived wayfinder (phase, baseline tag,
fixtures, authorisation boundary, read order); CLAUDE.md reduced to the
durable contract pointing at CURRENT_STATE for mode/authority (standing
invariant: Vanilla immutable, ZZ fixtures only under authorised
experiments); README reconciled; UNKNOWNS reconciled (stale open blocks
for resolved items removed, U-002 updated from E1 with history preserved);
EXPERIMENT-PROGRAMME marks E0/E1 COMPLETE and E2 AWAITING AUTHORITY.
New machine-readable behaviour layer model/VERIFIED-BEHAVIOURS.json
(B-001..B-013, graded PASSIVELY_OBSERVED / CONTROLLED_VERIFIED, evidence-
referenced) kept separate from the frozen structural model. Continuation
order now CLAUDE.md -> CURRENT_STATE.md -> SESSION_LOG.md -> evidence/
registers -> git log. Validator green. E2 NOT begun.

## 2026-08-19 — E1 executed: Reactive lifecycle + Cancelled CONTROLLED VERIFIED

Jobs 00000053 (lifecycle) and 00000054 (cancel) created via the admin
quick-add form (RAISE JOB modal - the OD-005 answer: Urgency* required
there, SLA applied; reporter wizard remains SLA-less). Verified against
configuration, one action per step: RH01->With Helpdesk with EXACT
Standard-hours SLA arithmetic (P2: response Fri 14:30 = 24 working hrs
from Wed 08:30; completion Mon 08:30 = 3 working days); RH02->WMT-R with
tag 01 auto-added; RH03 self-loop with tag 01->03 swap; RH10->Work
Complete - R with actual-response capture and tag ->08; G004->Closed;
G003->Cancelled with the Reactive-tasks toolbar button disappearing.
U-002 largely resolved (Cancelled = terminal non-complete tab; type
counts include Closed/Cancelled). Evidence:
evidence/experiments/E1-reactive-lifecycle.md. Fixtures retained.
STOPPED before E2 per authorisation.

## 2026-08-19 — E0 executed: TextMatch CONTROLLED VERIFIED (positive)

First authorised persistence. Fixtures: tag "ZZ TEST textmatch tag"
(Helpdesk, TextMatch=zzmatchphrase) and job 00000052 (wizard-raised on
demo site Aintree - deviation: no ZZ site created, noted in evidence).
Result: the tag AUTO-ATTACHED to the job at creation ("Helpdesk Tags"
section on the job). Job also confirms wizard-raised jobs carry no SLA
fields. Evidence: evidence/experiments/E0-textmatch.md. Fixtures left in
place pending cleanup approval.

## 2026-08-19 — Operational Helpdesk surface discovery (E-019..E-021)

Warwick paused E0/E1 and commissioned mapping of the runtime Helpdesk UI.
Read-only throughout; Raise Job wizard walked to CONFIRM with transient
values then CANCELLED; job counts verified unchanged (16/19).

Landing: Reactive/Planned type tabs with per-status tab counts exactly
matching the frozen model; search filters mapped to admin families
(Response time is Type-filtered; Tag shows Helpdesk-type tags only); new
unexplained vocabularies: PPM discipline, Statutory PPM (OD-004). Row
Options menus for three statuses EXACTLY match configured availability
minus hidden/wrong-type actions (OD-002 positive validation); in-job
surface renders action GROUPS as toolbar dropdowns with identical sets.
Job detail exposes a v2 REST endpoint (GET /api/helpdesk/v2/job/<guid>),
asbestos banner, SLA-computed targets, and a passively observed "Email
failed to send" on RH01 (OD-006). Raise Job wizard: 9 steps, mandatory
location/description/access details, nested classification tiles, NO
urgency/call-type/assignment (OD-005 - wizard-raised jobs arrive without
SLA). Planned creation = list ACTIONS -> PH01 (no wizard).

New registers: OPERATIONAL-DISCREPANCIES.md (OD-001..OD-007).
EXPERIMENT-PROGRAMME.md revised (Rev 2). Model provenance now 21 evidence
files; validator green. STOPPED - awaiting EXPERIMENT-mode authority.

## 2026-08-18 (freeze) — Residual reads complete; structural baseline v1 frozen

Residual safe-read tail closed (E-017): all 20 tags VALUE COMPLETE (no
TextMatch used anywhere; colours/flags captured), all 5 email templates
are EMPTY SHELLS (VI-008), Roles record + schema, Action route Add schema,
Quote process values ("approved quote -> create brand new Helpdesk job"),
all 6 Response-category records (P1 carries description/workspace/order-
priority link). Per Warwick's steer, Classifications re-examined (E-018):
they are a NESTED taxonomy - hover expanders reveal "Further
classifications" child grids; full two-level tree captured (16 parents,
~85 children; one Lifts child obscured by transient 502); SLA/asset wiring
unset at both levels (VI-006 extended); a per-row 'resource' grid exists
(residual).

Completion report rewritten to current truth with THREE reproducibility
gates (SCHEMA/VALUE/BEHAVIOUR); Action map explicitly demoted to a partial
view of automation. EXPERIMENT-PROGRAMME.md written (E0-E6 with objects,
variables, containment, success criteria; order E0-E1-E2-E3-E6-E5-E4).
Registers reconciled (U-004 resolved; VI-008 added). Model rebuilt on 18
evidence files; validator green. Tagged VANILLA-HELPDESK-STRUCTURAL-v1.

**STOPPED per stop condition. Awaiting explicit approval to enter
EXPERIMENT mode. No ZZ TEST records have been created.**

## 2026-08-18 (session 2) — All 50 action configs read; quote→job bridge found

Re-signed-in session. Batched form_view extraction captured the Edit-form
configuration of every one of the 50 actions individually (E-015): per-
action triggers (order-status trigger map now explicit), mobile constraint
chains (Accept→Travel/Start→Hold/Complete), action routing (G005/GM02→
G001), per-action default order projects, and anomalies (VI-007: LM01
grouped-view mismatch; PH05 available from a Reactive status; RH10/RH11
and PH02/PH02a config-identical).

Quote action configurator inventoried (~90 controls) and RE05 read
(E-016): **"Action to be triggered against the original job" = RH03b —
U-005 (top blocker) RESOLVED structurally; VI-003 downgraded to by-design
+ visualiser limitation.** All forms cancelled unsaved. Model rebuilt (16
evidence files), validator green, pushed to GitHub.

Remaining safe residuals: tag colours per record, email template bodies,
Roles/Action-route/Quote-process small Add forms, T03/T05/T06/T07/RH03b
trigger sources (no visible trigger field — likely engine-internal;
experiment E2/E3). EXPERIMENT programme still awaiting approval.

## 2026-08-18 (remote) — GitHub adopted as canonical remote

Safety scrub run (pattern scan for passwords/keys/tokens/cookies/private
keys: zero hits; all 40 tracked files are discovery artefacts). .gitignore
added. Remote `origin` = github.com/warwickallan/Labs (public); the
repository's auto-generated initial commit merged in (local README kept),
full local history preserved and pushed to `main`. Nothing excluded from
publication; no secrets present.

## 2026-08-18 (final) — Add-form sweep, GM05/constraints, conditional UI; safe discovery complete

U-015 executed: blank Add forms inventoried and cancelled for Status (51
controls — includes the expiry mechanism `target_days` +
`status_expiry_action_id`, resolving U-013), Operative status (4 — NO Type
field: U-003 resolved, genuinely shared), Tag (7 — incl. description
TextMatch auto-tagging), Response category (31 — full SLA engine),
Helpdesk job type (57 — Type↔Status binding + SLA bindings + prefixes),
Status rule (5 — hub-conditional remap, NOT expiry), Email rule (10 —
action-triggered alerts), Appointment rule (5), Action group (3),
Classification (31 — the unset classification→SLA wiring of VI-006),
Working time (10). GM05 inspected in Edit mode (225 controls): mobile
actions use `hide_from_use` (refines U-008); hold via on/off-hold flag;
Constraints reference prerequisite actions GM01+GM04 (U-012 semantics
still inferred). Conditional-UI probe: resulting-status list filters
server-side at render from SAVED Resulting type (U-014).

Provenance now derived automatically in build_model.py (evidence range,
phase, date); IDENTITIES.json re-framed as environment-observed GUIDs with
a canonical-key scheme (per Warwick's mid-session refinements). Model
rebuilt, validator green (14 evidence files).

**Session ended by server-side logout with an unsaved form open — state
discarded, nothing persisted at any point.** Discovery Completion Report
written: docs/VANILLA-HELPDESK-DISCOVERY.md (incl. reproducibility matrix
and proposed experiment programme E1–E6, awaiting Warwick's approval).

Residual safe items for a future signed-in session: per-record value reads
(48 action forms, tag colours, template bodies), small Add forms (Roles,
Quote family, Action route), full postback-dependency mapping.

## 2026-08-18 (expanded authority) — Configurator inventoried; all 43 admin tabs crawled

Warwick granted expanded discovery authority (open Add/Edit forms, inspect
options; absolute no-persist boundary — nothing was saved, created,
deleted or altered; the one Edit form opened was closed via Cancel and
re-verified unchanged).

**Action configurator (E-009):** RH04 opened in Edit mode — all 211
controls inventoried across 12 sections with DOM ids, current values and
full dropdown vocabularies (12 order statuses, 9 PPM-visit statuses, etc.).
Stable GUIDs harvested for types/statuses/operative statuses/security
roles/mobile actions → `model/IDENTITIES.json`. Key discoveries: explicit
Suppress/Hide fields (closes U-008); actions can be order-status-triggered
(RH04 fires on orders → "Awaiting acceptance") — the contractor loop runs
on order statuses + tags (U-009 largely resolved structurally); per-action
timers are start/stop only; expiry lives in Status rules (empty in
Vanilla).

**Full crawl (E-010..E-012):** every remaining tab visited. Populated:
Helpdesk job types (Reactive→RH01 default type, Planned→PH01), Working
time (Standard hours Mon–Fri 08:30–17:30), Roles (1: Helpdesk role), Audit
status (5), Call types (3), Contact methods (5), Classifications (16 —
all Reactive, no urgency wiring), Complaint status (2), Email templates
(5), Operatives and sites (4), Response categories (SLA: P1 2h/1d … P4
72h/7d — no default), Root causes (20), Satisfaction surveys (1), Tags
(20, typed Helpdesk/Order/QuoteRequest), Quote family (process/8 RE
actions/5+2 statuses/2 categories/3 priorities). Empty: Status rules,
Helpdesk rules, Appointment rules, Action routes/Overrides, Email rules,
Quote rules/roles, Approvers, Areas, Assignees, Audit bandings, CAPEX,
FM task types, Hubs, Non working days, Notes/Warnings, SLA fail reasons,
Short titles, Trading affected.

**Registers:** VANILLA-ISSUES.md created (VI-001..VI-006; VI-001 downgraded
— PH01 is Planned's creation default). UNKNOWNS updated: U-008/U-010/U-011
resolved; U-012..U-015 opened (Constraints semantics, expiry mechanism,
conditional-UI map, non-Action Add/Edit forms). Model rebuilt (evidence
E-001..E-012), validator green.

**Left open:** U-005 (quote→job-status bridge — top blocker), U-012..U-015,
Planned parity beyond structure (largely evidenced en route), discovery
report (Phase 4), controlled-experiment plan. jsonschema still not
installed (validator uses structural fallback).

## 2026-08-18 (later) — Phases 0–1 complete; Phase 2 substantially advanced

Warwick signed in; discovery ran read-only throughout (no Save/create/
delete/edit; FIND/REPLACE and all ADD buttons untouched). Evidence captured
as structured text/DOM extractions (E-001..E-008) — the browser toolchain
cannot save binary screenshots to disk, so captures are text-based.

**Found and evidenced:**

- Helpdesk admin (`helpdesk_admin.aspx`) is the parent area: one page, 43
  configuration tabs, Type filter proving exactly two Helpdesk Types —
  **Reactive** and **Planned** (E-002). 8 action groups.
- **Job statuses (E-003):** 14 records; Reactive-only 7, Planned-only 4,
  **Closed + Cancelled shared** (both filters), default = With Helpdesk,
  only Closed flagged Complete. "With AMO" excluded — Warwick's own
  non-Vanilla addition (his correction, mid-session).
- **Operative statuses (E-004):** 9, identical under both Type filters.
- **Actions (E-005/E-006):** all 50 live actions (zero archived) with full
  attribute matrix; status→action availability per the grouped view.
- **Action/status map (E-007):** legend confirms the six relationship
  kinds; geometric SVG reconstruction (zero residual) recovered 93 avail +
  25 sets + 15 user-selects edges; **zero operative-status and zero
  auto-fire edges in Vanilla**. System warnings: New PPM and Business
  Case - R unreachable. 26 actions "suppressed/hidden" by default.
- **RH04 record view (E-008):** summary fields incl. "Status: Web page
  only", "Resulting type: Reactive", tag automation (adds 01. Awaiting
  acceptance / removes 02. Supplier rejected); configurator sections named.

**Model:** `scripts/build_model.py` builds `model/VANILLA-HELPDESK.json`
from E-001..E-008 (2 types, 15 status entries, 75 action entries, 137
relationships); validator green (round-trip + evidence integrity;
`jsonschema` not installed — structural fallback used).

**Left open (see UNKNOWNS.md):** U-002..U-011. Biggest: the Add/Edit Action
configurator field inventory (Phase 2d, U-010 — the Update form was not
entered this session), quote-path progression (U-005), tag automation
(U-009), the other 40 admin tabs (U-011), Planned parity check (Phase 3),
discovery report (Phase 4). Gates 1–3 substantially met for the list level;
4–6 partial; 8 ✔; 9 ✔; 7/10 pending.

## 2026-08-18 — Project scaffold created (no discovery yet)

Created the discovery repository from the investigation brief, following the
RLMCP conventions (`C:\Bellrock Labs\References`): CLAUDE.md (DISCOVER MODE
rules, confidence taxonomy, gates, rotate protocol), INVESTIGATION_PLAN.md
(Phases 0–4, Helpdesk Admin first, then Reactive detail, then Planned parity
check), UNKNOWNS.md register, capture templates, evidence tree, JSON Schema
for the model, model skeleton (metadata only — grows only from evidence),
and `scripts/validate_model.py` (gate 9: schema + serialize→reload→serialize
identity). Validator green. Git initialised, first commit.

**No contact with the TEST environment has produced evidence yet.** Blocked
on: a human signing in at https://warwick.concertodemo.co.uk/login.aspx
(Claude must not enter credentials).

**Left open:** Phase 0 onwards — everything in INVESTIGATION_PLAN.md.
