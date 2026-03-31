## System Overview

**PMU EMS (PAU Muslim Ummah Event Management System)** is a web application used to manage:

- **Events** – creation, scheduling, lifecycle management, and per‑session scoping.
- **People** – student/member records, academic session assignment, and bulk imports.
- **Attendance** – real‑time, concurrent attendance tracking during events.
- **Finance** – invoices, event spending, and cross‑event financial reports.
- **Reports** – event‑level and session‑level reports combining attendance and finance.
- **Sessions** – academic sessions with rollover/migration support.
- **Users & roles** – Firebase‑backed authentication with custom RBAC.

### Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript.
- **Styling/UI**: Tailwind CSS, Material UI (MUI), custom UI components.
- **Backend**: Firebase Auth + Firestore (no custom backend server).
- **Utilities**: FullCalendar (calendar UI), dayjs (dates), xlsx (Excel import), pdf/CSV helpers.

### High‑Level Modules

- `src/app/(not-authenticated)` – Login.
- `src/app/(authenticated)` – Main app:
  - `page.tsx` – dashboard.
  - `events`, `people`, `attendance`, `finance`, `finance-reports`,
    `event-reports`, `session-reports`, `user-management`, `settings`.
- `src/context` – `AuthContext`, theme, sidebar, etc.
- `src/hooks` – domain hooks (`useEvents`, `usePeople`, `useCurrentSession`, `useAllSessions`, `useRole`).
- `src/services` – Firebase config, typed Firestore entities, session migration/rollover.
- `src/components` – shared UI, forms, tables, cards, RoleGuard, etc.

