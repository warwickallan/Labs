# E0 — Tag TextMatch behaviour: CONTROLLED VERIFIED ✔

- Run: 2026-08-19, authorised by Warwick (E0+E1 authorisation). First
  persisted records of the engagement.
- Layer: **BEHAVIOUR — CONTROLLED VERIFIED.**

## Fixtures created (disposable, ZZ TEST)

1. **Tag** "ZZ TEST textmatch tag" — Type=Helpdesk, TextMatch =
   `zzmatchphrase`, colour default (Red), no other flags. Created via
   Helpdesk admin → Tags → Add new → Save. (Deviation from the E0 spec: no
   ZZ TEST *site* was created — the job was raised against existing demo
   site Aintree/S0001 to avoid adding estate master data; smaller
   footprint, same experimental value.)
2. **Job 00000052** (GUID f2b9be6b-235c-4a17-8bfd-1143a3b89f1b) — raised
   via the Reactive Raise Job wizard: Aintree → Block 1 → location
   "ZZ TEST E0 - ground floor plant room" → classification Electrical →
   Socket → description "**ZZ TEST E0 zzmatchphrase** - TextMatch
   experiment job, disposable" → no photo → H&S No → access details
   "ZZ TEST E0 …" → CONFIRM.

## Controlled variable

Job description contains `zzmatchphrase` (exactly one variable vs the
baseline wizard walkthrough of E-021, which was cancelled).

## Observations

- Creation succeeded: "Your new job number is : 00000052. The job status
  is : With Helpdesk." (RH01 creation default, as modelled.)
- **Job detail shows section "Helpdesk Tags: ZZ TEST textmatch tag" — the
  TextMatch tag AUTO-ATTACHED at creation.** Hypothesis (E-013 field help
  "Matching phrase in description of new job will assign this tag")
  CONFIRMED for the create-time case.
- Job has Category=Reactive, Current status=With Helpdesk, Classification
  "Electrical - Socket", **no Response/Required-response/completion fields
  rendered at all** — second controlled-context confirmation that
  wizard-raised jobs carry no SLA (feeds E6/VI-005; this instance is now
  BEHAVIOUR — PASSIVELY OBSERVED evidence on a controlled fixture).

## Not tested (residuals for a later pass)

Case-sensitivity/substring semantics; whether editing a description
re-triggers matching; whether the match also fires for quotes ("job or
quote" in the field label).

## Containment / cleanup state

No emails involved beyond the standard originator flow (originator =
Warwick's own address; the environment's email already fails, OD-006).
Fixtures left in place for E1/audit: tag "ZZ TEST textmatch tag", job
00000052. Deletion requires separate approval per programme rules.

**Resolves:** TextMatch capability behaviour gate (CONTROLLED VERIFIED).
