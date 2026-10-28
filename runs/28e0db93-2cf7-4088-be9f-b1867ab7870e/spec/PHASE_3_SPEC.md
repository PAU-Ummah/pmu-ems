# Phase 3 — AI-assisted stock counting and stock-take

## Goal
Add the two remaining stock-counting flows from the locked PRD: a server-side Claude vision call that suggests an item/count/confidence from a photo of an open carton (never written to Firestore until a human confirms or edits it), and a stock-take screen that compares a physical count (optionally pre-filled from that AI suggestion) to the system's current on-hand quantity, producing a variance and, on save, an `adjustment` movement with a required reason. Satisfies AC7, AC8, AC9.

## Scope
In scope: `src/app/api/inventory/ai-count/route.ts` (Next.js Route Handler, server-side Claude vision call); `src/app/(authenticated)/inventory/_component/AiCountDialog.tsx` (photo upload, calls the route, shows the suggestion with a low-confidence warning, lets the user accept/edit before handing a plain number to the caller — never calls Firestore itself); `src/app/(authenticated)/inventory/_component/StockTakeForm.tsx` (counted-quantity input, optionally pre-filled by `AiCountDialog`, shows system on-hand and the resulting variance, reason `<select>` required whenever variance ≠ 0); a `recordStockTake` addition to `src/services/inventoryService.ts` plus a small pure helper in `src/lib/inventory/fifo.ts` for the found-stock (positive-variance) layer-insert case; a new `inventoryCounts` Firestore collection and matching `firestore.rules` block; `firestore.rules`' existing `inventoryMovements` block extended so `adjustment` movements (already admin-gated) also require a `reason`; Firebase Storage wiring for the count photo (`src/services/firebase.ts` storage export, `storage.rules`); wiring both new dialogs into `src/app/(authenticated)/inventory/page.tsx`; a `docs/data-model.md` touch-up for `inventoryCounts` and the adjustment path.

