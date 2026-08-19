# CURRENT_STATE — authoritative wayfinder (short-lived; supersedes stale phase text elsewhere)

> Read order for a cold session: **CLAUDE.md → this file → SESSION_LOG.md →
> the evidence/registers named below → `git log`.** This file states the
> CURRENT truth; history lives in SESSION_LOG and git.

- **Updated:** 2026-08-19 (ORDERS ADMIN DISCOVER complete; stopped).
- **Phase/mode:** **ORDERS ADMIN DISCOVER** — structural discovery of the
  Orders configuration domain (read-only: Add/Edit forms opened and
  CANCELLED, transient unsaved probes allowed, nothing persisted).
  E2 is BLOCKED until Orders structural truth exists. Standing rule
  unchanged: never modify Vanilla; ZZ fixtures only under authorised
  experiments. Domain separation mandatory: Orders artefacts live in
  model/VANILLA-ORDERS.json, schemas/vanilla-orders.schema.json,
  evidence/orders-admin/, docs/VANILLA-ORDERS-DISCOVERY.md; Helpdesk↔Orders
  edges in model/CROSS-DOMAIN-RELATIONSHIPS.json. Do NOT fold Orders into
  VANILLA-HELPDESK.json. PPM Scheduler and supplier-facing surfaces:
  record references only, no crawl/testing yet.
- **Frozen structural baseline:** tag `VANILLA-HELPDESK-STRUCTURAL-v1` =
  `705ca2a11001b610bffaf30da6447475bea91675` (immutable; raw discovered
  structure, defects unrepaired).
- **Current HEAD:** see `git log -1` (this checkpoint commit). Remote:
  github.com/warwickallan/Labs, branch `main` (public — no secrets ever).

## Completed

- Discovery: all 43 Helpdesk-admin tabs; 14+ configurator schemas; all 50
  actions individually configuration-mapped; nested classification
  taxonomy; operational Helpdesk surface (E-019..E-021); evidence
  E-001..E-021; registers UNKNOWNS / VANILLA-ISSUES /
  OPERATIONAL-DISCREPANCIES.
- Experiments: **E0 (TextMatch) ✔ CONTROLLED VERIFIED** (commit 4373790);
  **E1 (Reactive lifecycle + Cancelled) ✔ CONTROLLED VERIFIED** (commit
  781af1f). Behavioural claims: `model/VERIFIED-BEHAVIOURS.json`.

## Retained ZZ TEST fixtures (cleanup needs separate approval)

- Tag "ZZ TEST textmatch tag" (Helpdesk, TextMatch=zzmatchphrase).
- Jobs 00000052 (With Helpdesk), 00000053 (Closed), 00000054 (Cancelled)
  on demo site Aintree/S0001.

## Authorisation boundary (explicit)

- E0, E1: executed and closed.
- **E2 (contractor/order/tag engine): AWAITING WARWICK'S AUTHORITY — do
  not begin.** E3–E6 likewise unauthorised. Vanilla configuration remains
  immutable under all circumstances.

## Next permitted step

Orders Admin crawl COMPLETE (EO-001..EO-003; VANILLA-ORDERS.json;
CROSS-DOMAIN-RELATIONSHIPS.json X-001..X-017). Awaiting Warwick's word on:
(a) Supplier Helpdesk operational discovery (proposed, read-only), then
(b) E2. Both BLOCKED until authorised.

## Important unresolved items

- U-009 residual: T03/T05/T06/T07 trigger sources (E2/E3).
- U-012 residual: Constraints=prerequisites inference (E5). Per-status
  mobile flags now READ (E-022): only WMT and WMT-R download to the app.
- VI-002 (Business Case - R dead end), VI-005/VI-006 (SLA wiring — E6),
  VI-008 (empty email templates; email delivery fails in this
  environment, OD-006).
- Minor residuals listed in UNKNOWNS.md "Open" preamble.

## Core Five status

CORE-FIVE-COMPLETENESS.md: all five families SCHEMA + VALUES + OPERATIONAL
complete with named residuals; behaviour partial pending E2-E6.

## Files to read next (by task)

- Experiment execution: `docs/EXPERIMENT-PROGRAMME.md`,
  `evidence/experiments/`.
- Configuration questions: `model/VANILLA-HELPDESK.json`,
  `model/IDENTITIES.json`, `evidence/reactive-helpdesk/actions/004-*`.
- Behaviour claims: `model/VERIFIED-BEHAVIOURS.json`.
- Operational UI: `evidence/helpdesk-runtime/`, OPERATIONAL-DISCREPANCIES.md.
