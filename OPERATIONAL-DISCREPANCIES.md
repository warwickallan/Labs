# Operational discrepancies register — runtime UI vs Admin configuration

Layer discipline: CONFIGURATION TRUTH (Helpdesk Admin) vs OPERATIONAL
PRESENTATION TRUTH (Helpdesk UI) vs BEHAVIOUR TRUTH (experiments).
Categories: PRESENTATION DIFFERENCE · CONFIGURATION/PRESENTATION MISMATCH
· POSSIBLE ROLE FILTER · POSSIBLE CONTEXT FILTER · UNKNOWN.

## OD-001 — Row-menu "Raise order" appears status-dependently [PRESENTATION DIFFERENCE]

With Helpdesk and Work Complete - R row menus include "Raise order"; the
WMT-R row menu does not. Candidate driver: the status
`show_add_order_button` flag (E-013). Not proven. (E-020)

## OD-002 — Action availability rendering: CONFIRMED CONSISTENT [no mismatch]

Across three statuses the web action surfaces equal configured-available ∖
(hide_from_use ∪ wrong-PPM-type). Recorded as a positive validation, not a
discrepancy. Both surfaces (row menu, in-job group buttons) agree. (E-020)

## OD-003 — Admin-only flags not restricting current session [POSSIBLE ROLE FILTER]

G003/G004/RH08 (admin_only) are visible — session is an administrator.
Whether non-admin users lose them is untested. (E-020)

## OD-004 — "PPM discipline" and "Statutory PPM" vocabularies have no Helpdesk-admin source [UNKNOWN]

Operational filters expose PPM discipline (8 values) and works-order type
"Statutory PPM" that no crawled admin tab defines. Candidate source: PPM
scheduler / site admin (outside Helpdesk admin scope). (E-019)

## OD-005 — Raise Job wizard collects no SLA/triage; Priority-2 job exists anyway [UNKNOWN — needs experiment/evidence]

The wizard offers no urgency/call-type/assignment; job 00000051 (wizard-
raised) has no SLA targets, but job 00000050 carries Priority 2 with
computed targets. The route that applied P2 (RH07 Amend SLA, an admin-side
creation form, or other) is unevidenced. (E-019/E-021; feeds E6.)

## OD-006 — "Email failed to send" recorded on RH01 [BEHAVIOUR OBSERVATION, cause unknown]

Job 00000050's timeline logs "Email failed to send to :
warwick.allan@bellrock.co.uk" after RH01 — originator email fired and
failed. Candidates: empty templates (VI-008), demo SMTP absence. Passive
observation only. (E-020; feeds E2.)

## OD-007 — Response-time filter is Type-filtered [POSITIVE VALIDATION]

Reactive tab: By agreement + P1–P4; Planned tab: only "Planned" — matches
per-record Type ticks (E-017). Consistency, recorded for completeness.
