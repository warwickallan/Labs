# Session log — Concerto Vanilla Discovery

Append-only. One entry per working session, newest first. Purpose: a fresh
session (or Warwick) can see at a glance what happened, where the evidence
is, and what was left open — without any conversation history. Keep entries
factual and short; deep detail belongs in the linked docs and commit bodies.

---

## 2026-08-18 (later) — Phases 0–1 complete; Phase 2 substantially advanced

Warwick signed in; discovery ran read-only throughout (no Save/create/
delete/edit; FIND/REPLACE and all ADD buttons untouched). Evidence captured
as structured text/DOM extractions (E-001..E-008) — the browser toolchain
cannot save binary screenshots to disk, so captures are text-based.

**Found and evidenced:**

- Helpdesk admin (`helpdesk_admin.aspx`) is the parent area: one page, 43
  configuration tabs, Type filter proving exactly two Helpdesk Types —
  **Reactive** and **Planned** (E-002). 8 action groups.
- **Job statuses (E-003):** 14 records; Reactive-only 7, Planned-only 4,
  **Closed + Cancelled shared** (both filters), default = With Helpdesk,
  only Closed flagged Complete. "With AMO" excluded — Warwick's own
  non-Vanilla addition (his correction, mid-session).
- **Operative statuses (E-004):** 9, identical under both Type filters.
- **Actions (E-005/E-006):** all 50 live actions (zero archived) with full
  attribute matrix; status→action availability per the grouped view.
- **Action/status map (E-007):** legend confirms the six relationship
  kinds; geometric SVG reconstruction (zero residual) recovered 93 avail +
  25 sets + 15 user-selects edges; **zero operative-status and zero
  auto-fire edges in Vanilla**. System warnings: New PPM and Business
  Case - R unreachable. 26 actions "suppressed/hidden" by default.
- **RH04 record view (E-008):** summary fields incl. "Status: Web page
  only", "Resulting type: Reactive", tag automation (adds 01. Awaiting
  acceptance / removes 02. Supplier rejected); configurator sections named.

**Model:** `scripts/build_model.py` builds `model/VANILLA-HELPDESK.json`
from E-001..E-008 (2 types, 15 status entries, 75 action entries, 137
relationships); validator green (round-trip + evidence integrity;
`jsonschema` not installed — structural fallback used).

**Left open (see UNKNOWNS.md):** U-002..U-011. Biggest: the Add/Edit Action
configurator field inventory (Phase 2d, U-010 — the Update form was not
entered this session), quote-path progression (U-005), tag automation
(U-009), the other 40 admin tabs (U-011), Planned parity check (Phase 3),
discovery report (Phase 4). Gates 1–3 substantially met for the list level;
4–6 partial; 8 ✔; 9 ✔; 7/10 pending.

## 2026-08-18 — Project scaffold created (no discovery yet)

Created the discovery repository from the investigation brief, following the
RLMCP conventions (`C:\Bellrock Labs\References`): CLAUDE.md (DISCOVER MODE
rules, confidence taxonomy, gates, rotate protocol), INVESTIGATION_PLAN.md
(Phases 0–4, Helpdesk Admin first, then Reactive detail, then Planned parity
check), UNKNOWNS.md register, capture templates, evidence tree, JSON Schema
for the model, model skeleton (metadata only — grows only from evidence),
and `scripts/validate_model.py` (gate 9: schema + serialize→reload→serialize
identity). Validator green. Git initialised, first commit.

**No contact with the TEST environment has produced evidence yet.** Blocked
on: a human signing in at https://warwick.concertodemo.co.uk/login.aspx
(Claude must not enter credentials).

**Left open:** Phase 0 onwards — everything in INVESTIGATION_PLAN.md.
