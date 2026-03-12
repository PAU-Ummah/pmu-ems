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
  invoiceNumber?: string;
  vendor?: string;
  notes?: string;
  createdBy: string;        // uid of creator
}
```

- Managed from `Finance` page (Finance Manager).
- Used in:
  - Event‐level finance (`amountSpent` on events).
  - `Finance Report` (per‑event totals, counts, exports).
  - `Session Reports` (per‑session totals).

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

