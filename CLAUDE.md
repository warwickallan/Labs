# CLAUDE.md — Concerto Vanilla Discovery orientation

Durable instructions for a fresh Claude session with no useful conversation
history. **Trust Git, this repository and the evidence it contains — never
conversational memory.** If anything here contradicts observed system state
in the TEST environment, the TEST environment is right and this file needs
fixing.

## What this repository is

An evidence repository and model for discovering the **Vanilla** (out-of-the-
box / current baseline) Helpdesk configuration of **Concerto**, observed
read-only in the supplied TEST environment:

- TEST environment: `https://warwick.concertodemo.co.uk/login.aspx`
- Parent configuration area: **Helpdesk Admin**
- Helpdesk Types: at minimum **Reactive** and **Planned** — discover what
  actually exists rather than assuming the list.
- First detailed target: **Reactive Helpdesk** (after the Helpdesk Admin
  parent structure has been mapped).

No product code lives here. The deliverables are the machine-readable model
(`model/VANILLA-HELPDESK.json`), the discovery report
(`docs/VANILLA-HELPDESK-DISCOVERY.md`), the unknowns register (`UNKNOWNS.md`)
and the evidence tree (`evidence/`).

## Operating mode: DISCOVER MODE (safety invariants — breaking any is stop-and-ask)

1. **Read-only.** Never click Save. Never create, delete or edit records or
   configuration. Never trigger actions against live jobs. Never alter
   statuses, actions, roles, defaults, timers or workflow settings.
2. If a page cannot be understood without changing something, record that
   limitation in `UNKNOWNS.md` and stop — do not experiment.
3. **Claude never enters credentials.** A human signs in. If the session is
   logged out, stop and ask.
4. The TEST environment is authoritative for what currently exists. Do not
   assume documentation is correct where the UI says otherwise.
5. Behaviour testing is out of scope unless observable safely without
   changing data. A later, separately approved EXPERIMENT phase will test
   behaviour with disposable `ZZ TEST` objects. Do not begin it without
   explicit approval.
6. The model grows **only from discovered evidence** — never invent fields
   for completeness.

## Division of responsibility

- **Claude Code** owns: investigation plan, evidence repository, schemas,
  screenshots filing, field inventories, confidence classification,
  comparison scripts, the machine-readable model, the discovery report.
- **The browser (Claude for Chrome / Browser pane)** is the operator only:
  navigate, inspect labels/values/options/DOM/URLs, capture screenshots,
  return findings. It must not independently interpret unclear behaviour as
  fact.

## Evidence discipline

Every discovered fact carries exactly one confidence state:

| State | Meaning | Example |
| --- | --- | --- |
| `VERIFIED — OBSERVED` | Directly visible in the UI | Status "In Progress" exists. |
| `VERIFIED — STRUCTURAL` | Observed repeatedly, relationship confirmed | Action "Assign to contractor" is available from status "In Progress". |
| `INFERRED` | Strongly suggested by naming/layout, not proven | This field appears to control contractor assignment. |
| `UNKNOWN` | Meaning cannot currently be established | — |

Rules:

- Never upgrade an inference to verified merely because it seems obvious.
- **Configuration truth ≠ behaviour truth.** What is configured and what
  actually happens at runtime are recorded separately; behavioural meaning
  is marked unverified until the EXPERIMENT phase proves it.
- Do not assume job statuses and operative statuses are equivalent concepts.
- Do not assume Reactive settings apply to Planned, or that identically
  named actions are identically configured across Helpdesk Types.
- Do not force configuration into `sharedConfiguration` in the model unless
  evidence demonstrates it is genuinely shared.
- Every important claim traces to a file under `evidence/` (screenshot or
  capture note). Evidence file naming: `NNN-short-description.png` /
  `NNN-short-description.md`, numbered in capture order within each folder.

## File map

