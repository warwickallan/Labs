# EO-004 — Orders core-four Add-form schemas (complete configurators)

- Captured: 2026-08-19; blank Add forms opened and CANCELLED. With
  EO-001/EO-002's per-record values this makes Status, Priority, Order
  Types and Supplier Actions SCHEMA + VALUE complete ("90% of the module"
  per Warwick).
- Confidence: VERIFIED — OBSERVED.

## Order Status (34 controls)

Name*/external label/Colour* (13-colour vocab, default Red)/Code ·
defaults: Default · **Default for journals only · Default for consumable
orders only · Delivered/Partial-delivery consumable statuses** · semantic
flags: Complete · Cancelled · In progress · **PPM review status · Failed
PPM review** · Quote pending · On hold · Complete-on-site/Goods received ·
**Default line status** · surfacing: mobile app · goods-received page ·
restricted to operatives/suppliers · contractor app · hub dashboard (+name
override) · **remedials-from-device flag** · commercial: prevent
application · prevent invoices · **"set orders to this status when a final
application is received" · "set previous complete orders to this status
when an invoice is recalled"** · PPM-accrual set flag · remedial action on
completion (vocab: Send email / Not Required / Add note / Add to existing
project / Add a new project / Add a helpdesk job / Raise an order /
Complete work) · **estimate-linked PPM visit setter** (8 visit statuses) ·
sort* · Suppress. → Unused-in-Vanilla capabilities now schema-known
(journal/consumable defaults, PPM review pair, final-application/invoice-
recall setters).

## Order Priority (20 controls)

Name*/description · manual target dates · initial response hours*/days* +
fixed time hh:mm · target completion hours*/days* + fixed time · Code ·
hide-on-quote · hide-on-remedial · Default · Suppress · Workspace ·
Status colour (6) · Working hours* · separate completion working-hours
toggle. (Mirrors the Helpdesk Response-category shape minus
retro/external/supplier fields.)

## Order Type (10 controls)

Type* · **"Is this the type allocated to PPM orders by default"** · Code ·
consumable flag · Suppress · Default · Workspace · Budget heading ·
Budget category (11) · consumable/stock orders project.

## Supplier Action (114 controls — full configurator)

Identity/presentation: portal visibility (default ✓) · name* · external
label · sort* · guidance notes · portal toolbar (multi-select/bulk) ·
contractor app · overdue-activities · helpdesk-timeline inclusion ·
**"Include on supplier portal" + per-order-status availability checkboxes
(all 11)** · when-to-show (whether/before/after acceptance).
Workflow: **Resulting order status (11) · Resulting action on the
helpdesk status (all 51 Helpdesk actions)** · Supplier-Order-Status
checkpoint · supplier order status setter · PPM visit setter (8) ·
estimate/business-case prompt ("Cost uplift") · quote request + Quote
Process + send-to-quote-screen · appointment + operative-assignment
panels · multiple attendances (+remove previous timings) ·
percent-complete.
Field controls (hide/show/mandatory tri-state): response time · complete
time · estimated arrival · root cause · notes · supplier reference ·
no-charge · status-update note; flag-job; offline photo + online file
upload with mandatory modes (non/statutory-only/all).
Scoping: PPM (all/non-planned/planned-only) + statutory scope · timings
scope · certificate scope · quote scope · remedial scope + remedials
must/must-not gates · authorised/unauthorised orders ·
helpdesk-type link (Planned/Reactive) · not-linked-to-jobs ·
retrospective-only · project templates (Major/Planned/Reactive/Stock) ·
workspaces.
Special roles: **portal accept/acknowledge action · portal reject action ·
portal application-for-payment action** · must-accept-terms ·
final-invoice triggers (none / no-retention / with-retention) · authorise
the order · reset pre-approval · reset sell value.
PPM machinery: creates PPM review · forces PPM supplier (certificate)
review · certificate-identify prompt · statutory/non-statutory document
mandates · equipment update on PPM orders · linked-equipment availability
prompt.
Device/operative layer (mirrors Helpdesk mobile options): **operative
status setter + user-selectable operative statuses (all 9)** ·
pause/restart · start/stop travel · acknowledge/unacknowledge · device
job-type scope · multi-complete gating · once-per-operative · signature +
engineer signature · updates response/complete dates · timer start/stop ·
lead-operative select · pending-completion gate · who-can-carry-out ·
app audit trail · remove-all-assignees.
Email: send-to-operative + subject + body with merge tags.
Integration: **Related CAPI action** (None/Accept/Reject/Attended/
Complete/Re-Complete/Complete Awaiting Timings/Complete Awaiting
Certificate/Upload certificate/Add timing/Upload document/Add note).
Constraints: checkboxes referencing the SP-series actions.

## Completion statement (the "90%" families)

| Family | Records read | Schema | Notes |
| --- | --- | --- | --- |
| Order Status | 11/11 | 34 controls | unused capabilities catalogued |
| Priority | 7/7 | 20 controls | VO-001 duplicate-Default anomaly |
| Order Types | 2/2 | 10 controls | PPM-default-type field unused in Vanilla(!) — neither record ticks it |
| Supplier Actions | 13/13 | 114 controls | complete cross-domain engine |
