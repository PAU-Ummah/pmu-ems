# Conventions

Stack, tools and conventions this project uses. One fact per line.

- Technologies/libraries this project documents and relies on: Next.js, React, TypeScript, Firebase Authentication, Firestore, Firestore Security Rules, Firebase Storage, Tailwind CSS, MUI (Material UI), Vitest, Anthropic Claude API (Messages / Vision) _(run 28e0db93, 2026-10-28)_
- Constraint: Must be built inside the existing Next.js 15 App Router / React 19 / TypeScript / Tailwind + MUI stack _(run 28e0db93, 2026-10-28)_
- Constraint: Must use Firebase Auth + Firestore, consistent with the existing data model and RBAC conventions (RoleGuard / useRole) _(run 28e0db93, 2026-10-28)_
- Constraint: firestore.rules must be extended, not replaced, to add rules for the new inventory collections _(run 28e0db93, 2026-10-28)_
- Constraint: Claude (Anthropic) vision API must only be called server-side from a Next.js API route, with the API key held in an environment variable, never exposed client-side _(run 28e0db93, 2026-10-28)_
- Constraint: vitest must be added to package.json devDependencies and `npm install` run in the foreground (node_modules/vitest already present via --no-save install) _(run 28e0db93, 2026-10-28)_
