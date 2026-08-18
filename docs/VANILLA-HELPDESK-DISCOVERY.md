# Vanilla Helpdesk — Discovery Completion Report

**Environment:** https://warwick.concertodemo.co.uk (Vanilla Concerto demo,
build `2026.08.9968-main`) · **Mode:** DISCOVER (read-only; nothing
persisted) · **Date:** 2026-08-18 · **Author:** Claude (Bellrock Labs),
under Warwick Allan's expanded discovery authority.

Every claim below traces to evidence files E-001…E-014 in [`evidence/`](../evidence);
the machine-readable model is [`model/VANILLA-HELPDESK.json`](../model/VANILLA-HELPDESK.json)
(built by [`scripts/build_model.py`](../scripts/build_model.py), validator green)
with identities in [`model/IDENTITIES.json`](../model/IDENTITIES.json).
"With AMO" is excluded throughout (Warwick's non-Vanilla addition).

## 1. Complete Helpdesk Admin inventory

One admin page (`helpdesk_admin.aspx`) with a Reactive/Planned Type filter
and **43 tabs**, all visited:

- **Populated (17):** Action groups (8) · Actions (50 live, 0 archived) ·
  Audit status (5) · Call types (3) · Contact methods (5) · Classifications
  (16) · Complaint status (2) · Email templates (5) · Helpdesk job types
  (2) · Operative statuses (9) · Operatives and sites (4) · Quote actions
  (8) / categories (2) / priorities (3) / processes (1) / Request statuses
  (5) / statuses (2) · Response categories (6) · Roles (1) · Root causes
  (20) · Satisfaction surveys (1) · Statuses (14 incl. non-Vanilla With
  AMO) · Tags (20) · Working time (1).
- **Empty (18):** Status rules · Helpdesk rules · Appointment rules ·
  Action routes/Overrides · Email rules · Quote rules · Quote roles ·
  Approvers · Areas · Assignees · Audit bandings · CAPEX codes · FM task
  types · Hubs · Non working days · Notes/Warnings · SLA fail reasons ·
  Short titles · Trading affected.

**Every rule/automation surface ships empty.** Vanilla's only automation is
what is embedded in the Action and Status objects themselves.

## 2–3. Configurators mapped and control counts

| Configurator | Mode | Controls |
| --- | --- | --- |
| Action (RH04) | Edit | 211 |
| Action (GM05) | Edit | 225 (composition varies by action) |
| Helpdesk job type | Add | 57 |
| Status | Add | 51 |
| Classification | Add | 31 |
| Response category | Add | 31 |
| Email rule | Add | 10 |
| Working time | Add | 10 |
| Tag | Add | 7 |
| Status rule | Add | 5 |
| Appointment rule | Add | 5 selects |
| Operative status | Add | 4 |
| Action group | Add | 3 |

All Add/Edit forms were cancelled; the closing session logout discarded the
final unsaved form. Not inventoried (small residuals): Roles, Quote
action/process/status forms, Action route, Call type, Contact method, Audit
status, Complaint status, Root cause, Email template body.

## 4. Reactive Vanilla baseline

- **Statuses (9):** With Helpdesk (default) · With Maintenance Team - R ·
  Awaiting Order Approval - R · With Contractor - R · Quote Requested - R ·
  Business Case - R · Work Complete - R · Closed* · Cancelled* (*shared).
- **Entry:** job type Reactive (the default type) creates via **RH01. New
  Reactive Task** → With Helpdesk; RH01 is the only default-for-user/
  helpdesk action.
- **Actions:** 39 applicable (Non-planned-only + All-jobs), including the
  RH-series workflow, RM/GM/LM mobile series, G-series generals and
  T-series tag/auto actions. Full attribute matrix in E-006.
- **SLED/SLA:** Response categories P1–P4 (2h/24h/48h/72h response; 1/3/5/7
  day repair) on Standard hours (Mon–Fri 08:30–17:30) — none default.
- **Contractor loop (configuration truth):** RH04 assigns supplier, emails
  them, adds tag "01. Awaiting acceptance", and its trigger field fires on
  orders reaching "Awaiting acceptance"; T-actions mirror the 11-value
  order-status vocabulary; RH05 approves orders from Awaiting Order
  Approval - R.

## 5. Planned Vanilla baseline

- **Statuses (6):** New PPM · With Maintenance Team · With Contractor ·
  PPM Complete · Closed* · Cancelled*.
- **Entry:** job type Planned creates via **PH01. New PPM** → New PPM.
- **Actions:** 36 applicable (Planned-only PH/PM series + All-jobs).
  Structure mirrors Reactive (assign team/contractor → complete → close);
  no quote/business-case path, no hold statuses (hold is a flag not a
  status in both types).
- **Parity verdict:** Planned follows the same structural model as Reactive
  with a smaller vocabulary; differences are data (fewer statuses/actions),
  not architecture. VERIFIED — STRUCTURAL.

## 6. Shared configuration

Statuses Closed and Cancelled (single records, both Type boxes ticked);
all 9 operative statuses (the object has no Type dimension at all);
the 50-action pool (partitioned only by PPM-applicability); action groups;
tags; order-status and PPM-visit vocabularies; working time; SLA table
(per-record Type checkboxes); audit/complaint/contact/call-type reference
data.

## 7. Vanilla issue register (current)

See [`VANILLA-ISSUES.md`](../VANILLA-ISSUES.md): VI-001 New PPM
"unreachable" (downgraded: creation-default path exists; residual =
visualiser limitation) · VI-002 Business Case - R unreachable AND without
exit actions (strong anomaly) · VI-003 Quote Requested - R has no exit
actions; RH03b unallocated (possible defect, needs experiment) · VI-004
action naming/sequence gaps; RH03b has no button group · VI-005 no default
SLA row · VI-006 classification→SLA wiring exists but is entirely unset.

## 8. Resolved unknowns

U-001 (With AMO = user addition) · U-003 (operative statuses type-agnostic)
· U-006 (no archived actions) · U-008 (Suppress vs Hide fields; mobile
actions use Hide) · U-010 (configurator inventoried) · U-011 (all tabs
visited) · U-013 (expiry lives on Status: `target_days` +
`status_expiry_action_id`; Status rules are hub remaps) · U-014
(status-list filtering is server-side render-time from saved Resulting
type) · U-015 (9 further configurators inventoried).

## 9. Remaining unknowns

U-002 (Cancelled jobs' open/closed semantics) · U-004 ("Not allocated"
actions' reachability) · **U-005 (the quote-workflow → job-status bridge —
top blocker)** · U-007 (map warning logic) · U-009 residual (runtime tag
mechanics) · U-012 residual (Constraints semantics — observed GM05 requires
GM01+GM04; prerequisite reading is inferred) · residual small Add forms.

## 10. Reproducibility matrix (Blank Helpdesk → deterministic Vanilla build)

| Object | Classification | Basis / gap |
| --- | --- | --- |
| Helpdesk job types | REPRODUCIBLE | Full Add form + both records' values known |
| Statuses | REPRODUCIBLE | 51-field form; flags/sort/type/expiry known per record (per-record role ticks unverified) |
| Operative statuses | REPRODUCIBLE | 4-field object; 9 names known (colours unverified per record) |
| Action groups | REPRODUCIBLE | 3-field object; 8 names known (sort orders unverified) |
| Actions | PARTIALLY REPRODUCIBLE | Full schema + list attributes + 2 records in depth; remaining 48 records' full form values not read individually |
| Tags | REPRODUCIBLE | 7-field object; 20 records with types (colours/TextMatch per record unverified) |
| Response categories | REPRODUCIBLE | Full form + all 6 records' core values |
| Classifications | PARTIALLY REPRODUCIBLE | Full form; 16 records' names known, per-record fields (budget etc.) unread |
| Working time | REPRODUCIBLE | Form + the single record |
| Quote family | PARTIALLY REPRODUCIBLE | List-level values; Add forms not inventoried |
| Rule surfaces (7 kinds) | REPRODUCIBLE | Empty in Vanilla — "create nothing" + schemas captured |
| Reference data (audit/call/contact/root/complaint/templates) | PARTIALLY REPRODUCIBLE | Names/flags known; per-record detail (template bodies!) unread |
| Behavioural semantics | NOT YET REPRODUCIBLE | Requires EXPERIMENT phase |

Overall: the **structural skeleton of Vanilla is now largely reproducible**;
the gaps are per-record field values for the long tail (readable safely in
a future session) and all runtime semantics.

## 11. Items now requiring persisted experimentation

Quote-path progression (does completing the quote lifecycle move the job?
does RH03b fire?) · order-status triggers actually firing T-actions · tag
add/remove at runtime · status expiry firing `status_expiry_action_id` ·
email despatch (rules/templates) · mobile Constraints enforcement ·
pause/travel clock behaviour · Cancelled-job reporting state · default-SLA
behaviour when none is flagged (VI-005).

## 12. Proposed Controlled Experiment programme (ordered by value ÷ risk)

All experiments on disposable `ZZ TEST` site/jobs, one variable at a time,
evidence captured before/after, **each requires Warwick's explicit
approval before any record is saved**:

1. **E1 — Reactive lifecycle walk-through** (highest value, low risk):
   create one ZZ TEST job, run RH01→RH02→RH03→RH10→G004; verify statuses,
   tags, timeline. Resolves U-002 partially, validates the core model.
2. **E2 — Contractor/order loop:** RH04 on a ZZ job with a ZZ supplier; observe
   order creation, order-status changes, T-action firing, tag movement
   (resolves U-009, VI-002 partially). Medium risk (emails — use a dead
   supplier email).
3. **E3 — Quote path:** RH06 then drive the RE-actions; observe whether/how
   the job leaves Quote Requested - R and whether RH03b fires (resolves
   U-005/VI-003).
4. **E4 — Status expiry:** set `target_days=0→1` on a ZZ-only test status
   (or observe an existing one) with a harmless expiry action (needs a
   dedicated ZZ status to avoid touching Vanilla records).
5. **E5 — Mobile constraints:** on Orchestrate, attempt GM05 before/after
   GM01/GM04 (resolves U-012).
6. **E6 — SLA defaulting:** raise ZZ jobs with/without classification and
   observe target dates (resolves VI-005/VI-006 consequence).

---

*Session end note: discovery stopped when the demo environment logged the
session out (safe — unsaved state discarded). Residual safe-discovery
items (per-record value reads, small Add forms, quote-action forms) can be
finished in a future session before E1.*
