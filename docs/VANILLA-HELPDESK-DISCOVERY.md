# Vanilla Helpdesk — Discovery Completion Report (structural baseline v1)

**Environment:** https://warwick.concertodemo.co.uk (Vanilla Concerto demo,
build `2026.08.9968-main`) · **Mode:** DISCOVER (read-only; nothing ever
persisted) · **Baseline frozen:** 2026-08-18, tag
`VANILLA-HELPDESK-STRUCTURAL-v1` · **Author:** Claude (Bellrock Labs) under
Warwick Allan's expanded discovery authority.

Every claim traces to evidence **E-001…E-018** in [`evidence/`](../evidence).
Machine-readable outputs: [`model/VANILLA-HELPDESK.json`](../model/VANILLA-HELPDESK.json)
(generated, validator green) and [`model/IDENTITIES.json`](../model/IDENTITIES.json)
(environment-observed GUIDs + canonical-key scheme). "With AMO" is excluded
throughout (Warwick's non-Vanilla addition). This report supersedes the
pre-E-015 edition; historical interpretations that later evidence revised
are stated only in their revised form (the registers keep the audit trail).

## 1. Complete Helpdesk Admin inventory

One admin page, Reactive/Planned Type filter, **43 tabs, all visited**;
17 populated, 18 empty (every rule/automation surface — Status rules,
Helpdesk rules, Appointment rules, Action routes, Email rules, Quote
rules/roles — ships EMPTY; Vanilla's only automation lives inside the
Action, Status and Quote-action objects themselves).

**A key correction from later evidence: the Action map is NOT a complete
representation of automation.** Cross-engine paths (quote engine → job
action; order-status triggers; AFP/approval triggers; creation defaults)
are invisible to it. Its "unreachable" warnings and "Not allocated"
grouping must be read with that limitation (VI-001/VI-002/VI-003/VI-007).

## 2–3. Configurators mapped and control counts

14 configurator schemas inventoried: Action (211–225 controls; composition
varies per action) · Helpdesk job type (57) · Status (51) · Classification
(31, nested-capable) · Response category (31) · Quote action (~90) · Email
rule (10) · Working time (10) · Tag (7) · Email template (subject+rich
body+13 merge tags) · Status rule (5) · Appointment rule (5) · Operative
status (4) · Action group (3) · Roles (6) · Action route/Override (4).

## 4. Reactive Vanilla baseline

9 statuses (With Helpdesk default; Closed/Cancelled shared), 39 applicable
actions **each individually configuration-mapped (E-015)**, entry via RH01
(the type default), SLA P1–P4 (2/24/48/72h; P1 linked to order priority
P1), the contractor loop driven by **order-status triggers** (Awaiting
acceptance→RH04-tagging, Accepted→T02, Appointment Made→T04,
Cancelled→G003, Closed→G004, order-approval→RH05, AFP-approval→T09) plus
the numbered Helpdesk tag ladder (01–09, colours captured), and the
**quote path closed**: RH06 → Quote Requested - R; quote engine RE01…RE05;
**RE05 fires RH03b against the original job → With Contractor - R**
(E-016). T03/T05/T06/T07 firing sources are not visible in configuration
(engine-internal; experiment E2/E3).

## 5. Planned Vanilla baseline

6 statuses, 36 applicable actions (PH/PM series + shared), entry via PH01
(type creation default — the source of the map's misleading "New PPM
unreachable" warning), same structural model as Reactive with a smaller
vocabulary; PPM-visit statuses set by PH03/PH06/PH07/PM01/PM02
(Ordered/Complete/Complete - Remedial). Planned orders default to project
(00002); Reactive to (00001).

## 6. Shared configuration

Closed/Cancelled statuses; all 9 operative statuses (object has no Type
dimension); the 50-action pool (partitioned by PPM applicability); 8
action groups; 20 tags (typed Helpdesk/Order/QuoteRequest — all
value-complete, **no TextMatch used anywhere**); order-status (11) and
PPM-visit (8) vocabularies; working time (Standard hours Mon–Fri
08:30–17:30); quote configuration; reference data.

## 7. Vanilla issue register (current classifications)

- VI-001 New PPM "unreachable" — **visualiser limitation** (creation
  default exists).
- VI-002 Business Case - R unreachable AND exitless — **strong anomaly**
  (T07 reaches it but nothing leaves it; E3 extension investigates).
- VI-003 Quote Requested - R — **downgraded: by-design cross-engine path +
  visualiser limitation** (RE05→RH03b).
- VI-004 action naming/sequence gaps; RH03b groupless — configuration
  inconsistency.
- VI-005 no default Response category — configuration inconsistency /
  possible defect (E6 tests consequence).
- VI-006 classification→SLA/asset wiring entirely unset — at BOTH levels
  of the classification tree (E-018).
- VI-007 grouped-view/form mismatches (LM01; PH05-from-With-Helpdesk;
  RH10≡RH11, PH02≡PH02a config twins) — configuration inconsistency.
- VI-008 **all five email templates are empty shells** (no subject, no
  body) — apparently unwired capability; if actions' email flags fire,
  content source is unknown (E2 observes).

## 8. Resolved unknowns

U-001 (With AMO), U-003 (operative statuses type-agnostic), U-004 ("Not
allocated" = hidden/machine-fired actions + VI-007 rendering), U-005
(quote→job bridge = RE05→RH03b), U-006 (no archived actions), U-008
(Suppress vs Hide; mobile uses Hide), U-010 (configurator inventoried),
U-011 (all tabs), U-013 (expiry lives on Status), U-014 (server-side
render-time conditionality), U-015 (non-Action configurators).

## 9. Remaining unknowns (all behavioural or minor)

U-002 (Cancelled open/closed semantics — E1) · U-007 (map warning logic —
NICE TO KNOW) · U-009 residual (T03/T05/T06/T07 trigger sources — E2/E3) ·
U-012 residual (constraints=prerequisites inference — E5) · minor residual
reads: one Lifts child classification (transient 502), classification
'resource' expander grids, remaining 8 parent + all child classification
forms (uniform pattern expected), full postback-dependency map.

## 10. Reproducibility matrix — three gates

Gates: **SCHEMA** (how Concerto exposes it) · **VALUE** (actual Vanilla
record values) · **BEHAVIOUR**, split into **PASSIVELY OBSERVED**
(footprints: the P2 SLA clock computation, the RH01 email failure) and
**CONTROLLED VERIFIED** (experiments — none yet).

Two accepted scope refinements (2026-08-19): (1) the operational Helpdesk
COMPOSES Helpdesk Admin configuration with shared/master configuration
from Sites, workforce, suppliers and presently-unmapped PPM sources — not
everything originates in Helpdesk Admin (PPM discipline / Statutory PPM
have no admin source, OD-004); (2) the action-visibility formula is
strongly supported by the sampled administrator/web surfaces, NOT
universally verified until role, Constraints and further contexts are
tested.

| Object family | SCHEMA | VALUE | BEHAVIOUR |
| --- | --- | --- | --- |
| Helpdesk job types | ✔ | ✔ | ✘ (E1) |
| Statuses | ✔ | ✔ (list+form flags; per-record role ticks unread) | ✘ (E1/E4) |
| Operative statuses | ✔ | ✔ (names; colours unread per record) | ✘ (E5) |
| Actions (50) | ✔ | ✔ (all 50 individually) | ✘ (E1/E2/E5) |
| Action groups | ✔ | ✔ (names; sort orders unread) | ✘ |
| Tags (20) | ✔ | ✔ (complete incl. colours/flags) | ✘ (E0/E2) |
| Response categories (SLA) | ✔ | ✔ (all 6 records) | ✘ (E6) |
| Classifications | ✔ (incl. nesting) | ◐ (tree complete; 8/16 parent forms read; children unread but uniform) | ✘ (E6) |
| Quote family | ✔ (action+process) | ✔ (RE05 + process + statuses; RE01–RE04/06/07 forms unread) | ✘ (E3) |
| Email templates | ✔ | ✔ (empty shells) | ✘ (E2) |
| Email/Status/Appointment/Helpdesk/Quote rules, Action routes | ✔ | ✔ (empty) | n/a (empty) |
| Roles | ✔ | ✔ | ✘ |
| Working time | ✔ | ✔ | ✘ (E6) |
| Reference data (audit/call/contact/root/complaint) | ✔ | ✔ (root causes 15/20 paged) | ✘ |

**Position:** the structural skeleton is SCHEMA+VALUE complete for every
family that materially affects reproduction, with small enumerated
residuals. **No family is BEHAVIOUR VERIFIED** — that is precisely the
EXPERIMENT programme's scope.

## 11. Items requiring persisted experimentation

See [`EXPERIMENT-PROGRAMME.md`](EXPERIMENT-PROGRAMME.md): E0 TextMatch ·
E1 lifecycle+Cancelled · E2 order/tag trigger engine · E3 quote bridge ·
E6 SLA defaulting · E5 mobile constraints · E4 status expiry (the only one
touching config — via a disposable ZZ status). Execution order
E0→E1→E2→E3→E6→E5→E4. **None may run without explicit approval.**

## 12. Stop state

Structural baseline frozen at tag `VANILLA-HELPDESK-STRUCTURAL-v1`.
Vanilla defects preserved as-is; no normalisation applied. Awaiting
Warwick's authority to enter EXPERIMENT mode.