Out of scope: date-range summary report, CSV export, admin-only stock valuation view (Phase 4); any change to the `issue`/`writeoff` flows built in Phases 1-2; deploying Storage/Firestore rules to a live Firebase project (no production deployment, per the locked PRD's constraints).

## Part A (first agent)

### 1. `src/app/api/inventory/ai-count/route.ts`
A `POST` Route Handler, following the existing `src/app/api/register-user/route.ts` shape (`NextRequest`/`NextResponse`, a top-level `try`/`catch`, `console.error` + a mapped JSON error response on failure — no raw 500s, no uncaught exceptions reaching the client, per AC8).

Request body: `{ imageBase64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' }` (the client base64-encodes the file; nothing is sent as multipart/form-data, keeping this a single small JSON body).

Server-side validation, before any call to Anthropic:
- Reject (400) if `imageBase64` is missing or not a string.
- Reject (400, `{ error: 'Image is too large. Please use a photo under 5MB.' }`) if the decoded byte size exceeds 5MB — the locked PRD's own assumption for the client-side cap, re-enforced server-side so a client-side bug or a direct API call can't bypass it; this is the AC8 "oversized image" handled-error-state path.
- Reject (400) if `mediaType` is not one of the four Anthropic-supported image types.

On a validated request, call the Anthropic Messages API server-side using `ANTHROPIC_API_KEY` from `process.env` (never sent to or read by client code, per the locked PRD's constraint). Use the `@anthropic-ai/sdk` package (add it to `package.json` `dependencies`, `npm install` in the foreground per this module's existing install convention) or a direct `fetch` to `https://api.anthropic.com/v1/messages` with `x-api-key`/`anthropic-version: 2023-06-01` headers — either is acceptable, but do not invent a third HTTP client pattern this repo doesn't already use elsewhere.

Send one `user` message with an `image` content block (`{ type: 'image', source: { type: 'base64', media_type, data: imageBase64 } }`) followed by a `text` block instructing Claude to count the items in the carton and report its best guess of what the item is. Define a single tool, e.g. `record_stock_count`, with `input_schema` properties `item` (string), `count` (integer), `confidence` (number, 0-1), `required: ['item', 'count', 'confidence']`, and `strict: true` so the response is schema-guaranteed regardless of whether the model in use supports forced `tool_choice` (per this phase's own research digest below — some current models reject forced `tool_choice`; `tool_choice: { type: 'auto' }` plus `strict: true` works across all of them). Read the result from `response.content.find(b => b.type === 'tool_use').input`.

Wrap the Anthropic call in its own `try`/`catch` distinct from the outer validation `try`/`catch`, and on any failure (network error, non-2xx response, missing `tool_use` block) return a `502` with `{ error: 'AI count failed. You can still enter the count manually.' }` — this is the AC8 "Claude API failure" handled-error-state path; the route must never let an Anthropic SDK exception propagate as an unhandled 500.

On success, return `{ item: string, count: number, confidence: number }` as JSON. **The route handler itself must never write to Firestore** — it only returns the suggestion; persistence happens only after the `AiCountDialog`'s caller (the `StockTakeForm`) is submitted by a human. This is the literal mechanism behind AC7.

### 2. `src/app/(authenticated)/inventory/_component/AiCountDialog.tsx`
A modal, reusing `Modal`/`Button` exactly as the other inventory forms do. Props: `isOpen`, `onClose`, `onAccept: (count: number) => void` (the parent — `StockTakeForm` — receives only a plain number once the user confirms or edits; `AiCountDialog` never touches `itemId`, Firestore, or the count's reason).

Flow:
- A file input (`<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" />`). On selection, check `file.size > 5 * 1024 * 1024` client-side and show `"Image is too large. Please use a photo under 5MB."` without ever calling the route — the first of AC8's two handled-error-state paths, and the cheaper one (no network round-trip for an upload that would be rejected anyway).
- On a valid file, read it via `FileReader.readAsDataURL`, strip the `data:image/...;base64,` prefix, `POST` to `/api/inventory/ai-count` with `{ imageBase64, mediaType: file.type }`, showing a loading state while in flight.
- On a non-OK response, render the server's `error` message in the same `<p className="text-sm text-error-500">` pattern the other inventory forms already use — the second AC8 path (API failure surfaced, not a crash).
- On success, show the suggestion: `"Looks like: {item} — count: {count}"`, plus confidence as a percentage. If `confidence < 0.7` (this module's existing documented threshold convention), show a visible low-confidence warning banner (e.g. `"Low confidence — please check this count carefully."`) but do not block acceptance; a human can still accept or edit it.
- An editable number input pre-filled with `count`, and an "Use this count" button that calls `onAccept(editedCount)` and closes. There is no separate "edit item name" field wired to anything — `StockTakeForm` already has its own item `<select>`, chosen before opening `AiCountDialog`, since a stock-take is always for one already-selected item; the AI's `item` guess is shown for the human to sanity-check against the item they picked, not written anywhere.

### 3. `src/app/(authenticated)/inventory/_component/StockTakeForm.tsx`
Modal, same conventions as `ReceiptForm.tsx`/`IssueForm.tsx`. Props: `isOpen`, `onClose`, `items: InventoryItem[]`, `itemsWithStock: InventoryItemWithStock[]` (from `useInventoryItems()`, to read each item's current `onHand`), `defaultItemId?: string`, `onCreated: () => void`.

Fields:
- Item `<select>` (required) — same options pattern as the other forms.
- System quantity: read-only, derived from `itemsWithStock.find(i => i.item.id === itemId)?.onHand ?? 0`, displayed as `"System quantity: {systemQty}"` — not an input.
- Counted quantity number input (`min=0`, required), with a small "Use AI Count" button next to it (same `variant="outline"` pattern) that opens `AiCountDialog`; its `onAccept` sets this field's value.
- Variance, computed and displayed live (not stored as a controlled field): `countedQty - systemQty`. Render as `"Variance: +N"` / `"Variance: -N"` / `"Variance: 0 (matches system)"`.
- Reason `<select>` with the same three-value enum as `WriteOffForm.tsx` (`expired` / `damaged` / `lost`) plus a fourth option, `miscounted` (covering the "system was simply wrong," e.g. a prior data-entry slip, which is the one adjustment scenario none of `expired`/`damaged`/`lost` describes) — **shown and required only when variance ≠ 0**; hidden (and not required) when counted quantity equals system quantity, since there is nothing to adjust.
- Submit disabled while: no item selected, counted quantity is empty, or (variance ≠ 0 and no reason selected).

On submit, calls a new `recordStockTake` function (Part B, `inventoryService.ts`) with `{ itemId, countedQty, systemQtyAtCount: systemQty, date, createdBy: user.uid, reason: variance !== 0 ? reason : undefined }`. Show the thrown error's `.message` on failure, same pattern as the other forms; on success, close and call `onCreated()`.

### 4. Wire into `src/app/(authenticated)/inventory/page.tsx`
Add `stockTakeFormOpen`/`stockTakeDefaultItemId` state and an `openStockTakeForm(itemId?)` helper, mirroring the existing per-item button pattern exactly. Add a "Stock Take" button next to "Issue Stock"/"Add Receipt" (visible to every role the page already allows — counting is logging-tier, per the locked PRD's §9 and `canAccessInventory()`, no extra gate needed; the *reason-required-adjustment* half is enforced by `firestore.rules`' existing `isInventoryAdmin()` gate on the `adjustment` movement type, Phase 1, unchanged by this phase). Pass `itemsWithStock={items}` straight through from the page's existing `useInventoryItems()` call — do not re-fetch on-hand data inside `StockTakeForm`.

**Commit Part A's work** (`route.ts`, `AiCountDialog.tsx`, `StockTakeForm.tsx`, `page.tsx` wiring, the `@anthropic-ai/sdk` `package.json` addition if used) before handing off.

## Part B (second agent)

### 1. `src/services/inventoryService.ts` — `recordStockTake`
Add:
```ts
export interface RecordStockTakeOpts {
  itemId: string;
  countedQty: number;
  systemQtyAtCount: number;
  date: string;
  createdBy: string;
  reason?: AdjustmentReason; // 'expired' | 'damaged' | 'lost' | 'miscounted'
}

export async function recordStockTake(opts: RecordStockTakeOpts): Promise<string>
```
Validation mirroring `writeOffStock`'s existing style: throw a plain `Error` (client-side, before any Firestore call) if `countedQty < 0`, or if `opts.countedQty !== opts.systemQtyAtCount` and `opts.reason` is falsy — the service-layer belt to `StockTakeForm`'s UI-level suspenders, exactly as Phase 2's `writeOffStock`/`WriteOffForm` pair already established for AC6 and now repeated here for AC9's "required reason."

Behaviour:
- Always create one `inventoryCounts` doc (`addDoc`, no transaction needed — it's a pure audit record, not a stock mutation): `{ itemId, countedQty, systemQtyAtCount, variance: countedQty - systemQtyAtCount, date, createdAt, createdBy }`.
- If `countedQty === systemQtyAtCount`, stop there — no `adjustment` movement, since there is nothing to adjust (AC9 only requires a movement "if the counted quantity is different").
- If `countedQty < systemQtyAtCount` (shrinkage — physical count found less than the system expects): reuse the existing `consumeAndRecordMovement` internal helper with `type: 'adjustment'`, `quantity: systemQtyAtCount - countedQty`, `reason: opts.reason` — identical mechanics to a write-off (consume oldest layers first via `consumeFifoLayers`, write the movement in the same transaction), just a different `type` and a different (wider) reason enum. This requires widening `ConsumeAndRecordMovementOpts.type` from `'issue' | 'writeoff'` to also accept `'adjustment'`, and widening its `reason` field's type to `AdjustmentReason`.
- If `countedQty > systemQtyAtCount` (physical count found more than the system expects — a new pure helper, `addFoundLayer`, in `src/lib/inventory/fifo.ts`): rather than consuming existing layers, this path inserts one new layer sized to the variance, dated `opts.date`, at `unitCost: 0` (the found quantity has no known purchase/donation cost — the locked PRD's existing donated-layer-at-zero-cost convention is reused here, since "stock the system didn't know it had" is economically identical to an unpriced donation for costing purposes), inside the **same transaction** that writes the `adjustment` movement (`quantity`, `costOfGoods: 0`, `layerConsumption: []`, `reason`). This does not go through `consumeFifoLayers` at all (nothing is being consumed) — write it as its own small transaction block in `recordStockTake`, not shoehorned into `consumeAndRecordMovement`, which exists specifically for the *consumption* shape (candidate-layers query → re-read by reference → `consumeFifoLayers` → update + movement).

Export `AdjustmentReason = WriteOffReason | 'miscounted'` from `src/services/inventoryTypes.ts`, and add `InventoryCount` to the same file:
```ts
export type AdjustmentReason = WriteOffReason | 'miscounted';

export interface InventoryCount {
  id?: string;
  itemId: string;
  countedQty: number;
  systemQtyAtCount: number;
  variance: number;
  date: string;
  createdAt: string;
  createdBy: string;
}
```

### 2. `firestore.rules`
Add a new top-level block (additive only, nothing existing touched):
```
match /inventoryCounts/{countId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn()
    && request.resource.data.countedQty is number && request.resource.data.countedQty >= 0
    && request.resource.data.systemQtyAtCount is number && request.resource.data.systemQtyAtCount >= 0;
  allow update, delete: if false;
}
```
Extend the existing `inventoryMovements` `create` rule's `adjustment` clause from `(request.resource.data.type != 'adjustment' || isInventoryAdmin())` to also require a reason, matching the `writeoff` clause's shape:
```
&& (request.resource.data.type != 'adjustment'
    || (isInventoryAdmin() && request.resource.data.reason in ['expired', 'damaged', 'lost', 'miscounted']))
```
This is the data-layer half of AC9's "required reason," mirroring Phase 1's identical treatment of `writeoff`.

### 3. Firebase Storage for count photos
Add a `storage` export to `src/services/firebase.ts` (`import { getStorage } from 'firebase/storage'; export const storage = getStorage(app);`), and a root `storage.rules` file (new — this repo has none yet) gating count-photo reads/writes to signed-in users, following the same "signed-in users only, app enforces session scoping" convention `firestore.rules`' header comment already states: `allow read, write: if request.auth != null;` under `match /inventoryCountPhotos/{allPaths=**}`. Per this phase's own locked-PRD assumption, a photo is capped at 5MB client-side before upload (already enforced in `AiCountDialog.tsx`, Part A); `StockTakeForm` does not itself upload a photo to Storage — that remains `AiCountDialog`'s concern if a photo was used, attached to the `inventoryCounts` doc as an optional `photoUrl` field once uploaded via `uploadBytes`/`getDownloadURL`. (Deploying `storage.rules` to a live project is out of scope, per "no production deployment" — this phase only adds the file to the repo.)

### 4. `docs/data-model.md` — Inventory Collections section touch-up
Append a paragraph documenting `inventoryCounts` (fields, that it is a pure audit record never itself consumed by FIFO logic) and the `adjustment` movement's two directions (shrinkage via `consumeFifoLayers` identical to a write-off; found-stock via a new zero-cost layer), plus the `miscounted` addition to the reason enum and why it exists (per Part B §1 above).

### 5. Verify, in the foreground, before committing
Run `npm test` (all prior tests plus any new ones for `addFoundLayer` must pass — this phase should add at least one `fifo.test.ts` case for the found-stock helper, consistent with the locked PRD's "pure functions... exercised by dedicated unit tests" requirement, AC14), `npx tsc --noEmit`, and `npx eslint` on every file this phase touched or added. Manually read `AiCountDialog.tsx`/`StockTakeForm.tsx`/`route.ts` against the acceptance criteria below line by line, since there is still no Firebase emulator and no real `ANTHROPIC_API_KEY` in this environment to drive an end-to-end check.

**Commit Part B's work** (`inventoryService.ts` additions, `inventoryTypes.ts` additions, `fifo.ts`/`fifo.test.ts` additions, `firestore.rules`, `storage.rules`, `src/services/firebase.ts`, `docs/data-model.md`).

## Acceptance-criteria mapping
| AC | Satisfied by | Concrete check |
|---|---|---|
| 7 | Part A, `AiCountDialog.tsx` returning only a plain number to its caller; `route.ts` never calling Firestore | No code path from a photo upload reaches Firestore without `StockTakeForm`'s own submit being clicked by a human |
| 8 | Part A, `AiCountDialog.tsx`'s client-side 5MB check + `route.ts`'s server-side 5MB check and Anthropic-call `try`/`catch` | Upload a >5MB file: handled error shown, no network call made; force the Anthropic call to fail: route returns 502 with a JSON error, not a 500 |
| 9 | Part A, `StockTakeForm.tsx`'s live variance display and reason-required-when-nonzero submit gate; Part B, `recordStockTake`'s matching service-layer check and `firestore.rules`' `adjustment` reason requirement | Enter a counted quantity different from on-hand: variance shown, submit blocked without a reason; with a reason, an `inventoryCounts` doc and an `adjustment` movement are both created |

(AC1-6, 11 (UI half for write-off), 13, 14 were satisfied in Phases 1-2. AC10 and the remaining, admin-valuation-view half of AC11/12 are satisfied in Phase 4, per the phase plan in `context.md`.)

## Documentation sources
- [Vision - Claude Docs](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Tool use with Claude - Claude Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [Define tools - Claude Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- [Messages API Reference - Claude Docs](https://platform.claude.com/docs/en/api/messages)
- [Firebase Storage - Get started](https://firebase.google.com/docs/storage/web/start)
- [Firebase Storage Security Rules](https://firebase.google.com/docs/storage/security)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers-and-middleware)

## Out of scope for this phase
- Date-range summary report, CSV export, admin-only stock valuation view (Phase 4).
- Multi-item detection within a single photo (the locked PRD's own assumption: one item guess, one count per submission).
- Any change to `issueStock`/`writeOffStock` or their Phase 2 UI (`IssueForm.tsx`/`WriteOffForm.tsx`) beyond widening the shared `consumeAndRecordMovement` helper's `type`/`reason` typing to admit `adjustment`.
- Deploying `firestore.rules`/`storage.rules` to a live Firebase project, or provisioning a real `ANTHROPIC_API_KEY` — both require production access this environment does not have and the locked PRD does not ask for.
- NRV/write-down mechanics, weighted-average costing, journal-entry display, PDF export, multi-warehouse, barcode hardware, supplier/PO workflow, tax/VAT, multi-currency (all explicitly out of scope per the locked PRD, all phases).

## Spec assumptions

Gaps found while writing this spec were resolved as follows (nobody was asked):

- A fourth write-off/adjustment reason, `miscounted`, is added specifically for the `adjustment` movement type (not for `writeoff`, which keeps its original three-value enum from Phase 1/2 unchanged) because none of `expired`/`damaged`/`lost` describes "the system's recorded quantity was simply wrong" — the one scenario a stock-take with zero physical loss can still surface (e.g. a prior receipt was entered with the wrong quantity). The locked PRD requires *a* reason for every adjustment but does not enumerate adjustment's reasons the way it explicitly enumerates write-off's three, so this is read as a deliberate gap for the phase to fill, not a constraint to work around.
- A found-stock (positive-variance) adjustment inserts a new zero-cost layer rather than, say, reversing a phantom "negative write-off" or requiring the user to also enter a cost for the found items — because the locked PRD never asks for a UI to price newly-discovered stock, and zero-cost is the same convention already established for donated layers (Phase 1), so no new costing concept is introduced, only the existing donated-layer convention applied to a second scenario that shares its economics (quantity whose acquisition cost is unknown or nil).
- `inventoryCounts` is written outside any transaction (a plain `addDoc`) even on the shrinkage path, where the `adjustment` movement itself *is* transactional — because the count record is pure audit trail (what did the human observe), not a stock balance, and the invariant this module actually needs to protect (`remainingQty` never going negative, a movement never existing without its layer updates) lives entirely in the movement+layer write, not in the count record's existence. A count doc existing without a matching movement (e.g. if the transaction below it later failed) is an acceptable inconsistency to leave unresolved for this "narrow scope" coursework build, same spirit as Phase 1's choice not to re-derive on-hand from movement replay.
- The AI route's structured-output approach (a `strict: true` tool with `tool_choice: 'auto'`) is chosen over forcing `tool_choice: { type: 'tool', ... }` because this phase's own research digest found forced tool choice is rejected on several current models (400 error) while `auto` + `strict` is documented to work across all of them — picking the forced variant would risk the entire AI-count feature breaking outright depending on which model the deployed `ANTHROPIC_API_KEY`'s account defaults to.
- `storage.rules` is added to the repo but not deployed (no `firebase deploy` run), consistent with the locked PRD's "no production deployment" constraint and with how this phase's own environment has no live Firebase project to deploy to in the first place; the file existing and being correct is the deliverable, not its live effect.
