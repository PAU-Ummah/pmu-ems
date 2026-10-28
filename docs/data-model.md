## Data Model (Firestore)

This document summarizes the main Firestore collections and how they are used in PMU EMS.

> Note: Types below are conceptual; see `src/services/types.ts` for exact definitions.

### `users` Collection

Stores application users and their roles.

```ts
User {
  id: string;         // Firestore document ID = Firebase uid
  email: string;
  role:
    | 'event-organizer'
    | 'it'
    | 'finance-manager'
    | 'admin'
    | 'registrar';
  displayName?: string;
}
```

- Loaded in `AuthContext` on login.
- Drives RBAC via `useRole` and `RoleGuard`.
- Created or updated from:
  - Registration API (`src/app/api/register-user/route.ts`).
  - IT UI (`user-management`).

### `people` Collection

Represents individuals (students/members) used for attendance and reporting.

Key fields (simplified):

```ts
Person {
  id: string;
  firstName: string;
  middleName?: string;
  surname: string;
  department: string;
  gender: string;
  living?: 'On Campus' | 'Off Campus';
  academicSessionId: string;
  year: number;       // normalized from class (e.g. YR1–YR5)
  status: 'active' | 'graduated' | ...;
}
```

- Assigned to an academic session via:
  - Initial migration.
  - Session rollover.
  - Direct creation in `People` page.
- Imported/updated from Excel in `People` via:
  - `xlsx` parsing and duplicate detection (by firstName + surname).

### `events` Collection

Core event entity, with attendance embedded as a list of person IDs.

```ts
Event {
  id: string;
  name: string;
  date: string;             // 'YYYY-MM-DD'
  startTime?: string;       // ISO datetime
  endTime?: string;         // ISO datetime
  isEnded?: boolean;
  attendees: string[];      // person IDs from `people`
  amountSpent?: number;     // aggregate of invoices
  academicSessionId: string;
}
```

- Created/edited/ended by Event Organizers on the `Events` page.
- Attendance:
  - Maintained via `Attendance` page.
  - Uses `arrayUnion`/`arrayRemove` for concurrent updates.
- Finance:
  - `amountSpent` updated when invoices are created/edited/deleted.

### `invoices` Collection

Represents financial records attached to events.

```ts
InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

Invoice {
  id: string;
  eventId: string;          // FK to Event.id
  items: InvoiceItem[];
  totalAmount: number;
  date: string;             // 'YYYY-MM-DD'
  /** Required HTTP(S) URL to the invoice/payment receipt. */
  attachmentUrl: string;
  invoiceNumber?: string;
  vendor?: string;
  notes?: string;
  createdBy: string;        // uid of creator
}
```

- Managed from `Finance` page (Finance Manager).
- Used in:
  - Event‐level finance (`amountSpent` on events).
  - `Finance Report` (per‑event totals, counts, exports, and per‑invoice receipt links).
  - `Session Reports` (per‑session totals and invoice receipt links).

### Academic Sessions

Sessions are used to scope people, events, invoices, and reporting.

Conceptual shape:

```ts
AcademicSession {
  id: string;
  name: string;        // e.g. '2024/2025'
  isActive: boolean;
  createdAt: string;
}
```

- Current session:
  - Exposed via `useCurrentSession` (`currentSessionId`, `currentSession`).
  - Used by `useEvents` and `usePeople` to filter data.
- All sessions:
  - Exposed via `useAllSessions` for `Session Reports`.

Session lifecycle logic is implemented in:

- `runInitialSessionMigration` – assign existing people/events to the first session.
- `runSessionRollover` – graduate final‑year people, promote others, create the next session.

### Inventory Collections

Tracks refreshment stock (biscuits, drinks, snacks, supplies) bought or donated for weekend programs, costed on a FIFO basis for the society's IAS 2 coursework. Inventory is **not** scoped by `academicSessionId` — it persists continuously across sessions, unlike `people`/`events`/`invoices`, since physical stock carries over regardless of session boundaries. The inventory module never writes to `events.amountSpent` or `invoices/*`.

```ts
InventoryItem {
  id: string;
  name: string;
  unitOfMeasure: string;   // e.g. 'pack', 'piece', 'box'
  createdAt: string;       // ISO datetime
  createdBy: string;       // uid of creator
}
```

```ts
InventoryLayerDoc {
  id: string;
  itemId: string;                       // FK to InventoryItem.id
  sourceType: 'purchased' | 'donated';
  receivedDate: string;                  // 'YYYY-MM-DD'
  quantityReceived: number;
  remainingQty: number;                  // invariant: 0 <= remainingQty <= quantityReceived
  unitCost: number;                      // may be 0 for donated stock
  expiryDate?: string;                    // 'YYYY-MM-DD', optional, informational only
  createdAt: string;                      // ISO datetime; FIFO tie-break for equal receivedDate
  createdBy: string;
}
```

Each stock-in receipt creates one cost layer (a "batch"). Layers are consumed oldest-`receivedDate`-first; when two layers share the same `receivedDate`, the one with the earlier `createdAt` is consumed first. This FIFO ordering and the consumption math live entirely in the pure, import-free engine at `src/lib/inventory/fifo.ts`.

Donated layers may carry `unitCost: 0`. IAS 2 itself only prescribes FIFO or weighted-average costing and is silent on donated/zero-cost inventory, so donated layers here are valued at their estimated fair value (possibly zero) by analogy to the IPSAS 12 / nonprofit-GAAP convention, and are otherwise consumed in the same chronological FIFO order as purchased layers — a judgment call worth stating explicitly in the coursework write-up.

```ts
InventoryMovement {
  id: string;
  itemId: string;
  type: 'issue' | 'writeoff' | 'adjustment';
  date: string;                 // 'YYYY-MM-DD'
  quantity: number;
  costOfGoods: number;          // sum of qtyConsumed * unitCost across consumed layers
  layerConsumption: { layerId: string; qtyConsumed: number; unitCost: number }[];
  // issue-only:
  eventId?: string;
  recipientGroup?: 'everyone' | 'participants';
  headcount?: number;
  // writeoff-only, required:
  reason?: 'expired' | 'damaged' | 'lost';
  createdAt: string;
  createdBy: string;
}
```

`inventoryMovements` is a single flat collection discriminated by `type`, immutable once written (`allow update, delete: if false` in `firestore.rules`), always created in the same Firestore transaction that decrements the consumed layers' `remainingQty`. A write-off requires a `reason` and the `admin` role; an adjustment requires the `admin` role; issues are open to the logging tier (`event-organizer`, `it`, `finance-manager`, `admin`, `registrar`).

As of Phase 2, `issueStock`/`writeOffStock` are reachable from the `/inventory` UI via the `IssueForm`/`WriteOffForm` modals; the "Write Off" action is only shown to `admin` in the UI, on top of the `firestore.rules` enforcement described above. `recipientGroup`/`headcount` on an issue movement are optional and only meaningfully populated when the issue is linked to an event (the headcount is pre-filled from that event's attendance but remains editable before saving). `src/services/inventoryService.ts` never references `events.amountSpent` or `invoices/*`, keeping the inventory module architecturally separate from finance; this is backed by the static source check in `inventoryService.finance-separation.test.ts`.

