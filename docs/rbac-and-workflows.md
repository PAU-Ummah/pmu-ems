## RBAC & User Workflows

Role‑based access control is central to PMU EMS. This document summarizes:

- Roles and what they can see/do.
- How RBAC is implemented technically.
- End‑to‑end workflows for each role.

For a narrative, non‑technical description of roles and workflows, see `ROLE_SYSTEM.md`.

---

## Roles

Supported roles (values stored in `users` collection and in `User['role']`):

- `event-organizer`
- `it`
- `finance-manager`
- `admin`
- `registrar`

### Role → Feature Matrix (High Level)

- **Event Organizer**
  - `Events` – create, edit active events, end events, view attendees.
  - `Events/[id]` – view event details and attendee list; end event.
  - Dashboard – event metrics and quick access to `Events`.

- **IT**
  - `People` – full CRUD, Excel import/update.
  - `User Management` – register users, assign roles.
  - Dashboard – people metric and quick access to people & user management.

- **Finance Manager**
  - `Finance` – full CRUD for invoices.
  - `Finance Report` – view finance analytics & exports.
  - Dashboard – invoice/amount metrics.

- **Admin**
  - `People` – same capabilities as IT.
  - `Reports` – per‑event attendance + finance.
  - `Session Reports` – per‑session reporting, export session summary PDFs.
  - `Finance Report` – read‑only.
  - `Settings` → Session management – initialize and roll over sessions.
  - Dashboard – cross‑domain metrics and quick access to reports and people.

- **Registrar**
  - `Attendance` – list of events starting within 1 hour or already started (not ended), plus attendance dialog.
  - Dashboard – total attendees metric and quick access to `Attendance`.

---

## Technical Implementation

### Auth & Role Loading

- `AuthContext`:
  - Listens to `onAuthStateChanged` from Firebase Auth.
  - On login:
    - Fetches `users/{uid}` from Firestore.
    - If the document exists, sets `userData` to that document (including `role`).
    - If missing, constructs a default `User` with role `event-organizer`.
  - Provides `userData` and `loading` to the rest of the app.

### Role Helpers (`useRole`)

Located at `src/hooks/useRole.ts`:

- `hasRole(role | role[])`:
  - Returns `true` if `userData.role` matches the given role or is in the provided array.
- Convenience methods (used throughout UI and sidebar filtering):
  - `canCreateEvents`, `canEditEvents`, `canEndEvents` → `event-organizer`.
  - `canManagePeople` → `it` or `admin`.
  - `canManageFinance` → `finance-manager`.
  - `canViewReports` → `admin`.
  - `canManageUsers`, `canRegisterUsers` → `it`.
  - `canMarkAttendance` → `registrar`.

### Component Guarding (`RoleGuard`)

`src/components/auth/RoleGuard.tsx`:

- Props: `allowedRoles: string | string[]`, `children`, optional `fallback`.
- Uses `useRole().hasRole(allowedRoles)` to decide:
  - If `true`: renders `children`.
  - If `false`: renders `fallback` or an “Access Denied” alert with required roles.

Usage patterns:

- Guard an entire page:
  - `Attendance`, `Finance`, `Reports`, `Session Reports`, `People` wrap their main content in `RoleGuard`.
- Guard specific actions:
  - `Events` page:
    - `Create Event` button and event edit/end/delete actions are wrapped with `RoleGuard` for `event-organizer`.
  - `EventDetail` page:
    - `End Event` button wrapped in `RoleGuard` for `event-organizer`.

### Navigation Control (`AppSidebar`)

- `AppSidebar` uses `useRole` to compute `navItems`:
  - `/events` → `canCreateEvents()`.
  - `/attendance` → `canMarkAttendance()`.
  - `/people` → `canManagePeople()`.
  - `/user-management` → `canManageUsers()`.
  - `/finance` → `canManageFinance()`.
  - `/finance-reports` → `canManageFinance()` or `canViewReports()`.
  - `/event-reports` and `/session-reports` → `canViewReports()`.
