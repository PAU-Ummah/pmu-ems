# PMU EMS Role & Workflow Guide (v3.0.0)

This document describes **who can do what** in the PMU Event Management System and the **day‑to‑day workflow** for each role.

The system currently supports **five roles**:

- **Event Organizer** (`event-organizer`) – owns event setup and lifecycle.
- **IT** (`it`) – manages people records and user accounts.
- **Finance Manager** (`finance-manager`) – manages invoices and event spending.
- **Admin** (`admin`) – oversees data, reports, and academic sessions.
- **Registrar** (`registrar`) – marks attendance during events.

All roles:
- Sign in via the login page.
- Land on the dashboard, which shows role‑specific metrics and **Quick Actions** that deep‑link into the main pages they use.

---

## Event Organizer (`event-organizer`)

**Primary responsibility:** Set up and manage events for the current academic session.

**Key permissions**
- Create new events in the current session.
- Edit event details **while the event is still active**.
- End events (set end time and mark as ended).
- View all events in the current session.
- View attendee lists for each event (read‑only; attendance itself is managed by registrars).

**Main pages & features**
- **Dashboard**
  - Sees **Total Events**, **Upcoming Events**, and **Active Events** metrics.
  - Quick Action: **Manage Events** → `/events`.
- **Events**
  - Create events with date and start time.
  - Edit active events.
  - End events when finished.
  - View attendee counts and basic attendee information per event.
- **Event Details**
  - For any event, view date, times, status, and full attendee list.
  - End the event from this page while it is active.

**Typical workflow**
1. **Log in** and confirm you are logged in as **Event Organizer** on the dashboard.
2. From **Quick Actions**, click **Manage Events** (or use the sidebar to open `Events`).
3. Click **Create Event**, fill in event name, date, and start time, then save.
4. Before the event, optionally update event details (e.g., time adjustments) while it is still active.
5. During the event, **registrars** mark attendance on the `Attendance` page; you can monitor attendee counts on the event list and detail views.
6. After the event finishes, open the event from the list and click **End Event** to close it.
7. When finance data is entered by the Finance Manager, you can see updated **amount spent** and attendee statistics in reports (read‑only).

---

## IT (`it`)

**Primary responsibility:** Maintain the people database and manage application users and roles.

**Key permissions**
- **People management**
  - Add new people records.
  - Edit existing people (including department, gender, year, and living status).
  - Delete people when necessary.
  - Upload Excel files to **bulk import or update** people, with duplicate detection.
- **User management**
  - Register new application users.
  - Assign roles to users at registration.
  - Trigger password‑reset emails via the registration flow.

**Main pages & features**
- **Dashboard**
  - Sees **Total People** metric.
  - Quick Actions:
    - **Manage People** → `/people`.
    - **User Management** → `/user-management`.
- **People**
  - Filter people by **year**, **department**, and **living**.
  - Add, edit, and delete people.
  - Bulk upload from Excel; system will:
    - Update existing people when matches are found.
    - Create new people when needed.
- **User Management**
  - Register new users with email, temporary password, display name, and role.
  - Shows brief descriptions of each role to help with correct assignment.

**Typical workflow – managing people**
1. **Log in** and confirm you are logged in as **IT** on the dashboard.
2. Use **Manage People** Quick Action or sidebar `People` link.
3. To add a single person, click **Add Person**, fill the required fields (name, department, gender, year, etc.), and save.
4. To update many people at once, click **Upload Excel**, select the prepared file, and wait while the import progress runs.
5. Review the filtered list (by year/department/living) to confirm records look correct.

**Typical workflow – managing users**
1. From the dashboard, open **User Management**.
2. Click **Register New User**.
3. Enter the user’s email, temporary password, and display name.
4. Select the appropriate **role** (Event Organizer, IT, Finance Manager, Admin, or Registrar).
5. Submit; a password‑reset email is automatically sent so the user can set their own password.

