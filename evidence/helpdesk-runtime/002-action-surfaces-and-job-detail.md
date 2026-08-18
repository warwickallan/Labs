# E-020 — The two operational Action surfaces + job-detail record

- Captured: 2026-08-19, read-only; no action executed. Layer: OPERATIONAL
  PRESENTATION TRUTH (validated against configuration truth E-005/E-007/
  E-015).

## Surface 1: row-level Options (three-dots) menu — by status

Utility block (constant): Audit trail and detail · Timeline · [Raise
order] · Bookmark toggle · Cad View · Site alerts · … · Documents · Order
Documents · Print job ticket. ("Raise order" appeared on With Helpdesk and
Work Complete - R rows but NOT on the WMT-R row — candidate driver: the
status's `show_add_order_button` flag (E-013); not proven → PRESENTATION
DIFFERENCE, cause candidate recorded.)

Workflow actions offered:

| Status (job type Reactive) | Row-menu actions | vs configured availability (E-015) |
| --- | --- | --- |
| With Helpdesk | G001, G003, RH02, RH04, RH06, RH07 | exact match minus RH01 (hidden) and PH05 (Planned-only ⇒ filtered by job's type) ✔ |
| With Maintenance Team - R | G001, G003, G005, G006, RH03, RH04, RH07, RH08, RH10, RH11 | exact match = all non-hidden, non-mobile configured actions ✔ (RM/GM/LM hidden ✔) |
| Work Complete - R | G001, G004 | exact match (T07 hidden ✔) |

→ **The operational UI independently validates the availability model:**
visible set = configured-available ∖ (hide_from_use ∪ wrong-PPM-type).
Admin-only flags did not restrict (session is administrator) — POSSIBLE
ROLE FILTER untested for non-admin users.

## Surface 2: in-job toolbar — action groups as buttons

Open job (00000050, With Helpdesk) header toolbar: BACK TO JOBS · RAISE
ORDER · **GENERAL ACTIONS** (dropdown: G001, G003) · **REACTIVE HELPDESK
TASKS** (dropdown: RH02, RH04, RH06, RH07) · PRINT JOB TICKET.

→ Same action membership as the row menu, partitioned by **Action group**
— this is what the action-group "button group" concept renders as
(E-002/E-006 groups → job-page toolbar dropdowns). Structural mapping:
`Admin action group ⇒ job-toolbar dropdown; group sort order ⇒ button order`.

## Job-detail record surface (00000050)

- Header: Job reference · **API details: job GUID + documented endpoint
  `GET /api/helpdesk/v2/job/<guid>`** (a v2 REST read surface — new
  discovery, candidate for future read-side integration).
- Raised on · Location (site + address + "More detail") · Classification
  ("Boilers - Gas Condensing Boiler") · **asbestos-register warning banner
  with link** (site-level safety data surfacing into jobs) · Site status.
- Record input by · Originator (name : email) · Category (= Call type,
  "Reactive") · Current status · Response (Priority 2) · Required
  response/completion timestamps.
- Sections: job description ("Test details") · CHANGE JOB DETAILS button
  (not used) · tabs: **Job details · Timeline · Quotes on this site ·
  Estimates, business cases and notices on this site**.
- **Timeline** ("Activities on this job so far"): newest-first entries with
  avatar/user/timestamp — shows "RH01. New Reactive Task / Record added
  by Warwick Allan" AND **"Email failed to send to :
  warwick.allan@bellrock.co.uk"** → passive runtime evidence that RH01's
  originator email fired and FAILED (consistent with empty email templates
  VI-008 and/or demo SMTP absence; cause not proven).

## Mapping chains recorded (configuration → presentation)

- `Response category "Priority 2" (E-017)` → search filter "Response
  time" option → job field "Response: Priority 2" → computed "Required
  response/completion" per Working time clock.
- `RH04 available-in With Helpdesk (E-015)` → row Options → RH04 → job
  toolbar REACTIVE HELPDESK TASKS → RH04.
- `Action group (E-002)` → job toolbar dropdown.
- `hide_from_use = true (E-015)` → absent from BOTH web surfaces.
- `Nested classification (E-018)` → grid "Parent : Child" path + job
  Classification field.
