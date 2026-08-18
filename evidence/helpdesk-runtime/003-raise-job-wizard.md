# E-021 — Raise Job wizard (Reactive) + Planned creation route

- Captured: 2026-08-19. The wizard was walked to its final CONFIRM screen
  with transient values and then **CANCELLED — CONFIRM never pressed**;
  job counts verified unchanged (Reactive 16 / Planned 19).
- Confidence: VERIFIED — OBSERVED. Layer: OPERATIONAL PRESENTATION TRUTH.

## The Reactive "Raise job" wizard (RAISE JOB button → `Raise a job`)

Step sequence (each step is a full page; BACK/NEXT/CANCEL):

1. **Site selection** — searchable list (wildcard search); demo sites:
   Aintree University Hospital (S0001), Broadgreen Hospital (S0003),
   Royal Liverpool Hospital (S0002).
2. **Duplicate check** — "The following tickets have been previously
   raised against this site": open tickets with status, block, requester,
   date (deduplication guard before creation).
3. **Block selection** — tiles: Block 1 · Block 2 · Land Block 1
   (site structure).
4. **Fault location*** — mandatory textarea ("floor, room and any other
   details").
5. **Classification** — tile pages: the 16 parent classifications, then
   the selected parent's CHILD tiles (Boilers → CHP / Expansion Vessels /
   Gas Condensing Boiler / Heating and Hot water / Water Only Boiler) —
   **the nested taxonomy (E-018) IS the reporter journey**.
6. **Describe the issue*** — mandatory textarea; inline validation
   observed: *"An answer is required."*
7. **Add a file or photo** — optional upload.
8. **Health and safety?** — Yes/No tiles (maps to classification/job H&S
   concept).
9. **Summary + Access details*** — read-back of all inputs; Name/Email
   pre-filled from logged-in user (originator defaulting); mandatory
   "Please enter access details, including times and contact details*";
   **CONFIRM** (the persistence point — not pressed).

### What the wizard does NOT ask (significant)

No urgency/Response category · no Call type · no caller selection (locked
to logged-in user) · no team/operative/contractor assignment · no
budget/cost · no tags. → The reporter journey defers ALL triage to the
helpdesk. Combined with no default Response category (VI-005), jobs raised
this way arrive **without SLA targets** — exactly what job 00000051 shows
(blank Required response/completion). Job 00000050's Priority 2 must have
been applied by another route (RH07 Amend SLA or an admin-side form) — not
yet evidenced (candidate routes recorded, UNKNOWN).

### Mapping chains

`Site admin (sites/blocks)` → steps 1/3 · `Classifications (nested,
E-018)` → step 5 tiles · `Classification "available on external helpdesk
page" flag (E-018)` → candidate visibility driver for step 5 (not proven)
· `RH01 (default action, E-015)` → the action recorded on jobs created by
this wizard (Last Action column + timeline) · `is_hs classification
concept (E-014 schema)` → step 8.

## Planned creation route

The Planned list has **no RAISE JOB**. Its toolbar **ACTIONS** menu
contains exactly **PH01. New PPM** — manual Planned creation is a
list-level bulk/toolbar action, not a wizard. (PPM-scheduler-originated
creation — `site_scheduler.aspx`, "PPM discipline"/"Statutory PPM"
vocabularies — is outside Helpdesk admin and remains a separate uncharted
surface; STRUCTURAL CANDIDATE only.) **Do not assume PH01's runtime
behaviour mirrors RH01's wizard** — E1/E-planned experiments must treat it
separately.
