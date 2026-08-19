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

## Status (foundation complete)

Working today, all fed from the real Labs models (browser test suite:
23 tests green):

- **Vanilla projections** — Workflow Diagram (status columns / action
  cards / machine-fired column / inspector), Action Map (three-lane,
  hover/pin-focused edges), Matrix (sortable 50-action grid),
  Configuration (every family, both domains), Overview, Evidence index.
- **DESIGN** — fork of the immutable Vanilla baseline; Diagram
  drag-and-drop (move / Alt-copy / remove availability, add/remove/reorder
  statuses), editable Grid, inspector editing (resulting status per type,
  sets/user-selects, mobile flag, button group, availability checklist,
  add/remove action), undo/redo, autosave, CUSTOMER-DESIRED-STATE.json
  export/import pinned to the baseline fingerprints.
- **COMPARE** — Added/Removed/Modified/Unchanged at object and field
  level (Vanilla vs design fork today; the same engine takes a crawled
  instance later).
- **FINDINGS** — evidence-referenced computed rules + register-quoted
  findings; fixable selection compiles a desired-state patch preview.
- **SOLUTION DESIGN** — print-quality HTML generated from the canonical
  model: Vanilla edition and Customer edition with a computed Deviation
  Schedule; in-app preview, open-for-printing, download.
- **INSTANCE** — connection page (persisted URL, read-only Connect/Crawl
  controls, snapshot store) over the declared harness adapter contract
  (`harness-client.js`) — the adapter itself is honestly not built.
- **BUILD** — `buildplan.js` compiles diffs into the staged plan
  (create → resolve identities → relationships → defaults/gated deletions
  → read-back → verify-empty) with validation and unresolved-identity
  listing; Validate / Preview Build work, BUILD is disabled until the
  execution adapter and explicit authorisation exist.

Not built yet: the browser-harness Python service (crawl, then gated
execution with receipts and read-back) and the instance-side Compare it
enables; Orders-domain editing; DOCX export. See docs/ARCHITECTURE.md.
