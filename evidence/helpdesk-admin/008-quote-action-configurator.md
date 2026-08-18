# E-016 — Quote action configurator + RE05: the quote→job bridge (U-005 resolved)

- Captured: 2026-08-18 (second signed-in session). Blank Quote-action Add
  form inventoried; RE05 "Raise Order" opened in Edit view; both cancelled
  unsaved.
- Confidence: VERIFIED — OBSERVED (configuration truth).

## Quote action Add form (~90 controls) — capability summary

Name* · Sort* · Default-on-new-request · Archive · **"Quote requests will
be sent to this status"** (5 request statuses) · **"The source order will
be set to this status"** (11 order statuses) · per-quote status prompt
(Awaiting quote / Sent to client) · overdue-activities availability ·
**availability checkboxes per quote-request status** (Request issued,
Quotes received, Raise order, Quote complete, Quote request cancelled) ·
displays-order-page · successful-quote selectable · assign-to-person ·
recharge-status change · display in options menu (default ✓) · display on
mobile (default ✓) · **approval action (requires approver permission)** ·
manual project/budget input · customer-ref prompt · cost/capex code input ·
business-unit input · manual order details · **triggered when attached
order approved / rejected** · new-job page type (Reactive/Planned) ·
only-if-successful-quote gate · **trigger if all quotes submitted or
declined** · value display bands (above / equal-and-below) · guidance
text · **"Action fired against any linked quotes when a successful…"**
(RE-action select) · quote-type scope (All / FM only / Project only) ·
per-security-role restriction (14 roles) · **client quote value-limit
override actions** (two bands, each with an alternative RE-action) ·
optional project/budget for resulting orders ·
**"Action to be triggered against the original job linked to…"** (select
of all 51 helpdesk actions — THE quote→job bridge) · QuoteRequest tag
add/remove lists (Q1–Q4 × 2) · statutory & non-statutory **remedial status
setters** (Cancelled/Closed/Live/Ordered/With helpdesk) with auto flags ·
email options (person assigned / owner / all suppliers / selected people +
subject) · icon picker.

## RE05. Raise Order — Vanilla values (non-default)

| Field | Value |
| --- | --- |
| Sort order | 50 |
| Quote requests will be sent to this status | **Quote complete** |
| Available in quote-request status | Raise order ✓ |
| Display in options menu / on mobile | ✓ / ✓ |
| Allows manual input of order details | ✓ |
| Value above which this action will display | 0.01 |
| **Action triggered against the original job** | **RH03b. Quote Ordered** |
| QuoteRequest tags (Q1–Q4, second list = remove set) | all ✓ |
| Non-statutory remedials → status | Ordered (auto ✓) |
| Statutory remedials → status | Ordered (auto ✓) |

## The complete quote loop (structural, now closed)

1. Job: **RH06 Quote Request** → job status Quote Requested - R; quote
   request created (default RE01 issues it → Request issued).
2. Quote lifecycle: RE02 Quotes received (auto when all suppliers submit,
   per IS_ALL_SUBMITTED flag E-011) → RE04/RE04a select/approve →
   **RE05 Raise Order**.
3. RE05: quote request → Quote complete; order raised (≥ £0.01);
   **fires RH03b against the parent job → With Contractor - R**; clears
   Q1–Q4 tags; sets remedials → Ordered.

→ **U-005 RESOLVED structurally.** RH03b's "Not allocated" placement is by
design: it is machine-fired by the quote engine, not user-selected.
**VI-003 downgraded** from "possible defect" to "by-design machine path +
visualiser limitation" (the Action map does not render quote-engine
firings). Runtime confirmation remains experiment E3.

## RE-action record GUIDs (environment-observed)

RE01 990b4850-eb94-4c0b-b9ec-188902715a33 · RE02 4c9b6bd4-b968-448b-b97c-470aaa88b792 ·
RE03 242a8b75-46ef-4fe4-81be-2bedac9440b0 · RE04 68f926c1-63aa-4a67-9edb-a6fee34f528d ·
RE04a ec3e7022-f271-46a0-8139-7701d99437e1 · RE05 a5ca4c5b-c524-4de7-a72f-ce6646235a48 ·
RE06 90876e64-f955-4e27-a26f-5bf65d77f752 · RE07 7d7146f7-b88f-4805-a8f9-263958fb8e89
