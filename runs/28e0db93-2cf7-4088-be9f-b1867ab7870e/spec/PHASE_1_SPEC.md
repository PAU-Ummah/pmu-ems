# Phase 1 — Data model, FIFO engine, rules, minimal stock screen

## Goal
Establish the inventory module's foundation: typed data model, a pure and fully unit-tested FIFO cost-flow engine, a Firestore service layer that uses that engine inside transactions to make stock mutations atomic and reject over-issues, an extended `firestore.rules` enforcing the logging/admin split on the new collections, and just enough UI (`/inventory`) to create items, create receipts, and see on-hand quantity with batches ordered oldest-first.

## Scope
In scope: `src/lib/inventory/fifo.ts` + its unit tests; `src/services/inventoryTypes.ts`; `src/services/inventoryService.ts`; `firestore.rules` additions for `inventoryItems`/`inventoryLayers`/`inventoryMovements`; `vitest.config.ts` + `package.json` wiring; `useRole.ts` additions; the minimal `/inventory` stock screen, item-creation modal, and receipt-creation modal; a Part B pure helper module (`src/lib/inventory/onHand.ts`) with its own tests; a `docs/data-model.md` update.
Out of scope: issue/write-off/stock-take/AI-counting UI, reporting/CSV, Firebase Storage (all later phases — see `## Out of scope for this phase` below).

## Part A (first agent)

### 0. Environment setup (do first, in the foreground)
1. Read `node_modules/vitest/package.json` to confirm the installed version (expected `5.0.5`); add `"vitest": "^5.0.5"` to `package.json`'s `devDependencies` (do not add `@vitejs/plugin-react` or `jsdom` — not needed for pure-function tests).
2. Add a `"test": "vitest run"` script to `package.json` (NOT bare `vitest`, so `npm test` runs once and exits).
3. Run `npm install` in the foreground and wait for it to finish before continuing. Do not run it as a background process.

