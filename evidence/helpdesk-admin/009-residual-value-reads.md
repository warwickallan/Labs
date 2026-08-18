# E-017 — Residual value reads: Tags, Email templates, Roles, Action routes, Quote process, Response categories

- Captured: 2026-08-18 (session 2, continued). All records opened read-only
  and cancelled unsaved.
- Confidence: VERIFIED — OBSERVED.

## Tags — all 20 records VALUE COMPLETE

Every tag: **TextMatch EMPTY** (description auto-tagging capability unused
in Vanilla), not suppressed, not out-of-hours. All are
"Hide the tag on entry" = TRUE **except Q4. Quote Approved and Travelling**
(visible on entry). Colours:

| Tag | Type | Colour |
| --- | --- | --- |
| 01. Awaiting acceptance | Helpdesk | Amber |
| 01. Team assigned | Helpdesk | Dark blue |
| 02. Job accepted | Helpdesk | Dark blue |
| 02. Supplier rejected | Helpdesk | Dark red |
| 03. Appointment made/Operative assigned | Helpdesk | Light green |
| 03. Engineer assigned | Helpdesk | Blue |
| 04. In progress | Helpdesk | Green |
| 05. On hold | Helpdesk | Dark red |
| 06. Cost uplift awaiting approval | Helpdesk | Dark blue |
| 07. Follow up required/Remedials | Helpdesk | Amber |
| 08. Awaiting AFP/invoicing | Helpdesk | Dark gray/black |
| 09. AFP approved | Helpdesk | Green |
| CU01. Cost uplift request | Order | Purple |
| CU02. Cost uplift approved | Order | Green |
| Parts/Stock required | Helpdesk | Purple |
| Q1. Awaiting approval | Quote request | Amber |
| Q2. Send back to supplier | Quote request | Dark red |
| Q3. Successful quote selected | Quote request | Green |
| Q4. Quote Approved | Quote request | Green (visible on entry) |
| Travelling | Helpdesk | Dark gray/black (visible on entry) |

## Email templates — all 5 records: EMPTY SHELLS (VI-008)

Form: "Subject text for detail" (text) + rich-text body + merge-tag help:
{date raised} {reference} {batch} {reason} {status} {action} {priority}
{uprn} {site name} {category} {message} {target date} {link}.
**All five templates have empty subject AND empty body** (originator
new/progress/completes, Quote declined, Quote submitted).

## Roles — record + schema VALUE COMPLETE

Form: Role* (text) · Users in this role (picker, empty) · Suppress type ·
Default type · Reactive / Planned checkboxes. Vanilla record "Helpdesk
role": name only — no users, no flags, no type ticked.

## Action routes/Overrides — Add form schema (empty tab)

Resulting action* (51 actions) · Priority (6 response categories) ·
Helpdesk type · Workspace. → Priority/type/workspace-conditional action
overrides; none configured in Vanilla.

## Quote process "Standard process" — VALUE COMPLETE

Show tab on Quotes page ✓ · single-quote text "Quote" · list text
"Quotes" · client can create new Quote Requests ✓ · display summary /
reference / value ✓ · **"When a quote in this process is approved… =
Create a brand new Helpdesk job"**.

## Response categories — all 6 records VALUE COMPLETE

| Record | Resp hrs | Repair days | Colour | Type | Notable |
| --- | --- | --- | --- | --- | --- |
| Priority 1 | 2 | 1 | Red | Reactive | Desc "Attend in 2 hours complete in 24 hours"; workspace "A Workspace"; **Link to order priority: Priority 1**; NOT external-users |
| Priority 2 | 24 | 3 | Orange | Reactive | external-users ✓ |
| Priority 3 | 48 | 5 | Yellow | Reactive | external-users ✓; display order 0 |
| Priority 4 | 72 | 7 | Green | Reactive | external-users ✓; display order 4 |
| Planned | 0 | 0 | Blue | Planned | out-of-hours allowed ✓ |
| By agreement | 0 | 0 | — | Reactive | manual target dates ✓ |

All on Standard hours; arrival-adjust ✓ on all except By agreement; none
default (VI-005 confirmed at record level). The Add-form defaults
(is_force_retro etc., E-013) are NOT set on the actual records.

## Deliberately not read (low value for reproduction)

Per-record Classification forms (list-level uniform: all Reactive, zero
values, blank urgency — E-012); Quote status / Quote Request status Add
forms (values fully visible in list); Satisfaction-survey record detail.
