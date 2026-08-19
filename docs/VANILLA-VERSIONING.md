# Vanilla is versioned

Written 2026-08-19, from the first real second-instance comparison (an
implementation project against a newer Vanilla deployment). Customer-specific
identifiers are deliberately excluded — this document records only the
generic, durable lesson.

## The conclusion

**Vanilla is not one eternal golden configuration.** Bellrock's standard
Concerto deployment evolves as mistakes are found and corrected. Two Vanilla
baselines observed to date are materially different:

- **Older Labs baseline** — the deployment behind `model/VANILLA-HELPDESK.json`,
  `model/VANILLA-ORDERS.json` etc. This remains valuable as historical source
  evidence, a semantic map (where objects live, what relationships matter),
  and a defect catalogue — but it is **not** an instruction to force newer
  deployments back to it.
- **A newer Vanilla deployment** (an implementation project's Day-One state) —
  demonstrably different from the older baseline.

## Differences actually observed (older Labs baseline → a newer deployment)

- **Helpdesk statuses/actions:** GUID lineage inherited from the older base
  image (same object identities).
- **Orders re-seeded:** different supplier-action GUIDs; **11 supplier
  actions, not 13** — no **ORC10** (Acknowledge Job), no **SPWA** (PPM
  Reviewed). The acceptance entry therefore rests solely on SP01/SP02.
- **Quote engine healthy** (RE01→RE07; RE05 "Raise Order" fires RH03b) — the
  older "Quote Requested - R dead-end" (VI-003) reconciles to a visualiser
  limitation.
- **Business Case engine present** (Helpdesk → Business Cases module) — the
  older "Business Case - R dead-end" (VI-002) likewise reconciles to a
  visualiser limitation.
- **Reactive `With Helpdesk` no longer exposes PH05** — the older VI-007
  Planned-action-on-Reactive-status anomaly is absent (newer deployment is
  cleaner here).
- **Reactive statuses pristine** vs the older baseline.
- **VI-009 supplier-acceptance defect PERSISTED** in the newer deployment
  (SP01/SP02 portal visibility) — a genuine, still-shipping defect, since
  corrected in the implementation project.

Direction of "correct" is not always "match the older baseline": in several
cases the newer deployment is the better one (Quote/Business Case engines,
absent PH05 anomaly). Classify each difference on its merits.

## What this requires of tooling (Studio)

A **Project** must record **which Vanilla baseline it started from**, not
assume a single eternal Vanilla:

```
Project
  → baselineVanilla { snapshot, fingerprint, version/label, date }
  → project (customer) changes
```

Studio should be able to show **older Vanilla → newer Vanilla** (object/field
differences), so we learn how the standard product changes over time. The
existing Compare engine already supports arbitrary model sources; the missing
piece is treating each captured Day-One deployment as a first-class,
comparable Vanilla baseline rather than a deviation from the Labs model.

## Discipline

- Never silently rewrite the older Labs baseline to match a newer deployment.
  The Labs model is historical evidence + map; corrections to *current*
  interpretation go in the registers (see VI-002/VI-003/VI-009 updates), not
  by mutating the frozen structural baseline
  (`VANILLA-HELPDESK-STRUCTURAL-v1` = 705ca2a…).
- Customer/project-specific configuration and identifiers belong to that
  project's private store, never to this public repo.
