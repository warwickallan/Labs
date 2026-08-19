# Session log — Concerto Vanilla Discovery

Append-only. One entry per working session, newest first. Purpose: a fresh
session (or Warwick) can see at a glance what happened, where the evidence
is, and what was left open — without any conversation history. Keep entries
factual and short; deep detail belongs in the linked docs and commit bodies.

---

## 2026-08-20 — Studio: projects made real; private store; harness proven offline

**Projects now render their own configuration.** Opening a project shows that
project's model or says `PROJECT MODEL NOT YET INGESTED` — the silent Vanilla
fallback is gone, because a customer view containing another instance's
configuration is worse than an empty one. A project owns a Day-One baseline
and a CURRENT state expressed as Day-One plus its verified changes, so the
baseline cannot drift and every difference traces to a change receipt. Design
forks CURRENT, not Vanilla; Solution Design describes the engagement.

Generic lessons banked (no customer data in this repo):
- **Absence, ignorance and emptiness are different.** Models now carry
  `OBSERVED-ABSENT`, `PRESENT-DETAIL-NOT-OBSERVED`, `REFERENCED-NOT-
  ENUMERATED` and `NOT-CAPTURED`, and views render the distinction. An empty
  configuration family says "not captured", never "none".
- **Four acquisition routes, one format** — browser crawl, assisted/manual
  discovery, import, build read-back. Re-crawling an instance merely to
  satisfy the application is waste.
- **A discovery instance is a project too.** Where the canonical model was
  generated FROM an instance, using it for that instance is the capture, not
  a fallback — but it must be declared, fingerprint-checked, and carry its
  known deltas and gaps.

**Durable private project store built** (`apps/concerto-studio/store/`): data
outside the repo, refuses to start inside it, versions every save, commits to
a private git repo, never deletes, and reports its real durability. A store
test caught a real defect — two saves in the same second collided and
silently discarded a banked version.

**Harness proven end to end offline**: a fixture Concerto reproduces the DOM
conventions and the real adapter + crawlers run against it (21/21), including
byte-identical repeat crawls and loud failure on a wrong-record render. Only
authentication remains unproven — it needs a human to sign in.

Tests: Studio 66/66 · store 24/24 · harness offline 6/6 · end-to-end 21/21.

## 2026-08-20 — Studio: real instance ingest + stamped snapshot timeline

A project's views now render the **customer instance**, not the Vanilla
reference. `js/instance-ingest.js` converts a captured read-only crawl into
the standard model shape; `js/snapshots.js` turns a project's captures into a
**time-and-date stamped timeline** — pick a stamp to see that capture in every
view, or turn on *Changes only* to see what moved since the previous stamp
ringed in the Diagram/Matrix/Action Map above a written summary.

The differ (`js/diff.js`) learned to respect what a crawl could actually see.
An ingested model declares `meta.capture`, and comparison is scoped to the
covered Helpdesk Types, excludes fields the crawl never read, excludes actions
no grouped-by-status view can show (engine-fired ones), and excludes outcomes
the crawl recorded neither way — each exclusion counted and printed rather
than silently absorbed. Ambiguous source abbreviations are resolved only
against the baseline, or left unresolved and reported; nothing is guessed.

Result: the deltas previously written by hand in prose are now **computed**
from the capture — 1 action absent, 1 availability added, 6 availability
edges absent, all matching the manual analysis. Studio tests 46/46.
Generic knowledge only in this repo; customer captures stay git-ignored.

## 2026-08-19 — Vanilla is versioned; register reconciliations; Studio Projects

First real second-instance comparison (an implementation project against a
newer Vanilla deployment; customer identifiers held privately, NOT in this
repo). Generic knowledge banked:
- **docs/VANILLA-VERSIONING.md** — Vanilla is versioned, not one eternal
  golden config. Older Labs baseline vs a newer deployment differ materially
  (Orders re-seeded, 11 supplier actions not 13, no ORC10/SPWA, Quote +
  Business Case engines healthy, PH05 anomaly absent) — but the VI-009
  acceptance defect persisted. Projects must record which Vanilla baseline
  they started from.
