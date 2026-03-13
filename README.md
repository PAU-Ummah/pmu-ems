## PMU EMS – PAU Muslim Ummah Event Management System

PMU EMS is an internal web application for **managing events, people, attendance, finance, and reports** for the PAU Muslim Ummah.  
It is built with **Next.js 15, React 19, TypeScript, Tailwind, MUI, and Firebase (Auth + Firestore)**.

For detailed technical docs, see the `docs/` folder (starting with `docs/overview.md` and `docs/rbac-and-workflows.md`).

---

## Features

- **Events** – create, edit, and end events per academic session; view attendees.
- **People** – manage people records, bulk import from Excel, filter by year/department/living.
- **Attendance** – real‑time attendance marking for registrars, with concurrent updates.
- **Finance** – invoices per event, line items, required receipt links, and automatic event spending totals.
- **Reports** – event‑level and session‑level reports (attendance + finance) with PDF/CSV exports.
- **Sessions** – academic session initialization and rollover (graduate/progress people).
- **Users & roles** – Firebase‑backed auth with role‑based navigation and guards.

---

## Tech Stack

- **Framework**: Next.js (App Router), React, TypeScript.
- **UI**: Tailwind CSS, Material UI, custom components.
- **Backend**: Firebase Auth + Firestore (no custom server).
- **Utilities**: dayjs, xlsx, PDF/CSV helpers.

---

## Getting Started (Development)

1. **Install dependencies**

   ```bash
   npm install
   # or
   yarn
   ```

2. **Configure environment**

   Create `.env.local` in the project root and set your Firebase config:

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

3. **Run the dev server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

   Then open `http://localhost:3000` in your browser.

---

## Scripts

- `npm run dev` – start the development server.
- `npm run lint` – run ESLint.
- `npm run lint:fix` – auto‑fix lint issues where possible.
- `npm run check` – typecheck + lint (if configured).

---

## Documentation

More detailed information lives in the `docs/` directory:

- `docs/overview.md` – high‑level system overview.
- `docs/architecture.md` – app architecture and main modules.
- `docs/data-model.md` – Firestore collections and types.
- `docs/rbac-and-workflows.md` – roles, permissions, and workflows.
- `docs/features.md` – feature‑by‑feature breakdown.
- `docs/development.md` – deeper development guide and conventions.
