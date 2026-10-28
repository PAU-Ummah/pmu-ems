# Phase 2 — Issue & write-off UI, RBAC-in-UI, finance separation check

## Goal
Add the two remaining stock-mutating actions to the `/inventory` screen built in Phase 1: issuing stock (optionally linked to an event, with headcount pre-filled from that event's attendance) and writing stock off (admin-only, reason required). Both already have a Firestore service layer (`issueStock`/`writeOffStock` in `src/services/inventoryService.ts`) and a `firestore.rules` enforcement (Phase 1); Phase 2's job is the UI that calls them, the role gating of that UI, and a check that neither path ever touches `events.amountSpent` or `invoices/*`.

## Scope
In scope: `src/app/(authenticated)/inventory/_component/IssueForm.tsx`; `src/app/(authenticated)/inventory/_component/WriteOffForm.tsx`; wiring both into `src/app/(authenticated)/inventory/page.tsx` (new buttons, modal state, admin-only visibility for write-off); a small event-selector data source for the issue form; a `src/services/inventoryService.test.ts` (or equivalent) static/source-inspection check for AC13; a `docs/data-model.md` touch-up noting the two movement-creation entry points now exist in the UI.
Out of scope: AI-assisted stock counting, Firebase Storage photo attachments, the Claude vision API route, stock-take/adjustment UI (all Phase 3); date-range summary report, CSV export, admin-only valuation view (Phase 4).

## Part A (first agent)

### 1. `src/app/(authenticated)/inventory/_component/IssueForm.tsx`
Modal, reusing `Modal`/`InputField`/`Label`/`Button` exactly as `ItemForm.tsx`/`ReceiptForm.tsx` already do (Phase 1), and the `<select>` pattern already used for the item picker in `ReceiptForm.tsx` for the event picker (matching `InvoiceForm.tsx`'s `eventId` `<select>` — same markup, same `h-11 w-full appearance-none ...` classes, do not invent a new dropdown component).

Props: `isOpen`, `onClose`, `items: InventoryItem[]` (from the already-loaded `useInventoryItems()` list, same as `ReceiptForm`), `events: Event[]` (from `useEvents(currentSessionId)`, same hook `InvoiceForm`'s caller already uses, imported from `@/services/types` for the `Event` type), `defaultItemId?: string`, `onCreated: () => void`.

Fields:
- Item `<select>` (required) — same options pattern as `ReceiptForm`.
- Quantity number input (required, `min=1`).
- Date input (default today via `new Date().toISOString().split('T')[0]`, same convention as `ReceiptForm.receivedDate`).
- Event `<select>` (optional) — options `events.map(e => ({ value: e.id, label: `${e.name} - ${e.date}` }))`, with a leading `<option value="">No linked event</option>`, matching `InvoiceForm`'s event dropdown shape.
- Recipient group: two radio buttons, `everyone` / `participants`, same markup pattern as `ReceiptForm`'s `sourceType` radios. Required once an event is selected; when no event is selected it still has a value (default `everyone`) since AC5 only mandates pre-fill behaviour *when linked to an event*, not that recipient group is meaningless without one.
- Headcount number input (`min=0`), **pre-filled from the selected event's attendance when an event is selected**: `headcount` state is set to `selectedEvent.attendees.length` via a `useEffect` keyed on the selected `eventId`, and remains a plain controlled input the user can edit afterward (AC5: "pre-filled... and can be edited before saving"). When the event is deselected (`eventId` cleared), do not force-reset `headcount` to `0` — leave whatever the user has typed, since they may still want to issue stock with a manually-entered headcount and no event link.
- Submit disabled while: no item selected, `quantity <= 0`, or (an event is selected and no `recipientGroup` chosen — though per the default above this can't actually happen; keep the check anyway as the literal mirror of "required once an event is selected" for defensiveness, same spirit as `ReceiptForm`'s `canSubmit` boolean).

On submit, calls `issueStock({ itemId, quantity, date, createdBy: user.uid, eventId: eventId || undefined, recipientGroup, headcount: headcount || undefined })` from `inventoryService.ts` (already exported from Phase 1 — no service-layer change needed), shows the thrown error's `.message` (e.g. `InsufficientStockError`'s inherited `Error.message`) in the same `<p className="text-sm text-error-500">` pattern as `ItemForm`/`ReceiptForm`, then on success closes and calls `onCreated()` (→ `refresh()` on the page's `useInventoryItems()`).

### 2. `src/app/(authenticated)/inventory/_component/WriteOffForm.tsx`
Same modal conventions as `IssueForm.tsx`. Props: `isOpen`, `onClose`, `items: InventoryItem[]`, `defaultItemId?: string`, `onCreated: () => void` (no `events` prop — write-offs are never event-linked, per the locked PRD's §5).

Fields:
- Item `<select>` (required).
- Quantity number input (required, `min=1`).
- Date input (default today).
- Reason `<select>` with exactly three options plus a disabled placeholder: `expired` / `damaged` / `lost` (the literal enum from `firestore.rules`' `request.resource.data.reason in ['expired', 'damaged', 'lost']` — do not add a fourth option or free text).

Submit button **disabled while no reason is selected** (AC6's UI half — "Submitting a write-off without selecting a reason... is blocked by the UI"), in addition to the existing no-item/quantity<=0 checks. On submit calls `writeOffStock({ itemId, quantity, date, createdBy: user.uid, reason })`; `inventoryService.ts`'s existing `writeOffStock` already throws before opening any transaction if `reason` is falsy (Phase 1), so this is a second, UI-level belt to the service layer's existing suspenders, exactly as the spec's AC6 wording requires both. On error, render the thrown message the same way as the other two forms.

### 3. Wire both forms into `src/app/(authenticated)/inventory/page.tsx`
Add `issueFormOpen`/`writeOffFormOpen` state and matching `openIssueForm(itemId?)`/`openWriteOffForm(itemId?)` helpers, mirroring the existing `receiptFormOpen`/`openReceiptForm` pair exactly.

Add an "Issue Stock" button next to the existing per-item "Add Receipt" button (same `variant="outline"` button, visible to every role the page already allows — issuing is logging-tier, per `canAccessInventory()`, no extra gate needed).

Add a "Write Off" button next to it, **visible only when `canAdminInventory()` is true** — read `canAdminInventory` from `useRole()` (already exported since Phase 1's `useRole.ts` change) and wrap the button in `{canAdminInventory() && ( ... )}`, the same inline-conditional pattern `AppSidebar.tsx` already uses for `canAccessInventory()`. This is the UI half of AC11/AC12 for write-off: a non-admin never even sees the control, and if one were somehow invoked anyway, `firestore.rules`' `isInventoryAdmin()` check on `inventoryMovements` create (Phase 1) still rejects it at the data layer.

Fetch `events` for the `IssueForm` via `useEvents(currentSessionId)` (`currentSessionId` from `useCurrentSession()`, both hooks already existing and unchanged) at the page level, passed down as a prop — do not fetch events inside `IssueForm` itself, keeping data-fetching at the page level exactly as `page.tsx` already does for `items`.

**Commit Part A's work** (`IssueForm.tsx`, `WriteOffForm.tsx`, `page.tsx` wiring) before handing off.

## Part B (second agent)

### 1. `src/services/inventoryService.finance-separation.test.ts` — AC13 check
A Vitest test, importing nothing from `firebase/*` (so it needs no emulator or mock setup, consistent with this module's existing test philosophy). Reads the **source text** of `src/services/inventoryService.ts` via Node's `fs.readFileSync(require.resolve('./inventoryService.ts'), 'utf-8')` (or, if simpler and the project's `tsconfig`/`vitest.config.ts` module resolution makes a relative `fs.readFileSync(new URL('./inventoryService.ts', import.meta.url))` more reliable — pick whichever actually runs under the existing `vitest.config.ts`; do not add new vitest config for this one file) and asserts, with plain string/regex checks:
- The source never contains the substring `'invoices'` (no `collection(db, 'invoices')`, no reference to the `invoices` collection at all).
- The source never contains the substring `amountSpent`.
- The source never calls `updateDoc`/`setDoc` against an `'events'` collection reference (a regex like `/collection\(db,\s*['"]events['"]\)/` must not match).

This is a deliberately blunt, static check — not a Firestore-emulator integration test — because this codebase has no emulator harness and Phase 1 established that Vitest here is for pure/static checks only; it is "good enough" evidence for AC13's actual requirement ("does not modify `events.amountSpent` or create/update any document in the `invoices` collection") precisely because `inventoryService.ts` is the *only* place inventory movements are written, so if that one file never names those collections/fields, no code path through the inventory module can touch them. Add a one-line comment above the test (the only comment this spec asks for in this phase) stating that this is intentionally a static source check and not a Firestore-emulator integration test, so a future reader doesn't mistake its scope.

### 2. `docs/data-model.md` — Inventory Collections section touch-up
Append one short paragraph (do not restructure or remove anything written in Phase 1) under the existing `inventoryMovements` block, noting that `issueStock`/`writeOffStock` are now reachable from the `/inventory` UI via `IssueForm`/`WriteOffForm`, that `recipientGroup`/`headcount` on an issue movement are optional and only meaningfully populated when an event is linked, and restating (for the coursework write-up's defensibility) that `src/services/inventoryService.ts` never references `events.amountSpent` or `invoices/*`, backed by `inventoryService.finance-separation.test.ts`.

### 3. Verify, in the foreground, before committing
Run `npm test` (all of Phase 1's 25 tests plus the new finance-separation test must pass), `npx tsc --noEmit`, and `npx eslint` on every file this phase touched or added. Manually open `/inventory` (or at minimum read through `IssueForm.tsx`/`WriteOffForm.tsx`/`page.tsx` against the acceptance criteria below line by line) since there is still no Firebase emulator in this environment to drive an end-to-end check.

**Commit Part B's work** (`inventoryService.finance-separation.test.ts`, `docs/data-model.md` touch-up).

## Acceptance-criteria mapping
| AC | Satisfied by | Concrete check |
|---|---|---|
| 5 | Part A, `IssueForm.tsx`'s event-keyed `useEffect` pre-filling `headcount` | Select an event with attendees in the UI; headcount field populates to `attendees.length` and remains editable before submit |
| 6 | Part A, `WriteOffForm.tsx`'s submit-disabled-without-reason + Part A (Phase 1) `firestore.rules`' `reason in [...]` check | Attempt to submit the write-off modal with no reason selected: submit button is disabled; `firestore.rules` independently rejects a crafted write lacking a valid `reason` |
| 11 (UI half, write-off) | Part A, `page.tsx`'s `canAdminInventory()`-gated "Write Off" button | A non-admin logged-in user does not see the "Write Off" button at all on `/inventory` |
| 13 | Part B, `inventoryService.finance-separation.test.ts` | `npm test` passes the static source check that `inventoryService.ts` never names `invoices` or `amountSpent` |

(AC1-4, 14 were satisfied in Phase 1. AC7, 8, 9 are satisfied in Phase 3. AC10 and the remaining, admin-valuation-view half of AC11/12 are satisfied in Phase 4, per the phase plan in `context.md`.)

## Documentation sources
- [Get started with Cloud Firestore](https://firebase.google.com/docs/firestore/quickstart)
- [Transactions and batched writes | Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Security Rules language](https://firebase.google.com/docs/rules/rules-language)
- [Vitest — API Reference](https://vitest.dev/api/)
- [Vitest — Getting Started Guide](https://vitest.dev/guide/)
- [React — useEffect Reference](https://react.dev/reference/react/useEffect)
- [TypeScript tsconfig Reference](https://www.typescriptlang.org/tsconfig)

## Out of scope for this phase
- AI stock counting (photo upload, Claude vision API route, confidence/low-confidence/oversized-image/API-failure handling), Firebase Storage photo attachments (Phase 3).
- Stock-take screen, physical-count-vs-system-quantity variance, adjustment movement UI (Phase 3).
- Date-range summary report, CSV export, admin-only stock valuation view (Phase 4).
- Any production deployment, NRV/write-down mechanics, journal-entry display, weighted-average costing, PDF export, multi-warehouse, barcode hardware, supplier/PO workflow, tax/VAT, multi-currency (all explicitly out of scope per the locked PRD, all phases).
- A Firestore-emulator-backed integration test for AC13 — not introduced in this phase (no emulator harness exists in this repo yet, and adding one is a scope increase the PRD does not ask for); the static source check in Part B is accepted as sufficient evidence given `inventoryService.ts` is the sole write path for inventory movements.

## Spec assumptions

Gaps found while writing this spec were resolved as follows (nobody was asked):

- The event selector for `IssueForm` reuses `useEvents(currentSessionId)` (current-session events only), matching how `InvoiceForm` already scopes its own event dropdown — an issue being optionally linked to "an existing event" is read as an event from the society's current operating session, not an arbitrary historical one, consistent with `events` itself being session-scoped while `inventoryItems`/`inventoryLayers`/`inventoryMovements` are not (the movement's `eventId` simply stores whichever event was picked; nothing about the movement itself needs to be session-scoped for this to work).
- `recipientGroup` defaults to `'everyone'` when no event is linked (rather than being left `undefined`/disabled), since the locked PRD's AC5 only constrains pre-fill behaviour when an event is linked, and `inventoryService.ts`'s existing `IssueStockOpts.recipientGroup` is already optional — a default avoids inventing a third UI state ("recipient group: n/a") that nothing in the PRD asks for.
- AC13's "check" is implemented as a static source-text test rather than a Firestore-emulator integration test, because (a) this repo has no emulator harness today, (b) the locked PRD's own constraints list scopes automated-test effort to the FIFO engine ("Unit tests for the FIFO engine..."), and (c) `inventoryService.ts` being the only read/write surface for inventory movements makes a static "this file never names `invoices`/`amountSpent`" check a sound proxy for the behavioural claim, not a weaker stand-in for it.
- The "Write Off" button's admin-only visibility is implemented as an inline `canAdminInventory()` conditional inside the existing, five-role `RoleGuard`-wrapped `/inventory` page, not a second nested `RoleGuard` or a separate `/inventory/writeoff` route — this matches `AppSidebar.tsx`'s existing pattern of inline-filtering a shared list by capability function, and avoids introducing a second page-level access-control mechanism alongside `RoleGuard` for what is, at the data layer, already fully enforced by Phase 1's `firestore.rules`.
- No new modal-dismissal/reset-on-close logic is specified beyond what `ItemForm.tsx`/`ReceiptForm.tsx` already established in Phase 1 (clear local state, clear error, call `onClose`) — `IssueForm`/`WriteOffForm` follow the identical `resetAndClose` shape, not a new pattern.
