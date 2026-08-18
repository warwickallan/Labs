# E-006 — Actions tab, "Full list" view: complete action attribute matrix (50 records)

- Captured: 2026-08-18, Helpdesk admin → Actions tab → Full list view.
  Page reports "There are 50 records." — all 50 captured, unfiltered
  (Live actions default).
- Method: DOM table extraction. `✓flag` = an icon in that column (alt text
  with `is_` prefix stripped). Empty = blank cell.
- Confidence: VERIFIED — OBSERVED (list-view rendering of configuration).
  What each flag means at runtime is NOT proven (configuration truth only).

## Columns (verbatim, in order)

Action · Code · Resulting status · Operative status · Default for user ·
Default for helpdesk · Assign responsibility · Resource Team · Resource ·
Admin Team · Supplier · Internal Supplier · Select user · Email ·
Email supplier · Email originator · Admin · Attachments · Is complete ·
(2 spacer cols) · Job type · PPM/Non-PPM · Pause status · Button group

Observations that hold across all 50 rows:

- **Code column is blank for every record** — the visible code (G001, RH04…)
  is part of the Action name text.
- **Operative status column is blank for every record** — no action in
  Vanilla sets an operative status per this view (VERIFIED — OBSERVED in
  list view; cross-check on edit screens advised).
- Job type values seen: All jobs · Single operative job · (blank).
- PPM/Non-PPM values seen: All jobs · Planned only · Non-planned only · (blank).
- Pause status values seen: Paused (GM05) · Restart (GM06) · (blank).
- Only RH01 carries **Default for user** and **Default for helpdesk** flags.
- Only G004 carries **Is complete** (`status_complete`) — pairs with Closed
  being the only Complete status (E-003).

## The matrix (key populated fields per action)

| Action | Resulting status | Flags | Job type | PPM/Non-PPM | Pause | Button group |
| --- | --- | --- | --- | --- | --- | --- |
| G001. Add a note, photo or document | | Attachments ✓document | All jobs | All jobs | | General Actions |
| G002. Permit to work request | | | | All jobs | | General Actions |
| G003. Cancel job | Cancelled | ✓email_supplier ✓email_originator ✓admin_only | | All jobs | | General Actions |
| G004. Close job | Closed | ✓email_originator ✓admin_only ✓status_complete | | All jobs | | General Actions |
| G005. Stock request | | | All jobs | All jobs | | General Actions |
| G006. Consumable order | | | | All jobs | | General Actions |
| GM01. Accept job | | | All jobs | All jobs | | General Mobile |
| GM02. Start Travel | | | All jobs | All jobs | | General Mobile |
| GM03. Stop Travel | | | All jobs | All jobs | | General Mobile |
| GM04. Start job | | | All jobs | All jobs | | General Mobile |
| GM05. Place Job on hold | | | All jobs | All jobs | Paused | General Mobile |
| GM06. Take off hold | | | All jobs | All jobs | Restart | General Mobile |
| GM07. Complete Time on job | | | All jobs | All jobs | | General Mobile |
| LM01. Stock request | | | All jobs | All jobs | | Lead Mobile |
| LM02. Consumable order | | | All jobs | All jobs | | Lead Mobile |
| LM03. Assign/Change Lead | | | All jobs | Non-planned only | | Lead Mobile |
| LM04. Request assistance | | | All jobs | All jobs | | Lead Mobile |
| LM05. Assign to Contractor | With Contractor - R | ✓supplier_assignment ✓email_supplier | All jobs | Non-planned only | | Lead Mobile |
| PH01. New PPM | New PPM | | | Planned only | | Planned Helpdesk Tasks |
| PH02. Assign to maintenance team | With Maintenance Team | ✓resource_team_assignment | | Planned only | | Planned Helpdesk Tasks |
| PH02a. Bulk assign to team | With Maintenance Team | ✓resource_team_assignment | | Planned only | | Planned Helpdesk Tasks |
| PH02b. Assign operative | With Maintenance Team | ✓resource_assignment | | Planned only | | Planned Helpdesk Tasks |
| PH03. Assign to contractor | With Contractor | ✓supplier_assignment ✓email_supplier | | Planned only | | Planned Helpdesk Tasks |
| PH04. Place on hold | | | | Planned only | | Planned Helpdesk Tasks |
| PH05. Take off hold | | | | Planned only | | Planned Helpdesk Tasks |
| PH06. PPM complete | PPM Complete | | | Planned only | | Planned Helpdesk Tasks |
| PH07. PPM Complete - with remedials | PPM Complete | | | Planned only | | Planned Helpdesk Tasks |
| PM01. PPM complete | PPM Complete | | All jobs | Planned only | | Mobile Planned |
| PM02. PPM Complete - with Remedials | PPM Complete | | Single operative job | Planned only | | Mobile Planned |
| RH01. New Reactive Task | With Helpdesk | ✓default_for_user ✓default_for_helpdesk ✓email_originator | | Non-planned only | | Reactive Helpdesk Tasks |
| RH02. Assign to Maintenance team | With Maintenance Team - R | ✓resource_team_assignment ✓email_originator | | Non-planned only | | Reactive Helpdesk Tasks |
| RH03. Assign Operative | With Maintenance Team - R | ✓resource_team_assignment ✓resource_assignment | | Non-planned only | | Reactive Helpdesk Tasks |
| RH03b. Quote Ordered | With Contractor - R | | | All jobs | | *(none)* |
| RH04. Assign to contractor | With Contractor - R | ✓supplier_assignment ✓email_supplier | | Non-planned only | | Reactive Helpdesk Tasks |
| RH05. Approve Order | With Contractor - R | | | Non-planned only | | Reactive Helpdesk Tasks |
| RH06. Quote Request | Quote Requested - R | | | Non-planned only | | Reactive Helpdesk Tasks |
| RH07. Amend SLA | | ✓email | | All jobs | | Reactive Helpdesk Tasks |
| RH08. Place On Hold | | ✓admin_only | | Non-planned only | | Reactive Helpdesk Tasks |
| RH09. Take off hold | | | | Non-planned only | | Reactive Helpdesk Tasks |
| RH10. Work Complete | Work Complete - R | | | Non-planned only | | Reactive Helpdesk Tasks |
| RH11. Work Complete - Follow up | Work Complete - R | | | Non-planned only | | Reactive Helpdesk Tasks |
| RM01. Work Complete - no further work required | Work Complete - R | ✓email_originator | All jobs | Non-planned only | | Mobile Reactive |
| RM02. Work Complete - Follow up | Work Complete - R | | All jobs | Non-planned only | | Mobile Reactive |
| T02. Accepted | | | | All jobs | | Tag/Auto Actions |
| T03. Rejected | With Helpdesk | | | All jobs | | Tag/Auto Actions |
| T04. Appointment Made/Operative Assigned | | | | All jobs | | Tag/Auto Actions |
| T05. In progress | | | | All jobs | | Tag/Auto Actions |
| T06. On hold | | | | All jobs | | Tag/Auto Actions |
| T07. Cost uplift request | Business Case - R | | | All jobs | | Tag/Auto Actions |
| T09. AFP approved | | | | All jobs | | Tag/Auto Actions |

Missing codes in sequences (T01, T08, G-series gaps if any) — not present in
Live actions; whether archived actions exist under the "Archived actions"
filter is not yet checked (U-006).

## Flag vocabulary observed (icon alt texts)

document · email · email_supplier · email_originator · admin_only ·
status_complete · default_for_user · default_for_helpdesk ·
resource_team_assignment · resource_assignment · supplier_assignment