### 1. `src/lib/inventory/fifo.ts` — pure FIFO engine
No imports of any kind (no `firebase/*`, no `@/*`, nothing). Exports:
```ts
export interface InventoryLayer {
  id: string;
  receivedDate: string;   // 'YYYY-MM-DD'
  remainingQty: number;
  unitCost: number;        // may be 0 (donated)
  createdAt: string;       // ISO datetime, tie-breaks equal receivedDate
}

export interface LayerConsumption {
  layerId: string;
  qtyConsumed: number;
  unitCost: number;
}

export interface FifoConsumptionResult {
  consumption: LayerConsumption[];
  updatedLayers: { layerId: string; remainingQty: number }[];
  totalCost: number;
}

export class InsufficientStockError extends Error {
  constructor(public itemId: string, public requested: number, public available: number);
}

export function sortLayersForConsumption(layers: InventoryLayer[]): InventoryLayer[];
export function consumeFifoLayers(layers: InventoryLayer[], itemId: string, quantityRequested: number): FifoConsumptionResult;
export function calculateStockValue(layers: InventoryLayer[]): number;
export function getNextLayerToConsume(layers: InventoryLayer[]): InventoryLayer | undefined;
```
Behaviour:
- `sortLayersForConsumption` filters out layers with `remainingQty <= 0`, then sorts ascending by `receivedDate`; when two layers share `receivedDate`, sorts ascending by `createdAt` (insertion-order tie-break, per the locked PRD's own assumption).
- `consumeFifoLayers` throws a plain `Error` if `quantityRequested <= 0`. It computes `totalAvailable` from the sorted, filtered layers; if `quantityRequested > totalAvailable`, throws `InsufficientStockError` and returns nothing (no partial result object) — the caller must receive either a complete result or a thrown error, never a partially-consumed result. Otherwise it walks the sorted layers, consuming `min(layer.remainingQty, remaining)` from each until `remainingToConsume` reaches 0, recording one `LayerConsumption` entry and one `updatedLayers` entry per layer touched, and summing `qtyConsumed * unitCost` into `totalCost`. Input layers are never mutated (treat as read-only; build new objects/arrays for the result).
- `calculateStockValue` sums `remainingQty * unitCost` over all passed layers (no filtering/sorting needed).
- `getNextLayerToConsume` returns `sortLayersForConsumption(layers)[0]` (or `undefined` if none have stock).

### 2. `src/lib/inventory/fifo.test.ts` — Vitest unit tests
Use `describe`/`test`/`test.each` from `vitest`, importing only from `./fifo` (relative import, no alias). Must cover, at minimum, these PRD-mandated cases (AC1):
- Partial layer consumption: one layer with `remainingQty: 10`, issue `4` → `remainingQty` becomes `6`, one consumption entry.
- Multi-layer issue: two layers (`remainingQty: 5` and `remainingQty: 5`, different `receivedDate`), issue `8` → fully drains the older layer (5) and partially drains the newer layer (3), in that order; `updatedLayers` reflects `0` and `2`.
- Over-issue rejection: total available `10`, request `11` → throws `InsufficientStockError`; assert the thrown error's `available` equals `10` and that no `updatedLayers`/`consumption` data is observable (the function must throw before returning anything).
- Zero-cost donated layer: a layer with `unitCost: 0` is consumed normally and contributes `0` to `totalCost`; a mixed issue spanning one zero-cost and one priced layer produces the correct partial `totalCost`.
- Exact-match consumption: `quantityRequested` exactly equals total available → succeeds, last touched layer's `remainingQty` is exactly `0`.
- Tie-break: two layers with identical `receivedDate` but different `createdAt` → the one with the earlier `createdAt` is consumed first.
- `quantityRequested <= 0` throws a plain `Error` (not `InsufficientStockError`).
- `getNextLayerToConsume` and `calculateStockValue` each get at least one direct test.

### 3. `src/services/inventoryTypes.ts`
```ts
import type { InventoryLayer, LayerConsumption, FifoConsumptionResult } from '@/lib/inventory/fifo';
export { InsufficientStockError } from '@/lib/inventory/fifo';
export type { InventoryLayer, LayerConsumption, FifoConsumptionResult };

export type InventorySourceType = 'purchased' | 'donated';
export type MovementType = 'issue' | 'writeoff' | 'adjustment';
export type WriteOffReason = 'expired' | 'damaged' | 'lost';
export type RecipientGroup = 'everyone' | 'participants';

export interface InventoryItem {
  id?: string;
  name: string;
  unitOfMeasure: string;
  createdAt: string;
  createdBy: string;
}

export interface InventoryLayerDoc extends InventoryLayer {
  itemId: string;
  sourceType: InventorySourceType;
  quantityReceived: number;
  expiryDate?: string;
  createdBy: string;
}

export interface InventoryMovement {
  id?: string;
  itemId: string;
  type: MovementType;
  date: string;
  quantity: number;
  costOfGoods: number;
  layerConsumption: LayerConsumption[];
  eventId?: string;
  recipientGroup?: RecipientGroup;
  headcount?: number;
  reason?: WriteOffReason;
  createdAt: string;
  createdBy: string;
}
```
(`InventoryLayerDoc` extends the pure engine's `InventoryLayer` shape with the Firestore-only fields; this keeps one source of truth for the fields the engine actually consumes.)

### 4. `src/services/inventoryService.ts`
Uses `db` from `@/services/firebase`, `consumeFifoLayers`/`sortLayersForConsumption` from `@/lib/inventory/fifo`. Exports:
- `createInventoryItem(name: string, unitOfMeasure: string, createdBy: string): Promise<string>` — validates non-empty trimmed `name`/`unitOfMeasure`, then `addDoc(collection(db, 'inventoryItems'), {...})`.
- `createReceipt(params): Promise<string>` — validates `quantityReceived > 0` and `unitCost >= 0` (throws plain `Error` otherwise, so the UI can show a message before ever calling Firestore); `addDoc(collection(db, 'inventoryLayers'), { ...params, remainingQty: params.quantityReceived, createdAt: new Date().toISOString() })`.
- `issueStock(opts): Promise<string>` and `writeOffStock(opts): Promise<string>` — both delegate to an internal `consumeAndRecordMovement` that: (a) runs a plain `getDocs` query for `where('itemId','==', itemId)` + `where('remainingQty','>',0)` to get a candidate, ordered list of layer doc refs; (b) opens `runTransaction(db, async (transaction) => {...})`; (c) inside the transaction, re-reads each candidate ref with `transaction.get(ref)`, builds fresh `InventoryLayer[]` from the live data, and calls `consumeFifoLayers`; (d) `transaction.update()`s each touched layer's `remainingQty`; (e) `transaction.set()`s a pre-allocated movement doc ref (`doc(collection(db, 'inventoryMovements'))`) with `type`, `quantity`, `costOfGoods`, `layerConsumption`, and the type-specific fields (`reason` for write-off; `eventId`/`recipientGroup`/`headcount` for issue, all optional). `writeOffStock` requires a non-empty `reason` argument and throws a plain `Error` before opening any transaction if it's missing — this guarantees AC2/AC6's "no movement written" even before Firestore is touched.
- `getItemWithLayers(itemId: string): Promise<{ item: InventoryItem; layers: InventoryLayerDoc[] }>` — one `getDoc` + one `getDocs` query, layers returned pre-sorted via `sortLayersForConsumption`.
- `listInventoryItemsWithLayers(): Promise<{ item: InventoryItem; layers: InventoryLayerDoc[] }[]>` — `getDocs` on `inventoryItems`, then one layers query per item (acceptable at this app's scale; do not add pagination/batching).

### 5. `firestore.rules`
Extend the existing file (do not touch the existing `users`/`people`/`events`/`invoices`/`sessions`/`config` blocks). Add, inside the existing `match /databases/{database}/documents { ... }` block:
```
function isSignedIn() {
  return request.auth != null;
}
function callerRole() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
}
function isInventoryAdmin() {
  return isSignedIn() && callerRole() == 'admin';
}

match /inventoryItems/{itemId} {
  allow read: if isSignedIn();
  allow create, update: if isSignedIn()
    && request.resource.data.name is string && request.resource.data.name.size() > 0
    && request.resource.data.unitOfMeasure is string && request.resource.data.unitOfMeasure.size() > 0;
  allow delete: if isInventoryAdmin();
}

match /inventoryLayers/{layerId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn()
    && request.resource.data.quantityReceived is number && request.resource.data.quantityReceived > 0
    && request.resource.data.unitCost is number && request.resource.data.unitCost >= 0
    && request.resource.data.remainingQty == request.resource.data.quantityReceived;
  allow update: if isSignedIn()
    && request.resource.data.remainingQty is number
    && request.resource.data.remainingQty >= 0
    && request.resource.data.remainingQty <= resource.data.quantityReceived;
  allow delete: if isInventoryAdmin();
}

match /inventoryMovements/{movementId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn()
    && request.resource.data.quantity is number && request.resource.data.quantity > 0
    && request.resource.data.type in ['issue', 'writeoff', 'adjustment']
    && (request.resource.data.type != 'writeoff'
        || (isInventoryAdmin() && request.resource.data.reason in ['expired', 'damaged', 'lost']))
    && (request.resource.data.type != 'adjustment' || isInventoryAdmin());
  allow update, delete: if false;
}
```
This is the authoritative enforcement of: never-negative stock (`remainingQty >= 0` and `<= quantityReceived`), write-off requires `admin` role + a reason in the allowed enum (AC6, AC11, AC12), adjustment requires `admin` (AC9/AC11/AC12 groundwork for Phase 3), and movements are an immutable audit trail once written.

### 6. `src/hooks/useRole.ts`
Add, without removing any existing export:
```ts
const canAccessInventory = () => hasRole(['event-organizer', 'it', 'finance-manager', 'admin', 'registrar']);
const canAdminInventory = () => hasRole('admin');
```
Return both from the hook alongside the existing guards.

**Commit Part A's work** (types, engine, tests, service layer, rules, `useRole` addition, `vitest.config.ts`, `package.json`) before handing off.

## Part B (second agent)

### 1. `src/lib/inventory/onHand.ts` — pure UI-aggregation helpers (new, separate from the FIFO consumption engine)
No Firestore/network imports. Exports:
```ts
export function computeOnHand(layers: { remainingQty: number }[]): number; // sum of remainingQty
export function hasExpiringSoon(layers: { expiryDate?: string; remainingQty: number }[], asOfIso: string, withinDays: number): boolean;
```
`hasExpiringSoon` returns true if any layer with `remainingQty > 0` has an `expiryDate` within `withinDays` days of `asOfIso` (string-date arithmetic via `Date.parse`, no library). This is genuinely separate logic from `fifo.ts` (presentation/alerting, not cost-flow), owned by Part B.

### 2. `src/lib/inventory/onHand.test.ts`
Unit tests: `computeOnHand` with empty array (0), single layer, multiple layers; `hasExpiringSoon` true/false/boundary cases (exactly `withinDays` away, already expired, no `expiryDate` set, `remainingQty: 0` layer ignored even if expiring).

### 3. `src/hooks/useInventoryItems.ts`
Mirrors `src/hooks/useEvents.ts`'s shape (`useState`/`useEffect`/`useCallback`, `loading`/`error`/`refresh`). Calls `listInventoryItemsWithLayers()` from `inventoryService.ts`; for each item, pre-computes `onHand` (via `computeOnHand`) and `nextLayer` (via `getNextLayerToConsume`) client-side and returns an array of `{ item, layers, onHand, nextLayer }`. No session scoping (per the locked PRD's assumption that inventory persists across sessions) — do not import `useCurrentSession`.

### 4. `src/app/(authenticated)/inventory/page.tsx` — main stock screen
Wrapped in `RoleGuard` with `allowedRoles` = the same five roles as `canAccessInventory()`. Renders, using existing `Card`/`Table`/`Button` components (matching `events`/`finance` page conventions):
- A table of items: name, unit of measure, on-hand quantity.
- Expanding/nesting each item's batches, oldest-first (already sorted by the hook), each row showing `receivedDate`, `sourceType`, `remainingQty`/`quantityReceived`, `expiryDate` if present, and a visible "Next" badge/label on exactly the batch `getNextLayerToConsume` would pick (AC4: "indicating which batch will be consumed next").
- An "Add Item" button opening `ItemForm` (modal) and an "Add Receipt" button (per item, or a top-level button with an item selector) opening `ReceiptForm` (modal).
- Loading and empty states consistent with other pages (reuse `Loading`/`EmptyState` components already in `src/components/`).

### 5. `src/app/(authenticated)/inventory/_component/ItemForm.tsx`
Small modal (reuse `Modal`, `InputField`, `Label`, `Button` exactly as `InvoiceForm.tsx` does): `name` (required, non-empty), `unitOfMeasure` (required, non-empty). On submit calls `createInventoryItem`, closes, triggers `refresh()` on the parent hook. Shows a validation error (not a crash) if either field is empty — client-side mirror of the rules check.

### 6. `src/app/(authenticated)/inventory/_component/ReceiptForm.tsx`
Modal with: item selector (from the list already loaded by `useInventoryItems`), `sourceType` radio (`purchased`/`donated`), `receivedDate` date input (default today, via `new Date().toISOString().split('T')[0]`), `quantityReceived` number input (`required`, `min=1`), `unitCost` number input (`required`, `min=0`, explicitly allowed to be `0` — label it "may be 0 for donated stock"), `expiryDate` optional date input. Submit button disabled while `quantityReceived <= 0` or `unitCost < 0` or no item selected; on submit calls `createReceipt`, closes, triggers `refresh()`.

### 7. `src/layout/AppSidebar.tsx`
Add a `{ name: 'Inventory', path: '/inventory', subItems: undefined }` nav entry, filtered the same way `/attendance`/`/finance` already are (visible when `canAccessInventory()` — i.e., to any authenticated user with a role, consistent with this being the logging tier).

### 8. `docs/data-model.md`
Add an `### Inventory Collections` section documenting `inventoryItems`, `inventoryLayers` (fields, `remainingQty` invariant), and `inventoryMovements` (the `type` discriminant, which fields are required per type), explicitly noting: inventory is not session-scoped; donated layers may have `unitCost: 0`, valued at fair value by analogy to IPSAS 12 / nonprofit GAAP convention since IAS 2 itself does not address donated inventory (for the coursework write-up's defensibility, per the research findings) ; and layers are consumed oldest-`receivedDate`-first, tying by `createdAt`.

**Commit Part B's work** (onHand helpers + tests, hook, page, both forms, sidebar entry, docs update).

## Acceptance-criteria mapping
| AC | Satisfied by | Concrete check |
|---|---|---|
| 1 | Part A, `fifo.test.ts` | `npm test` passes, covering partial/multi-layer/over-issue/zero-cost cases |
| 2 | Part A, `consumeFifoLayers` + `consumeAndRecordMovement` | `fifo.test.ts`'s over-issue test asserts `InsufficientStockError` thrown and no result returned; `firestore.rules`' `remainingQty >= 0` update rule backs this at the data layer |
| 3 | Part A `createReceipt` + Part B `ReceiptForm`/stock screen | Manually create a receipt via the UI; confirm a new `inventoryLayers` doc with `date`/`quantity`/`unitCost`/optional `expiryDate` appears in the Firestore console and in the stock screen's batch list |
| 4 | Part B stock screen + `getNextLayerToConsume` | Open `/inventory` with an item having 2+ batches; confirm batches render oldest-first and the oldest/available one is visibly marked "Next" |
| 14 | Part A, `src/lib/inventory/fifo.ts` has zero imports | Code review of the file's import list; `fifo.test.ts` runs with no Firestore/network setup |

(AC5, 6, 7, 8, 9, 10, 11, 12, 13 are satisfied in Phases 2-4 per the phase plan in `CONTEXT.md`; Phase 1's `firestore.rules` changes are a necessary but not sufficient part of AC6/AC11/AC12, completed when their respective UIs land.)

## Documentation sources
- [Get started with Cloud Firestore](https://firebase.google.com/docs/firestore/quickstart)
- [Transactions and batched writes | Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Usage and limits | Firestore](https://firebase.google.com/docs/firestore/quotas)
- [Get started with Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Structuring Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-structure)
- [Writing conditions for Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Security Rules language](https://firebase.google.com/docs/rules/rules-language)
- [Firestore Security Rules and queries (Securely query data)](https://firebase.google.com/docs/firestore/security/rules-query)
- [Avoid insecure rules](https://firebase.google.com/docs/rules/insecure-rules)
- [Vitest — Getting Started Guide](https://vitest.dev/guide/)
- [Vitest — API Reference](https://vitest.dev/api/)
- [Vitest — Test Environment](https://vitest.dev/guide/environment)
- [Configuring Vitest](https://vitest.dev/config/)
- [TypeScript tsconfig Reference](https://www.typescriptlang.org/tsconfig)

## Out of scope for this phase
- Issue and write-off UI, event-linked headcount pre-fill (Phase 2).
- Any check/test confirming `events.amountSpent`/`invoices` remain untouched (Phase 2, once movements actually get created from the UI).
- Claude vision API route, oversized-image/API-failure handling, Firebase Storage photo attachments, stock-take screen and adjustment movements (Phase 3).
- Date-range summary report, CSV export, admin-only valuation view (Phase 4).
- Any production deployment, NRV/write-down mechanics, journal-entry display, weighted-average costing, PDF export, multi-warehouse, barcode hardware, supplier/PO workflow, tax/VAT, multi-currency (all explicitly out of scope per the locked PRD, all phases).

## Spec assumptions

Gaps found while writing this spec were resolved as follows (nobody was asked):

- `inventoryLayers` and `inventoryMovements` are flat top-level Firestore collections (not subcollections of `inventoryItems`), each carrying an `itemId` field, consistent with this codebase's existing flat-collection convention for `events`/`invoices`/`people`.
- `inventoryMovements` is a single collection for issue/write-off/adjustment, discriminated by a `type: 'issue'|'writeoff'|'adjustment'` field, so firestore.rules can gate role and required-reason logic per type in one place.
- `unitCost` is NOT field-level hidden from the logging tier's Firestore reads (the research report's suggestion to split cost into an admin-only collection is not adopted): logger-created issues must compute `costOfGoods` from `unitCost`, so hiding it would block a logging-tier action the PRD requires. The admin-only "valuation view" (AC11/AC12) is instead enforced as a page-level `RoleGuard` gate (Phase 4) plus firestore.rules restricting who may create `writeoff`/`adjustment` movements — the existing RoleGuard pattern already gates whole pages, not fields, throughout this codebase.
- The client Firestore SDK's `runTransaction`/`transaction.get()` only accepts document references, not queries. FIFO-consuming mutations therefore read layer ordering via a plain (non-transactional) query first, then re-read each candidate layer by reference inside the transaction and re-run the pure FIFO function on the fresh data. A concurrent receipt with an even-older `receivedDate` landing between the ordering query and the transaction commit is an accepted, low-probability race for this low-traffic nonprofit app; it is not solved by introducing a server-side Admin SDK route in Phase 1, since the PRD only mandates server-side routing for the Claude vision call.
- `src/lib/inventory/fifo.ts` is fully self-contained (defines its own types and error class, zero imports) so it can be unit-tested by Vitest with no path-alias plugin or extra config; `src/services/inventoryTypes.ts` re-exports the FIFO-related types for the rest of the app to import via the `@/*` alias.
- Vitest stays pinned to the version already installed in `node_modules` (5.0.5, confirmed by reading `node_modules/vitest/package.json`), since the locked PRD states vitest is already present via a `--no-save` install and only needs adding to `package.json`.
- Stock-in receipts are created with a single `addDoc` (no transaction needed, since creating one new layer document has no multi-document read dependency); only consuming movements (issue/write-off/adjustment) use `runTransaction`.
- Dates (`receivedDate`, movement `date`) are plain `'YYYY-MM-DD'` strings produced via `new Date().toISOString().split('T')[0]`, matching the existing `events`/`invoices` convention; `createdAt` is a full ISO datetime string (`new Date().toISOString()`), used as the FIFO same-date tie-breaker, since this codebase does not use `serverTimestamp()` anywhere else.
- Phase 1 includes only a minimal main stock screen and receipt/item creation UI (just enough to make AC3/AC4 checkable in the UI); issue, write-off, stock-take, AI counting, and reporting screens are explicitly built in Phases 2-4.
- `useRole.ts` gains two inventory-specific convenience guards (`canAccessInventory` = any of the five existing roles, `canAdminInventory` = `admin` only) so Phase 1's rules and Phase 1's UI encode the same logger/admin split, reusable unchanged by later phases.