- **VANILLA-ISSUES.md reconciliations:** VI-002 (Business Case-R) and VI-003
  (Quote Requested-R) RE-CLASSIFIED from "dead end" to VISUALISER / ACTION-MAP
  LIMITATION — both are engine-driven (Business Cases module; quote engine
  RE05→RH03b), the Action map just can't see the cross-engine lifecycle.
  VI-009 confirmed a PERSISTENT genuine current-Vanilla defect (SP01/SP02
  portal visibility + SP02 availability), corrected + read-back-verified in
  the implementation project. Historical structural evidence preserved
  throughout; only current interpretation updated. Frozen baseline untouched.
- **Studio Projects** feature integrated (project-centric app, current-project
  chip, versioned-Vanilla-aware), tests 30/30. Customer project data is
  git-ignored; ARCHITECTURE.md records the requirement for durable PRIVATE
  project storage (git-ignored must not mean un-backed-up).
No model/*.json changed; no customer data committed to this public repo.

## 2026-08-19 — Concerto Configuration Studio v0.1 (apps/concerto-studio/)

New tooling boundary: Labs is now knowledge (evidence/model) + tools
(apps/). Built the Studio as a self-contained zero-build browser app per
the Launch playbook (no Node on this machine): studio-schema (canonical
keys, PARSED-FROM-NOTES provenance), vanilla-loader (fetches
../../model/*.json READ-ONLY, normalises, deep-freezes, runs 18 pinned
fidelity invariants), left-nav shell, Overview dashboard, and four real
Vanilla views fed from the canonical models: Workflow Diagram (status
columns/action cards, Not-allocated machine-fired column, filters,
zoom/pan, inspector drawer), Action Map (three-lane, hover/pin-focused
edges — default draws none), Matrix (sortable 50-action grid),
Configuration (all families, both domains, cross-domain edges, graded
behaviours). Browser test suite PASS 14/14 against canonical data
(document.title reporting). Studio runtime dirs (data/snapshots/receipts)
git-ignored. No Concerto contact; Vanilla untouched; no evidence/model
files modified. Accepted architecture recorded in
apps/concerto-studio/docs/ARCHITECTURE.md (desired-state fork, pure diff,
staged build plan, harness-as-adapter, receipts + read-back).

Second pass same day: DESIGN mode v1 shipped — model.js (fork of the
frozen Vanilla, mutation API graded DESIGNED, JSON-snapshot undo/redo,
localStorage autosave, CUSTOMER-DESIRED-STATE.json export/import pinning
the baseline fingerprints), diff.js (pure Added/Removed/Modified differ +
deviation schedule; serves DESIGN now, Compare/Build later), and the
Diagram component gained an editable mode (drag card = move availability,
Alt-drag = copy, drop on Not-allocated = remove, ✕ affordances, + Status,
column-header drag reorder). Third pass: Findings engine (rules.js) —
computed, evidence-referenced rules recover VI-009 (SP01/ORC10 portal
gaps), the SP02/UO-002 availability contradiction, dead-end statuses
(BC-R + QR-R with its by-design note), circular entries (New PPM), VO-001
duplicates and VI-004 groupless actions from the loaded model; fixable
findings compile to a desired-state patch PREVIEW (3 ops; execution
disabled until the harness adapter exists). VI-010 could NOT be computed:
the canonical model does not carry per-action tag automation for GM06 —
recorded as a register-only finding and flagged as a candidate
build_model.py enhancement (models NOT modified).

Fourth pass (continuous build, Warwick-directed no-checkpoint-stops):
DESIGN completed (addAction/removeAction/modifyAction with rollback-safe
mutate; inspector edit section - resulting status per type, mobile,
button group, availability checklist; editable Grid with inline Mobile;
Diagram|Grid tabs; + Action). COMPARE page (object+field level, filters;
same engine will take a crawled instance). SOLUTION DESIGN generator
(soldesign.js - print-quality standalone HTML from the canonical model;
Vanilla + Customer editions, computed Deviation Schedule; register-quoted
facts marked; in-app preview/print/download). INSTANCE shell (persisted
URL, honest read-only Connect/Crawl, snapshot store) over the declared
harness adapter contract (harness-client.js; execute() refuses).
BUILD (buildplan.js staged compiler: create -> resolve GUIDs ->
relationships -> defaults/gated deletions -> read-back -> verify-empty;
validation warnings; unresolved identities; BUILD disabled). Diagram
user-selects chips decluttered. Tests 23/23 green against the real
models. NO Concerto contact; NO writes; Vanilla and evidence untouched.
Foundation for the agreed application is complete; next genuine step is
the Python browser-harness service (needs Playwright install + Warwick's
go-ahead) and Orders-domain editing.

## 2026-08-19 (repo-only rotate patch) — Final durability inconsistencies fixed

No browser work. E2's RH04 expectation corrected to With Contractor - R
(structural only); Rev-2 preamble no longer claims E1 used the reporter
wizard (E0 did; E1 used the admin quick-add modal). CURRENT_STATE marked
as Rotate Correction state with evidence E-001..E-024. build_model.py's
last stale U-003 wording removed (operative statuses are type-agnostic -
no Type field); model rebuilt. CLAUDE.md/README stripped of obsolete
DISCOVER-MODE/future-phase/scope-approval wording presented as current
(authority defers to CURRENT_STATE). VANILLA-ORDERS now carries
observedCode=SP07 for all four SP07 records with canonicalKey as the
internal disambiguator; schema/validator updated (+canonicalKey
uniqueness check) and annotated as structural/manual rather than full
JSON-Schema-engine validation. Validators green.

## 2026-08-19 (ROTATE CORRECTION) — Cold-review gaps closed

External review found the first rotate incomplete. Closed this pass:
(A) discovery tail - ALL 32 Orders Add-schemas captured incl. Budget
Category/13 controls with CIS pairing (EO-006); 7 Helpdesk residual Add
schemas + all 20 root causes + (+)-flag tag corrections (RH03b adds
01.Awaiting acceptance; LM01/T09 have NO tag automation; GM06 = VI-010
inverted tags) + classification resource grids empty (E-024).
(B) operating-model precision: RH04 is CONFIG not VERIFIED; mobile
allocation wording corrected to the status-gate formulation; 40/1
acceptance route marked UNKNOWN; VI-009 = FOUR field changes across three
actions. (C) stale docs reconciled: README/CLAUDE.md rewritten to
two-domain reality; Helpdesk report given a historical-snapshot banner;
Orders report updated (portal IS discovered); EXPERIMENT-PROGRAMME E2
rewritten as verification with VI-009 precondition, .invalid containment,
E1-route note, E4 wording; OD-005 resolved; UNKNOWNS debris removed;
VI-005/VI-006/VI-008 refreshed. (D) build_model.py no longer regenerates
stale claims (U-003/U-005/phase); VANILLA-ORDERS carries portalVisible
per supplier action + observedCode vs canonicalKey; IDENTITIES
canonical-key collision caveat. (E) vanilla-orders.schema.json +
validate_orders.py added (orders/cross-domain/behaviours now VALIDATE,
not merely parse).

## 2026-08-19 (FINAL ROTATE) — Knowledge consolidation and handoff

Cross-domain reconciliation completed (VI-009 precision: SP01/ORC10 =
portal-visibility gap only; SP02 = portal visibility AND availability
gaps; U-009 residual closed by Supplier Action links). Canonical
operating-model document written
(docs/CONCERTO-HELPDESK-ORDERS-OPERATING-MODEL.md) covering the five
surfaces, ten core objects, the full cross-domain loop, the two-gate
mobile model, three creation routes, and the 00000040/1 explanation.
Discovery techniques + lessons banked
(docs/DISCOVERY-TECHNIQUES-AND-LESSONS.md). All registers reconciled;
CURRENT_STATE rewritten as the cold-start handoff. Validators green.
E2 not begun; PPM not begun; Vanilla untouched. SAFE TO CLEAR issued.

## 2026-08-19 — Supplier Portal operational discovery (EO-005, read-only)

Portal mapped as the Orders-side operational surface: dashboard tiles,
order list (tabs incl. "Waiting to be acknowledged", parent-job columns/
filters), utility row menu, order detail (statutory PPM activity badges,
asbestos banner, appointments block), and the toolbar ACTIONS dropdown as
THE supplier action surface. Identity link recorded (X-018): order number
= parent job ref + /sequence. Rendering formula VALIDATED orders-side:
order 40/1 (AMO) shows exactly SP05 + SP07x2 (portal-flagged, in-status).
HEADLINE: VI-009/VO-002 - the acceptance loop is broken in Vanilla (SP01/
SP02/ORC10 have portal role flags but not portal visibility; Awaiting-
acceptance orders offer no accept/reject; confirmed against Warwick's
experience). E2 not begun; supplier behavioural testing not begun.

## 2026-08-19 — Orders core-four Add schemas (EO-004)

Per Warwick's 90%% steer: complete blank Add-form schemas captured for
Order Status (34 controls - incl. journal/consumable defaults, PPM review
pair, final-application/invoice-recall setters, remedial-action vocab),
Priority (20), Order Type (10 - note: 'default type for PPM orders' field
is unticked on BOTH records), and Supplier Action (114 controls - portal
role flags, per-status availability, tri-state field controls, PPM
review/certificate machinery, CAPI vocabulary, operative-status layer,
email merge tags, constraints). With EO-001/EO-002 record values the four
families are SCHEMA + VALUE complete.

## 2026-08-19 — ORDERS ADMIN DISCOVER complete (EO-001..EO-003)

All 32 Orders Admin tabs crawled read-only; 7 populated / 25 empty.
Priority families ALL record-complete: 11 Order Statuses (codes, semantic
flags, device/portal, AFP gates; Awaiting acceptance default), 7
Priorities (duplicate-Default anomaly VO-001; only P1 has deadlines), 2
Order Types, 11 Budget Categories (nominal codes; RM MECH default), 13
Supplier Actions individually read. KEY: Supplier Actions carry a direct
"Resulting action on the helpdesk status" link - the complete T-action
trigger map is structurally resolved (T02<-SP01, T03<-SP02, T04<-SP03,
T05<-ORC10/SP04/SP06, T06<-SP05, T07<-BC01; supplier completions fire
RH10/RH11/PH06/PH07). New artefacts: VANILLA-ORDERS.json,
CROSS-DOMAIN-RELATIONSHIPS.json (X-001..X-017),
docs/VANILLA-ORDERS-DISCOVERY.md. PPM references recorded, no PPM crawl.
E2 still not begun. Unknowns: UO-001 approval-level source, UO-002 SP02
contradiction.

## 2026-08-19 (rotate checkpoint) — Entering ORDERS ADMIN DISCOVER

Core Five audit accepted and banked (E-023, CORE-FIVE-COMPLETENESS.md).
Warwick identified Orders Admin as a missing prerequisite domain for E2
(the Helpdesk/Orders boundary). New phase: exhaustive structural discovery
of Orders Admin with mandatory domain separation (VANILLA-ORDERS model/
schema/evidence/report + CROSS-DOMAIN-RELATIONSHIPS for the edges).
Priority depth: Order Status, Priority, Order Types, Budget Categories,
Supplier Actions (highest - every record individually). PPM Scheduler and
supplier-facing surfaces: references only. E2 remains blocked.

## 2026-08-19 — Core Five completeness audit (E-023, read-only)

Warwick prioritised Job Types/Statuses/Actions/Classifications/Response
Categories as ~85%% of any Helpdesk build. Gaps closed: BOTH Job Type
records fully read (Reactive binds 9 statuses + default With Helpdesk +
5 SLA rows + RH01 + button text "Raise job"; Planned hides its add button
by configuration - "**DO NOT USE**" - binds 6 statuses + Planned SLA +
PH01, no default status). All 50 actions' record-view TAG AUTOMATION
lists captured (the complete numbered-tag choreography; a few (+)-flagged
entries need one re-read). ALL 90 classification records read (16 parents
+ 74 children): 100%% uniform - external-page + Reactive only, everything
else unwired (VI-006 full scope); children hold explicit values, no live
inheritance; the "502-obscured Lifts child" was a transient error row -
Lifts has exactly 3 children (E-018 corrected). CORE-FIVE-COMPLETENESS.md
matrix added. E2 not begun.

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
