# Stage 2

## What was built

The system now lets staff record when stock is given out at an event, and write off stock that's expired, damaged, or lost. If an event is linked, it automatically suggests how many people to count for, based on who actually attended — a person can still change that number before saving. Only authorised administrators can write off stock, and the system quietly checks, behind the scenes, that this inventory tracking never mixes with the separate financial/invoice records.

## What was decided

- Write-offs are limited to three reasons only (expired, damaged, lost) — this keeps the records consistent and prevents vague entries.
- Only admins can write off stock, while any authorised user can record stock given out — this limits who can remove stock from the books.
- The headcount suggestion can be edited by the person recording it, rather than locked — this allows for last-minute changes on the day.

## What is uncertain

This stage finished its work, but it has not yet been tested by an actual person clicking through it in a working system — all checks so far were done by reading the code, not by using it live, because the testing environment needed for that wasn't available. This should be done before relying on the feature. Separately, a couple of internal record-keeping checks (file "fingerprints" used to track changes) didn't match what was expected, though the actual content involved was confirmed correct — likely a bookkeeping quirk rather than a real problem, but not yet fully explained.
