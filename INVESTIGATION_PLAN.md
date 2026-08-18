# Investigation plan — Concerto Vanilla Discovery

Mission: establish an evidence-backed, machine-readable definition of the
Vanilla Helpdesk configuration in the TEST environment, read-only, under the
rules in [CLAUDE.md](CLAUDE.md). Reactive Helpdesk is the first detailed
target, but **Helpdesk Admin is the parent domain and is discovered first**.

## Terminology (use consistently)

- **Helpdesk Admin** — parent configuration area.
- **Helpdesk Type** — e.g. Reactive, Planned (discover the actual list).
- **Reactive Helpdesk** — the Reactive Helpdesk Type and its configuration.
- **Planned Helpdesk** — the Planned Helpdesk Type and its configuration.

Do not describe Reactive and Planned as separate Concerto modules unless the
system itself evidences that terminology.

## Phase 0 — Access and orientation

- Human signs in to `https://warwick.concertodemo.co.uk/login.aspx`
  (Claude never enters credentials).
- Confirm read-only discipline: identify where Save/create/delete controls
  live so they are never touched.
- Capture the landing/navigation structure relevant to Helpdesk Admin.
- Evidence → `evidence/helpdesk-admin/`.

**Exit:** signed in; Helpdesk Admin located; navigation evidenced.

## Phase 1 — Helpdesk Admin parent structure

1. Navigate to Helpdesk Admin and map the administration area's structure.
2. Enumerate all Helpdesk Types that actually exist (expect at least
   Reactive and Planned; record whatever is really there).
3. Classify configuration as: shared across Helpdesk / specific to Reactive /
   specific to Planned / apparently shared but configured per type / unknown.
4. Record relationships between Helpdesk Type, statuses, actions and any
   other configuration objects encountered.

**Exit:** Helpdesk Type list is `VERIFIED — OBSERVED`; the shared-vs-type-
specific classification is recorded with confidence states; model gains
`helpdeskTypes[]` entries (names + structure only).

## Phase 2 — Reactive Helpdesk detailed discovery

Scope (at minimum): job statuses; operative statuses; helpdesk actions;
action/status availability; job-status transitions; operative-status
transitions; action visibility; mobile availability; Reactive/PPM
applicability; security/roles; defaults; timers/expiry where visible;
assignment behaviour; contractor behaviour; maintenance-team behaviour;
notes/files/comments controls; associated constraints; any directly linked
configuration encountered.

### 2a — Status catalogue

Per job status capture (template: `templates/status-capture.md`): name;
internal identifier where visible; description/help text; default flag;
active/inactive; ordering; colour/icon where meaningful; operative
equivalent; actions available from it; actions that move jobs into it;
expiry/timer behaviour; restrictions; evidence.

### 2b — Operative-status catalogue

Captured **separately** from job statuses: name; default flag; evidenced
purpose; actions that set it; actions allowing user selection; job-status
relationships; mobile relevance; evidence.

### 2c — Action catalogue

Per action capture (template: `templates/action-capture.md`): name;
code/reference; active/inactive; description; available statuses; resulting
job status; resulting operative status; whether user selects resulting
status / operative status; mobile availability; Reactive/PPM applicability;
assignment behaviour; role/security restrictions; note/file/comment
requirements; timer/expiry behaviour; bulk availability; hidden/suppressed
conditions; evidence.

Preserve as **distinct concepts** (the Dev visualiser proves they are):
available-in-status; sets-job-status; user-selects-status;
sets-operative-status; user-selects-operative-status;
auto-fires-on-status-expiry.

### 2d — Action configurator field inventory

The Add/Edit Action screen is a major evidence source. Inspect every tab and
section **without editing**. Per control (template:
`templates/field-catalogue.md`): section/tab; label; control type;
current/default value; available options; DOM name/id where accessible;
conditionality and its visible trigger; help text; probable meaning;
confidence; evidence reference. Unknown meaning is valid.

### 2e — Relationship map

Build the normalized relationship model (status → available actions;
action → resulting status; etc.). This map matters more than reproducing the
Dev spaghetti visualisation.

**Exit:** discovery gates 1–8 satisfied for Reactive.

## Phase 3 — Planned Helpdesk structural parity check

Inspect Planned sufficiently to determine whether it follows the Reactive
structural model or differs materially. Do **not** perform complete Planned
discovery unless required to understand the architecture or explicitly
instructed.

**Exit:** parity verdict recorded with evidence; material differences noted.

## Phase 4 — Consolidation and report

- Model complete and green: `scripts/validate_model.py` (gate 9).
- Generate `docs/VANILLA-HELPDESK-DISCOVERY.md` from the model + evidence:
  executive summary; configuration counts; status catalogue; operative-status
  catalogue; action catalogue; action/status matrix; defaults; security/role
  findings; mobile findings; known unknowns; suspected behaviour requiring
  experiment; anomalies; unanswerable questions; recommended next experiments.
- `UNKNOWNS.md` complete and prioritised.
- **STOP** per the stop condition in CLAUDE.md and report.

## Out of scope (this phase)

- Any configuration change, correction, improvement or redesign.
- Behavioural experiments (later EXPERIMENT phase, `ZZ TEST` objects,
  explicit approval required).
- Reverse-engineering the whole Concerto product.
- Customer builds and deviation analysis (the model must merely be
  **deviation-ready**: able to support Added/Removed/Modified/Unchanged
  comparison later).

## Effort discipline

Do not spend hours resolving unknowns that will never be required to build a
customer Helpdesk — file them in `UNKNOWNS.md` with a priority instead.
