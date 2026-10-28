# PMU EMS — Inventory Module: Project Context

## Stack and why
This module is built entirely inside the existing PMU EMS stack — no new framework or database is introduced:
- **Next.js 15 App Router + React 19 + TypeScript**, matching `package.json` (`next@15.5.9`, `react@^19.0.0`). Route Handlers are only needed starting Phase 3 (Claude vision proxy); Phases 1-2 are plain client components + Firestore, like the rest of the app.
- **Firebase Auth + Firestore** via the existing modular client SDK (`src/services/firebase.ts`), same pattern as `events`/`invoices`/`people`: client components call `addDoc`/`getDocs`/`runTransaction` directly, secured by `firestore.rules`, not by a server API layer.
- **Tailwind + MUI**, matching every existing authenticated page.
- **Vitest** (already present in `node_modules`, version 5.0.5) for the FIFO engine's pure-function unit tests — the only place in this module (and in the current repo) where an automated test suite is required by the locked PRD.
- **TypeScript 5.x** (already pinned in `devDependencies`); no version change needed.

## Repo layout (new files this module adds)
```
src/
  services/
    inventoryTypes.ts        # shared types (Phase 1)
    inventoryService.ts      # Firestore read/write + transactions (Phase 1)
  lib/
    inventory/
      fifo.ts                # pure FIFO engine, zero imports (Phase 1)
      fifo.test.ts            # Vitest unit tests (Phase 1)
      onHand.test.ts           # Vitest unit tests for onHand.ts (Phase 1, Part B)
      onHand.ts               # pure on-hand/batch-ordering helpers for the UI (Phase 1, Part B)
  hooks/
    useRole.ts                # + canAccessInventory/canAdminInventory (Phase 1)
    useInventoryItems.ts      # list items + layers for the stock screen (Phase 1)
  app/(authenticated)/inventory/
    page.tsx                  # main stock screen (Phase 1)
    _component/
      ReceiptForm.tsx          # stock-in receipt modal (Phase 1)
      ItemForm.tsx             # quick item creation modal (Phase 1)
      IssueForm.tsx            # Phase 2
      WriteOffForm.tsx         # Phase 2
      StockTakeForm.tsx        # Phase 3
      AiCountDialog.tsx        # Phase 3
  app/api/inventory/ai-count/route.ts   # Phase 3
firestore.rules                # extended, not replaced (Phase 1 adds inventory* blocks)
vitest.config.ts               # root config (Phase 1)
docs/data-model.md             # + Inventory section (Phase 1, Part B)
```

## Conventions to follow
- Collections are flat and top-level (`inventoryItems`, `inventoryLayers`, `inventoryMovements`, later `inventoryCounts`), each carrying `itemId`, matching `events`/`invoices`/`people`.
- Dates are `'YYYY-MM-DD'` strings; `createdAt` is a full ISO datetime string. No `serverTimestamp()` (not used elsewhere in this repo).
- Firestore access is direct from client components/hooks via `src/services/firebase.ts`'s `db`, guarded by `firestore.rules` — not routed through a Next.js API route, except the Claude vision call (Phase 3), which is the one case the locked PRD requires to be server-side.
- Role checks reuse `useRole`/`RoleGuard` exactly as used by every other page (`src/components/auth/RoleGuard.tsx`), never a new RBAC mechanism.
- Inventory data is **not** scoped by `academicSessionId` and is never filtered by `useCurrentSession` — it persists across sessions, unlike `people`/`events`/`invoices`.
- The inventory module imports nothing from the finance module and vice versa; it never writes to `events.amountSpent` or `invoices/*`.
- `src/lib/inventory/fifo.ts` must never import `firebase/firestore`, `fetch`, or any network/IO module — it is exercised only by Vitest.

## Constraints (from the locked PRD)
- Next.js 15 App Router / React 19 / TypeScript / Tailwind + MUI only.
- Firebase Auth + Firestore, consistent with existing RBAC (`RoleGuard`/`useRole`).
- `firestore.rules` is extended additively, never replaced.
- The Claude (Anthropic) vision API is called only server-side from a Next.js Route Handler, key in an env var, never exposed client-side (Phase 3).
- `vitest` must be a `package.json` devDependency; `npm install` and `npm test` run in the foreground, never backgrounded.
- No production deployment as part of this work.
- Inventory stays architecturally separate from finance: no shared totals, no invoice creation from inventory code.

## Glossary
- **Cost layer / batch**: one stock-in receipt's quantity+cost+date, tracked until fully consumed.
- **FIFO consumption**: issuing/writing off stock always drains the oldest layer(s) first.
- **Movement**: an audit-trail document recording a change in stock (issue, write-off, or adjustment), always alongside layer quantity updates, in one transaction.
- **Logging tier**: any of the five existing roles (`event-organizer`, `it`, `finance-manager`, `admin`, `registrar`) — can create receipts, issues, and counts.
- **Admin tier**: the existing `admin` role — can additionally write off, adjust, and view valuation.
- **On-hand**: sum of `remainingQty` across an item's layers.

