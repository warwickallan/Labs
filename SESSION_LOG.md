# Session log — Concerto Vanilla Discovery

Append-only. One entry per working session, newest first. Purpose: a fresh
session (or Warwick) can see at a glance what happened, where the evidence
is, and what was left open — without any conversation history. Keep entries
factual and short; deep detail belongs in the linked docs and commit bodies.

---

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
