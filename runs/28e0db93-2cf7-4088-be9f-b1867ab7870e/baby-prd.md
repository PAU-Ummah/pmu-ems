# Baby PRD -- FIFO-based non-profit inventory module for PMU EMS (Next.js/Firebase) with AI-assisted stock counting

## TL;DR
- A new Inventory section will be added to PMU EMS so the society can track refreshment stock (biscuits, drinks, snacks, supplies) bought or donated for weekend programs.
- Every batch of stock keeps its own cost, and when stock is given out, the system always uses the oldest batch first (FIFO), so the numbers are correct for the accounting coursework.
- You can see what's currently in stock, record what's given out at events, write off lost/expired/damaged stock, and compare physical counts to the system.
- You can photograph a box of stock and Claude AI will suggest what it is and how many there are, but a person must always confirm or correct it before anything is recorded.
- It works when stock numbers always reconcile (received minus issued minus written off equals on-hand), and a date-range summary report exports cleanly to CSV.

## Scope
narrow

## Baby PRD

### Problem
The society has no way to track what refreshment stock (purchased or donated) it has on hand, what was consumed by which event, or its cost, and the existing finance module (invoices/money paid) does not model stock or FIFO cost flow needed for an IAS 2 accounting coursework.

### Users / who it's for
Society committee members who log stock receipts, issues, and counts; a smaller admin tier who can additionally write off stock, record adjustments, and view stock valuation.

### In scope
- Items and stock-in receipts marked purchased or donated, with hand-entered unit cost (may be zero for donated) and optional expiry date
- FIFO cost-flow engine as deterministic pure functions: each receipt is a cost layer (date, qty, unit cost, optional expiry); issues consume oldest layers first; computes cost of issued items and remaining stock value with a per-item layer ledger
- Unit tests for the FIFO engine covering partial layer consumption, multi-layer issues, and edge cases
- Over-issue (exceeding stock on hand) rejected, stock never goes negative
- Stock mutations wrapped in Firestore transactions for atomicity
- Main stock screen showing current on-hand quantity per item, its batches, and which batch is next to be used
- Issues as distributions to an optional existing event, recording recipient group (everyone vs active participants only) and a headcount pre-filled from that event's attendance where available and editable
- Write-off as the only loss mechanism, requiring a reason: expired, damaged, or lost
- AI stock counting: photo of an open carton sent to Claude vision API server-side from a Next.js API route (key in env); returns item guess, count, and confidence; user must confirm or edit before anything is logged; handles low confidence, API failure, and oversized images; photo stored as audit attachment on the count
- Stock-take: physical count (optionally AI-assisted) compared to system quantity, producing a variance and an adjustment movement with a required reason
- Stock and movement summary (opening, received, issued, written off, closing, with cost) for a chosen date range, exportable to CSV
- Two role tiers reusing existing roles: a logging tier (receipts, issues, counts) and an admin tier (additionally write-off, adjustment, valuation view)
- firestore.rules extended to cover the new inventory collections per the two-tier access model
- Inventory kept separate from the finance module: no changes to event amountSpent, no invoice creation; inventory only reports the cost of stock an event consumed

### Out of scope
- Net realisable value (NRV) and write-down/reversal mechanics
- Journal-entry display
- Weighted-average costing or any weighted-average comparison
- PDF export
- Multi-warehouse support
- Barcode hardware integration
- Supplier / purchase-order workflow
- Tax / VAT handling
- Multi-currency support
- Deploying the app to production

### Acceptance criteria
1. FIFO unit tests cover partial layer consumption, multi-layer issue, over-issue rejection, and zero-cost donated layers, and all pass via `npm test`
2. Attempting to issue more than the current on-hand quantity is rejected and no movement is written; stock never becomes negative
3. A stock-in receipt creates a new cost layer recording date, quantity, unit cost, and optional expiry, visible in Firestore and in the UI
4. The main stock screen shows on-hand quantity per item with its batches listed oldest-first, indicating which batch will be consumed next
5. When an issue is linked to an event, the headcount field is pre-filled from that event's attendance and can be edited before saving
6. Submitting a write-off without selecting a reason (expired, damaged, lost) is blocked by the UI and by firestore.rules
7. An AI-suggested count is never written to Firestore until a user confirms or edits it on screen
8. Uploading an oversized image or a Claude API failure returns a handled error state in the UI, not a crash or silent 500
9. Running a stock-take with a counted quantity different from the system quantity produces a variance and, on save, creates an adjustment movement with a required reason
10. A date-range summary report shows opening, received, issued, written off, and closing quantities and cost, and the CSV export's totals match the on-screen totals
11. A user with only the logging role can create receipts, issues, and counts but is denied (both in UI and by firestore.rules) from writing off, adjusting, or viewing valuation
12. A user with the admin role can perform all logging-tier actions plus write-off, adjustment, and valuation view
13. Creating or editing an inventory issue or write-off does not modify `events.amountSpent` or create/update any document in the `invoices` collection
14. All FIFO calculation logic lives in pure functions with no Firestore or network calls, exercised by dedicated unit tests