---

## Finance Manager (`finance-manager`)

**Primary responsibility:** Track and manage all event‑related financial transactions.

**Key permissions**
- Create new invoices linked to events.
- Add, edit, and remove invoice line items (description, quantity, unit price).
- Update and delete existing invoices.
- Automatically update each event’s **amount spent** based on invoices.
- View finance summaries for the current session.

**Main pages & features**
- **Dashboard**
  - Sees **Total Invoices** and **Total Spent** metrics.
  - Quick Actions:
    - **Manage Finance** → `/finance`.
    - **View Finance Reports** → `/finance-report`.
- **Finance**
  - Add invoices for specific events.
  - Maintain detailed line items.
  - See per‑invoice totals and vendor information.
  - Session‑filtered view: only invoices for events in the current academic session are summarized.
- **Finance Report**
  - Cross‑event summary of:
    - Total events.
    - Total spending.
    - Total invoices and items.
  - Per‑event breakdown (status, invoices, items, total spent).
  - Can **view details**, **generate PDF**, or **download CSV** for each event.

**Typical workflow**
1. **Log in** and confirm you are logged in as **Finance Manager** on the dashboard.
2. Use **Manage Finance** Quick Action or sidebar `Finance` link.
3. Click **Add Invoice**, select the event, and add line items (description, quantity, unit price).
4. Save the invoice; the system recalculates the invoice total and updates the event’s **amount spent**.
5. Repeat for all vendors/expenses related to the event.
6. To review overall spending, open **Finance Report** from the sidebar or Quick Actions.
7. On **Finance Report**, review per‑event totals and, when needed, export a **PDF** or **CSV** for external reporting.

---

## Admin (`admin`)

**Primary responsibility:** Oversee data integrity, reporting, and academic session lifecycle.

**Key permissions**
- View and manage people (same CRUD capabilities as IT on the `People` page).
- View **all reports**:
  - Event‑level reports (`Reports`).
  - Academic session reports (`Session Reports`).
  - Finance reports (`Finance Report`).
- Manage academic sessions (create initial session and roll over to new sessions).
- View aggregated dashboard metrics across events, people, finance, and attendance.
- Does **not**:
  - Create/edit/end events (Event Organizer only).
  - Create/edit invoices (Finance Manager only).
  - Mark attendance (Registrar only).
  - Register application users (IT only).

**Main pages & features**
- **Dashboard**
  - Sees metrics across multiple domains:
    - Events (Total, Upcoming, Active).
    - People (Total People).
    - Finance (Total Invoices, Total Spent).
    - Attendance (Total Attendees).
  - Quick Actions:
    - **Manage People** → `/people`.
    - **View Reports** → `/reports`.
    - **View Session Reports** → `/session-reports`.
    - **View Finance Reports** → `/finance-report`.
- **People**
  - Same filtered list and CRUD operations as IT.
- **Reports (Event Reports)**
  - Select an event and view:
    - Total attendees.
    - Amount spent on that event.
    - Per‑attendee details (department, year).
- **Session Reports**
  - Select any **academic session** (current or past).
  - Tabs:
    - **Overview** – per‑event attendee count and amount spent.
    - **Attendees by event** – breakdown of people per event.
    - **Invoices** – invoice coverage for events in the session.
  - Export a **session summary PDF** with per‑event totals (no attendee names or invoice line items).
- **Finance Report**
  - Same aggregate finance view as Finance Manager (read‑only).
- **Settings → Session management**
  - Admin‑only card.
  - Initialize the **first session**, assigning existing people and events.
  - Run **session rollover**: graduate final‑year students, promote others, and create a new active session.

**Typical workflow – reporting & oversight**
1. **Log in** and confirm you are logged in as **Admin** on the dashboard.
2. Use dashboard metrics to spot trends (e.g., number of events, total attendees, total spending).
3. Open **Reports** to investigate a single event’s attendees and spending.
4. Open **Session Reports** to review the performance of an entire academic session; export PDFs for archival or management reporting.
5. Open **Finance Report** to confirm that invoices and spending are consistent across events.

