# E-023 — Core Five value completion: Job Type records, action tag matrix, all classifications

- Captured: 2026-08-19, read-only (all forms cancelled unsaved).
- Confidence: VERIFIED — OBSERVED.

## 1. Helpdesk Job Type records — VALUE COMPLETE (both records, full form)

**Reactive** (ba98cba4-…): Default type ✓ · standard helpdesk job ✓ · Show
on Helpdesk Mobile app ✓ · default entry action **RH01** (and FixMy action
RH01) · tab order 10 · tenant/contact selectable ✓ · **'Add new record'
button text = "Raise job"** · status bindings: all 9 Reactive statuses ·
**Default status = With Helpdesk** · Response categories bound: By
agreement, P1, P2, P3, P4 · everything else default/blank (no prefixes, no
audit frequency, no remedial default, no roles, no site/region scoping, no
report template).

**Planned** (cf54e0a3-…): NOT default · standard job ✓ · mobile app ✓ ·
default entry action **PH01** (no FixMy action) · tab order 20 · display
PPM start date on grid ✓ · **"Hide the 'Add new record' button entirely" ✓
with button text "\*\*DO NOT USE\*\*"** — the absent Planned Raise-Job
button is CONFIGURATION, not product behaviour · status bindings: the 6
Planned statuses · **no Default status set** (PH01 supplies New PPM;
recorded as a benign gap) · Response category bound: Planned only.

## 2. Actions — per-action TAG AUTOMATION matrix (all 50 record views read)

The numbered-tag choreography, action by action (add → / remove ∖):

| Action | Adds | Removes |
| --- | --- | --- |
| RH02 | 01. Team assigned | 02. Supplier rejected |
| RH03 | 03. Engineer assigned | 01. Team assigned · 02. Supplier rejected |
| PH02b | 03. Engineer assigned | 01. Team assigned |
| RH04 / PH03 | 01. Awaiting acceptance | 02. Supplier rejected |
| LM05 | 01. Awaiting acceptance | 01. Team assigned · 03. Engineer assigned |
| T02 | 02. Job accepted | 01. Awaiting acceptance |
| T03 | 02. Supplier rejected | 01. Awaiting acceptance |
| T04 | 03. Appointment made/Operative assigned | 02. Job accepted |
| T05 | 04. In progress | 03. Appointment made · 05. On hold · 07. Follow up · 08. Awaiting AFP… |
| T07 | 06. Cost uplift awaiting approval | 04. In progress |
| T09 | 01. Awaiting acceptance(†) | 02. Supplier rejected(†) |
| GM01 | 02. Job accepted | 01. Team assigned · 03. Engineer assigned |
| GM02 | Travelling | 02. Job accepted |
| GM03 | — | Travelling |
| GM04 | 04. In progress | 02. Job accepted · Travelling |
| GM05 / GM06 | 05. On hold(†GM06) | 04. In progress(†) |
| GM07/…, G001/G002/G003/G005, LM02-04, PH01/PH04/PH05, RH01/RH06-09, T06 | — | — |
| G004 | — | (clears the working ladder: 01,02,03,05,…) |
| G006 | Parts/Stock required(†) | — |
| RH05 | 01. Awaiting acceptance(†) | — |
| RH10 | 08. Awaiting AFP/invoicing | working-ladder clear |
| RH11 / PH07 / RM02 / PM02 | 07. Follow up required/Remedials | working-ladder clear / 04. In progress |
| PH06 | 08. Awaiting AFP/invoicing | working-ladder clear |
| PM01 / RM01 | — | 04. In progress |
| RH03b / LM01 / PH02 / PH02a | 01. Team assigned(†) | — |

(†) Entries whose remove-section rendered the empty-state text mid-capture
— possible stale-panel artifact for the ADD value on RH03b/LM01/PH02/PH02a/
RH05/G006/T09 and GM06's add; flagged for a one-off re-verification pass.
E1 already CONTROLLED-VERIFIED the RH02/RH03/RH10/G004 rows behaviourally.

## 3. Classifications — ALL 90 records VALUE COMPLETE

All 16 parents + **all 74 children** read individually: **100% uniform.**
Every record sets exactly: name + "Classification is available on external
helpdesk page" ✓ + Helpdesk Job Type = Reactive. Every other field of the
31-control schema (default urgency, asset type/subtype, Helpdesk Process,
working pattern, budget category/heading, order type, AFP doc requirement,
H&S, equipment-not-working, mobile visibility, FixMy hiding, codes,
liability, planned hours, portfolio, external action) is default/blank on
EVERY record — VI-006 now proven at full scope.

**Inheritance semantics:** children carry their own explicit values
(identical to parents'); no live inheritance was observed; the "Cascade
these changes to child classes" checkbox is a write-time push mechanism
(structural reading — write behaviour untested). The earlier
"502-obscured" Lifts child does not exist: Lifts has exactly 3 children
(Disabled Access platform, Lifts - Hydraulic, Lifts - Passenger) — the
502 fragment was a transient error row, E-018 corrected.

Child tree totals: 74 children under 16 parents (E-018's ≈85 estimate
corrected to exactly 74).
