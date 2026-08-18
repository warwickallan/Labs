# Action capture — one block per Helpdesk action

Keep these relationship concepts **distinct** (the Dev visualiser proves they
are separate): available-in-status; sets-job-status; user-selects-status;
sets-operative-status; user-selects-operative-status;
auto-fires-on-status-expiry.

Record configuration truth here. Runtime behaviour is a separate claim and
stays unverified until the EXPERIMENT phase.

```text
Name:                        <as displayed>
Code/reference:              <where visible>
Active:                      yes | no | not visible
Description:                 <verbatim, or "none">
Available in statuses:       <list>
Resulting job status:        <status, or "user selects", or "none/unknown">
Resulting operative status:  <status, or "user selects", or "none/unknown">
User selects resulting status:      yes | no | unknown
User selects operative status:      yes | no | unknown
Mobile availability:         yes | no | unknown
Reactive/PPM applicability:  <as evidenced>
Assignment behaviour:        <as evidenced>
Role/security restrictions:  <as evidenced>
Note/file/comment requirements:     <as evidenced>
Timer/expiry behaviour:      <as evidenced>
Bulk-action availability:    yes | no | unknown
Hidden/suppressed conditions:       <as evidenced>
Confidence:                  VERIFIED — OBSERVED | VERIFIED — STRUCTURAL | INFERRED | UNKNOWN
Evidence:                    E-NNN (evidence/<path>)
```

Then complete the configurator field catalogue for the Add/Edit Action
screen (`templates/field-catalogue.md`) — every tab, every section, every
control, without editing anything.
