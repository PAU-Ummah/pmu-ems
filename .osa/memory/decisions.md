# Decisions

Choices made on this project and why. One fact per line. Written by OSA from each run's record; safe to edit by hand.

- Accepted risky assumption: The existing `admin` role is the inventory 'admin' tier; the remaining existing roles (event-organizer, it, finance-manager, registrar) all map to the inventory 'logger' tier (receipts, issues, counts) _(run 28e0db93, 2026-10-28)_
- Accepted risky assumption: Each AI count photo is assumed to show a single item type per submission (one item guess, one count), not multi-item detection within one photo _(run 28e0db93, 2026-10-28)_
- Accepted risky assumption: Inventory data (items, layers, movements) is NOT scoped per academic session and persists continuously, unlike people/events/invoices which reset per session, since physical stock carries over regardless of session boundaries _(run 28e0db93, 2026-10-28)_
- Accepted risky assumption: Count photos are stored in Firebase Storage with a reference URL on the count document, access-restricted by the same role rules as the count collection _(run 28e0db93, 2026-10-28)_
- Accepted risky assumption: When two cost layers share the same receipt date, FIFO consumption order ties are broken by insertion/creation order _(run 28e0db93, 2026-10-28)_
- Architecture: kept the planned architecture -- AC6 and AC11 literally say logging-tier denial must happen "by firestore.rules" — Alternative 1's Admin SDK write path bypasses rules entirely for mutations, so adopting it would require re-deriving those same role/reason checks... _(run 28e0db93, 2026-10-28)_
- Spec decision: `inventoryLayers` and `inventoryMovements` are flat top-level Firestore collections (not subcollections of `inventoryItems`), each carrying an `itemId` field, consistent with this codebase's existing flat-collection convention for `events`/`invoices`/`people`. _(run 28e0db93, 2026-10-28)_
- Spec decision: `inventoryMovements` is a single collection for issue/write-off/adjustment, discriminated by a `type: 'issue'|'writeoff'|'adjustment'` field, so firestore.rules can gate role and required-reason logic per type in one place. _(run 28e0db93, 2026-10-28)_
- Spec decision: `unitCost` is NOT field-level hidden from the logging tier's Firestore reads (the research report's suggestion to split cost into an admin-only collection is not adopted): logger-created issues must compute `costOfGoods` from `unitCost`, so hiding it would... _(run 28e0db93, 2026-10-28)_
- Spec decision: The client Firestore SDK's `runTransaction`/`transaction.get()` only accepts document references, not queries. FIFO-consuming mutations therefore read layer ordering via a plain (non-transactional) query first, then re-read each candidate layer by reference... _(run 28e0db93, 2026-10-28)_
- Spec decision: `src/lib/inventory/fifo.ts` is fully self-contained (defines its own types and error class, zero imports) so it can be unit-tested by Vitest with no path-alias plugin or extra config; `src/services/inventoryTypes.ts` re-exports the FIFO-related types for the... _(run 28e0db93, 2026-10-28)_
- Spec decision: Vitest stays pinned to the version already installed in `node_modules` (5.0.5, confirmed by reading `node_modules/vitest/package.json`), since the locked PRD states vitest is already present via a `--no-save` install and only needs adding to `package.json`. _(run 28e0db93, 2026-10-28)_
- Spec decision: Stock-in receipts are created with a single `addDoc` (no transaction needed, since creating one new layer document has no multi-document read dependency); only consuming movements (issue/write-off/adjustment) use `runTransaction`. _(run 28e0db93, 2026-10-28)_
- Spec decision: Dates (`receivedDate`, movement `date`) are plain `'YYYY-MM-DD'` strings produced via `new Date().toISOString().split('T')[0]`, matching the existing `events`/`invoices` convention; `createdAt` is a full ISO datetime string (`new Date().toISOString()`), used as... _(run 28e0db93, 2026-10-28)_
- Out of scope: Net realisable value (NRV) and write-down/reversal mechanics _(run 28e0db93, 2026-10-28)_
- Out of scope: Journal-entry display _(run 28e0db93, 2026-10-28)_
- Out of scope: Weighted-average costing or any weighted-average comparison _(run 28e0db93, 2026-10-28)_
- Out of scope: PDF export _(run 28e0db93, 2026-10-28)_
- Out of scope: Multi-warehouse support _(run 28e0db93, 2026-10-28)_