**Typical workflow – session management**
1. Open **Settings** from the user dropdown.
2. In **Session management**:
   - If no session exists, enter the initial session name and run **Initialize session**.
   - At the end of a session, enter the new session name and run **End session & start new**.
3. After rollover, coordinate with IT to upload new YR1 students for the new session.

---

## Registrar (`registrar`)

**Primary responsibility:** Mark and manage attendance during live events.

**Key permissions**
- View only events that:
  - Start within the next 1 hour, or
  - Have already started and are not yet ended.
- Open an **Attendance** dialog for an event.
- Search people by name or department.
- Toggle an individual’s attendance for the selected event.
- See real‑time updates to attendance when other registrars are working on the same event.

**Main pages & features**
- **Dashboard**
  - Sees **Total Attendees** across all events.
  - Quick Action: **Mark Attendance** → `/attendance`.
- **Attendance**
  - List of events available for attendance based on start time and status.
  - For each event:
    - See date, start time, and time until start / time since start.
    - View current attendees with counts.
  - **Attendance dialog**:
    - Full list or filtered view of people for the current session.
    - Search by name or department.
    - Toggle attendance on/off per person.
  - Uses safe concurrent updates, so multiple registrars can mark the same event without conflicts.

**Typical workflow**
1. **Log in** and confirm you are logged in as **Registrar** on the dashboard.
2. Use **Mark Attendance** Quick Action or sidebar `Attendance` link.
3. In the **Events Available for Attendance** list, pick the active/upcoming event you are responsible for.
4. Click **Mark Attendance** for that event to open the attendance dialog.
5. Search or scroll to find each attendee and toggle their status as they arrive.
6. Continue updating throughout the event; changes are reflected immediately for other registrars.
7. When the event is over, the **Event Organizer** ends the event from the `Events` section; you no longer see it in your active list.

# Role-Based Access Control System

This document describes the role-based access control (RBAC) system implemented in the PMU EMS application.

## User Roles

The system supports five distinct user roles:

### 1. Event Organizer (`event-organizer`)
**Permissions:**
- Create new events
- Edit existing events (only if not ended)
- End events
- View events and attendees

**Access:**
- Events page (full access)
- Can create, edit, and end events
- Cannot manage event attendance (removed from this role)

### 2. IT (`it`)
**Permissions:**
- Add new people to the system
- Edit existing people records
- Delete people from the system
- Upload Excel files to bulk import people
- Register new users with specific roles
- Manage user accounts and role assignments

**Access:**
- People page (full access)
- User Management page (full access)
- Can manage all people-related operations
- Can register new users and assign roles

### 3. Finance Manager (`finance-manager`)
**Permissions:**
- Add invoices to events
- Edit existing invoices
- Delete invoices
- Attach spending amounts to events
- View financial data

**Access:**
- Finance page (full access)
- Can manage all financial operations

### 4. Admin (`admin`)
**Permissions:**
- View comprehensive reports
- Access to all event data including:
  - Event name
  - Number of attendees
  - Amount spent
  - Start and end times
  - Detailed attendee lists

**Access:**
- Reports page (full access)
- Can view all system data

### 5. Registrar (`registrar`)
**Permissions:**
- Mark attendance for events
- View events starting within 1 hour
- Access to people data for attendance marking

**Access:**
- Attendance page (full access)
- Can only see events that start within 1 hour
- Can mark attendance for people attending events
- Time-based visibility: Events appear 1 hour before start time

**Concurrent Access Features:**
- Multiple registrars can mark attendance simultaneously for different people
- Real-time updates when other registrars make changes
- Safe array operations using Firestore's arrayUnion/arrayRemove
- Error handling and user feedback

