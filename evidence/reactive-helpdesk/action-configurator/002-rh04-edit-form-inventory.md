# E-009 — Add/Edit Action configurator: complete control inventory (RH04 in Edit mode)

- Captured: 2026-08-18 by opening RH04's Update form (form NOT saved; closed
  via Back after inspection). RH04's stable id: action GUID
  `9b0ee52e-c932-4a17-a2a2-ac70a218fa33` (from the Update button's
  `PblActions.nav('form_view', …)` call).
- Method: DOM walk of the open form — 211 visible controls with label, type,
  DOM id (all `pbl_form_*`), current RH04 value; plus full option lists of
  every meaningful select.
- Confidence: VERIFIED — OBSERVED (labels/controls/options/values).
  Runtime meaning of any control is NOT proven (configuration truth only).

The form is one long page with 12 quick-link sections:
**Statuses · What does action do · Prompts · General · Email rules · Mobile
options · Assignments · Defaults · Timer · Roles · Constraints · Project
details**

## Top / identity / Statuses section

| Label | Control (DOM id) | RH04 value |
| --- | --- | --- |
| Action* | text `further_action` | RH04. Assign to contractor |
| Code (optional) | text `action_code` | *(blank — codes live in the name!)* |
| External label (for cross-database reporting) | text `external_label` | blank |
| Action group | select `helpdesk_action_groupid` (9 opts = blank + the 8 groups) | Reactive Helpdesk Tasks |
| **Suppress this action** | checkbox `suppress_helpdesk_further_action` | false |
| **Hide this action from the user options** | checkbox `hide_from_use` | false |
| Jobs will be changed to this type when this action… | select `to_helpdesk_typeid` [blank, Planned, Reactive] | Reactive |
| Jobs will be set to this status when this action… | select `helpdesk_further_action_statusid` | With Contractor - R |
| Included/Excluded workspaces | checkbox lists `included/excluded_portfolio_ids<GUID>` | A Workspace, unticked |
| This action appears when adding a new job | checkbox `is_new_job` | false |
| Statuses in which this action can be selected | checkbox per status `status_ids<GUID>` + select-all | With Helpdesk ✓, WMT-R ✓, WC-R ✓ |

Resulting-status select options (with Resulting type = Reactive):
`(Keep existing job status if compatible with new type, otherwise use
default status for new type)` + the 9 Reactive statuses. **The option list
is conditional on the selected Resulting type** (only Reactive statuses
offered) — structural UI behaviour.

## "What does action do" section

