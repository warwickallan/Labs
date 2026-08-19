# Concerto Configuration Studio

A local, zero-build browser application for understanding, comparing,
designing and (eventually) building Concerto configuration — fed directly
from the canonical Labs models. Lives inside the Labs repository at
`apps/concerto-studio/`; Labs is the Concerto knowledge + tooling
repository and this app is one of its tools.

## Run it

```
Start Studio.bat
```

serves the **Labs repository root** on `http://localhost:8600` (plain
`python -m http.server` — read-only static files) and opens
`/apps/concerto-studio/`. Tests: `/apps/concerto-studio/tests/`
(`document.title` reports `PASS n/n`).

## Source of truth

The Studio consumes the canonical models **read-only** from the parent
repository — `../../model/VANILLA-HELPDESK.json`, `VANILLA-ORDERS.json`,
`CROSS-DOMAIN-RELATIONSHIPS.json`, `VERIFIED-BEHAVIOURS.json`,
`IDENTITIES.json`. They are never copied into the app and never written by
it. The loaded Vanilla model is deep-frozen; customer design (later) forks
a clone. If the Studio exposes a deficiency in a source model, that is
recorded/proposed separately — evidence files are never adjusted for the
app's convenience.

## Architecture (see docs/ARCHITECTURE.md for the full picture)

- **Zero-build vanilla JS** (no Node on this machine, and per the proven
  Launch playbook): IIFE namespace modules, no framework, no ES modules.
- `js/studio-schema.js` — the only file that knows Concerto's shapes:
  canonical keys, notes parsing, badges, clone/freeze/fingerprint.
- `js/vanilla-loader.js` — fetch → normalise → deep-freeze, plus the
  fidelity invariants (pinned counts from the evidence baseline) run on
  every load; drift in the source models is surfaced, never absorbed.
- `js/views/*` — Overview, Diagram, Action Map, Inspector: pure
  projections of one model object. The same components will render the
  editable desired-state model in DESIGN mode.
- `js/app.js` — routing and shell wiring (the only file owning global DOM).

## Identity rules

Concerto GUIDs are environment identities, never portable. Canonical keys
are `domain:objectType:kebab-name` with explicit disambiguators where names
collide (SP07a–d, duplicate Default priorities). Per-instance
canonicalKey→GUID maps will live with instance snapshots, outside the
desired-state model.

## Local data boundaries

`data/`, `snapshots/`, `receipts/` are Studio-owned runtime directories,
git-ignored: anything instance-specific, customer-specific or
session-related stays out of the public repository.

## Status

Built so far: model loader + 18 fidelity invariants (browser test suite,
17 tests), application shell with left navigation, Overview dashboard,
read-only Vanilla views (Workflow Diagram, Action Map, Matrix,
Configuration, Evidence index), and DESIGN mode v1: fork Vanilla into an
editable desired state (`model.js` — mutation API, JSON-snapshot
undo/redo, localStorage autosave, CUSTOMER-DESIRED-STATE.json
export/import with pinned baseline fingerprints), drag-and-drop
availability editing on the same Diagram component (move / Alt-copy /
remove / add status / reorder columns), and a live Deviation Schedule
computed by the pure differ (`diff.js`), and the Findings engine
(`rules.js`): explicit evidence-referenced rules that recover the known
Vanilla defects from the loaded model (VI-009 portal gaps, SP02/UO-002
availability contradiction, dead-end statuses, circular entries, VO-001
duplicates), checkbox selection of fixable findings and a desired-state
patch preview — execution stays disabled until the harness adapter
exists. Findings the models cannot yet compute (VI-005/006/007/008/010)
are quoted from the register, clearly separated. Instance crawl, Compare
against a crawled instance, Build pipeline and the Solution Design
generator are designed but not yet built — see docs/ARCHITECTURE.md.
