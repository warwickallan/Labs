# Concerto Configuration Studio — architecture

The accepted design (Warwick, 2026-08-19), recorded durably. Companion to
[../README.md](../README.md). The long-term product is
**DISCOVER → UNDERSTAND → COMPARE → DESIGN → VALIDATE → BUILD → VERIFY**
for Concerto configuration, across multiple domains (Helpdesk, Orders,
cross-domain today; PPM Scheduler accommodated but honestly unmapped).

## Placement

The Studio is a self-contained application folder inside the Labs
repository (`apps/concerto-studio/`). Labs is the Concerto knowledge +
tooling repository: `evidence/` + `model/` hold what we know;
`apps/` holds the tools that use it. No separate git repository.

## The pipeline

```
VANILLA MODEL (../../model/*.json, read-only, deep-frozen)
      │
      ▼
UI / EDITOR (Diagram · Action Map · Matrix · Inspector — projections of ONE model)
      │
      ▼
DESIRED STATE (fork of Vanilla; CUSTOMER-DESIRED-STATE.json pins the base fingerprint)
      │
      ▼
COMPILER / BUILD PLAN (dependency-aware staged passes; pure diff in front)
      │
      ▼
CONCERTO ADAPTER (browser harness first — a separate local Python service;
                  HTTP/API adapter later if write-surface discovery supports it)
      │
      ▼
CONCERTO → READ BACK → ACTUAL STATE → DESIRED vs ACTUAL → PASS / DIFF
```

Inherited, proven principles (Launch / RLMCP):

- **The browser is plumbing.** No model/AI call in the runtime execution
  path; the harness sits behind an adapter interface.
- **Success = the re-read diff is empty**, never "we sent the requests".
  Fixed-point apply with bounded re-diff; read-back verification.
- **Every execution appends one truthful receipt**: intended, executed,
  returned, read back, matched.
- **Two independent write gates**: instance scope guard (never the Vanilla
  demo tenant) + exact-plan fingerprint approval, invalidated by any edit.
- **The Studio never enters credentials** — a human signs in; the harness
  detects session state and refuses to proceed logged out.

## Identity

- Concerto GUIDs are environment identities of one tenant — never portable,
  never shown as identity in the UI.
- Canonical keys: `domain:objectType:kebab-name` (+ explicit disambiguator
  where display names collide — SP07a–d, duplicate Default priorities).
- Per-instance `canonicalKey → GUID` maps live with instance snapshots
  (Studio-local, git-ignored), exactly as RLMCP keeps launchId→rocketlaneId
  mappings out of the plan file.

## Vanilla immutability

Three layers: (1) the loader fetches over read-only HTTP and has no write
path; (2) the normalised model is deep-frozen (`Object.freeze`, recursively
— test-enforced); (3) customer design operates on a **clone** whose file
records `basedOnVanilla: {fingerprint}`. The Deviation Schedule is always
COMPUTED against the pinned base by the pure differ — it cannot drift.

## Evidence discipline carried through

Every normalised object keeps its confidence grade and evidence ids.
Values recovered from generated notes prose (button group, flags, tag
automation, resulting type) carry `PARSED-FROM-NOTES` provenance and are
chipped as such in the inspector. Configuration truth stays separate from
behaviour truth (VERIFIED-BEHAVIOURS is its own layer with its own grades).
The Studio never upgrades an inference to fact.

## Fidelity invariants

`vanilla-loader.js` runs pinned invariants on every load (13 statuses, 50
actions, 95/27/15 relationships, 13 supplier actions with unique canonical
keys, 18 cross-domain edges, referential integrity, VI-009 ground truth…).
If the Labs models change shape or counts, the Studio surfaces it in the
header chip and the test suite — drift is detected, never absorbed. If the
Studio ever exposes a genuine deficiency in a source model, it is
recorded/proposed separately; evidence files are never adjusted for the
app's convenience.

## Module map

```
js/studio-schema.js    the only file that knows Concerto's shapes
js/vanilla-loader.js   fetch → normalise → deep-freeze → invariants
js/views/inspector.js  right-side drawer + StudioDom helpers
js/views/overview.js   dashboard (computed + curated register pointers)
js/views/diagram.js    status columns / action cards projection
js/views/actionmap.js  three-lane map, hover/pin-focused edges
js/views/grid.js       the Matrix (sortable action grid)
js/views/config.js     read-only reference of every family, both domains
js/app.js              routing + shell wiring (only global-DOM owner)
tests/                 browser test runner; document.title = PASS n/n
data/ snapshots/ receipts/   Studio-local runtime dirs (git-ignored)
```

Planned next (in rough order): `model.js` (desired-state fork, undo/redo,
autosave, import/export), `diff.js` (pure differ powering Compare +
Deviation Schedule + Build), `rules.js` (Findings engine seeded from
VANILLA-ISSUES), DESIGN mode (drag-and-drop on the same Diagram/Grid
components), the local Python harness service (Playwright crawl per the
techniques in `docs/DISCOVERY-TECHNIQUES-AND-LESSONS.md`), `buildplan.js`,
and the Solution Design generator (consumes the canonical model + diff +
findings; Vanilla and Customer editions with a computed Deviation
Schedule; print-styled HTML first, DOCX/JSON later).

## UI conventions

Left navigation; calm, spacious, obvious. Pages, cards, tables, side
drawers; no modal overload. Simplified vs technical detail toggles. The
Action Map's anti-spaghetti rule: the default view draws NO edges —
hovering/pinning lights only the selected object's relationships;
overlays opt into the technical layers. Vanilla views are read-only;
DESIGN reuses the same components against the forked model, with
non-destructive drag gestures (move availability by default, explicit
copy, removal never a drag outcome) and undo/redo.

## Environment constraints

No Node/npm on this machine (Python 3.12 available) — zero-build vanilla
JS per the proven Launch playbook: IIFE namespace modules, no ES modules,
no framework, browser-based tests. `Start Studio.bat` serves the Labs repo
root with `python -m http.server` so `../../model/*.json` is fetchable.
