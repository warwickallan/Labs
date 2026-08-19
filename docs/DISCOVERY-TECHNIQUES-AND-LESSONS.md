# Discovery techniques and lessons learned (for the next Claude)

How this environment was actually operated during discovery, plus the
lessons that will save you from repeating mistakes. Written 2026-08-19.

## Operating Concerto efficiently (browser techniques)

- **Page anatomy:** admin pages are single ASPX pages (`helpdesk_admin`,
  `order_admin`) with a client-side tab strip (all tab BUTTONs share
  `tab_bar/nav-link` classes), a search panel (`pbl_form_dba_*` controls),
  and a paginated grid. Tab switches and record opens are AJAX — the URL
  never changes.
- **Record GUIDs:** every grid row's select-checkbox id embeds the record
  GUID (`pbl_form_<guid>_0`); action tiles carry it in
  `onclick="PblActions.nav('RenderActionSummaryConst','<guid>')"`; Update
  buttons in `PblActions.nav('form_view','<guid>')`. Harvest name→GUID
  maps from these.
- **Direct record navigation:** `PblActions.nav('form_view', guid, …)`
  opens a record's Edit form **within the current tab's context** (the
  same call on the wrong tab opens that tab's form!). This enables batch
  reads without clicking rows.
- **Batch reading:** loop nav→poll→capture inside one `javascript_exec`
  with an accumulator on `window` (survives between tool calls but NOT
  page navigations). Keep each call under ~24s (tool timeout 30s); size
  batches accordingly (~6–9 records). Poll for render by checking a
  text input whose value equals the record name — never sleep blind.
- **Render races:** panel content can lag navigation; a capture may show
  the PREVIOUS record's section (this poisoned a few tag-list reads,
  flagged (†) in E-023). Detect by matching the expected record
  name/code in the captured text; re-read anything ambiguous.
- **Trusted vs synthetic clicks:** row Options menus and some buttons
  ignore JS `.click()` — use `computer` clicks at
  `rect * screenshotWidth/viewportWidth` coordinates from a FRESH
  screenshot (coordinate frames go stale). Search filters, tab buttons
  and nav() work fine from JS. Setting input values needs the native
  setter (`Object.getOwnPropertyDescriptor(HTML*Element.prototype,
  'value').set`) + input/change events, or the framework ignores it.
- **Full page navigations kill your JS context** (RAISE JOB, menu links)
  — split flows into one call per navigation; re-install helpers after.
- **Beware name collisions:** an "Actions" matcher once hit the Assurance
  module's menu link and navigated away. Scope queries to `main` or to a
  known sibling (e.g. the BACK button's parent toolbar).
- **Field vocabularies:** Add/New forms are the cheapest complete schema
  source (every control + option list + create-time defaults); Edit forms
  give per-record values; **record VIEW pages carry data the Edit form
  does not** (per-action tag add/remove lists, API endpoint). Read all
  three layers for core objects.
- **Conditional UI:** mostly server-side at form render (saved Resulting
  type filters the status list); client-side change events do NOT
  re-filter. Probe transiently in unsaved forms, restore, cancel.
- **Cancel discipline:** every form has SAVE / SAVE-AND-ADD / DELETE /
  CANCEL. Always Cancel; verify by re-reading the list (counts/values).
  A server-side logout also discards unsaved state. Hidden "ADD NEW"
  inline-form templates exist in expanded grids — text captures may
  include them; they are NOT open forms.
- **Nested grids:** classification rows have hidden hover-expanders
  (`PblExpand.row(this,'expanded_grid_form','class'|'resource')`) —
  clickable via JS even when invisible.
- **Operational pages as validators:** the runtime UI is an independent
  read-side check of Admin truth (row menus vs configured availability;
  portal ACTIONS vs supplier-action flags; SLA dates vs clock config).
  Timelines are free PASSIVE behaviour evidence ("Email failed to send").
- **Useful endpoints/pages:** job detail exposes
  `GET /api/helpdesk/v2/job/<guid>` (untested); `helpdesk2.aspx` job list;
  `supplier_portal.aspx` (supplier projection; order ref = parent job
  ref + "/n"; ACTIONS dropdown on the order detail toolbar is the
  supplier action surface — row menus are utility-only).
- The Action map's JSON feed (`?func=ActionMapJson`) needs the page's
  postback context — geometric SVG reconstruction of `.ham-edge` paths
  against node positions worked instead (offset-fit, zero residual).

## Lessons learned

1. **Visualisers are partial projections.** The Action map cannot see
   creation defaults, quote/order/AFP engines, or supplier links — its
   "unreachable" warnings misled until the engines were found.
2. **List/grouped views can disagree with record truth** (LM01 "Not
   allocated" vs its ticked availability; PH05 shown from a Reactive
   status). Record forms win; log mismatches (VI-007).
3. **Admin config and operational rendering are separate layers** —
   examine both; each explains the other's anomalies.
4. **Apparent defects can be hidden cross-engine paths** (Quote
   Requested - R "dead end" → RE05 fires RH03b), and **valid features can
   be dead through missing visibility flags** (VI-009: role-flagged
   accept/reject not portal-visible). Check both directions before
   labelling.
5. **Identical names ≠ identical objects** (two "Default" order
   priorities; Helpdesk P1 vs Order P1; duplicate tag numbers; SP07 ×4).
6. **GUIDs are environment identities, not portable keys** — canonical
   keys are the display names (see IDENTITIES.json semantics).
7. **Vanilla ≠ product capability.** Unused fields (expiry, TextMatch,
   PPM review statuses, final-application setters) are capability
   evidence a rebuild/blueprint must know about.
8. **Read both ends of every cross-domain relationship** before inferring
   behaviour — the T-action "mystery" dissolved the moment Supplier
   Actions were read.
9. **Experiments verify understood mechanisms; they are not exploration.**
   E0/E1 were cheap and total because the structure was already mapped —
   and E2's first finding (broken acceptance) was caught structurally
   BEFORE burning an experiment on it.
10. **Freeze structural truth before behaviour** (the v1 tag), keep
    domains in separate models, keep behaviour in its own graded layer,
    and bank evidence + push continuously — context dies, repos don't.
11. **Batch automation needs verification hooks** — name-match every
    captured record; treat empty-state text bleeding into captures as a
    red flag; re-read rather than rationalise.
12. **The demo environment itself drifts** (session logouts, transient
    502s, stale panels) — design every loop to be resumable and every
    claim to carry its evidence.
