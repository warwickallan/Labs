# EO-002 — Orders Admin priority families: Priority, Order Types, Budget Categories, Supplier Actions (all records)

- Captured: 2026-08-19, read-only, all forms cancelled.
- Confidence: VERIFIED — OBSERVED.

## Order Priorities — all 7 records

| Priority | Values |
| --- | --- |
| Default (740807bf…) | **Default flag ✓** — nothing else |
| Default (59802890…) | *(name only — DUPLICATE-NAME record, empty)* → Vanilla inconsistency VO-001 |
| Planned | colour Blue, Standard hours |
| Priority 1 | **2h response / 1d completion**, Red, Standard hours, **Workspace "A Workspace"** |
| Priority 2 | code 02, Orange, Standard hours — no deadlines |
| Priority 3 | code 03, Yellow, Standard hours — no deadlines |
| Priority 4 | code 04, Green, Standard hours — no deadlines |

Cross-domain: Helpdesk Response Category P1 → "Link to order priority:
Priority 1" (E-017); RH07 "will update the order priority to associated
helpdesk priority" (E-015). Orders-side P2–P4 carry NO deadline values —
the order-SLA layer is largely unwired (mirrors VI-005 pattern).

## Order Types — both records

- **Purchase order** — code PO-01, **Default** ✓.
- **Stock Order** — code STK01, consumable type ✓, Budget heading Stock,
  Budget category STK (STOCK), orders assigned to project **(00003) Stock
  Orders**.

## Budget Categories — all 11 records

CAP (EQUIP)/CAP (IT) codes CAP/6000·7000 · PM (BUILD/ELEC/MECH/OTHER)
PM/1000–4000 · RM (BUILD/ELEC/MECH/OTHER) RM/1000–4000 (**RM (MECH) =
default**) · STK (STOCK) STK/5000. All: Type=Works, Category="Either
expenditure or income", rate/unit/qty input ✓; **lumpsum input ✓ on all PM
and RM lines only** (not CAP/STK). Cross-domain: exactly the vocabulary
offered on Classification forms (budget category + heading) and Quote
actions (budget for resulting orders); CIS/Non-CIS/other-code columns
exist but are empty in Vanilla.

## SUPPLIER ACTIONS — all 13 records (the cross-domain engine)

Every Supplier Action carries **"Resulting action on the helpdesk
status"** — a DIRECT Helpdesk-action link. The complete matrix:

| Supplier action | Avail (order statuses) | → Order status | Fires Helpdesk action | Notable config |
| --- | --- | --- | --- | --- |
| ORC10. Acknowledge Job | Awaiting acceptance, AMO | In progress | **T05** | acknowledge=sets acknowledged; all fields hidden |
| SP01. Accept job | Awaiting acceptance | Accepted | **T02** | **"the supplier portal accept/acknowledge action" ✓**; show before accepted |
| SP02. Reject job | (In progress ✓ listed) | Cancelled | **T03** | **"the supplier portal reject action" ✓**; Non-planned; Reactive template scope |
| SP03. Make appointment/Assign operative | Accepted | Appointment Made/Op Assigned | **T04** | appointment + operative-assignment panels; **PPM visit → Appointment made** |
| SP04. Start Job | AMO, In progress | In progress | **T05** | response time MANDATORY; start timer; once-per-operative; updates response date; contractor app ✓ |
| SP05. Place on hold | AMO, In progress | On hold | **T06** | stop timer; notes optional |
| SP06. Start return visit | On hold | In progress | **T05** | **constraints: SP04 + SP05**; start timer |
| SP07. Work complete | AMO, In progress | Work complete | **RH10** | response+complete MANDATORY; signature + engineer signature + customer-not-present; portal toolbar (bulk) ✓; updates response+complete dates; stop timer; templates Major/Reactive/Stock; **constraint SP04** |
| SP07. Complete & Quote | AMO, In progress | Work complete | **RH11** | **is-quote-request ✓, Quote Process "Standard process", sends user to quote screen**; complete time mandatory; stop timer; **constraint SP04** |
| SP07. PPM Complete | In progress | Work complete | **PH06** | Planned only (stat+non-stat); **PPM visit → Complete**; timings mandatory; **constraint SP04** |
| SP07. PPM Complete - with remedials | In progress | Work complete | **PH07** | Planned only; **PPM visit → Complete - Remedial**; can add remedials |
| SPWA. PPM Reviewed | (any) | Work complete | **PH06** | Planned only; **file upload MANDATORY**; PPM-certificate prompt; "orders linked to Planned" scope |
| BC01. Cost uplift required | Work complete | *(none)* | **T07** | **prompts estimate/business case type "Cost uplift"**; Non-planned |

Configurator schema (from record forms): sort order · resulting order
status · resulting helpdesk action (all 51) · availability per order
status (checkbox list) · when-to-show (before/after acceptance) ·
per-field show/hide/mandatory controls (response time, complete time,
estimated arrival, root cause, notes, supplier reference, no-charge,
status-update note) · file/photo upload modes incl. mandatory ·
PPM/non-PPM + statutory scoping · timings/certificate/quote/remedial
action scoping · PPM-visit resulting status · portal visibility + portal
toolbar (bulk) · contractor app visibility · device job-type scope ·
once-per-operative · response/complete date updates · timer start/stop ·
signatures (customer/engineer/not-present) · quote process link ·
estimate/business-case prompt · project-template scoping (Major/Planned
maintenance/Reactive maintenance/Stock) · constraints (other supplier
actions) · final-invoice trigger · CAPI action · acknowledge ·
who-can-carry-out · special-role flags (portal accept / portal reject).

## Cross-domain resolution (updates U-009 residual — now STRUCTURALLY RESOLVED)

T-action trigger sources, previously invisible on the Helpdesk side:
**T02←SP01 · T03←SP02 · T04←SP03 · T05←ORC10/SP04/SP06 · T06←SP05 ·
T07←BC01.** Supplier completions fire RH10/RH11/PH06/PH07 directly. The
Helpdesk-side order-status triggers (G003/G004/RH04/RH05 fields, E-015)
are the OPPOSITE direction (job events ↔ order updates); arbitration
between same-event candidates is the "importance/use-first" flag.
Runtime confirmation remains experiment E2.
