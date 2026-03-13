## Features

This document breaks the app down by feature area and explains how each is implemented.

---

## Dashboard

- File: `src/app/(authenticated)/page.tsx`
- Responsibilities:
  - Greet the logged‑in user and show their display name and role.
  - Show metrics based on role:
    - Events: total, upcoming, active.
    - People: total people.
    - Finance: total invoices, total spent.
    - Attendance: total attendees across events.
  - Show upcoming and recent events for organizers/admin.
  - Show finance overview for finance‑related roles.
  - Provide **Quick Actions** that deep‑link to core pages, filtered by role using `hasRole`.

Dependencies:

- `useAuth` – user profile and display name.
- `useRole` – current role and permissions.
- `useCurrentSession` – active session.
- `useEvents`, `usePeople` – session‑scoped data.
- Firestore `invoices` collection for finance metrics.

---

## Events

- Pages:
  - `src/app/(authenticated)/events/page.tsx`.
  - `src/app/(authenticated)/events/[id]/page.tsx`.
- Roles:
  - `event-organizer` (write).
  - Other roles have read‑only access only via reports or dashboard.

Key behaviours:

- **Events list & CRUD**:
  - Lists events for the current session (`useEvents(currentSessionId)`).
  - `Create Event`:
    - Controlled by `RoleGuard allowedRoles={['event-organizer']}`.
    - Persists to `events` with `academicSessionId`.
  - `Edit` & `Delete`:
    - Only available while `isEnded` is false.
  - `End Event`:
    - Sets `endTime` and `isEnded = true`.
    - Used both from list and detail pages.

- **Event details (`[id]`)**:
  - Loads a single event by id from Firestore.
  - Shows date, start/end time, status badge, and total attendees.
  - Lists attendees joined with `people` to show department/year.
  - `End Event` button guarded by `RoleGuard` for `event-organizer`.

---

## People

- Page: `src/app/(authenticated)/people/page.tsx`.
- Roles: `it`, `admin`.

Key behaviours:

- **Listing & filtering**:
  - Uses `usePeople(currentSessionId)` to fetch people.
  - Filters by:
    - Year (normalized `year` field).
    - Department.
    - Living (On/Off Campus).

- **CRUD**:
  - Add/Edit/Delete operations controlled by `canAddEditDelete` (IT or Admin).
  - Firestore:
    - `addDoc` for new people.
    - `updateDoc` for edits.
    - `deleteDoc` for deletes.
  - Ensures `academicSessionId` is set for new people.

- **Excel import**:
  - Uses `xlsx` to parse first sheet into JSON.
  - For each row:
    - Normalizes `living` and `year` (from `CLASS`).
    - Checks for duplicates using Firestore `where` on `firstName` and `surname`.
    - Updates existing docs or inserts new docs accordingly.
  - Shows a modal progress indicator while processing.

---

## Attendance

- Page: `src/app/(authenticated)/attendance/page.tsx`.
- Roles: `registrar`.

Key behaviours:

- **Event filtering**:
  - Uses `useEvents(currentSessionId)` to get events for the session.
  - Filters events whose:
    - `startTime` is within the next hour, or
    - `startTime` is already in the past, and `isEnded` is false.

- **Attendance dialog**:
  - When opening an event:
    - `currentEvent` state is set and a `onSnapshot` listener is attached to `events/{id}`.
    - Listener keeps `currentEvent` updated in real time.
  - `toggleAttendance(personId)`:
    - Reads current `attendees` from `currentEvent`.
    - Uses `arrayUnion` to add, or `arrayRemove` to remove, the person id.
    - Updates local state optimistically.
    - Handles errors with a user‑facing message.
  - People list:
    - Filterable by name and department.
    - Uses `usePeople(currentSessionId)` as the base dataset.

---

## Finance

- Page: `src/app/(authenticated)/finance/page.tsx`.
- Roles: `finance-manager`.

Key behaviours:

