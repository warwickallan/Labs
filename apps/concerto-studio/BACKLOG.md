# Concerto Studio — backlog

Living list of what's outstanding, so nothing is lost between sessions.
Newest decisions at the top of each section. Convert relative dates to
absolute. When an item is done, move it to the SESSION_LOG, don't just delete.

---

## ACROSS ALL PROJECTS (platform / Studio itself)

- [ ] **UAT execution: browser / hybrid auto-run.** Guided-human execution is
      live. Next: drive scenario steps against the instance through the harness
      (read-back assertions), and a hybrid mode. Needs the write path's
      read-back plus assertion evaluators.
- [ ] **UAT test-data fixtures.** Scenarios reference `{{job}}` etc.; a fixture
      service to create/reuse/clean ZZ-TEST records for a run.
- [ ] **SRD import: .docx / .pdf.** Text/markdown/CSV work now. Rich formats
      need a converter (client-side or a small harness endpoint).
- [ ] **Writer ops to add:**
      - `set_status_field` / `set_action_field` (e.g. fix the response-category
        → order-priority mapping; unsuppress a status).
      - `untick_user_selectable_statuses` (to finish T06 — see NPL).
      - `create_action` / `create_status` — makes deletes *executable* reverts,
        not just recorded recipes.
- [ ] **Suppression on re-crawl.** The harness crawler now captures
      "Suppress status from use"; `completeModel` derives `suppressed` from
      flags. VERIFY the crawl→ingest→model path actually carries it on the next
      real crawl (the ingest has more than one status path).
- [ ] **Durable store off-machine remote.** Store is one-machine-only until
      Warwick creates a private GitHub repo; then wire the remote.
- [ ] **The `/concerto-studio` skill.** NPL has proven the end-to-end method
      (crawl → AI inspection → findings/decisions → design → work order → live
      audited writes → docs → UAT). Distil it into a skill so any customer gets
      its own thread running the same SOP. HIGH VALUE — do after NPL is fully
      closed.
- [ ] **UX declutter — remaining surfaces.** Configuration/Evidence/Settings/
      Matrix/ActionMap/Design done. Projects page and deep receipt tables could
      get the same summary-first fold if wanted everywhere.

## NPL specifically

- [ ] **T06 — finish it.** The four Link-to-Statuses ticks are written; the
      four WRONG ticks in "Select which statuses can be selected" still need
      UNticking (needs the untick writer op above).
- [ ] **NPL-F-008 (decision).** Auto-action **T07** routes jobs to
      **Business Case - R**, which is SUPPRESSED. Either unsuppress the status
      or rewire T07. Customer/consultant call.
- [ ] **Response-category anomaly.** **P1 Cleaning** points at the **Grounds**
      order priority. Fix via `set_status_field` writer op or by hand.
- [ ] **NPL-D-001 (open).** Duplicate **RH02**: which GUID does the FixMY tag /
      rules wiring fire? Rename or retire the other. Helpdesk-rules tab is
      empty — check the tag/auto-action config or ask Concerto support.
- [ ] **NPL-D-002 (open).** **RH03b Quote Ordered** — process-fired or
      orphaned? Settle via Quote-processes config or a test quote.
- [ ] **Tag hygiene proof.** Does tag **05. On hold** ever get REMOVED? Quick:
      read-only search of live jobs for tag 05 on jobs whose orders are NOT on
      hold. Longer: a ZZ-TEST hold/release experiment. Same question for
      Travelling, Require Assistance, 07. Follow up.
- [ ] **Suppressed statuses — customer call.** Awaiting Order Approval - R and
      Quote Requested - R are suppressed with nothing routing to them —
      deletable candidates. Confirm with NPL then delete.
- [ ] **Post-build re-crawl.** Model was synced from write-verification; an
      independent fresh crawl proves it AND tests the crawler against the
      renamed status + suppression capture.

## KIRKLEES COUNCIL (parked — pick up when working this plan)

- [ ] **DECISION-001** — default response category: still awaiting the
      customer's answer (see `projects/kirklees-council/findings/`).
- [ ] Kirklees has NOT been run through the newer pipeline (life-of-a-job flow,
      UAT generation, SRD). The views all work on it; it just hasn't had a
      fresh capture or a UAT pass.
- [ ] When resumed: crawl/verify current state, generate UAT smoke+core,
      confirm CHG-001/002 still hold, review findings.

## WARWICK DEMO (reference instance)

- [ ] Second-priority demo project; kept as the clean reference. No outstanding
      work unless it drifts from the reference build.

## HOUSEKEEPING / NOTES

- `writeEnabled` is currently **true** on this machine
  (`harness/harness.config.json`). Delete the file or set false to revoke.
- Permissions: a terminal session rewrote the browser-tool allow entries to
  `mcp__claude-in-chrome__*`; the side-panel here uses `mcp__Claude_Browser__*`.
  Harmless under bypass mode, but the names don't match across the two.
- PowerShell 5.1 `>` / `-Encoding utf8` writes a **BOM**; config parsers choke
  on it (cost us two debugging rounds). Use `[System.IO.File]::WriteAllText`
  or write the file from Python for BOM-free UTF-8.