### Constraints
- Must be built inside the existing Next.js 15 App Router / React 19 / TypeScript / Tailwind + MUI stack
- Must use Firebase Auth + Firestore, consistent with the existing data model and RBAC conventions (RoleGuard / useRole)
- firestore.rules must be extended, not replaced, to add rules for the new inventory collections
- Claude (Anthropic) vision API must only be called server-side from a Next.js API route, with the API key held in an environment variable, never exposed client-side
- vitest must be added to package.json devDependencies and `npm install` run in the foreground (node_modules/vitest already present via --no-save install)
- All installs and tests run in the foreground, not as background processes
- No production deployment as part of this work
- Inventory module must remain architecturally separate from the finance module (no shared totals/invoices)

### Research plan
- Topic: FIFO-based non-profit inventory module for PMU EMS (Next.js/Firebase) with AI-assisted stock counting
- Time range: last 3 years
- Items:
  1. fifo-costing-ias2 | IAS 2 FIFO cost-flow rules and donated inventory treatment | What does IAS 2 require for FIFO cost-layer consumption and for valuing donated (fair-value, possibly zero-cost) inventory, so the engine and its explanations are defensible for coursework? | modules: academic-papers, general-web
  2. firestore-transactions-atomic-writes | Atomic multi-document stock mutations with Firestore transactions | How to structure a Firestore transaction that reads multiple cost-layer docs, mutates several of them, and writes a movement record atomically without race conditions? | modules: general-web, github-debug
  3. firestore-security-rules-role-based | Two-tier RBAC in firestore.rules for new collections | What rule patterns correctly scope read/write per collection (items, layers, movements, counts) to a logging role vs an admin role, matching the existing role field on `users`? | modules: general-web
  4. anthropic-vision-api-nextjs | Calling Claude's vision API from a Next.js Route Handler | What is the correct request shape for sending an image to Claude's messages/vision endpoint server-side, including size limits and structured-output handling for item/count/confidence? | modules: general-web
  5. vitest-pure-function-testing | Vitest setup for deterministic TS unit tests in this repo | What vitest config and test patterns best suit testing pure FIFO functions (partial layers, multi-layer issues, edge cases) in a Next.js/TypeScript project? | modules: general-web, github-debug
  6. firebase-storage-image-upload | Storing and linking count photos as audit attachments | What is the secure pattern for uploading a stock-count photo to Firebase Storage and referencing it from a Firestore count document, with access restricted by role? | modules: general-web
  7. csv-export-client-side | Client-side CSV export for date-range summaries | What client-side CSV generation approach matches the existing finance module's export pattern, for opening/received/issued/written-off/closing rows? | modules: general-web, github-debug
- Official docs to read:
  - Next.js
  - React
  - TypeScript
  - Firebase Authentication
  - Firestore
  - Firestore Security Rules
  - Firebase Storage
  - Tailwind CSS
  - MUI (Material UI)
  - Vitest
  - Anthropic Claude API (Messages / Vision)
- Academic searches:
  - IAS 2 Inventories FIFO cost formula requirements
  - accounting treatment for donated inventory fair value measurement
  - FIFO inventory costing layer ledger algorithm
- Prior-art searches:
  - FIFO inventory management open source Firestore
  - Next.js Firestore inventory tracker reference implementation
  - Claude vision API stock count image recognition example

