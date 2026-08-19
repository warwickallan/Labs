# Core Five completeness matrix

Warwick's five essential Helpdesk configuration families (~85% of any
Helpdesk build). Gates: **SCHEMA COMPLETE** (every configurator field and
option) · **VANILLA VALUES COMPLETE** (every record, every value) ·
**OPERATIONAL MAPPING COMPLETE** (where it surfaces in the runtime UI) ·
**BEHAVIOUR VERIFIED** (controlled runtime proof) · **RESIDUAL** (named
gaps). Audited 2026-08-19 after E-023.

| Family | SCHEMA | VANILLA VALUES | OPERATIONAL MAPPING | BEHAVIOUR | RESIDUAL |
| --- | --- | --- | --- | --- | --- |
| **Helpdesk Job Types** (2) | ✔ 57-control form (E-014) | ✔ both records fully read (E-023) — bindings to statuses/SLAs/creation actions/button text | ✔ type tabs, tab order, Raise-job button text, hidden Planned button, creation routes (E-019/E-021) | ◐ creation via RH01 CONTROLLED VERIFIED (E1); PH01 creation untested | Planned type has no default status set (benign gap, noted); audit-frequency/prefix/role fields unused in Vanilla — behaviour untestable until configured |
| **Statuses** (13) | ✔ 51-control form incl. expiry mechanism (E-013) | ✔ all 13 records incl. mobile-app flags, locks, order-button flags (E-022) | ✔ status tabs+counts, row menus, raise-order button driver confirmed OD-001 (E-019/E-020/E-022) | ◐ transitions through 7 statuses CONTROLLED VERIFIED (E1); expiry (E4), AOA-R unapproved-orders entry (E2) untested | none structural; expiry/entry behaviours = E4/E2 |
| **Actions** (50) | ✔ 211–225-control form, all options (E-009/E-014) | ✔ all 50 edit forms (E-015) + all 50 tag-automation lists (E-023) + GUIDs | ✔ two web surfaces validated vs config across 3 statuses (E-020); group buttons; hidden-action rendering | ◐ 7 actions CONTROLLED VERIFIED incl. tag choreography (E0/E1); order-triggers/T-actions = E2/E3; mobile = E5 | (†)-flagged tag entries need a one-off re-read (possible stale-panel captures); per-action custom-field/phrase/questionnaire/doc-slot sub-lists assumed empty (only RH04 checked); role restrictions all-empty verified in forms but untested for non-admin rendering |
| **Classifications** (16+74) | ✔ 31-control form, nested structure (E-014/E-018) | ✔ ALL 90 records read — 100% uniform (name + external-page ✓ + Reactive) (E-023) | ✔ wizard parent→child tiles, admin cascading selects + short-title autofill, grid path rendering (E-021/E1) | ◐ cascade-select + tile journey CONTROLLED VERIFIED (E0/E1); urgency-defaulting untestable (nothing wired) = E6 | 'resource' expander grids per classification unread; cascade-to-child write semantics untested (would persist) |
| **Response Categories** (6) | ✔ 31-control form incl. clocks/fixed times/overrides (E-013) | ✔ all 6 records (E-017) incl. P1 order-priority link | ✔ Type-filtered search filter, urgency* in admin form, absent from wizard (E-019/E-021/E1) | **✔ SLA clock arithmetic CONTROLLED VERIFIED (E1/B-003)**; retro/arrival-adjust/out-of-hours variants untested | end-of-month period type, per-supplier/workspace overrides, fixed-time targets unused in Vanilla — untestable without fixtures |

## Cross-family relationship map (all evidenced)

- Job Type → binds Statuses (per-status ticks + default status), Response
  Categories (per-type ticks), creation Action (RH01/PH01), button text.
- Status → Type applicability ticks; expiry → any Action; mobile-app flag
  gates Orchestrate; order-button flag drives row menus.
- Action → availability per Status; resulting Status/Type; tag automation;
  group → job-toolbar rendering; PPM applicability partitions by Type.
- Classification → Job Type (all Reactive in Vanilla); Default Urgency →
  Response Category (unwired everywhere = VI-006); wizard/admin-form
  cascade; short-title autofill.
- Response Category → Type ticks; working-time clock; order-priority link
  (P1); required at admin creation, absent from reporter wizard.

**Verdict: all five families are SCHEMA + VANILLA-VALUES + OPERATIONAL-
MAPPING complete with the named residuals above. Behaviour coverage is
partial by design — E2–E6 close it.**
