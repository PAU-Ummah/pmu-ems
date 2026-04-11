# PMU EMS Role & Workflow Guide (v3.1.0)

This document describes **who can do what** in the PMU Event Management System and the **day‑to‑day workflow** for each role. It matches the behavior enforced in the app (sidebar, dashboard, and page-level checks) as of this version.

The system supports **five roles** (stored as `User.role`):

| Display name | Value |
| --- | --- |
| Event Organizer | `event-organizer` |
| IT | `it` |
| Finance Manager | `finance-manager` |
| Admin | `admin` |
| Registrar | `registrar` |

**Everyone**

- Signs in on the login page and lands on the **dashboard** (`/`).
- Sees a **No academic session configured** banner when no session is active; event and people data depend on an admin completing **Settings → Session management** (admin-only card).
- Can open **Settings** for account and security; only **Admin** sees **Session management** there.

---

## Quick reference: navigation and access

| Area | Who can use it (typical) |
| --- | --- |
| **Sidebar → Events** | Event Organizer only |
| **Sidebar → People** | IT, Admin |
| **Sidebar → User Management** | IT only |
| **Sidebar → Finance** (`/finance`) | Finance Manager only |
| **Sidebar → Finance Reports** (`/finance-reports`) | Finance Manager, Admin |
| **Sidebar → Event Reports** (`/event-reports`) | Admin only |
| **Sidebar → Session Reports** (`/session-reports`) | Admin only |
| **Sidebar → Attendance** | Registrar only |

**Note:** The **Events** list page (`/events`) is not wrapped in a full-page role gate. **Create / edit / end / delete** actions are restricted to **Event Organizer**. Other signed-in users could open `/events` by URL and see the list in read-only form (no organizer actions). The sidebar hides **Events** for non-organizers.

---

## Dashboard (`/`)

Metrics and **Quick Actions** depend on role.

**Metrics**

- **Event Organizer:** Total Events, Upcoming Events, Active Events.
- **IT:** Total People.
- **Finance Manager:** Total Invoices, Total Spent (₦).
- **Registrar:** Total Attendees (across events).
- **Admin:** All of the above (events, people, finance, attendance).

**Quick Actions**

- **Event Organizer:** Manage Events → `/events`.
- **IT:** Manage People → `/people`; User Management → `/user-management`.
- **Finance Manager:** Manage Finance → `/finance`; View Finance Reports → `/finance-reports`.
- **Admin:** Manage People → `/people`; View Finance Reports → `/finance-reports`; View Reports → `/event-reports`; View Session Reports → `/session-reports`.  
  (No **Manage Finance** link to `/finance` — that page is Finance Manager only; no **User Management**; no **Manage Events**.)
- **Registrar:** Mark Attendance → `/attendance`.

**Extra sections (dashboard)**

- **Upcoming Events** and **Recent Events** (links to event details): Event Organizer and Admin.
- **Finance Overview** (summary + button to Finance Reports): Finance Manager and Admin.

---

## Event Organizer (`event-organizer`)

**Primary responsibility:** Create and run events for the **current academic session**, including optional **external attendee groups** (named groups with headcounts, separate from individual attendees).

**Permissions**

- Create events (session must be configured).
- Edit events **while not ended**.
- End events and **delete** events (from the events list).
- View events and attendee information for the session.
- **Cannot** mark attendance (Registrar role).
- **Cannot** manage invoices (`/finance` is Finance Manager only).

**Main pages**

- **Dashboard** — event metrics; Quick Action **Manage Events**.
- **Events** (`/events`) — create; edit active events; end or delete; open **View** for detail. You can add **external attendee groups** when creating/editing (e.g. guests or external bodies with a label and count).
- **Event details** (`/events/[id]`) — full info and attendee list; **End Event** while active.

**Typical workflow**

1. Log in and confirm **Event Organizer** on the dashboard.
2. Open **Manage Events** or **Events** in the sidebar.
3. **Create Event:** name, date, start time; add external groups if needed; save.
4. Before or during the event, adjust details while the event is still active.
5. Registrars mark attendance on **Attendance**; you monitor counts on the list or detail page.
6. After the event, open the event and **End Event** (or use **End** on the list).
7. For spending, Finance Manager maintains invoices; you see totals via reports where your role has access (organizer-focused views on the dashboard; broader reporting is mainly Admin / Finance).

---

## IT (`it`)

**Primary responsibility:** Maintain the **people** database and **application users**.

**Permissions**

- **People:** Add, edit, delete people (same CRUD as Admin on this page).
- **People — Excel:** Bulk **upload / update** via Excel is **IT only** (Admin does not see this upload flow).
- **User Management:** Register users, assign roles, update roles, delete users (with safeguards). Sidebar and dashboard Quick Action point here for IT only.

**Main pages**

- **Dashboard** — Total People; Quick Actions **Manage People**, **User Management**.
- **People** — filters (year, department, living); Excel import with duplicate handling; single-record CRUD.
- **User Management** — register new users (email, temporary password, display name, role); password reset email sent on registration.

**Typical workflow — people**