```
INVESTIGATION_PLAN.md                 phases, scope, discovery gates, stop condition
UNKNOWNS.md                           prioritised unknowns register (BLOCKING/IMPORTANT/NICE TO KNOW)
SESSION_LOG.md                        append-only; newest first; one entry per session
model/VANILLA-HELPDESK.json           the Vanilla model — must always validate + round-trip
schemas/vanilla-helpdesk.schema.json  JSON Schema for the model
scripts/validate_model.py             gate 9: schema check + serialize→reload→serialize identity
templates/field-catalogue.md          per-control capture template (Action configurator etc.)
templates/status-capture.md           per-status capture template
templates/action-capture.md           per-action capture template
evidence/helpdesk-admin/              parent-structure evidence
evidence/reactive-helpdesk/           statuses/ operative-statuses/ actions/
                                      action-configurator/ mobile/ roles/ timers/ screenshots/
evidence/planned-helpdesk/            structural-parity evidence only (unless instructed)
docs/VANILLA-HELPDESK-DISCOVERY.md    the human-readable report (generated from the model + evidence)
```

## Exact commands

```bash
python "scripts/validate_model.py"
```

Runs the JSON Schema validation and the serialize → reload → serialize
identity check (discovery gate 9). Must pass before any model change is
committed.

## Git workflow

Work directly on `main` for evidence and model growth (this is a document
repository, not a codebase). Logical commits with honest messages; commit
evidence and the model changes it supports together. **Canonical remote:
`origin` = github.com/warwickallan/Labs (PUBLIC — Warwick adopted it
2026-08-18 as the durable source for other agents to inspect). Push every
meaningful checkpoint.** Before any push, verify no secrets/auth material/
browser artefacts are staged (.gitignore bars the known classes; the
repository must only ever contain discovery evidence).

## Discovery gates (all must be proven before calling Vanilla discovery complete)

1. Every relevant status inventoried.
2. Every relevant action inventoried.
3. Status → available-action relationships captured.
4. Action → resulting-status relationships captured where visible.
5. Operative-status effects captured where visible.
6. Action configurator field inventory complete (every tab/section/control).
7. Unknown behaviour explicitly marked unknown.
8. No configuration changes were made.
9. `scripts/validate_model.py` passes (schema + round-trip identity).
10. The human-readable report is generated from the same model.

## Stop condition

When Reactive Helpdesk Vanilla discovery is complete: **STOP** and report
counts (statuses, operative statuses, actions, relationships, configurator
fields), verified vs inferred facts, unknowns, gaps requiring experiment,
and whether Vanilla is sufficiently understood to begin a controlled
EXPERIMENT phase. Do not begin experiments or configuration changes without
explicit approval.

## The "rotate" protocol

When Warwick says **"rotate"**: (1) bank all work — file evidence, update
the model, run the validator, commit everything of value; (2) update the
durable docs that changed truth this session and append a `SESSION_LOG.md`
entry (what was done, evidence locations, what is open); (3) note any
known-bad state honestly; (4) report **"safe to clear"** plus the final HEAD
SHA. The next session starts from `CLAUDE.md` → `SESSION_LOG.md` →
`INVESTIGATION_PLAN.md` → `git log`, not from memory.

## What Claude may do autonomously

Read anything in this repo; navigate and inspect the TEST environment
read-only once a human has signed in; capture and file evidence; grow the
model and report from evidence; run the validator; commit on `main`.

## What needs Warwick's explicit approval

Any configuration change in Concerto; any behavioural experiment; creating
`ZZ TEST` objects; anything against live jobs; full Planned Helpdesk
discovery; adding a Git remote or pushing; widening scope beyond Helpdesk
Admin.

## Continuation checklist

1. Read `SESSION_LOG.md` — what happened, where evidence is, what is open.
2. `git log`/`status`; compare with the docs' claims.
3. Run `scripts/validate_model.py`; confirm the model is green.
4. Check `UNKNOWNS.md` for BLOCKING items.
5. Confirm the browser session is signed in (ask Warwick if not).
6. Ask what Warwick wants; do not resume half-remembered plans.