## Research digest
Firestore's client SDK enforces that transaction reads happen before writes and will retry the whole callback on contention, which is the mechanism this module relies on to guarantee an over-issue is rejected with zero documents written; because the client SDK's `transaction.get()` only takes document references (not queries), layer ordering must be queried once outside the transaction and then re-validated by reference inside it. IAS 2 permits only FIFO or weighted-average costing and is silent on donated/zero-cost inventory, so this module borrows the IPSAS 12 / nonprofit-GAAP convention of valuing donated layers at fair value (possibly zero) and consuming them in the same chronological order as purchased layers — a judgment call worth stating explicitly for the coursework write-up. Vitest 5.0.5 (already installed) needs no DOM environment for pure-function tests and uses `test.each` for table-driven FIFO edge cases. Firestore Security Rules read role data via a `get()` lookup against the caller's own `users/{uid}` document — the same pattern this app's data model already implies by storing `role` on `users` — and rules evaluate `create`/`update` separately per collection, which is how write-off/adjustment can be restricted to `admin` while issues stay open to the whole logging tier. The Claude Messages API treats vision as just another content block and documents its own object-counting as approximate, which is exactly why the PRD requires a human confirm/edit step before anything is written.

## Phase plan
- **Phase 1 — Data model, FIFO engine, rules, minimal stock screen.** Pure FIFO engine with PRD-mandated unit tests; `inventoryItems`/`inventoryLayers`/`inventoryMovements` types and Firestore service layer with transactional issue/write-off consumption; `firestore.rules` extended with logger/admin split; minimal `/inventory` screen showing on-hand + batches oldest-first, plus item/receipt creation. Satisfies AC1, AC2, AC3, AC4, AC14 (and lays the rules groundwork for AC6/AC11/AC12/AC13).
- **Phase 2 — Issue & write-off UI, RBAC-in-UI, finance separation check.** Issue form linked to an optional event with headcount pre-filled from attendance; write-off form requiring a reason, admin-only in UI; sidebar nav; integration test/manual check confirming `events.amountSpent`/`invoices` are untouched. Satisfies AC5, AC6, AC13 (and the UI half of AC11 for write-off).
- **Phase 3 — AI-assisted counting and stock-take.** `app/api/inventory/ai-count/route.ts` server-side Claude vision call with oversized-image and API-failure handling; confirm/edit UI before any Firestore write; Firebase Storage for count photos; stock-take screen comparing a count to system quantity, producing a variance and an adjustment movement with a required reason. Satisfies AC7, AC8, AC9.
- **Phase 4 — Reporting, valuation, final RBAC/integration pass.** Date-range stock & movement summary (opening/received/issued/written-off/closing, with cost) with a client-side CSV export matching the existing finance export pattern; admin-only valuation view; end-to-end RBAC check across all inventory screens. Satisfies AC10, AC11 (full), AC12 (full).

## Planned architecture
The module is split into three layers that mirror how `events`/`invoices` already work in this codebase, plus one new layer this feature needs that nothing else in the app currently has: a pure calculation core. `src/lib/inventory/fifo.ts` contains the entire FIFO cost-flow algorithm as import-free, side-effect-free functions operating on plain in-memory layer arrays; `src/services/inventoryService.ts` is the only place that touches Firestore, calling the pure engine from inside `runTransaction` so that "read current layers, decide consumption, write updates + a movement doc" happens atomically and an over-issue aborts the whole transaction before any write lands; and `src/app/(authenticated)/inventory/**` is ordinary client-component UI calling that service layer, gated by the existing `RoleGuard`/`useRole`. This separation is what makes AC1/AC14 ("pure functions... exercised by dedicated unit tests") straightforward: the engine never needs a Firestore emulator or mocks to be tested, and the service layer's correctness reduces to "did it call the engine with fresh data and write exactly what the engine returned," which is a thin, low-risk wrapper rather than logic that needs its own test harness.

The one deliberate deviation from the research report is not field-level hiding of `unitCost` between the logging and admin tiers. The report suggested splitting cost data into an admin-only collection so Firestore's "queries are all-or-nothing" rule couldn't leak valuation to loggers; but the PRD requires loggers to create issues with a computed `costOfGoods`, which needs `unitCost` to be readable at the moment of consumption regardless of who's issuing stock. Splitting the cost data would mean either giving loggers a narrow admin-signed read path anyway (defeating the hiding) or moving cost computation server-side (a scope increase the PRD doesn't ask for). Instead, "admin can view valuation, logger cannot" is enforced the same way every other role distinction in this app already is — a `RoleGuard`-gated valuation page/report plus a `firestore.rules` restriction on who may *create* `writeoff`/`adjustment` movements — which is simpler, consistent with the rest of the codebase, and matches the PRD's own phrasing ("admin tier... additionally... view stock valuation") more literally than a field-hiding scheme would.

## Architecture decision

An independent reviewer proposed: Server-authoritative mutations (Admin SDK); Event-sourced movement ledger.

**Chosen:** the planned architecture

**Why:** AC6 and AC11 literally say logging-tier denial must happen "by firestore.rules" — Alternative 1's Admin SDK write path bypasses rules entirely for mutations, so adopting it would require re-deriving those same role/reason checks in route-handler code while rules became decorative, contradicting the ACs' own wording rather than just adding plumbing. The reviewer's own cons list confirms this: rules work is "not avoided, only reduced," so Alt 1 buys server-side trust at the cost of auth-token verification, service-account provisioning, and an API route per mutation — overhead the PRD never asks for (it scopes server-side routing to the Claude vision call only) and inconsistent with how `events`/`invoices` are already written client-side + rules-gated in this repo. Alternative 2's audit-trail win is largely already present in the planned design — `inventoryMovements` is immutable (`allow update, delete: if false`) and carries full `layerConsumption` detail — so event-sourcing's main benefit is mostly redundant here, while its cost (on-hand becomes a read-time replay, over-issue checks still need a consistent current-state read per the reviewer's own note, more conceptual distance from the repo's CRUD pattern) is real and unjustified against a PRD explicitly scoped "narrow" and asking to "keep the product simple." Neither alternative clears the bar of being clearly better for this project; the planned pure-core/service/UI split stays.
