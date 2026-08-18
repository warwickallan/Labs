# E1 — Core Reactive lifecycle + Cancelled case: CONTROLLED VERIFIED ✔

- Run: 2026-08-19, authorised. Layer: **BEHAVIOUR — CONTROLLED VERIFIED.**
- Fixtures: jobs **00000053** (lifecycle) and **00000054** (cancel), both
  ZZ TEST-described, on demo site Aintree/S0001, created via the
  **admin quick-add form** (RAISE JOB on the Reactive list → "Enter
  helpdesk ticket details" modal — NOT the multi-step reporter wizard; both
  creation routes exist and pre-allocate the job reference before save).

## Discovery bonus: the admin quick-add form (answers OD-005)

19+ controls: Site search* (GUID-backed autocomplete; Aintree =
19927b87-8555-44bb-9ec1-e04b80c03f6b) · building/block · room · person
associated with site (caller) · person from main user list ·
**Classification 1* (16 parents) → cascading Classification 2* (children;
auto-fills the short description "Electrical : Socket")** · short
description · description · **Call type* (default Reactive)** · **Contact
method* (default Telephone — the admin default flag rendered)** · send
confirmation email checkbox · retrospective checkbox · **Urgency level*
(REQUIRED — the 6 SLA records; admin-raised jobs DO get SLA, unlike the
reporter wizard)** · notes · **tag checkboxes = exactly the
visible-on-entry tags (Travelling + ZZ TEST textmatch tag) — the
hide-on-entry flag verified** · supplier reference · related job ·
**Action taken* locked to RH01 with live caption "Status will be set to
With Helpdesk"**. Caller (person) is effectively required (validation).

## Job A (00000053) — lifecycle, one action per step

| Step | Expected (config) | Observed | Verdict |
| --- | --- | --- | --- |
| Create (RH01, P2, out-of-hours Wed 00:29) | → With Helpdesk; SLA from Standard-hours clock | With Helpdesk; **Required response Fri 21 Aug 14:30 = exactly 24 working hrs from Wed 08:30; completion Mon 24 Aug 08:30 = 3 working days** | ✔ SLA clock arithmetic verified |
| RH02 Assign to Maintenance team (team=Maintenance Team, notes) | → WMT-R | WMT-R; **tag "01. Team assigned" auto-added**; email-recipient preview shown on action page | ✔ (+tag automation observed) |
| RH03 Assign Operative (04. Operative (Plumber)) | stays WMT-R (self-loop) | WMT-R; **tags 01→"03. Engineer assigned"** (add+remove) | ✔ |
| RH10 Work Complete (response+completion date prompts) | → Work Complete - R | Work Complete - R; **Actual response recorded Wed 19 Aug 09:00**; tags →"08. Awaiting AFP/invoicing" | ✔ |
| G004 Close job | → Closed (complete flag) | Closed; tag section cleared | ✔ |

Action pages display "Status will be set to: <target>" before commit —
the configuration projected to the operator every time.

## Job B (00000054) — cancel

G003 Cancel job → **Cancelled** ✔. After cancel the REACTIVE HELPDESK
TASKS toolbar button disappears entirely (no RH actions available from
Cancelled — rendering follows availability). Note: the commit succeeded
without visible notes-mandatory enforcement blocking (notes text had been
entered into the form earlier in the flow; enforcement not independently
provoked — residual).

## U-002 (Cancelled semantics) — largely resolved

Cancelled is its own tab (count 1); **type-level counts include Closed and
Cancelled** (Reactive 19 = all jobs ever); only Closed carries the
Complete flag. Operationally a cancelled job is a terminal, non-complete
record still visible in the type total. Report-level "open jobs"
definitions remain unexamined (residual, minor).

## Containment

No supplier involved; originator = Warwick's own address; the environment's
email delivery already fails (OD-006) — no external side effects possible.
Fixtures retained: jobs 00000052/53/54, tag "ZZ TEST textmatch tag".

**Resolves:** BEHAVIOUR — CONTROLLED VERIFIED for: status transitions
(5 actions), SLA clock, tag add/remove automation, action-surface
rendering, creation defaults. U-002 largely resolved.
