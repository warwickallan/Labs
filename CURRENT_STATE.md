# CURRENT_STATE — authoritative wayfinder (short-lived)

> Cold-start order: **CLAUDE.md → this file → SESSION_LOG.md →
> docs/CONCERTO-HELPDESK-ORDERS-OPERATING-MODEL.md →
> models/registers/evidence → git log.** A fresh session must read the
> operating-model document before touching anything.

- **Updated:** 2026-08-19 — ROTATE CORRECTION state (post cold-review
  patch; final).
- **Phase:** structural discovery of Helpdesk + Orders + both operational
  surfaces COMPLETE. Experiments E0/E1 COMPLETE (CONTROLLED VERIFIED).
  **E2 NOT authorised/executed. PPM Scheduler NOT mapped. Vanilla NOT
  modified — ever.**
- **Standing rule:** Vanilla configuration is immutable; disposable ZZ
  TEST fixtures only where an authorised experiment explicitly requires
  them.
- **Baselines:** structural tag `VANILLA-HELPDESK-STRUCTURAL-v1` =
  705ca2a11001b610bffaf30da6447475bea91675 (immutable). Current HEAD =
  this rotate commit (`git log -1`). Remote: github.com/warwickallan/Labs
  `main` (public — never any secrets).

## Completed (with canonical artefacts)

- **Helpdesk domain:** 43 tabs; Core Five SCHEMA+VALUE complete
  (CORE-FIVE-COMPLETENESS.md); model/VANILLA-HELPDESK.json (generated,
  validator green); evidence E-001..E-024.
- **Operational Helpdesk:** landing/wizard/quick-add/action surfaces
  (E-019..E-021; OPERATIONAL-DISCREPANCIES.md OD-001..007).
- **Orders domain:** 32 tabs; ALL 32 configurator Add-schemas captured
  (EO-004/EO-006) incl. Budget Category; priority five SCHEMA+VALUE
  complete; model/VANILLA-ORDERS.json (validated); evidence
  EO-001..EO-006.
- **Supplier Portal:** operational surface mapped (EO-005); order ref =
  parent job ref + "/n"; portal rendering formula validated.
- **Cross-domain:** model/CROSS-DOMAIN-RELATIONSHIPS.json (X-001..X-018);
  T-action trigger map fully structural.
- **Behaviour:** model/VERIFIED-BEHAVIOURS.json (B-001..B-013 from E0/E1
  + passives). Experiment programme: docs/EXPERIMENT-PROGRAMME.md (Rev 2).

## Retained ZZ TEST fixtures

Tag "ZZ TEST textmatch tag"; jobs 00000052 (With Helpdesk), 00000053
(Closed), 00000054 (Cancelled) on demo site Aintree/S0001. Cleanup needs
approval.

## Known Vanilla defects (headline)

**VI-009/VO-002: the supplier acceptance loop is broken** — SP01/ORC10
lack portal visibility; SP02 lacks portal visibility AND correct
availability. Also: VI-002 BC-R dead end · VI-005/VI-006 SLA wiring unset
· VI-008 empty email templates (+observed send failures) · VI-007
view/form mismatches · VO-001 duplicate Default priorities. Full detail:
VANILLA-ISSUES.md.

## Genuine unknowns

UO-001 order approval-level source · UO-002 (folded into the VI-009 fix
decision) · U-007 map warning logic · U-012 residual constraints
semantics (E5) · report-level open-jobs definitions · PPM domain
entirely · runtime truth of every cross-domain edge (E2/E3).

## Next programme options (Warwick to choose)

1. **E2** — first requires the VI-009 decision: correct FOUR fields
   across three Supplier Actions on Vanilla (SP01 portal visibility;
   ORC10 portal visibility; SP02 portal visibility + Awaiting-acceptance
   availability) — explicit approval needed — OR clone ZZ TEST supplier
   actions.
2. E3 (quote bridge) / E6 (SLA) — runnable without the portal.
3. PPM Scheduler structural discovery (new domain).
4. (Residual re-reads closed 2026-08-19: (+) tags corrected in E-024;
   resource grids empty; root causes complete.)
