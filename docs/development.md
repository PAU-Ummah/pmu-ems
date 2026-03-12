## Development Guide

This document explains how to work on PMU EMS locally and the main conventions to follow.

---

## Getting Started

### Prerequisites

- Node.js (LTS).
- npm or yarn.
- Firebase project with:
  - Web app configured.
  - Firestore enabled.
  - Email/password authentication enabled.

### Environment Setup

Create `.env.local` in the project root with your Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

Values must match the Firebase project configured for PMU EMS.

### Install & Run

```bash
npm install
npm run dev
```

The app runs on `http://localhost:3000`.

---

## Scripts & Tooling

- `npm run dev` – start Next.js dev server.
- `npm run lint` – run ESLint.
- `npm run lint:fix` – auto‑fix lint issues where possible.
- `npm run check` – typecheck + lint (if configured that way).

Code style:

- TypeScript + React (functional components).
- Tailwind utility classes for layout/styling.
- Material UI icons and some components where convenient.
- Single quotes, 2‑space indentation (see ESLint config).
- **Variable naming**:
  - Avoid single‑character variable names; use descriptive names everywhere (`index`, `person`, `event`, etc.).

---

## Project Layout (Quick Map)

- `src/app/`
  - `(not-authenticated)/login` – login page.
  - `(authenticated)/` – main app:
    - `page.tsx` – dashboard.
    - feature directories: `events`, `people`, `attendance`, `finance`, `finance-report`, `reports`, `session-reports`, `user-management`, `settings`.
    - `api/` – API routes (e.g., `register-user`, `send-email`).
- `src/components/`
  - `auth` – `RoleGuard`.
  - `common` – cards, metrics, layout helpers.
  - `form` – form inputs, labels, selects.
  - `ui` – buttons, tables, alerts, dropdowns, modals.
  - `header`, `loading`, `empty-state`, etc.
- `src/context/`
  - `AuthContext` – auth + user role.
  - Other UI contexts (theme, sidebar).
- `src/hooks/`
  - `useRole`, `useEvents`, `usePeople`, `useCurrentSession`, `useAllSessions`, etc.
- `src/services/`
  - `firebase` – Firebase client setup.
  - `types` – shared TypeScript models.
  - `sessionMigration`, `sessionRollover` – academic session logic.
- `src/utils/`
  - `pdfGenerator` – PDF/CSV export helpers.
  - other domain helpers as needed.

---

## RBAC & Access Patterns (For Developers)

When adding new pages or actions:

- Use `useRole` to check permissions.
- Use `RoleGuard` to protect:
  - Entire page content.
  - Specific buttons/actions that should be role‑limited.
- Also hide navigation items in `AppSidebar` when the user lacks access.

Patterns:

- Page‑level guard:

  ```tsx
  import RoleGuard from '@/components/auth/RoleGuard';

  export default function MyPage() {
    return (
      <RoleGuard allowedRoles={['admin']}>
        {/* page content */}
      </RoleGuard>
    );
  }
  ```

- Action‑level guard:

  ```tsx
  <RoleGuard allowedRoles={['finance-manager']}>
    <Button onClick={handleCreateInvoice}>Add Invoice</Button>
  </RoleGuard>
  ```

---

## Data Access & Hooks

When adding new data‑driven components:

- Re‑use existing hooks where possible:
  - `useEvents(sessionId)` for events.
  - `usePeople(sessionId, options?)` for people.
  - `useCurrentSession()` to get the active session and refresh it after migrations/rollovers.
  - `useAllSessions()` for reports that can target past sessions.

Guidelines:

- Avoid embedding Firestore logic directly in many components.
  - Prefer shared hooks/services for:
    - Collection queries.
    - Common filters (by session, by status).
    - Real‑time listeners (`onSnapshot`).
- For mutations:
  - Prefer small helper functions in `services` where logic is reused across pages.
  - Use `try/catch` with user‑friendly error messages (via `Alert`).

---

## Async Patterns

- Use **async/await** over `.then` for readability.
- In React hooks (`useEffect`):
  - Define an inner async function and call it.
  - Handle `loading` and error state explicitly.
  - Consider cancellation patterns if the effect can re‑run before completion.

Example:

```tsx
useEffect(() => {
  let cancelled = false;

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [eventsResult, peopleResult] = await Promise.all([
        fetchEvents(),
        fetchPeople(),
      ]);
      if (!cancelled) {
        setEvents(eventsResult);
        setPeople(peopleResult);
      }
    } finally {
      if (!cancelled) {
        setIsLoading(false);
      }
    }
  };

  loadData();

  return () => {
    cancelled = true;
  };
}, []);
```

---

## Adding New Features

When adding a new feature (page or component):

1. **Decide route & ownership**
   - Place under `src/app/(authenticated)/<feature>` if it requires login.
   - Decide which roles can access it, and encode that in:
     - `RoleGuard` on the page or components.
     - `AppSidebar` nav filtering.
2. **Model data**
   - Extend `src/services/types.ts` as needed.
   - Update Firestore access patterns (add collections/fields).
3. **Create hooks & services**
   - New `useX()` hook if multiple components need the same data.
4. **Wire up UI**
   - Use shared UI components (`Button`, `Table`, `ComponentCard`, etc.).
5. **Update documentation**
   - Add or extend relevant sections in `docs/` (especially `features.md`, `data-model.md`, and `rbac-and-workflows.md`).

