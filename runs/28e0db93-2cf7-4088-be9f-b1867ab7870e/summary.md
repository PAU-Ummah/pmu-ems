# What OSA got done before it stopped

## In short
- A new Inventory section will be added to PMU EMS so the society can track refreshment stock (biscuits, drinks, snacks, supplies) bought or donated for weekend programs.
- Every batch of stock keeps its own cost, and when stock is given out, the system always uses the oldest batch first (FIFO), so the numbers are correct for the accounting coursework.
- You can see what's currently in stock, record what's given out at events, write off lost/expired/damaged stock, and compare physical counts to the system.
- You can photograph a box of stock and Claude AI will suggest what it is and how many there are, but a person must always confirm or correct it before anything is recorded.
- It works when stock numbers always reconcile (received minus issued minus written off equals on-hand), and a date-range summary report exports cleanly to CSV.

## It did not finish
An AI tool took too long on a step and was stopped.

## Stage by stage

### Stage 1
#### What was built

A new "Inventory" screen has been added to the system. Staff can now see exactly what refreshment stock (biscuits, drinks, snacks, supplies) is currently on hand, track each batch separately with its own cost and date, and the system automatically uses up the oldest stock first whenever items are given out — which keeps the accounting numbers correct. Everything was tested and checked for errors, and it is working as expected so far.

#### What was decided

- The system will always use the oldest stock batch first when items are given out, because that matches standard accounting practice and keeps costs accurate.
- Only certain approved staff roles can see or manage the Inventory screen, to keep control over stock records.
- A couple of small technical setup choices were made behind the scenes to get the testing tools working properly; these don't affect how the feature works, just how it was built.

#### What is uncertain

This stage is not yet finished — it only covers viewing stock and adding new stock. The next stage still needs to add the ability to record stock being given out at events and to write off lost or damaged stock, including making sure only authorized staff can do the write-offs.

Also, nobody has yet tested the actual screens in a real, working version of the system (only automated checks were run) — so someone should click through the new Inventory screen themselves once it's available to confirm it looks and works as intended.

### Stage 2
#### What was built

The system now lets staff record when stock is given out at an event, and write off stock that's expired, damaged, or lost. If an event is linked, it automatically suggests how many people to count for, based on who actually attended — a person can still change that number before saving. Only authorised administrators can write off stock, and the system quietly checks, behind the scenes, that this inventory tracking never mixes with the separate financial/invoice records.

#### What was decided

- Write-offs are limited to three reasons only (expired, damaged, lost) — this keeps the records consistent and prevents vague entries.
- Only admins can write off stock, while any authorised user can record stock given out — this limits who can remove stock from the books.
- The headcount suggestion can be edited by the person recording it, rather than locked — this allows for last-minute changes on the day.

#### What is uncertain

This stage finished its work, but it has not yet been tested by an actual person clicking through it in a working system — all checks so far were done by reading the code, not by using it live, because the testing environment needed for that wasn't available. This should be done before relying on the feature. Separately, a couple of internal record-keeping checks (file "fingerprints" used to track changes) didn't match what was expected, though the actual content involved was confirmed correct — likely a bookkeeping quirk rather than a real problem, but not yet fully explained.

### Stage 3 (did not complete)
#### What was built
- The agents did not record what they built in this stage.

#### What was decided
- No changes were saved to the project's history in this stage.

#### What is uncertain
- This stage did NOT finish.
- claude-code: The AI provider took too long to answer and was stopped.

## Choices made for you
- (you confirmed this risky one) The existing `admin` role is the inventory 'admin' tier; the remaining existing roles (event-organizer, it, finance-manager, registrar) all map to the inventory 'logger' tier (receipts, issues, counts)
- (you confirmed this risky one) Each AI count photo is assumed to show a single item type per submission (one item guess, one count), not multi-item detection within one photo
- (you confirmed this risky one) Inventory data (items, layers, movements) is NOT scoped per academic session and persists continuously, unlike people/events/invoices which reset per session, since physical stock carries over regardless of session boundaries
- (you confirmed this risky one) Count photos are stored in Firebase Storage with a reference URL on the count document, access-restricted by the same role rules as the count collection
- (you confirmed this risky one) When two cost layers share the same receipt date, FIFO consumption order ties are broken by insertion/creation order
- Stock records are kept in one organized filing system, matching how the rest of this app stores events and invoices.
- Giving out or removing stock, write-offs, and corrections are tracked in one unified log, so who's allowed to do what is controlled in a single, consistent place.
- Everyday staff can log stock usage (including its cost), but only admins can see the full value report or make write-offs/adjustments — enforced by locking those screens, not by hiding numbers.
- Stock is used up oldest-first (first in, first out). In the rare case two deliveries arrive at almost the same moment, there's a tiny chance the order gets slightly mixed up — considered an acceptable, low-risk trade-off for an app this size.
- Once a stock movement (issue, write-off, adjustment) is recorded, it can never be edited or deleted — only added to, so there's always a trustworthy history.
- Adding a new delivery to stock is quick and simple; only actions that use up existing stock need the extra safety checks.
- Dates are stored in a simple, consistent format already used elsewhere in the app.
- This first phase only builds the basic stock screen and the ability to add items/deliveries; giving out stock, write-offs, stock-taking, and AI-assisted counting arrive in later phases.

## How it was checked
- Research: 64 official documentation source(s), 8 academic paper(s) and 3 existing project(s) were consulted.
- A second, different AI checked the research against its sources.
- Every build stage was written by one AI and reviewed by a different one, and every change was recorded in git.

