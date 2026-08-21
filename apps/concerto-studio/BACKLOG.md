# Concerto Studio — backlog

Living list of what's outstanding, so nothing is lost between sessions.
Newest decisions at the top of each section. Convert relative dates to
absolute. When an item is done, move it to the SESSION_LOG, don't just delete.

---

## ACROSS ALL PROJECTS (platform / Studio itself)

- [~] **UAT execution.** Guided-human execution + CONFIG PRE-FLIGHT are live
      (`js/uatexec.js`, UAT > Pre-flight): every scenario is judged against
      the model, CONFIG-FAIL ones are caught before a human runs them, and
      runtime facts stay NEEDS-HUMAN. TRUE unattended execution still needs
      harness JOB reads that do not exist: open a job record + press an
      action, read a job's status / tags / linked orders, read an email log,
      and a fixture service to create test jobs. That is the next real
      harness capability (the Pre-flight tab lists it live).
- [ ] **UAT test-data fixtures.** Scenarios reference `{{job}}` etc.; a fixture
      service to create/reuse/clean ZZ-TEST records for a run.
- [x] **SRD import: .docx — DONE 2026-08-21** (`js/docx.js`, zero-library:
      ZIP parse + native DecompressionStream + WordprocessingML to text,
      table cells included). **.pdf still outstanding** — needs a different
      approach (harness-side extraction is probably simplest).
- [ ] **Writer ops to add:**
      - `set_action_field`; `delete_status`; `create_job_type` (the builder's
        one staged step — needs the 57-field job-type form learned).
      - (`set_status_field` DONE 2026-08-21: suppressed/sortOrder/isDefault/
        mobile, typed and refusing unknown fields — NOT yet proven live, the
        NPL dry-run could not run because the harness browser had closed.)
      - (`set_response_category_priority` DONE + PROVEN LIVE 2026-08-21.)
      - (`set_user_selectable` DONE 2026-08-20; `create_status` /
        `create_action` DONE 2026-08-21 in writer 0.3 — dry-run verified
        shapes, but NOT yet proven live: the first real create needs
        Warwick's go on an instance, and may need the add-button locator
        tuned to what the page actually offers.)
- [ ] **New-helpdesk builder — first live build.** The Design → New helpdesk
      tab designs a full helpdesk (workflow-logic checks live, life-of-a-job
      preview, dependency-ordered build plan, work-order creation). Executable
      steps run via writer create+wire ops; `configure_job_type` is STAGED.
      Prove the pipeline end-to-end on a sandbox with Warwick watching.
- [x] **Suppression on re-crawl — VERIFIED 2026-08-21.** The independent NPL
      re-crawl carried the suppress flag through capture→interpret and the
      suppressed set matched the model exactly (3 statuses).
- [ ] **Durable store off-machine remote.** Store is one-machine-only until
      Warwick creates a private GitHub repo; then wire the remote.
- [x] **The `/concerto-studio` skill.** DONE 2026-08-21 — lives at
      `C:\Bellrock Labs\.claude\skills\concerto-studio\SKILL.md` (project
      scope, OUTSIDE the public repo so it can name the method freely).
      Registers on next session start; invoke with `/concerto-studio` or it
      auto-triggers on Concerto engagement work. Keep it updated whenever the
      SOP itself changes (new writer op classes, new phases).
- [x] **UX declutter — Projects page DONE 2026-08-21**: cards lead with
      identity, health stats and ONE primary action; domains, timestamps,
      build, Export and Delete moved behind a fold (contract test-locked).
      Deep receipt tables are the only surface left if wanted.

## NPL specifically

- [x] **T06 — DONE 2026-08-20.** Link-to-Statuses ticks written AND the four
      wrong user-selectable ticks cleared live (`set_user_selectable`,
      IC-005b); verified, changeLog carries the revert.
- [ ] **NPL-F-008 (decision).** Auto-action **T07** routes jobs to
      **Business Case - R**, which is SUPPRESSED. Either unsuppress the status
      or rewire T07. Customer/consultant call.
- [x] **Response-category anomaly — FIXED LIVE 2026-08-21.** P1 Cleaning now
      points at the Cleaning order priority (writer 0.3
      `set_response_category_priority`, dry-run then apply, verified;
      changeLog IC-006 carries the revert).
- [ ] **NPL-D-001 (DECISION-READY).** Re-crawl distinguished the twins:
      Twin A (953bdd31…) unallocated but carries the default order project;
      Twin B (3da71f2e…) live in 3 statuses + email, no project. FixMy fires
      the separately-named FixMY action — neither twin. Customer call:
      consolidate (set project on B, delete A — or reallocate A, delete B).
- [ ] **NPL-D-002 (DECISION-READY).** RH03b is ORPHANED: hidden, unallocated,
      all quote/trigger flags False, no routing, nothing references it
      (all 45 forms scanned). Residual: Quote-processes family not yet
      crawled. Deletion candidate — confirm with NPL.
- [ ] **Tag hygiene proof.** Does tag **05. On hold** ever get REMOVED? Quick:
      read-only search of live jobs for tag 05 on jobs whose orders are NOT on
      hold. Longer: a ZZ-TEST hold/release experiment. Same question for
      Travelling, Require Assistance, 07. Follow up.
- [ ] **Suppressed statuses — customer call.** Awaiting Order Approval - R and
      Quote Requested - R are suppressed with nothing routing to them —
      deletable candidates. Confirm with NPL then delete.
- [x] **Post-build re-crawl — DONE 2026-08-21** (snapshot d33a80c474da):
      13 statuses + all 45 actions deterministic; 13/14 checks passed
      (1 verifier parse artifact); suppression carry VERIFIED; T06 model
      sync gap corrected (IC-005b-sync).

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

- **The harness browser is CLOSED** (2026-08-21) — the Playwright session
  ended with the side-panel logout. Live ops (dry-run or apply) need
  `/session/connect` plus a human sign-in before they will run again.

- `writeEnabled` is currently **true** on this machine
  (`harness/harness.config.json`). Delete the file or set false to revoke.
- Permissions: a terminal session rewrote the browser-tool allow entries to
  `mcp__claude-in-chrome__*`; the side-panel here uses `mcp__Claude_Browser__*`.
  Harmless under bypass mode, but the names don't match across the two.
- PowerShell 5.1 `>` / `-Encoding utf8` writes a **BOM**; config parsers choke
  on it (cost us two debugging rounds). Use `[System.IO.File]::WriteAllText`
  or write the file from Python for BOM-free UTF-8.