- **Invoices**:
  - Lists invoices linked to events in the current session.
  - `Add Invoice`:
    - Opens a form to select an event and add invoice items.
    - Computes `totalAmount` as the sum of `item.totalPrice`.
  - `Edit Invoice`:
    - Pre‑loads existing invoice into the form.
    - Recomputes `totalAmount` after edits.
  - `Delete Invoice`:
    - Removes invoice from Firestore and recomputes event spending.

- **Event spending**:
  - After saving/deleting any invoice, recomputes:
    - Sum of `totalAmount` for all invoices with the same `eventId`.
  - Updates `events/{id}.amountSpent`.

---

## Finance Report

- Page: `src/app/(authenticated)/finance-report/page.tsx`.
- Roles: `admin`, `finance-manager` (read‑only for admin).

Key behaviours:

- **Data aggregation**:
  - Loads:
    - All `events` for current session (via `useEvents`).
    - All `invoices` from Firestore.
  - Builds `EventFinanceData`:
    - `event`.
    - `invoices` attached to that event.
    - `totalSpent` (sum of `invoice.totalAmount`).
    - `itemCount` (sum of all invoice items).

- **UI & exports**:
  - Shows per‑event finance summary (status, invoice count, items, total spent).
  - Provides:
    - `View details` modal, including per‑invoice **payment receipt** links.
    - `Generate PDF` (via `generateInvoicePDF`), which includes each invoice’s receipt as a clickable **“Payment receipt”** link.
    - `Download CSV` per event.

---

## Reports (Single Event)

- Page: `src/app/(authenticated)/reports/page.tsx`.
- Roles: `admin`.

Key behaviours:

- Select an event from a dropdown list (events in current session).
- Show:
  - Total attendees for that event.
  - Amount spent (from `event.amountSpent`).
  - Attendee table joined with `people`:
    - Name, department, year.

---

## Session Reports

- Page: `src/app/(authenticated)/session-reports/page.tsx`.
- Roles: `admin`.

Key behaviours:

- **Session selection**:
  - Uses `useAllSessions` to list all academic sessions.
  - For the selected session:
    - Uses `useEvents(sessionId)` and `usePeople(sessionId, { activeOnly: false })`.
    - Loads all invoices from Firestore (global) and filters by `eventId`.

- **Event finance rows**:
  - Builds `eventFinanceRows`:
    - For each event in the session:
      - `invoices` for that event.
      - `totalSpent` and `attendeeCount`.

- **Tabs**:
  - `Overview`:
    - Uses `SessionOverviewTab` to show summary metrics and per‑event breakdown.
    - Provides **Export** button for session summary PDF (`generateSessionSummaryPDF`).
  - `Attendees by event`:
    - Uses `AttendeesByEventTab` to group attendees by event, joined with `people`.
  - `Invoices`:
    - Uses `InvoicesTab` to show invoices for events in the session.
    - Shows per‑invoice **receipt links**.
    - Includes a **session total** row at the bottom of the invoices table.
    - Provides a **“Print invoices (PDF)”** action that uses `generateSessionInvoicesPDF` to print/export all invoices (with embedded “Payment receipt” links) for the selected session.

---

## Settings

- Page: `src/app/(authenticated)/settings/page.tsx`.
- Components:
  - `AccountInformationCard` – read‑only view of email, display name, role.
  - `SecurityCard` – triggers `/api/send-email` to send a password reset email.
  - `AppInformationCard` – app metadata (version, helpful links).
  - `SessionManagementCard` – admin‑only session lifecycle controls.

Session management (`SessionManagementCard`):

- For **no current session**:
  - Allows initializing the first session with a name (e.g. `2024/2025`).
  - Calls `runInitialSessionMigration` to:
    - Create session document.
    - Assign existing people and events to that session.
- For an **active session**:
  - Allows entering the new session name (e.g. `2025/2026`).
  - Calls `runSessionRollover` to:
    - Graduate final‑year people.
    - Promote remaining people by one year.
    - Create new session and set it as current.
    - Leave instructions to upload new YR1 in `People`.

