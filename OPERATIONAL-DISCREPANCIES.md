# Operational discrepancies register — runtime UI vs Admin configuration

Layer discipline: CONFIGURATION TRUTH (Helpdesk Admin) vs OPERATIONAL
PRESENTATION TRUTH (Helpdesk UI) vs BEHAVIOUR TRUTH (experiments).
Categories: PRESENTATION DIFFERENCE · CONFIGURATION/PRESENTATION MISMATCH
· POSSIBLE ROLE FILTER · POSSIBLE CONTEXT FILTER · UNKNOWN.

## OD-001 — Row-menu "Raise order" appears status-dependently [PRESENTATION DIFFERENCE]

With Helpdesk and Work Complete - R row menus include "Raise order"; the
WMT-R row menu does not. Candidate driver: the status
`show_add_order_button` flag (E-013). (E-020)
**CONFIRMED structurally 2026-08-19:** per-status record reads show the
flag set on WH/WC-R and NOT set on WMT-R — exact match (E-022).

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

## OD-005 — Raise Job wizard collects no SLA/triage [RESOLVED 2026-08-19 by E1]

RESOLVED: two creation routes exist. The reporter wizard collects no
urgency (jobs arrive SLA-less); the ADMIN QUICK-ADD modal REQUIRES
Urgency and applies the SLA at creation (E1, CONTROLLED VERIFIED; B-010).
Historical note: job 00000050's P2 came from such an admin-side entry.

## OD-006 — "Email failed to send" recorded on RH01 [BEHAVIOUR OBSERVATION, cause unknown]

Job 00000050's timeline logs "Email failed to send to :
warwick.allan@bellrock.co.uk" after RH01 — originator email fired and
failed. Candidates: empty templates (VI-008), demo SMTP absence. Passive
observation only. (E-020; feeds E2.)

## OD-007 — Response-time filter is Type-filtered [POSITIVE VALIDATION]

Reactive tab: By agreement + P1–P4; Planned tab: only "Planned" — matches
per-record Type ticks (E-017). Consistency, recorded for completeness.