## Assumptions
- [risky] The existing `admin` role is the inventory 'admin' tier; the remaining existing roles (event-organizer, it, finance-manager, registrar) all map to the inventory 'logger' tier (receipts, issues, counts)
- [risky] Each AI count photo is assumed to show a single item type per submission (one item guess, one count), not multi-item detection within one photo
- [risky] Inventory data (items, layers, movements) is NOT scoped per academic session and persists continuously, unlike people/events/invoices which reset per session, since physical stock carries over regardless of session boundaries
- [risky] Count photos are stored in Firebase Storage with a reference URL on the count document, access-restricted by the same role rules as the count collection
- [risky] When two cost layers share the same receipt date, FIFO consumption order ties are broken by insertion/creation order
- [safe] New Firestore collections will be named `inventoryItems`, `inventoryLayers` (or embedded per-item), `inventoryMovements` (issues/write-offs/adjustments), and `inventoryCounts`
- [safe] A confidence threshold (e.g. below 70%) triggers a visible low-confidence warning on the AI suggestion but still allows the user to accept or edit it
- [safe] Uploaded count photos are capped at 5MB; larger uploads are rejected client-side with a clear error before any API call
- [safe] CSV export is generated client-side reusing the existing pattern used by the finance module's export utilities, with no new server export endpoint
- [safe] Each inventory item has a simple free-text or short-enum unit of measure (e.g. pack, piece, box) with no unit-conversion math
- [safe] Expiry dates are informational only (surfaced on the stock screen and selectable as a write-off reason trigger) and do not auto-generate write-offs
- [safe] If an issue is not linked to an event, headcount is entered manually with no pre-fill source

## Recommended questions
- (none)

## Original request (authoritative)

The person's own words, unedited. Where anything above differs from this, this request wins.

> Add a simple, non-profit inventory management module to the existing PMU EMS app (PAU Muslim Ummah Event Management System: Next.js 15 App Router, React 19, TypeScript, Tailwind + MUI, Firebase Auth + Firestore, role-based access via RoleGuard/useRole, existing finance module with invoices per event, existing per-event attendance, existing docs/ folder describing data model and RBAC). This is NOT a business: it is a mosque student society. The point is to keep track of what refreshment stock (biscuits, drinks, snacks, event supplies) the society has in hand. It is also the basis of a financial accounting coursework on IAS 2 / FIFO, so the FIFO costing must be correct and explainable, but keep the product simple.
>
> Context of use: refreshments are bought or donated for weekend programs. They are not always shared with everyone: sometimes only participants who actively took part get them, sometimes everyone does. The society wants to know what is in stock at any time.
>
> Core requirements:
> 1. Items and stock movements. Receipts (stock-in) are marked purchased or donated. Unit cost is entered by hand; for donated stock it is an estimated fair value and may be zero. Optional expiry date per receipt.
> 2. FIFO cost-flow: each receipt creates a cost layer (date, quantity, unit cost, optional expiry); each issue consumes the oldest layers first; compute cost of items issued and remaining stock value, with a per-item layer ledger. Implemented as deterministic pure functions with unit tests, correct for partial layer consumption, multi-layer issues, and edge cases. An issue exceeding stock on hand is rejected, never negative. Stock mutations must be atomic via Firestore transactions.
> 3. Main screen is current stock on hand per item, showing the batches behind it and which batch to use first.
> 4. Issues are distributions to an event (linked to an existing event, optional). Each issue records the recipient group (everyone, or active participants only) and a headcount, pre-filled from that event's existing attendance where available and editable.
> 5. Write-off with a required reason (expired, damaged, lost) as the only loss mechanism. NO net realisable value (NRV), NO write-down/reversal mechanics, NO weighted-average comparison, NO journal-entry display.
> 6. AI stock counting: user takes/uploads a photo of an open carton and Claude (Anthropic vision API, called server-side from a Next.js API route only, key in env) returns a structured suggestion (item guess, count, confidence). The user must confirm or edit before anything is logged; never auto-posted. Handle low confidence, API failure, oversized images. Store the photo as an audit attachment against the count.
> 7. Stock-take: physical count (optionally AI-assisted) compared with system quantity, producing a variance and an adjustment movement with a required reason.
> 8. Simple stock and movement summary (opening, received, issued, written off, closing, with cost) for a chosen date range, exportable to CSV. No PDF required.
> 9. Two role tiers only, following existing roles: people who can log receipts, issues and counts; admins who can additionally write off, adjust and view valuation. Extend firestore.rules for the new collections.
> 10. Keep the inventory module separate from the finance module: do not feed event spending totals or create invoices; inventory shows the cost of stock each event consumed, finance remains the record of money paid.
>
> Out of scope: NRV, journals, weighted average, PDF export, multi-warehouse, barcode hardware, supplier/PO workflow, tax/VAT, multi-currency, deploying to production.
>
> Environment note for the build: node_modules is already installed in the repo, including vitest (installed with --no-save, so add vitest to package.json devDependencies yourself and run npm install in the foreground, never as a background task). Do not end a turn while waiting on a background process; run installs and tests in the foreground so the handoff record is always written.
