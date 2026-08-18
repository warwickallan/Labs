# E-011 — Quote family tabs (8): the parallel quote workflow

- Captured: 2026-08-18 via the per-tab list views (read-only), unfiltered.
- Confidence: VERIFIED — OBSERVED.
- Relevance: U-005 / VI-003 — how jobs in "Quote Requested - R" progress.

## Quote processes — 1

Standard process (Tab Order 0, **default**).

## Quote actions — 8 (all under Standard process)

Columns: Status · Resulting status · Value status · Action when new quote
added · All Suppliers submit quotes · Process.

| Action | Resulting quote-request status | Flags |
| --- | --- | --- |
| RE01. Issue quote request | Request issued | default_quote_action |
| RE02.Quotes Received *(sic — no space)* | Quotes received | IS_ALL_SUBMITTED |
| RE03. Send back to supplier | Request issued | |
| RE04. Select successful quote | Raise order | |
| RE04a. Approve Quote | Raise order | |
| RE05. Raise Order | Quote complete | |
| RE06. Complete quote | Quote complete | |
| RE07. Cancel request | Quote request cancelled | |

*(The "Status" column was blank for all rows — likely the quote-request
status in which the action is available; not populated in Vanilla.)*

## Quote Request status — 5 (all Standard process)

Columns: Status · Has Email Rules · Is Default · Issued · Cancelled ·
Complete · Process.

| Status | Flags |
| --- | --- |
| Request issued | default, issued |
| Quotes received | issued |
| Raise order | *(none)* |
| Quote complete | complete |
| Quote request cancelled | cancelled |

All rows: Has Email Rules = No.

## Quote status — 2

Awaiting quote (sort 1, **default**) · Sent to client (sort 2).
*(Distinct from Quote Request status — appears to be the per-quote status
vs the per-request status; distinction INFERRED from naming.)*

## Quote categories — 2

Estimate · Fixed price quote — both flagged email-responsible-user on
submission and on decline.

## Quote priorities — 3

Low · Medium · High.

## Quote rules — EMPTY (columns: Name · Process)

## Quote roles — EMPTY (columns: Name)

## Interpretation (INFERRED, for U-005/VI-003)

The quote lifecycle runs in its own status machine (Request issued →
Quotes received → Raise order → Quote complete/cancelled) driven by
RE-actions. How completion of that lifecycle moves the parent JOB out of
"Quote Requested - R" is still not evidenced — the candidate job-side
action RH03b ("Quote Ordered" → With Contractor - R) remains unallocated,
and no quote action visibly references a job status. U-005 stays open,
now sharpened: the bridge quote-workflow → job-status is the missing link.
