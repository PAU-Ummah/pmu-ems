## Architecture

### Application Structure

- **App Router** (`src/app`)
  - `layout.tsx` – root layout, providers, sidebar + header.
  - `(not-authenticated)/login` – login page.
  - `(authenticated)` – all authenticated routes:
    - `page.tsx` – dashboard (role‑aware metrics + quick actions).
    - `events`, `events/[id]` – event list & detail.
    - `people` – people management.
    - `attendance` – registrar attendance view.
    - `finance` – invoice CRUD.
    - `finance-report` – finance analytics & exports.
    - `reports` – single‑event report.
    - `session-reports` – per‑session reporting.
    - `user-management` – user registration (IT‑only).
    - `settings` – account, security, app info, session management.

### Context & Hooks

- **AuthContext** (`src/context/AuthContext.tsx`)
  - Wraps Firebase Auth.
  - Exposes:
    - `user` (Firebase user).
    - `userData` (`User` from Firestore, including `role`).
    - `loading`, `login(email, password)`, `logout()`.
  - On auth state change:
    - Loads `users/{uid}` from Firestore.
    - If missing, synthesizes a default `User` document (role default `event-organizer`).

- **Role / RBAC**
  - `useRole` (`src/hooks/useRole.ts`):
    - `userRole`, `hasRole(role | role[])`.
    - Convenience guards:
      - `canCreateEvents`, `canEditEvents`, `canEndEvents`.
      - `canManagePeople`, `canManageFinance`, `canViewReports`.
      - `canManageUsers`, `canRegisterUsers`, `canMarkAttendance`.
  - `RoleGuard` (`src/components/auth/RoleGuard.tsx`):
    - Wraps children and checks `hasRole(allowedRoles)`.
    - Renders fallback “Access Denied” alert when unauthorized.

- **Domain Hooks**
  - `useCurrentSession` – returns current academic session (`currentSession`, `currentSessionId`, `loading`, `refresh`).
  - `useAllSessions` – returns all sessions for reporting and rollover.
  - `useEvents(sessionId)` – events scoped to a given session.
  - `usePeople(sessionId, options?)` – people scoped to session (optionally `activeOnly`).

### Navigation & Layout

- **AppSidebar** (`src/layout/AppSidebar.tsx`)
  - Builds `navItems` (Events, Attendance, People, User Management, Finance, Finance-Report, Reports, Session Reports).
  - Filters items using `useRole` guards:
    - Example: `/events` visible if `canCreateEvents()`.
    - `/attendance` visible if `canMarkAttendance()`.
    - `/people`, `/user-management` visible only to IT/Admin, etc.
  - Handles responsive expanded/hover/collapsed states.

- **User Dropdown** (`src/components/header/UserDropdown.tsx`)
  - Shows display name & email.
  - Links to `/settings`.
  - Handles logout and redirect to `/login`.

