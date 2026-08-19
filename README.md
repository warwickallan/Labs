# Concerto Vanilla Discovery

A Bellrock-owned, evidence-driven discovery of the out-of-the-box (**Vanilla**)
Helpdesk configuration of Concerto, performed read-only against the supplied
TEST environment. Concerto remains the authoritative system; this repository
observes it and never changes it.

> **Phase: EXPERIMENT mode (suspended between experiments).** Structural
> discovery is complete and frozen at tag `VANILLA-HELPDESK-STRUCTURAL-v1`;
> the operational Helpdesk surface is mapped; experiments **E0 and E1 are
> CONTROLLED VERIFIED** (TextMatch; full Reactive lifecycle + Cancelled).
> Orders Admin + Supplier Portal are also structurally complete
> (VI-009: the Vanilla supplier acceptance loop is broken). E2+ await
> explicit authority. Current truth: [`CURRENT_STATE.md`](CURRENT_STATE.md);
> canonical explainer: [`docs/CONCERTO-HELPDESK-ORDERS-OPERATING-MODEL.md`](docs/CONCERTO-HELPDESK-ORDERS-OPERATING-MODEL.md).
> Reports: [`docs/VANILLA-HELPDESK-DISCOVERY.md`](docs/VANILLA-HELPDESK-DISCOVERY.md) ·
> [`docs/EXPERIMENT-PROGRAMME.md`](docs/EXPERIMENT-PROGRAMME.md) ·
> behaviours: [`model/VERIFIED-BEHAVIOURS.json`](model/VERIFIED-BEHAVIOURS.json).

**TEST environment:** https://warwick.concertodemo.co.uk/login.aspx

## What this is

An evidence-backed, machine-readable definition of Vanilla Concerto
configuration across TWO domains — **Helpdesk Admin** (43 tabs) and
**Orders Admin** (32 tabs) — plus their operational surfaces (Helpdesk UI,
Supplier Portal) and the explicit cross-domain relationship map. Vanilla
configuration is never modified; disposable `ZZ TEST` fixtures exist only
where authorised experiments (E0/E1, both complete) required them.

## Domain map

```
Helpdesk Admin (43 tabs)  ── model/VANILLA-HELPDESK.json  (frozen tag v1)
Orders  Admin (32 tabs)   ── model/VANILLA-ORDERS.json
Cross-domain edges        ── model/CROSS-DOMAIN-RELATIONSHIPS.json
Behaviour (graded)        ── model/VERIFIED-BEHAVIOURS.json
Canonical explainer       ── docs/CONCERTO-HELPDESK-ORDERS-OPERATING-MODEL.md
```

## Deliverables

| Deliverable | Location | Status |
| --- | --- | --- |
| Helpdesk model | [`model/VANILLA-HELPDESK.json`](model/VANILLA-HELPDESK.json) | generated; validator green; evidence E-001..E-024 |
| Orders model | [`model/VANILLA-ORDERS.json`](model/VANILLA-ORDERS.json) | validated; evidence EO-001..EO-006 |
| Cross-domain map | [`model/CROSS-DOMAIN-RELATIONSHIPS.json`](model/CROSS-DOMAIN-RELATIONSHIPS.json) | X-001..X-018 |
| Behaviour layer | [`model/VERIFIED-BEHAVIOURS.json`](model/VERIFIED-BEHAVIOURS.json) | E0/E1 CONTROLLED VERIFIED + passives |
| Registers | UNKNOWNS · VANILLA-ISSUES · OPERATIONAL-DISCREPANCIES · CORE-FIVE-COMPLETENESS | reconciled 2026-08-19 |

## Repository map

```
CLAUDE.md              durable operating contract (read first, every session)
CURRENT_STATE.md       current phase/authority wayfinder
INVESTIGATION_PLAN.md  historical phased plan (original Helpdesk brief)
SESSION_LOG.md         append-only per-session record
UNKNOWNS.md            prioritised unknowns register
model/                 the machine-readable Vanilla model (grows only from evidence)
schemas/               JSON Schemas the model must validate against
evidence/              screenshots + capture notes, one predictable tree
templates/             capture templates (field catalogue, status, action)
scripts/               validation and (later) comparison tooling
docs/                  discovery report and supporting notes
```

## Operating rules (summary — full rules in CLAUDE.md)

- Read-only. No Save, no create, no delete, no edit, no actions against live
  jobs, no status/role/timer/workflow changes.
- Every discovered fact carries a confidence state:
  `VERIFIED — OBSERVED` / `VERIFIED — STRUCTURAL` / `INFERRED` / `UNKNOWN`.
  Unknown is acceptable; silent upgrading of inference to fact is not.
- Configuration truth and behaviour truth are recorded separately.
- The TEST environment is authoritative over any documentation.
- Every important claim traces to evidence in `evidence/`.
- Claude never enters credentials; a human performs sign-in.

## Future direction

The model is **deviation-ready**: structured so a later phase can diff a
customer design against Vanilla (Added / Removed / Modified / Unchanged for
statuses, actions, relationships, defaults, permissions, behaviour settings).
Customer builds are out of scope now.

---

Bellrock internal. Not for external distribution.