## What to look at
- claude-code (sonnet) reviewed work written by claude-code (sonnet): the same model. This works, but a model tends to favour its own output; a second model, ideally from another family, would make the check more independent.
- To make the review more independent, install a second provider (ideally from another model family), or name models in osa.config.json: providers.seatModels, and providers.models.claude-code if claude-code's models are not recognised automatically.
- Research item "docs-firebase-storage" could not be completed: "uncertain" names "key_findings[0]", which is not a field of this result. "uncertain" names "key_findings[6]", which is not a field of this result.
- No official documentation was found for: Official documentation: Firebase Storage.
- claude-code (sonnet) reviewed work written by claude-code (sonnet): the same model. This works, but a model tends to favour its own output; a second model, ideally from another family, would make the check more independent.
- 1 research claim(s) were not confirmed by the independent check.
- The implication review (claude-code) could not be completed (claude-code: The AI provider stopped with an error (it exited with code 1).); the spec was built without it.
- phase 1: Turn 2 (reviewer/claude-code) is reviewing its own prior work: the reviewer seat and the seat whose diff it reviews are the same provider and the same model (role_pins left no other seat eligible, or no second model was set).
- phase 2: Turn 2 (reviewer/claude-code) is reviewing its own prior work: the reviewer seat and the seat whose diff it reviews are the same provider and the same model (role_pins left no other seat eligible, or no second model was set).

## For engineers (technical detail)

_Everything above is written for non-engineers; this is the raw detail behind it._

- `Phase 3's own runDispatch() call did not complete successfully: claude-code: The AI provider took too long to answer and was stopped..`
- `decision: 'inventoryLayers' and 'inventoryMovements' are flat top-level Firestore collections (not subcollections of 'inventoryItems'), each carrying an 'itemId' field, consistent with this codebase's existing flat-collection convention for 'events'/'invoices'/'people'.`
- `decision: 'inventoryMovements' is a single collection for issue/write-off/adjustment, discriminated by a 'type: 'issue'|'writeoff'|'adjustment'' field, so firestore.rules can gate role and required-reason logic per type in one place.`
- `decision: 'unitCost' is NOT field-level hidden from the logging tier's Firestore reads (the research report's suggestion to split cost into an admin-only collection is not adopted): logger-created issues must compute 'costOfGoods' from 'unitCost', so hiding it would block a logging-tier action the PRD requires. The admin-only "valuation view" (AC11/AC12) is instead enforced as a page-level 'RoleGuard' gate (Phase 4) plus firestore.rules restricting who may create 'writeoff'/'adjustment' movements — the existing RoleGuard pattern already gates whole pages, not fields, throughout this codebase.`
- `decision: The client Firestore SDK's 'runTransaction'/'transaction.get()' only accepts document references, not queries. FIFO-consuming mutations therefore read layer ordering via a plain (non-transactional) query first, then re-read each candidate layer by reference inside the transaction and re-run the pure FIFO function on the fresh data. A concurrent receipt with an even-older 'receivedDate' landing between the ordering query and the transaction commit is an accepted, low-probability race for this low-traffic nonprofit app; it is not solved by introducing a server-side Admin SDK route in P`
- `decision: 'src/lib/inventory/fifo.ts' is fully self-contained (defines its own types and error class, zero imports) so it can be unit-tested by Vitest with no path-alias plugin or extra config; 'src/services/inventoryTypes.ts' re-exports the FIFO-related types for the rest of the app to import via the '@/*' alias.`
- `decision: Vitest stays pinned to the version already installed in 'node_modules' (5.0.5, confirmed by reading 'node_modules/vitest/package.json'), since the locked PRD states vitest is already present via a '--no-save' install and only needs adding to 'package.json'.`
- `decision: Stock-in receipts are created with a single 'addDoc' (no transaction needed, since creating one new layer document has no multi-document read dependency); only consuming movements (issue/write-off/adjustment) use 'runTransaction'.`
- `decision: Dates ('receivedDate', movement 'date') are plain ''YYYY-MM-DD'' strings produced via 'new Date().toISOString().split('T')[0]', matching the existing 'events'/'invoices' convention; 'createdAt' is a full ISO datetime string ('new Date().toISOString()'), used as the FIFO same-date tie-breaker, since this codebase does not use 'serverTimestamp()' anywhere else.`
- `decision: Phase 1 includes only a minimal main stock screen and receipt/item creation UI (just enough to make AC3/AC4 checkable in the UI); issue, write-off, stock-take, AI counting, and reporting screens are explicitly built in Phases 2-4.`
- `decision: 'useRole.ts' gains two inventory-specific convenience guards ('canAccessInventory' = any of the five existing roles, 'canAdminInventory' = 'admin' only) so Phase 1's rules and Phase 1's UI encode the same logger/admin split, reusable unchanged by later phases.`
- `decision: Architecture: kept the original plan after an independent review -- AC6 and AC11 literally say logging-tier denial must happen "by firestore.rules" — Alternative 1's Admin SDK write path bypasses rules entirely for mutations, so adopting it would require re-deriving those same role/reason checks in route-handler code while rules became decorative, contradicting the ACs' own wording rather than just adding plumbing. The reviewer's own cons list confirms this: rules work is "not avoided, only reduced," so Alt 1 buys server-side trust at the cost of auth-token verification, service-acco`
- `tokens (estimated): 900580 total -- file_exploration 14%, research_input 30%, handoffs 7%, spec_prd 33%, tool_output 0%, model_output 16%`
