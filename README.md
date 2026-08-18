# Concerto Vanilla Discovery

A Bellrock-owned, evidence-driven discovery of the out-of-the-box (**Vanilla**)
Helpdesk configuration of Concerto, performed read-only against the supplied
TEST environment. Concerto remains the authoritative system; this repository
observes it and never changes it.

> **Phase: DISCOVER MODE — not started.** The scaffold, schemas, evidence
> structure and rules exist; no discovery evidence has been captured yet.
> Discovery cannot begin until a human signs in to the TEST environment
> (Claude never enters credentials).

**TEST environment:** https://warwick.concertodemo.co.uk/login.aspx

## What this is

The first bounded objective of the Concerto programme: establish an
evidence-backed, machine-readable definition of the Vanilla Helpdesk
configuration — statuses, actions, transitions, defaults, roles, timers —
under **Helpdesk Admin**, covering its **Helpdesk Types** (at minimum
Reactive and Planned; discover what actually exists).

This is a **read-only discovery exercise**. Nothing is configured, corrected,
improved, rationalised or redesigned during this phase. Behavioural
experiments belong to a later, separately approved EXPERIMENT phase using
disposable `ZZ TEST` objects.

## Discovery hierarchy

```
Helpdesk Admin                      ← parent configuration area (discover first)
    ├── Helpdesk Type: Reactive    ← first detailed discovery target
    │      statuses / actions / relationships / operative statuses /
    │      mobile / roles / timers / defaults / other type-specific config
    └── Helpdesk Type: Planned     ← inspect enough to judge structural parity
           (full discovery only if required or instructed)
```

Do not assume configuration seen under Reactive applies to Planned, nor that
identically named objects are identically configured across types.

## Deliverables

| Deliverable | Location | Status |
| --- | --- | --- |
| Machine-readable Vanilla model | [`model/VANILLA-HELPDESK.json`](model/VANILLA-HELPDESK.json) | skeleton |
| Model schema | [`schemas/vanilla-helpdesk.schema.json`](schemas/vanilla-helpdesk.schema.json) | v1 |
| Human-readable discovery report | `docs/VANILLA-HELPDESK-DISCOVERY.md` | not started |
| Unknowns register | [`UNKNOWNS.md`](UNKNOWNS.md) | empty |
| Evidence repository | [`evidence/`](evidence) | empty tree |
| Round-trip / schema validator | [`scripts/validate_model.py`](scripts/validate_model.py) | working |

## Repository map

```
CLAUDE.md              orientation + DISCOVER MODE rules (read first, every session)
INVESTIGATION_PLAN.md  the phased plan and discovery gates
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
