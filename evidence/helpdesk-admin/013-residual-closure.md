# E-024 — Helpdesk residual closure: small Add schemas, root causes, tag corrections

- Captured: 2026-08-19 (rotate-correction pass). Read-only; all forms
  cancelled. Confidence: VERIFIED — OBSERVED.

## Remaining small Add-form schemas (closes the E-014 residual list)

- **Quote status (8):** Name* · Default · Is Cancelled? · Is Complete? ·
  Is Issued? · **Is RAMS?** · Sort* · Suppress.
- **Quote Request status (14):** Status* · external label · issued/
  complete/cancelled flags · **"Set this status when a linked quote is
  created"** · sort* · archive · default · show-lowest-quote-value ·
  show-successful-quote · client-dashboard · Standard process tick ·
  **"Quote requests will be sent to this status on expiry" (select — an
  expiry hook, empty vocabulary in Vanilla)**.
- **Call type (7):** category* · external label · default · suppress ·
  **"Force a selection of PPM visit when this category [chosen]"** ·
  mobile-app · workspace.
- **Contact method (4):** name* · default · suppress · **default for the
  external helpdesk page** (a second default dimension).
- **Audit status (6):** Status* · **semantic select [Pending / No Audit /
  Audit In Progress / Fail / Pass]** · default · archive · colour · sort*.
- **Complaint status (4):** Status* · closed flag · default · archive.
- **Root cause (4):** name* · sort* · **"Selecting this cause on
  application will cancel the order"** (ties to the Orders
  application-approval rule) · archive.

## Root causes — VALUE COMPLETE (all 20; closes the 15/20 pagination gap)

The five previously unpaged: **Mis-Use · Vehicle Damage · Wear and Tear ·
Winter Weather · Poor Installation.**

## (†)-flagged tag-automation re-reads — E-023 CORRECTIONS

Definitive per-record re-reads (both sections verified present):

| Action | Adds | Removes | Correction vs E-023 |
| --- | --- | --- | --- |
| RH03b | **01. Awaiting acceptance** | — | earlier "01. Team assigned" was a stale-panel artifact |
| LM01 | **none** | — | earlier add was stale bleed |
| T09 | **none** | **none** | earlier entries were stale bleed |
| PH02 / PH02a | 01. Team assigned | — | confirmed |
| RH05 | 01. Awaiting acceptance | — | confirmed (approved order goes back out to supplier) |
| G006 | Parts/Stock required | — | confirmed |
| GM06 | **05. On hold** | 04. In progress | confirmed — see VI-010 |

## VI-010 (new) — GM06 tag automation appears inverted [CONFIGURATION INCONSISTENCY]

GM06 "Take off hold" has IDENTICAL tag automation to GM05 "Place Job on
hold" (adds 05. On hold, removes 04. In progress). Its purpose implies the
inverse (remove 05, arguably add 04). Structural observation only;
runtime effect untested (E5 territory).
