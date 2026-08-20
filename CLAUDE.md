# CLAUDE.md — Concerto Vanilla Discovery orientation

Durable instructions for a fresh Claude session with no useful conversation
history. **Trust Git, this repository and the evidence it contains — never
conversational memory.** If anything here contradicts observed system state
in the TEST environment, the TEST environment is right and this file needs
fixing.

## What this repository is

The Bellrock evidence repository and models for **Vanilla Concerto**
configuration in the TEST environment
(`https://warwick.concertodemo.co.uk`). Scope has grown beyond the
original Helpdesk-only brief: it now covers **Helpdesk Admin, Orders
Admin, the operational Helpdesk, the Supplier Portal, and the
cross-domain mechanism between them**, plus a graded behaviour layer
(experiments E0/E1 complete). PPM Scheduler is a known, deliberately
unmapped future domain. The canonical explainer is
`docs/CONCERTO-HELPDESK-ORDERS-OPERATING-MODEL.md`.

Labs is becoming the Concerto **knowledge + tooling** repository. The
knowledge deliverables are the machine-readable models (`model/*.json`),
the discovery reports (`docs/`), the registers (`UNKNOWNS.md`,
`VANILLA-ISSUES.md`, `OPERATIONAL-DISCREPANCIES.md`) and the evidence tree
(`evidence/`). Tooling lives under `apps/` — currently
`apps/concerto-studio/` (the Concerto Configuration Studio, a zero-build
browser app consuming the models READ-ONLY; see its README and
`docs/ARCHITECTURE.md` inside the app folder). The evidence/model
artefacts remain the canonical source of truth and are never modified
merely to make an application convenient.

## Operating mode

**Current mode, phase and authorisation boundary live in
[CURRENT_STATE.md](CURRENT_STATE.md) — read it first; this file is the
durable contract only.** Standing invariants regardless of mode:

1. **Vanilla configuration is immutable.** Disposable ZZ TEST
   configuration/master-data fixtures may be created only where explicitly
   required by an experiment Warwick has authorised.
2. If something cannot be understood safely within the current
   authorisation, record it in `UNKNOWNS.md` and stop — do not improvise.
3. **Claude never enters credentials.** A human signs in. If the session is
   logged out, stop and ask.
4. The TEST environment is authoritative for what currently exists. Do not
   assume documentation is correct where the UI says otherwise.
5. Behavioural experiments run only with Warwick's explicit per-
   experiment authorisation, using disposable `ZZ TEST` fixtures (E0/E1
   are complete; see CURRENT_STATE for what is and is not authorised).
6. The models grow **only from discovered evidence** — never invent
   fields for completeness. Domains stay separate (Helpdesk / Orders /
   cross-domain / behaviour); GUIDs are environment identities, and
   display names are NOT guaranteed unique (duplicate 'Default' order
   priorities) — canonical keys need family + code/semantic + disambiguator.

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
apps/concerto-studio/                 the Configuration Studio app (self-contained; own README,
                                      tests, Start Studio.bat; consumes model/*.json read-only)
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

Historic (Helpdesk discovery is complete). Standing rule: STOP at the
boundary CURRENT_STATE defines; report evidence-graded findings; never
begin experiments or configuration changes without explicit approval.

## Receipts (cost accounting — standing rule)

Every operation that touches an instance or spends AI tokens gets a receipt
(Studio → Settings → Receipts; durable store `POST :8603/receipt`).
Deterministic work (harness crawler, ingests, saves) records measured
durations and REAL ZEROS for AI. When Claude works in the side panel, it
records a receipt per work block with the ACTUAL session-budget meter delta
as `totalTokens` and the basis stated in `tokenBasis` — a number is never
estimated; if no reading exists, the value is the string `unavailable`.

## The "rotate" protocol

When Warwick says **"rotate"**: (1) bank all work — file evidence, update
the model, run the validator, commit everything of value; (2) update the
durable docs that changed truth this session and append a `SESSION_LOG.md`
entry (what was done, evidence locations, what is open); (3) note any
known-bad state honestly; (4) report **"safe to clear"** plus the final HEAD
SHA. The next session starts from `CLAUDE.md` → `CURRENT_STATE.md` →
`SESSION_LOG.md` → relevant evidence/registers → `git log`, not from
memory.

## What Claude may do autonomously

Read anything in this repo; navigate and inspect the TEST environment
read-only once a human has signed in; capture and file evidence; grow the
model and report from evidence; run the validator; commit on `main`.

## What needs Warwick's explicit approval

Any configuration change in Concerto (Vanilla is immutable); any
behavioural experiment; creating/deleting `ZZ TEST` fixtures; anything
against live jobs; opening a NEW domain (e.g. PPM Scheduler). Current
scope and authority always per CURRENT_STATE.md.

## Continuation checklist

1. Read `CURRENT_STATE.md` — current phase, authority, fixtures, next step.
2. Read `SESSION_LOG.md` — what happened, where evidence is, what is open.
3. Read the evidence/registers CURRENT_STATE points at; then `git log`.
4. Run `scripts/validate_model.py`; confirm the model is green.
5. Confirm the browser session is signed in (ask Warwick if not).
6. Ask what Warwick wants; do not resume half-remembered plans.