1. Log in as **IT**; open **People**.
2. Add individuals with **Add Person** or use **Upload Excel** for bulk work.
3. Filter the list to verify data.

**Typical workflow — users**

1. Open **User Management** → **Register New User**.
2. Fill email, password, display name, and **role**.
3. Submit; the user receives a password reset email to set their own password.

---

## Finance Manager (`finance-manager`)

**Primary responsibility:** Invoices and event spending for the session.

**Permissions**

- Full access to **Finance** (`/finance`): create, edit, delete invoices; line items; **payment receipt URL** on invoices.
- Totals update **amount spent** on linked events.
- **Finance Reports** (`/finance-reports`): summaries, per-event breakdown, PDF/CSV where provided, receipt links in detail views.

**Main pages**

- **Dashboard** — invoice and spent metrics; Quick Actions **Manage Finance**, **View Finance Reports**.
- **Finance** — session-scoped invoice work (events in the current session).
- **Finance Reports** — analytics and exports.

**Typical workflow**

1. Log in as **Finance Manager**.
2. Open **Finance** → **Add Invoice**, pick the event, add lines and receipt URL, save.
3. Use **Finance Reports** for cross-event review and exports.

---

## Admin (`admin`)

**Primary responsibility:** Oversight, **reporting**, **academic session** lifecycle, and **people** data entry (without Excel bulk import).

**Permissions**

- **People:** Add, edit, delete — same as IT **except** **no Excel bulk upload** (IT only).
- **Reports:** **Event Reports** (`/event-reports`) and **Session Reports** (`/session-reports`) — admin only.
- **Finance Reports** (`/finance-reports`): read-only analytics and exports (same page as Finance Manager for viewing; **not** invoice editing).
- **Session management:** **Settings** → **Session management** (initialize first session, rollover to a new session). Card is **admin-only**; other roles do not see it.
- **Dashboard:** Sees **all** metric cards (events, people, finance, attendance) and **Finance Overview** linking to Finance Reports.
- **Does not** (by design and UI):
  - Create/edit/end/delete events (Event Organizer only for mutations; sidebar does not show Events for Admin).
  - Create/edit invoices — use **`/finance`** only as **Finance Manager**; Admin uses **Finance Reports** for visibility.
  - Mark attendance (Registrar only).
  - Register or manage users — **User Management** is **IT** only (`canManageUsers`); Admin has no sidebar link and no Quick Action.

**Main pages**

- **Dashboard** — cross-domain metrics; Quick Actions: People, Finance Reports, Event Reports, Session Reports.
- **People** — CRUD without Excel upload.
- **Event Reports** / **Session Reports** — per-event and per-session analytics; session PDF export where available.
- **Finance Reports** — financial overview.
- **Settings** — **Session management** for session init and rollover.

**Typical workflow — reporting**

1. Log in as **Admin**.
2. Use **Event Reports** or **Session Reports** for operational and archival review.
3. Open **Finance Reports** to validate spending and invoices at a glance.

**Typical workflow — session**

1. **Settings** → **Session management**.
2. If needed, run **Initialize session** with a session name (assigns existing people/events as applicable).
3. At year end, run **End session & start new** with the new session name; then coordinate with IT for new YR1 data (Excel on **People**).

---

## Registrar (`registrar`)

**Primary responsibility:** Mark attendance during live events.

**Permissions**

- **Attendance** page only (sidebar); list shows events that are **starting within about one hour**, or **already started and not ended**.
- Open the attendance dialog for an event: search people by name or department; toggle attendance.
- Multiple registrars can work on the same event; updates are coordinated in the backend.

**Main pages**

- **Dashboard** — Total Attendees; Quick Action **Mark Attendance**.
- **Attendance** — event list + dialog per event.

**Typical workflow**

1. Log in as **Registrar**; open **Attendance**.
2. Choose the relevant event → **Mark Attendance**.
3. Search or scroll; toggle each person as they arrive.
4. When the Event Organizer **ends** the event, it drops out of the active attendance list.

---

## Appendix: RBAC (technical)

Authorization is enforced through:

- **`useRole()`** (`src/hooks/useRole.ts`) — helpers such as `hasRole`, `canCreateEvents`, `canManagePeople` (IT + Admin), `canManageFinance` (Finance Manager), `canViewReports` (Admin), `canManageUsers` / `canRegisterUsers` (IT), `canMarkAttendance` (Registrar).
- **`RoleGuard`** — wraps pages or sections with `allowedRoles` (e.g. Finance page `finance-manager`; Finance Reports `admin` + `finance-manager`; Attendance `registrar`; Event/Session reports `admin`).
- **Sidebar** (`src/layout/AppSidebar.tsx`) — menu items filtered with the same helpers so users only see what they can access.

**`getRolePermissions` in `src/utils/userManagement.ts`** is a coarse legacy map; **prefer `useRole()`** for accurate behavior (e.g. Admin can manage people in the UI though the old map may not list `canManagePeople` for admin).

**Registrar concurrency:** Attendance uses safe Firestore array updates so multiple registrars can update different attendees without lost updates.

---

*Document version 3.1.0 — aligned with dashboard, sidebar, and page guards in the PMU EMS codebase.*