Bulk availability (`is_bulk_action`), overdue-activities availability,
cancel order (`is_cancel_order`), reset response target (`is_reset_target`),
estimated-cost update select `update_helpdesk_estimated_cost`
[Do not update / Set to specific value / Set to sum of all orders / Prompt
user] + value field, actual response date set (`is_actual_response`), actual
work-complete date set (`is_sla_complete`), show root cause on app
(`is_root_cause`), **admin only** (`is_admin_only`), on/off-hold select
`on_hold_status` [blank / Will put the job on hold / Will take the job off
hold], off-hold return date prompt (`is_set_off_hold_date`),
**order-status trigger** select `action_orderstatusid` (RH04 = "Awaiting
acceptance") — *"This action will trigger when orders are set to the
following status"*, order-status setter `to_orderstatusid`, PPM-visit setter
`to_sitelogbook_statusid`, remove-all-operative-assignees
(`is_remove_assign`), set-assigned-from-op, assign-to-self.

Order status vocabulary (12): Accepted · Appointment Made/Operative
Assigned · Awaiting acceptance · Cancelled · Closed · Complete - awaiting
certificate · In progress · In review · On hold · Pending quote · Work
complete. *(matches the T-action names → the T Tag/Auto actions are
evidently order-status-triggered; see finding below)*

Site-logbook (PPM visit) statuses (9): Aborted visit · Appointment made ·
Complete · Complete - Remedial · Complete with non compliance · Helpdesk ·
Ordered · Unable to access site.

## Prompts section (36 controls, all checkboxes unless noted)

Appointment details · response date/time · completion dates (even if not
completion) · NOT prompt completion dates on completion action · NOT prompt
response dates · customer/client reference · cost code · call type ·
retrospective raised date · **is quote request** (`is_quote`) · **is quote
process** (`is_quote_process`) · stock request (`is_stock`) · permit request
(`is_add_permit`) · consumable order · order-approval prompt
(`is_order_approve_prompt`) · assign responsibility (`is_assignment`) ·
**mandatory notes** (`is_mandatory_notes`) · select user (`is_select_user`) ·
set job owner · set assignee · update work description · change priority ·
agree new target date · protect target vs decrease · protect vs increase ·
asset approval/rejection select `asset_date_status` · document attachment
(`is_document`) · revisit action · recall action · can add remedial ·
job-flag select `flag_status` [Flag the job / Remove the job flag] · must
select project · KPI prompt (`is_kpi_action`) · forecast cost · order
appointment display · linked-equipment availability prompt.

## General section

Job applicability select `is_ppm_text` [All jobs / Non-planned only /
Planned only] (RH04 = Non-planned only) · target-state select
`job_target_state` [Any / Jobs that are on target / Jobs where target has
been missed] · fires on order approval (`is_order_approved`) · orders
created unapproved (`is_no_order_approve`) · fires when all orders closed
(`is_all_orders_closed`) · note on printed ticket · note in supplier portal ·
contract notification select `contract_job_typeid` [blank / **Cost uplift**]
· note-count exclusion (`is_note_only`) · fires on application-for-payment
approval (`is_application_approved`) · show in helpdesk timeline
(`is_timeline`).

## Email rules section

Email selected users+notes (`is_email`) · **email supplier**
(`is_email_supplier`, RH04 = true) · email operatives · email originator ·
include documents · include all documents by default · email subject (text).

## Mobile options section (37 controls)

Operative-status setter select `operative_statusid` (blank + the 9) —
**"Status operative record will be set"** · per-operative-status checkbox
list `operative_statusids<GUID>` (user-selectable operative statuses) ·
**appears on mobile** (`is_handheld`) · app select `app_version_mode`
[Both web app and Orchestrate / Legacy web app only / Orchestrate only] ·
geofence restriction · remove Mobiess operative assignment · remedials
gate select [Not applicable / must be none / must exist] · client-app
availability · Orchestrate "Op…" availability · guidance text (textarea) ·
client-app audit trail · operative message · can select lead operative ·
pending-completion gate · resource select mode [Select operatives to
assign / …to request] · **who can carry out** select
`lead_or_sub_operative_action` [Anyone on the job / Lead operative only /
Sub operative only] · download-scope select `action_type` [all operatives /
single-operative jobs / multi-operative jobs] · multi-complete gating ·
signature required / mandatory / hidden / signer label · reassign
(`is_reassign`) · **once per job** (`is_once_per_job`) · pause select
`pause_mode` [Pause job for operative / Restart job for operative] · travel
select `travel_mode` [Start travel / Stop travel] · acknowledge select
[acknowledged / unacknowledged] · include in app audit trail · file upload.

## Assignments section

Resource assignment (`is_resource_assignment`) · resource-team assignment ·
new related child job (`is_new_helpdesk_job`) · admin-team assignment ·
portal exclusion · **supplier prompt** (`is_supplier_assignment`, RH04 =
true) · importance select [Normal / Use this action before others…] ·
**attach order PDF** (`attach_order`, RH04 = true) · update/swap orders'
supplier · fired when order raised for internal supplier
(`is_internal_supplier_assignment`) · limit assignable users (text) ·
**routing**: select `ruletype` [No routing / **Route when supplier
assigned**] + `rule_orderstatusid` (12 order statuses) + `rule_actionid`
(51 = blank + all 50 actions).

## Defaults section

Default for standard users (`default_for_user`) · default for helpdesk
operatives · default note text · **timer select** `timer_setting`
[Start timer on job / Stop timer on job] · timesheet category select
[Default / Timesheetcategory Default].

## Roles section

One "Helpdesk role" checkbox (`role_ids…`) + 14 security-role checkboxes
(`sec_role_ids<GUID>`) — all **unticked** for RH04 (= no role restriction).
Roles: [Concerto] Administrator · Assurance Administrator · Common
Functions · End User · Estates Surveyor · Facilities Manager · Helpdesk
Administrator · Maintenance operative · Property Information Officer ·
Reporting Administrator · Sites Administrator · Supplier · Supplier
Operative · System Administrator.

## Constraints section

Checkbox per **mobile** action (18: G001, G005, GM01–GM07, LM01–LM05,
PM01–PM02, RM01–RM02) — all unticked for RH04. Semantics per the section
name: constraints between actions (exact meaning UNKNOWN, U-012).
Then an icon picker (radio `icon*`, RH04 = `users3`).

## Project details section

Default order project (text `order_projectid`, RH04 =
"(00001) Reactive Maintenance") · per-workspace project override
(`projectid<workspaceGUID>`).

## Major findings

1. **U-008 answered structurally:** "Suppress this action" and "Hide this
   action from the user options" are explicit action fields.
2. **U-009 substantially answered (configuration truth):** actions can be
   **order-status-triggered** (`action_orderstatusid`). RH04 itself
   triggers "when orders are set to Awaiting acceptance"(!). The T-actions'
   names match the order-status vocabulary — the contractor loop is driven
   by order statuses, not tags per se. Tag add/remove is a separate
   per-action list (E-008). Runtime behaviour still unverified.
3. **Timers exist per action** (`timer_setting` start/stop) and per
   operative record; no expiry-timer field seen on the action form — the
   map's "auto-fires on status expiry" concept must live elsewhere
   (Status rules? U-013).
4. **Role restriction = empty for RH04** → available to all roles
   (structural default).
5. The resulting-status option list is conditional on Resulting type —
   only that type's statuses are offered, plus a keep-if-compatible rule.
6. GUID identity is exposed for every referenced object (statuses,
   operative statuses, roles, actions, workspaces) via DOM ids — recorded
   in `model/IDENTITIES.json`.