- Result: unauthorized users do not see menu entries to features they cannot access.

---

## Role Workflows (Technical View)

This section focuses on which routes, hooks, and Firestore collections each role primarily interacts with.

### Event Organizer

- **Core routes**
  - `/` – dashboard (metrics: total events, upcoming, active).
  - `/events` – list & CRUD for events.
  - `/events/[id]` – per‑event details and attendees.
- **Key operations**
  - Create/edit events:
    - `EventsPage` uses `useCurrentSession` and `useEvents(sessionId)`.
    - Creates and updates documents in `events` collection.
  - End events:
    - Sets `endTime` and `isEnded = true` in `events` documents.
  - Read‑only view of:
    - `attendees` array on events.
    - `amountSpent` once invoices exist.

### IT

- **Core routes**
  - `/people` – full people management.
  - `/user-management` – user registration.
- **Key operations**
  - People:
    - `usePeople(currentSessionId)` to list.
    - CRUD on `people` collection using Firestore `addDoc`, `updateDoc`, `deleteDoc`.
    - Excel upload:
      - Each row mapped to `Person`, normalized year from class.
      - Duplicate detection (firstName + surname) via Firestore `where` queries.
      - Existing docs updated; new docs created as needed.
  - Users:
    - `RegisterUserForm` collects email, password, displayName, and role.
    - API route `/api/register-user` creates Firebase Auth user and Firestore `users/{uid}` document.

### Finance Manager

- **Core routes**
  - `/finance` – invoices.
  - `/finance-reports` – finance analytics.
- **Key operations**
  - Invoices:
    - CRUD on `invoices` collection.
    - Each invoice references an `eventId`, contains a list of items, and includes a required **payment receipt link** (`attachmentUrl`).
    - `totalAmount` computed from items per invoice.
  - Event spending:
    - For each invoice create/update/delete, re‑computes sum of `totalAmount` for invoices per event.
    - Updates `events/{id}.amountSpent`.
  - Reporting:
    - `FinanceReportPage` joins `events` and `invoices` into `EventFinanceData` rows and surfaces per‑invoice receipt links in the event detail modal.
    - Session‑level reports show invoice receipt links on the **Invoices** tab.
    - Uses helpers (`generateInvoicePDF`, CSV utilities) for exports.

### Admin

- **Core routes**
  - `/people` – same people management as IT.
  - `/event-reports` – per‑event reports with attendance + finance.
  - `/session-reports` – per‑session reports.
  - `/finance-reports` – read‑only finance analytics.
  - `/settings` → session management card.
- **Key operations**
  - Uses `useEvents` and `usePeople` to produce:
    - Event attendee lists and counts.
    - Department and year breakdowns.
  - Uses `useAllSessions` and `useEvents(sessionId)` / `usePeople(sessionId)` to build session‑level reports.
  - `SessionReportsPage` builds `eventFinanceRows`:
    - Combines `events` with matching `invoices` and `attendees`.
    - Exports aggregated info via `generateSessionSummaryPDF`.
  - Session lifecycle:
    - `SessionManagementCard` calls:
      - `runInitialSessionMigration()` – create first session & assign existing data.
      - `runSessionRollover()` – graduate & promote people, create next session.

### Registrar

- **Core route**
  - `/attendance` – registrar‑only attendance marking UI.
- **Key operations**
  - `AttendancePage`:
    - Uses `useEvents(currentSessionId)` and `usePeople(currentSessionId)`.
    - Filters events:
      - Start within the next 1 hour, or
      - Already started and not ended.
    - Shows time‑until‑start badges (color coded).
  - Attendance dialog:
    - Uses a Firestore `onSnapshot` listener for the selected event.
    - Uses `updateDoc` with `arrayUnion` / `arrayRemove` to toggle person IDs in `event.attendees`.
    - Reflects updates across multiple registrars in real time.

