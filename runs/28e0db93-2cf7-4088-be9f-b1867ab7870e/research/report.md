# Research report -- FIFO-based non-profit inventory module for PMU EMS (Next.js/Firebase) with AI-assisted stock counting

Generated 2026-10-28T13:12:28.402Z by OSA. Researched by claude-code using its built-in web search. Time range: last 3 years.
Values marked [uncertain] could not be verified from a source the agent opened; they are repeated under *Open uncertainties*.

## Findings

### Official documentation: Next.js
*Find the OFFICIAL documentation for "Next.js": its current stable version, how it is installed or enabled, the API surface this build will use, and any breaking changes or pitfalls in the last 3 years.*

The official Next.js docs (nextjs.org/docs) confirm the current stable release is 16.4 (2026-10-06), but this build is locked to the Next.js 15.x App Router line, which remains documented and security-patched (most recently 15.5.26, security update 2026-09-22). For this build, the relevant API surface is the App Router's Route Handlers (`app/**/route.ts`) for the server-side Claude vision proxy, the async Request APIs (`params`, `cookies`, `headers`) that became mandatory in 15.0, and standard Web Request/Response/FormData APIs for handling image uploads. The single most relevant pitfall for this build is that Route Handlers have no Next.js-enforced request body size limit (unlike Server Actions' 1MB default), so the API route must implement its own oversized-image check to satisfy acceptance criterion 8.

**Key findings**
- Current stable Next.js release is 16.4, published 2026-10-06 (nextjs.org/blog/next-16-4); Next.js 15.5 was the last 15.x feature release (2025-08-18) and 15.5.26 received a critical out-of-band security patch on 2026-09-22 alongside 16.3.6 — the 15.x line is still actively patched.
- Route Handlers (`route.ts`) support GET/HEAD/POST/PUT/DELETE/PATCH/OPTIONS exported as async functions taking `(request: NextRequest, { params })`; `params` is a Promise since v15.0.0-RC (nextjs.org/docs/app/api-reference/file-conventions/route, 'Version History' table).
- As of Next.js 15, `cookies()`, `headers()`, `draftMode()`, and route `params`/`searchParams` are all asynchronous and must be awaited; a codemod (`@next/codemod upgrade latest` / codemod `150`) exists but manual `await` is the documented recommended path.
- GET Route Handlers are no longer cached by default as of Next.js 15 (previously static); opting into caching requires `export const dynamic = 'force-static'` or similar segment config — relevant if any inventory GET routes are added.
- Request bodies in Route Handlers are read via standard Web APIs: `request.json()`, `request.formData()`, `request.text()` — there is no Next.js-imposed body size cap on Route Handlers documented anywhere in the Route Handler reference page.
- By contrast, Server Actions have a documented default `bodySizeLimit` of 1MB (configurable via `experimental.serverActions.bodySizeLimit` in next.config.js) — this limit is explicitly scoped to Server Actions, not Route Handlers (nextjs.org/docs .../config/next-config-js/serverActions).
- `runtime = 'experimental-edge'` is rejected as of Next.js 15 (must use `runtime = 'edge'` or default `'nodejs'`); for a route that calls the Claude API with a server-held key, `runtime = 'nodejs'` (the default) is appropriate.
- React 19 is now the minimum peer dependency for the App Router as of Next.js 15; `@types/react`/`@types/react-dom` must also be upgraded.
- Webhooks/third-party API proxying from Route Handlers needs no `bodyParser` config (unlike the old Pages Router API Routes) — errors are handled by try/catch around `request.text()`/`request.json()` and returning a `new Response(..., { status: ... })`, which is the documented pattern for returning handled error states instead of letting Next.js produce a generic 500.

**Recommendations**
- Pin the project to the Next.js 15.x line (consistent with the locked constraint) using `npm install next@^15 react@^19 react-dom@^19` rather than installing `next@latest` (which would pull in 16.4).
- Implement the Claude vision proxy as `app/api/inventory/ai-count/route.ts` exporting an async `POST`, running on `runtime = 'nodejs'` (default), reading the image via `request.formData()` or `request.arrayBuffer()`.
- Because Route Handlers have no built-in body-size ceiling, explicitly check `request.headers.get('content-length')` (and/or the actual decoded buffer size) against an app-defined max (e.g. a few MB) before calling the Claude API, returning a 413-style handled JSON error — this directly satisfies acceptance criterion 8's 'oversized image' case.
- Wrap the Claude API call in try/catch; on failure return `Response.json({ error: ... }, { status: 502 })` or similar rather than letting an unhandled rejection produce a framework 500, also required by criterion 8.
- Everywhere `params`, `cookies()`, or `headers()` are used in new route/page/layout files, write them as `await`-ed from the start — do not rely on the deprecated synchronous/`UnsafeUnwrapped` escape hatches, since those are migration shims, not the steady-state API.
- Keep the API key in `process.env.ANTHROPIC_API_KEY` read only inside the server-side route file; never prefix it with `NEXT_PUBLIC_`, consistent with the locked constraint and with Next.js's documented client/server env var boundary.
- If any inventory summary data is exposed via a GET Route Handler, be explicit about caching: either accept the Next.js 15 default (dynamic, uncached) or set `export const dynamic = 'force-static'` deliberately — do not assume GET responses are cached as they were pre-15.

**current version:** 16.4 (stable, released 2026-10-06, per nextjs.org/blog) — this build is locked to the Next.js 15.x line per constraints, latest patch 15.5.26

**api surface**
- app/api/.../route.ts exporting async POST(request: NextRequest) for the Claude vision proxy
- request.formData() / request.arrayBuffer() / request.json() for reading uploaded image and JSON payloads
- Response.json(data, { status }) and new Response(body, { status, headers }) for success and handled-error responses
- runtime = 'nodejs' route segment config (default) for the server-side API route holding the Anthropic key
- await params in any dynamic route segment (e.g. app/inventory/items/[id]/route.ts) per the Next.js 15 async Request API change
- next/headers: cookies(), headers() (awaited) if session/role info needs reading in a route handler
- Firebase Auth/Firestore client and admin SDKs invoked from App Router client/server components and route handlers (standard Next.js data-fetching patterns, not Next.js-specific APIs)
- export const dynamic / runtime segment config options on any new GET route handlers for the inventory summary/report endpoints

**pitfalls**
- Next.js 15 made params, searchParams, cookies(), headers(), and draftMode() asynchronous — every new route/page/layout must await them; omitting await is a common migration bug.
- GET Route Handlers switched from cached-by-default to dynamic-by-default in Next.js 15 — any inventory report/export GET endpoint will not be cached unless explicitly opted in.
- `runtime = 'experimental-edge'` now errors in Next.js 15; must use `'edge'` or omit (defaults to nodejs).
- Route Handlers have no documented Next.js-level request body size limit, unlike Server Actions (1MB default) — relying on an assumed framework-level cap for the AI image upload would be incorrect; the app must enforce its own limit and handled error response to meet the 'oversized image' acceptance criterion.
- React 19 is now mandatory for the App Router in Next.js 15; mismatched React 18 type packages or peer dependencies commonly break `npm install` and require --force/--legacy-peer-deps during transition.
- `@next/font` was removed in Next.js 15 in favor of the built-in `next/font` — irrelevant to this build's functionality but worth avoiding if copying older boilerplate.
- Next.js 16 (current stable) is a different major line from the 15.x this build targets — copying examples or upgrade guidance from 16.x docs/blog posts (e.g. Cache Components, Turbopack-specific behavior) without checking applicability to 15.x could introduce mismatched assumptions.

*As of: Next.js docs content as fetched 2026-10-28; nextjs.org/docs/app/api-reference/file-conventions/route last updated 2026-04-30; nextjs.org/docs/app/guides/upgrading/version-15 last updated 2026-10-15; current stable per nextjs.org/blog is 16.4 (2026-10-06), locked build target is the 15.x line (latest patch 15.5.26, security update 2026-09-22)*

**Sources**
- [Next.js Docs — What is Next.js?](https://nextjs.org/docs) (official-docs) -- "Next.js is a React framework for building full-stack web applications... App Router: The newer router that supports new React features like Server Components."
- [The latest Next.js news (blog index)](https://nextjs.org/blog) (official-docs) -- "Next.js 16.4 (2026-10-06): Next.js 16.4 introduces lazy compilation, smaller Turbopack output, React 19.3 features... Upcoming Next.js Security Update ... Next.js 16.3.6 and 15.5.26 are planned for a critical out-of-band security update on September 22, 2026."
- [route.js — API Reference | Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) (official-docs) -- "`v15.0.0-RC` | `context.params` is now a promise. ... `v13.2.0` | Route Handlers are introduced."
- [How to upgrade to version 15](https://nextjs.org/docs/app/guides/upgrading/version-15) (official-docs) -- "Previously synchronous Request-time APIs that rely on request information are now asynchronous: cookies, headers, draftMode, params... GET functions in Route Handlers are no longer cached by default."
- [serverActions — next.config.js options](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions) (official-docs) -- "By default, the maximum size of the request body sent to a Server Action is 1MB, to prevent the consumption of excessive server resources in parsing large amounts of data..."


### Official documentation: React
*Find the OFFICIAL documentation for "React": its current stable version, how it is installed or enabled, the API surface this build will use, and any breaking changes or pitfalls in the last 3 years.*

React's current stable release is 19.3 (minor 19.3.0 shipped 2026-09-09 per the official Versions page), built on the React 19 line first released 2024-12-05. For this Next.js 15 / React 19 inventory module, the build will rely on core hooks (useState, useEffect, useContext for RoleGuard/useRole), the new Actions-oriented APIs (useActionState, useFormStatus, useOptimistic) for receipt/issue/write-off/stock-take forms with pending and error states, and ref-as-prop (no forwardRef needed) for any custom MUI-wrapped inputs. No installation beyond `npm install react@latest react-dom@latest` (or pinning to the 19.x already locked in this project) is required since React 19 is enabled by default once the package version is 19.x. The main pitfalls from the last 3 years are the React 19 removal of function-component defaultProps/PropTypes and legacy ref/context APIs, the useFormState→useActionState rename, and TypeScript's new requirement that useRef() always take an argument.

**Key findings**
- react.dev/versions lists React 19.3 (19.3.0, 2026-09-09) as the current latest release; React 19.0.0 was the first stable 19 release on 2024-12-05.
- React 19 adds Actions: async functions usable in transitions that auto-manage pending/error/optimistic state, plus the useActionState hook returning [state, action, isPending] (react.dev/blog/2024/12/05/react-19).
- useFormStatus lets a child of a <form> read {pending} without prop drilling; <form action={fn}> and formAction props now accept functions directly.
- useOptimistic provides immediate optimistic UI updates while an async request is in flight.
- use() lets components read a Promise or Context value conditionally during render.
- Function components can now accept ref directly as a prop; forwardRef is no longer required for new components (forwardRef itself is deprecated per the upgrade guide).
- React 19 upgrade guide (react.dev/blog/2024/04/25/react-19-upgrade-guide) confirms removal of: propTypes/defaultProps on function components, legacy context (contextTypes/getChildContext), string refs, React.createFactory, module-pattern factories, ReactDOM.render/hydrate/findDOMNode/unmountComponentAtNode, and react-dom/test-utils.
- Error handling changed: React no longer re-throws errors; uncaught errors go to window.reportError, caught errors to console.error, with new onUncaughtError/onCaughtError options on createRoot/hydrateRoot.
- TypeScript changes in 19: useRef() now requires an argument, ref callbacks must not implicitly return a value, global JSX namespace removed in favor of React.JSX.
- React 19.2 (2025-10-01, non-breaking minor) added <Activity>, useEffectEvent, server-only cacheSignal, and changed the useId prefix from ':r:' to '_r_' for CSS-selector/XML-name compatibility.
- Migration codemods are available: `npx codemod@latest react/19/migration-recipe` and `npx types-react-codemod@latest preset-19 ./path-to-app`; the guide recommends upgrading to React 18.3 first to surface deprecation warnings before moving to 19.

**Recommendations**
- Pin the project to a React 19.x release (19.0 through the current 19.3 line are all compatible with Next.js 15's App Router); no special enabling step is needed beyond the package.json version already in use.
- Use useActionState (not the removed/renamed useFormState) for receipt-creation, issue, write-off, and stock-take forms so pending/error UI states (acceptance criteria 6, 8, 9) are handled with the official pattern rather than hand-rolled state.
- Use useOptimistic sparingly only where it clearly helps perceived responsiveness (e.g., marking an AI-suggested count as 'confirming' while the user edits it) -- do not use it to write unconfirmed AI counts to Firestore, which would violate acceptance criterion 7.
- If writing any custom input components that MUI wraps, prefer ref-as-prop over forwardRef since forwardRef is now deprecated in the official guide.
- Do not use removed APIs (defaultProps on function components, string refs, ReactDOM.render/findDOMNode, react-dom/test-utils) anywhere in new code; use ES6 default parameters and createRoot/hydrateRoot-based patterns instead.
- If useRef() is used anywhere in the new TypeScript code, always pass an explicit initial value (e.g., useRef<HTMLInputElement>(null)) to satisfy the React 19 TypeScript signature.
- Treat react-dom's new onCaughtError/onUncaughtError hooks as the place to log unexpected render errors (relevant to the 'no crash/silent 500' requirement for image upload / Claude API failures), though the actual fetch-failure handling in the API route itself is a server-side concern, not a React API concern.

**current version:** 19.3 (19.3.0, released 2026-09-09, per react.dev/versions)

**api surface**
- useState, useEffect, useContext (for RoleGuard/useRole patterns)
- useActionState (receipt, issue, write-off, stock-take form submission with pending/error state)
- useFormStatus (read pending state inside form child components)
- useOptimistic (optional optimistic UI for AI-suggested counts prior to user confirmation)
- ref as a component prop (replacing forwardRef for custom input wrappers)
- createRoot/hydrateRoot error handlers: onUncaughtError, onCaughtError (optional, for surfacing unexpected render-time errors)
- use() (optional, for reading promises/context conditionally if needed outside Next.js data-fetching patterns)

**pitfalls**
- defaultProps and PropTypes on function components are removed in React 19 -- must use default parameters/TypeScript instead
- useFormState was renamed to useActionState in the stable release
- forwardRef is deprecated in favor of passing ref directly as a prop; plan new custom components accordingly
- String refs, legacy context (contextTypes/getChildContext), React.createFactory, and module-pattern factories are all removed
- ReactDOM.render, ReactDOM.hydrate, findDOMNode, and unmountComponentAtNode are removed; react-dom/test-utils is removed (act moved to react package)
- TypeScript: useRef() now requires an explicit argument; ref callbacks must not implicitly return a value; global JSX namespace removed
- React no longer re-throws errors automatically -- uncaught errors go to window.reportError and caught errors to console.error by default, which changes how error boundaries/test assertions may need to be written
- React 19.2 changed the useId-generated prefix from ':r:' to '_r_', which could break any code relying on the old format for CSS selectors (low relevance to this build but worth noting if any snapshot tests pin IDs)

*As of: React 19.3 (19.3.0, released 2026-09-09) per react.dev/versions, accessed 2026-10-28; core React 19 API surface documented as of the 2024-12-05 React 19 blog post and 2024-04-25 upgrade guide.*

**Sources**
- [React Versions](https://react.dev/versions) (official-docs) -- "React 19.3 (September 9, 2026) - Latest version at react.dev"
- [React v19](https://react.dev/blog/2024/12/05/react-19) (official-docs) -- "React 19 is now stable and available on npm! ... Actions ... useActionState ... useFormStatus ... useOptimistic ... use API ... ref as a prop"
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide) (official-docs) -- "propTypes checks removed from React package ... defaultProps removed for function components ... ReactDOM.render -> Use createRoot()"
- [React 19.2](https://react.dev/blog/2025/10/01/react-19-2) (official-docs) -- "React 19.2 is a non-breaking minor release ... <Activity /> ... useEffectEvent ... cacheSignal ... useId prefix update"


### Official documentation: TypeScript
*Find the OFFICIAL documentation for "TypeScript": its current stable version, how it is installed or enabled, the API surface this build will use, and any breaking changes or pitfalls in the last 3 years.*

The official TypeScript documentation (typescriptlang.org, devblogs.microsoft.com) confirms the current stable release is TypeScript 7.0.2, a from-scratch rewrite of the compiler in Go (codename 'Corsa') shipped July 8, 2026, giving ~8-12x faster builds. Installation is unchanged (`npm install typescript --save-dev`, run via `npx tsc`), but TypeScript 7.0 ships no programmatic/compiler API — only a native `tsc` binary — and this breaks tools that rely on the JS Program/transformer API, including ts-jest and (per secondary sources) current Vitest/Next.js 15 type-checking integration until TS 7.1 restores an API. For this build (Next.js 15, vitest, pure FIFO functions), the safe choice is to pin TypeScript to the 6.x line rather than adopt 7.0, since the acceptance criteria require `npm test` (vitest) and a normal Next.js 15 build/type-check pipeline that depend on compiler-API tooling. Core API surface used will be ordinary tsconfig.json compilerOptions (strict, target, module/moduleResolution, jsx, paths) plus standard type-only language features (interfaces, generics, utility types, `satisfies`) for the FIFO pure functions and Firestore/Next.js typings — no direct TS compiler API calls are needed.

**Key findings**
- TypeScript 7.0 GA released July 8, 2026 (npm version 7.0.2), a full rewrite of the compiler in Go, no longer running as JS on Node — install/run commands (`npm install typescript --save-dev`, `npx tsc`) are unchanged. Source: official TypeScript 7.0 announcement.
- TypeScript 7.0 reports 7.7x-11.9x faster full builds than TS 6.0 in Microsoft's own benchmarks (e.g. VS Code 125.7s -> 10.6s), with 6-26% lower memory use.
- TypeScript 7.0 ships WITHOUT the JavaScript programmatic compiler API (no Program/transformer API, no `tsserver.js`); only the native `tsc`/language-server binary ships. Microsoft's own migration guidance and the ts-jest project's documentation both state ts-jest 'needs' the JS API and recommends a side-by-side npm alias workaround (`@typescript/native` for TS7 CLI + `typescript` pinned to a TS6 compatibility package) until TS 7.1 restores an API.
- TypeScript 7.1 is in Beta as of October 20, 2026 and is the version slated to reintroduce a programmatic API and import-attributes support for ambient modules.
- Breaking defaults/removed features confirmed on the official TS7.0 overview: `strict` now defaults to true, `module` defaults to `esnext`, `types` defaults to `[]` (no auto @types discovery), ES5 target removed, legacy AMD/UMD/CommonJS module emit removed, classic module resolution deprecated, and `baseUrl` is removed (use `paths` relative to project root — but `paths` normally requires `baseUrl` per the general tsconfig reference, so TS7 changes this contract).
- The general TypeScript tsconfig reference (stable across TS6/early TS7) documents the compilerOptions this build needs: `strict` (bundles noImplicitAny, strictNullChecks, etc.), `target`, `module`/`moduleResolution` (e.g. `nodenext` or `bundler`), `jsx: react-jsx`, `esModuleInterop`, `skipLibCheck`, `isolatedModules`, and `baseUrl`+`paths` for `@/*` aliases.

**Recommendations**
- Pin the project's `typescript` devDependency to the 6.x line (latest confirmed: 6.0.3) rather than 7.0.2, because vitest and the Next.js 15 type-checking pipeline rely on the programmatic compiler API that TypeScript 7.0 does not ship; re-evaluate once TypeScript 7.1 (currently Beta) ships a stable API.
- Set `isolatedModules: true` and `esModuleInterop: true` in tsconfig.json so FIFO pure-function modules transpile safely per-file under both the Next.js/SWC build and vitest.
- Use `jsx: "react-jsx"` (React 17+/React 19 transform) and keep `strict: true` explicitly in tsconfig regardless of which major version is used, since the default for `strict` differs across TS major versions and this build's correctness requirements (FIFO math, no negative stock) benefit from strict null/undefined checking.
- If path aliases (`@/*`) are used for the new inventory module files, keep `baseUrl` set explicitly in tsconfig rather than relying on root defaults, since this behavior is inconsistent between TS6 and TS7.
- Do not attempt to use any TypeScript 7.0 CLI-only features that assume a programmatic API (e.g. custom ts-morph/AST tooling) for this build; keep all Claude Vision API typing and Firestore typing on standard `.d.ts`/interface declarations, which work identically under TS6 and TS7.

**current version:** TypeScript 7.0.2 (GA, native Go compiler) is the official current stable release; this build should instead target TypeScript 6.0.3 for compiler-API/tooling compatibility with vitest and Next.js 15 [uncertain]

**api surface**
- tsconfig.json compilerOptions: strict, target, module, moduleResolution, jsx (react-jsx), esModuleInterop, skipLibCheck, isolatedModules, baseUrl/paths
- `npx tsc` / `npx tsc --noEmit` for type-checking in CI and local dev
- Standard language features: interfaces/types for FIFO cost-layer and movement models, generics and utility types (Partial, Pick, Omit) for Firestore document typing, `satisfies` operator for config/const objects
- No direct use of the TypeScript Compiler API (ts.createProgram, ts.transform, etc.) — this build only needs `tsc` as a build/check step, not programmatic compilation

**pitfalls**
- TypeScript 7.0 (native Go compiler) ships with no JavaScript programmatic compiler API; tools built on that API (ts-jest confirmed directly; Vitest's esbuild/oxc-based pipeline and Next.js's internal type-checker reported in secondary sources) can fail or require workarounds until TypeScript 7.1 restores an API — avoid upgrading the project's `typescript` package to 7.x until this build's tooling (vitest, Next.js 15) is confirmed compatible [uncertain: exact Vitest/Next.js 15 behavior not verified from an opened official source]
- TypeScript 7.0 removes ES5 targeting and legacy AMD/UMD/CommonJS module emission — irrelevant for this build's ESM/Next.js setup but would break any leftover CommonJS-targeted config
- TypeScript 7.0 removes `baseUrl` as a standalone setting (paths become project-root relative); this differs from the general tsconfig reference showing `paths` requires `baseUrl`, so `@/*` alias configs must be re-verified if the project ever moves to TS7
- `types` now defaults to `[]` in TS7 instead of auto-discovering `@types` packages — ambient type packages (e.g. `@types/node`) must be explicitly listed in `types` once/if TS7 is adopted
- TypeScript 7.1 (Beta as of Oct 20, 2026) is the version expected to restore the programmatic API and add import-attributes support for ambient modules — treat 7.0.x as not yet safe for this build's tool stack

*As of: TypeScript 7.0.2 (GA July 8, 2026) is current stable per official sources; TypeScript 7.1 Beta as of October 20, 2026; recommend building against TypeScript 6.0.3 for tooling compatibility.*

**Sources**
- [TypeScript - Download / Installing TypeScript](https://www.typescriptlang.org/download) (official-docs) -- "npm install typescript --save-dev ... npx tsc"
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) (official-docs) -- "a 10x faster native port of TypeScript ... 8x to 12x speedups on full builds ... strict now defaults to true ... baseUrl removed"
- [TypeScript tsconfig Reference](https://www.typescriptlang.org/tsconfig) (official-docs) -- "paths ... Requires: baseUrl to be set ... jsx: react-jsx - Uses JSX transform (React 17+, no need to import React)"
- [microsoft/TypeScript Releases](https://github.com/microsoft/TypeScript/releases) (repo) -- "TypeScript 7.0.2 ... TypeScript 7.1 Beta ... TypeScript 6.0.3"
- [ts-jest: Using TypeScript 7](https://kulshekhar.github.io/ts-jest/docs/next/guides/typescript-7) (official-docs) -- "TypeScript 7.0 ships a native tsc, but it does not ship the JavaScript compiler API that ts-jest needs ... TypeScript 7.0 has no stable programmatic API"


### Official documentation: Firebase Authentication
*Find the OFFICIAL documentation for "Firebase Authentication": its current stable version, how it is installed or enabled, the API surface this build will use, and any breaking changes or pitfalls in the last 3 years.*

Firebase Authentication is a managed auth backend accessed via the modular Firebase JS SDK (`firebase/auth`), currently shipping as part of SDK v13.1.0 (Oct 21, 2026). For this build it is installed via `npm install firebase`, initialized with `initializeApp()` + `getAuth(app)`, and the app will rely on `onAuthStateChanged`, sign-in/sign-out helpers, and server-set custom claims (via Admin SDK `setCustomUserClaims`) read in Firestore rules as `request.auth.token.<claim>` to implement the existing RoleGuard/useRole RBAC pattern for the new inventory collections. The last Authentication-specific breaking change in the official JS SDK release notes was in v10.0.0 (Jul 2023) — outside behavior this build touches (React Native storage default, RecaptchaVerifier param order, ParsedToken typing) — and no Authentication breaking changes are listed through the current v13.x line.

**Key findings**
- Firebase Authentication overview docs (firebase.google.com/docs/auth) describe it as backend services + SDKs for password, phone, and federated sign-in, integrating via OAuth2/OIDC; page last updated 2026-10-20.
- Web install is `npm install firebase`; no pinned version is mandated by the docs themselves (firebase.google.com/docs/web/setup).
- Modular initialization pattern: `import { initializeApp } from 'firebase/app'`, `import { getAuth } from 'firebase/auth'`, then `const app = initializeApp(firebaseConfig); const auth = getAuth(app);`.
- Core API surface documented at firebase.google.com/docs/auth/web/start: `getAuth(app)`, `createUserWithEmailAndPassword(auth, email, password)`, `signInWithEmailAndPassword(auth, email, password)`, `onAuthStateChanged(auth, callback)`.
- Current Firebase JS SDK line per official release notes (firebase.google.com/support/release-notes/js): v13.1.0 (2026-10-21) is latest; v13.0.0 (2026-10-07) was a major bump but contained no listed Authentication-specific breaking changes (changes were in AI Logic / Firestore typings).
- Last Authentication breaking changes were in v10.0.0 (2023-07-06): removed explicit `firebase/auth/react-native` entry point, React Native `getAuth()` now defaults to importing AsyncStorage from `@react-native-async-storage/async-storage`, `ParsedToken` values changed from `any` to `unknown`, and `RecaptchaVerifier` constructor reordered to take `auth` as the first parameter.
- Custom claims for RBAC are set server-side only via Admin SDK: `getAuth().setCustomUserClaims(uid, { admin: true })`; they propagate to the ID token on next sign-in, token refresh, or `getIdToken(true)` (firebase.google.com/docs/auth/admin/custom-claims).
- Firestore security rules read custom claims via `request.auth.token.<claim>` (e.g. `request.auth.token.admin === true`), enabling role checks (logging vs admin tier) without extra document lookups — directly applicable to firestore.rules for the inventory collections.
- Custom claims payload is capped at 1000 bytes total and is meant for access-control data only, not general profile data.
- Client-side claim read pattern: `getAuth().currentUser?.getIdTokenResult().then(r => r.claims.admin)`.

**Recommendations**
- Use `npm install firebase` and the modular v9+ API (`firebase/auth`, `getAuth`, `onAuthStateChanged`) — this is already the project's stack and remains current best practice; do not reintroduce the `firebase/compat` API.
- If RBAC for the inventory module's logging-vs-admin tiers (acceptance criteria 11–12) is implemented via custom claims, set them only from a trusted server context (Admin SDK) and keep the payload well under the 1000-byte limit — store just role flags, not profile data.
- In firestore.rules, gate inventory write-off/adjustment/valuation-view rules on `request.auth.token.role == 'admin'` (or equivalent claim/field already used by the existing RoleGuard/useRole convention) rather than client-trusted fields, consistent with how the rest of the app's RBAC works.
- Remember claims only take effect after token refresh — if role changes are made during a session, force `getIdToken(true)` or require re-login before relying on the new role client-side; don't assume an immediate UI update.
- No Authentication SDK breaking changes need to be absorbed for this build (last one affecting web apps relevant to this stack was v10.0.0 in 2023, around RecaptchaVerifier/ParsedToken typing, which this build does not use); just keep the `firebase` package reasonably current (v13.x) via normal `npm install`.

**current version:** Firebase JS SDK v13.1.0 (2026-10-21); Authentication module (firebase/auth) ships as part of this version with no version number pinned independently by the docs

**api surface**
- initializeApp(firebaseConfig)
- getAuth(app)
- onAuthStateChanged(auth, callback)
- signInWithEmailAndPassword(auth, email, password)
- createUserWithEmailAndPassword(auth, email, password)
- signOut(auth)
- currentUser.getIdTokenResult() / getIdToken(true) (client, for reading/refreshing custom claims)
- Admin SDK: getAuth().setCustomUserClaims(uid, claims) (server-only, for role claims used by RoleGuard/useRole and firestore.rules)
- firestore.rules expression: request.auth.token.<claim> (e.g. role/admin check)

**pitfalls**
- v10.0.0 (2023-07-06): RecaptchaVerifier constructor parameter order changed (auth now first) — relevant only if phone auth/reCAPTCHA is ever added; not used by this inventory build.
- v10.0.0: ParsedToken claim values typed as unknown instead of any — minor TypeScript impact if reading custom claims client-side with strict typing.
- No Authentication-specific breaking changes recorded between v10.0.0 (2023) and the current v13.1.0 (2026) in official release notes — the surface this build uses (getAuth, onAuthStateChanged, custom claims) has been stable.
- Custom claims have a hard 1000-byte payload limit and only update on token refresh, not instantly — a common real-world gotcha for role-based UI gating immediately after an admin changes a user's role.
- Custom claims can only be set from a trusted server/Admin SDK context, never from client code — relevant when designing how the logging/admin role distinction (acceptance criteria 11–12) gets assigned.

*As of: Firebase JS SDK v13.1.0, released 2026-10-21; Authentication overview page last updated 2026-10-20*

**Sources**
- [Firebase Authentication (overview)](https://firebase.google.com/docs/auth) (official-docs) -- "Firebase Authentication provides backend services, easy-to-use SDKs, and ready-made UI libraries to authenticate users to your app."
- [Get Started with Firebase Authentication on Web](https://firebase.google.com/docs/auth/web/start) (official-docs) -- "const auth = getAuth(app); ... createUserWithEmailAndPassword(auth, email, password) ... onAuthStateChanged(auth, callback)"
- [Add Firebase to your JavaScript project](https://firebase.google.com/docs/web/setup) (official-docs) -- "npm install firebase ... const app = initializeApp(firebaseConfig);"
- [Firebase JavaScript SDK Release Notes](https://firebase.google.com/support/release-notes/js) (official-docs) -- "Removed the explicit firebase/auth/react-native entry point... Reordered the parameters of the RecaptchaVerifier constructor so that auth is the first parameter."
- [Control Access with Custom Claims and Security Rules](https://firebase.google.com/docs/auth/admin/custom-claims) (official-docs) -- "The payload must not exceed 1000 bytes. ... getAuth().setCustomUserClaims(uid, {admin: true})"


### Official documentation: Firestore
*Find the OFFICIAL documentation for "Firestore": its current stable version, how it is installed or enabled, the API surface this build will use, and any breaking changes or pitfalls in the last 3 years.*

Firestore is Google's NoSQL document database, used here via the Firebase Web modular SDK (npm package `firebase`, currently v13.1.0) through `firebase/firestore`. The build will install Firestore in the Firebase Console in production mode, initialize it with `initializeApp`/`getFirestore`, and read/write cost-layer and movement documents with `collection`/`doc`/`addDoc`/`setDoc`/`getDocs`/`query`/`where`/`orderBy`. FIFO consumption and write-offs that must be atomic and never go negative should use `runTransaction` (not `writeBatch`, since it needs reads to decide which layers to consume), and RBAC is enforced by extending `firestore.rules` with role lookups via `get()`/`exists()` against a users/roles document. The main version-sensitive pitfall in the last 3 years is the Node.js engine bump to Node 20+ as of SDK v12.0.0 (July 2025) and continued type-signature changes to `UpdateData`/`FirestoreDataConverter`.

**Key findings**
- Current stable Firebase JS SDK (npm package `firebase`, includes `firebase/firestore`) is v13.1.0, published 2026-10-21, per the official release notes page.
- Install with `npm install firebase@13.1.0 --save`; initialize with `initializeApp(firebaseConfig)` then `getFirestore(app)` (official quickstart).
- Core modular API surface confirmed from official docs: `collection()`, `doc()`, `addDoc()`, `setDoc()`, `getDoc()`, `getDocs()`, `query()`, `where()`, `orderBy()`.
- Atomic multi-document operations: `runTransaction(db, async (transaction) => {...})` with `transaction.get/set/update/delete`; reads must precede writes in a transaction, and 'a function calling a transaction might run more than once if a concurrent edit affects a document that the transaction reads' (official docs) — relevant because FIFO layer consumption reads multiple layer docs then writes to several.
- Alternative `writeBatch(db)` with `.set/.update/.delete` + `.commit()` is write-only (no reads/retries), atomic, but not suited to decide-then-write FIFO logic without a prior transaction read.
- Official quota limits: transaction time limit 270s (60s idle expiry); max 500 field transformations per Commit/transaction; max API request size 10 MiB; document size limit 1 MiB; field value cap ~1 MiB - 89 bytes; max nesting depth 20 levels.
- Security Rules: must start with `rules_version = '2';` for collection-group query support (introduced ~2019, still current baseline). Role-based rules are written by looking up another document, e.g. `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.admin == true`, and rules support granular `allow create|read|update|delete` verbs.
- Firebase JS SDK v12.0.0 (2025-07-17) raised the minimum supported Node.js version to 20 and set ES2020 as the minimum build target — a breaking change for any CI/build tooling still on Node < 20.
- Firebase JS SDK v10.0.0 (2023-07-06) changed `UpdateData`/`FirestoreDataConverter` generics (added a second type parameter) to fix `updateDoc()` typing — can break existing TypeScript code using custom converters.
- Firebase JS SDK v13.0.0 (2026-10-07) further modified `UpdateData<T>` to support indexed/`Record<X,T>` types; mostly additive/typing but worth checking against strict TS inventory types.

**Recommendations**
- Pin `firebase` to the current major (^13.x) in package.json and ensure the dev/CI Node.js version is >= 20, since v12+ requires it.
- Implement FIFO consumption (partial/multi-layer issue, over-issue rejection) inside a single `runTransaction`: read all needed layer docs first, compute consumption in pure JS, then write updated layer quantities plus the movement doc — this satisfies 'no movement written on rejection' and 'never negative' acceptance criteria atomically.
- Use `writeBatch` only for independent, read-free writes (e.g., writing a receipt's single new layer doc); do not use it where the write depends on current on-hand quantity.
- Extend `firestore.rules` additively: add `match` blocks for the new inventory collections, using `get()`/`exists()` lookups against the existing users/role document pattern already used elsewhere in the project, and keep `rules_version = '2';` unchanged.
- Enforce write-off reason and role checks in both the UI and in `firestore.rules` as data validation (`request.resource.data.reason in ['expired','damaged','lost']`) rather than relying on UI validation alone, since rules are the acceptance-criterion boundary for role 11/12.
- Watch TypeScript converter/generic signatures (`FirestoreDataConverter`, `UpdateData`) when typing cost-layer and movement documents, since these generics changed in SDK v10 and v13 — verify with `npm run build`/`tsc` after upgrading.

**current version:** firebase npm package v13.1.0 (published 2026-10-21), includes firebase/firestore modular SDK

**api surface**
- initializeApp(firebaseConfig), getFirestore(app)
- collection(db, path), doc(db, path, id)
- addDoc(collectionRef, data), setDoc(docRef, data)
- getDoc(docRef), getDocs(query)
- query(collectionRef, where(...), orderBy(...))
- runTransaction(db, async (transaction) => { transaction.get/set/update/delete })
- writeBatch(db) -> batch.set/update/delete, batch.commit()
- firestore.rules: match /databases/{db}/documents + match blocks per collection, allow read/create/update/delete with request.auth and get()/exists() role lookups, rules_version = '2'

**pitfalls**
- SDK v12.0.0 (2025-07-17) requires Node.js >= 20 and ES2020 minimum target — CI/build environments on older Node will break.
- SDK v10.0.0 (2023-07-06) and v13.0.0 (2026-10-07) changed `UpdateData`/`FirestoreDataConverter` generics — custom TypeScript converters for inventory types may need signature updates.
- Transactions auto-retry on contention and 'should not directly modify application state' outside the transaction callback — side effects (e.g., toasts, external calls) must be kept out of the FIFO transaction function.
- Transactions have a hard 270s limit (60s idle) and reads must happen before writes — large multi-layer FIFO issues reading many layer docs should be kept efficient and ordered correctly.
- Batched writes are atomic but cannot read; using writeBatch for FIFO issue logic (which needs to read current layers first) would be incorrect — must use runTransaction instead.
- Document size cap is 1 MiB and max 500 field transformations per commit/transaction — not a practical limit for this app's scale but worth knowing if bulk stock-takes are batched.
- Security rules propagation to active listeners can take up to ~10 minutes after deployment [uncertain] (noted in docs but exact current figure not independently reverified beyond the fetched summary).

*As of: 2026-10-28 (Firebase JS SDK v13.1.0, published 2026-10-21)*

**Sources**
- [Cloud Firestore Documentation (Firebase)](https://firebase.google.com/docs/firestore) (official-docs) -- "Cloud Firestore is a flexible, scalable NoSQL database ... Web SDK: Modern modular SDK v9+ documentation available in the Build section"
- [Transactions and batched writes | Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions) (official-docs) -- "a function calling a transaction might run more than once if a concurrent edit affects a document that the transaction reads"
- [Usage and limits | Firestore](https://firebase.google.com/docs/firestore/quotas) (official-docs) -- "Time limit for a transaction: 270 seconds, with a 60-second idle expiration time ... Each document cannot exceed 1 MiB (1,048,576 bytes)"
- [Get started with Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started) (official-docs) -- "match /<some_path>/ { allow read, write: if <some_condition>; } ... rules_version = '2';"
- [Writing conditions for Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions) (official-docs) -- "allow delete: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.admin == true;"
- [Get started with Cloud Firestore](https://firebase.google.com/docs/firestore/quickstart) (official-docs) -- "npm install firebase@13.1.0 --save ... const db = getFirestore(app);"
- [Firebase JavaScript SDK Release Notes](https://firebase.google.com/support/release-notes/js) (official-docs) -- "Updated minimum Node.js requirement to version 20 ... SDK now uses ES2020 as minimum standard (Version 12.0.0, July 17, 2025)"


### Official documentation: Firestore Security Rules
*Find the OFFICIAL documentation for "Firestore Security Rules": its current stable version, how it is installed or enabled, the API surface this build will use, and any breaking changes or pitfalls in the last 3 years.*

Firestore Security Rules are configured as a separate ruleset (firestore.rules) written in Google's CEL-based rules language, declared with `rules_version = '2';` and `service cloud.firestore { match /databases/{database}/documents { ... } }`, then deployed via the Firebase CLI (`firebase deploy --only firestore:rules`) or the Firebase/Cloud console. For this build, rules will use `request.auth`, custom role-lookup functions (e.g. via `get()`/`exists()` against a users/roles doc or custom claims), `request.resource.data` field validation on create/update, and per-collection `allow create/update/delete/get/list` statements to enforce the logging-vs-admin split (ACs 6, 11, 12) and block missing write-off reasons. No new major rules_version (v3) exists yet — v2 (introduced 2019) remains current and is what should be used. The biggest pitfall for this build is that Security Rules are not query filters: a `list` query is rejected outright if it *could* return a document violating the rules, so role-restricted fields like cost/valuation must live in a separate document/collection rather than being hidden field-by-field inside a shared query.

**Key findings**
- Rules always start with `service cloud.firestore { match /databases/{database}/documents { ... } }`; rules are deployed per named database, separately from app code, via Firebase console or CLI (firebase.google.com/docs/firestore/security/rules-structure, firebase.google.com/docs/rules/get-started).
- `rules_version = '2';` is required to use recursive wildcards (`{name=**}`), collection-group query rules, and `request.query` (limit/offset/orderBy) inspection; omitting it defaults to the older v1 behavior (firebase.google.com/docs/rules/rules-language).
- Core condition API: `request.auth` / `request.auth.uid`, `resource.data` (current doc state), `request.resource.data` (proposed post-write state), `request.time`, `get(path)`, `exists(path)`, `getAfter(path)`, custom `function name() { return ...; }` helpers with `let` bindings (firebase.google.com/docs/firestore/security/rules-conditions).
- Official quota limits (firebase.google.com/docs/firestore/quotas): max 10 `exists()`/`get()`/`getAfter()` calls for a single-document/query request, 20 for multi-document reads/transactions/batched writes (10 per sub-operation); max function call-stack depth 20; max 7 function arguments; max 10 `let` bindings per function; no recursive/cyclical function calls; max nested match depth 10; max 1,000 expressions evaluated per request; ruleset source limit 256 KB, compiled limit 250 KB.
- Security Rules are not filters: 'queries are all-or-nothing' — if a query could return a document that would fail the rule, the entire request is denied regardless of what's actually in the database; `where()`/`request.query` constraints in the query must provably satisfy the rule condition (firebase.google.com/docs/firestore/security/rules-query).
- Collection-group queries need `rules_version = '2'` and a rule written as `match /{path=**}/[COLLECTION_ID]/{doc}`, which then applies to that collection ID at every depth in the hierarchy — a pitfall if the same subcollection name is reused elsewhere in the data model.
- Common insecure patterns flagged by the official 'Avoid insecure rules' guide: blanket `allow read, write: if true`, over-broad recursive wildcards, checking only `request.auth != null` without an ownership/role check, and omitting `request.resource.data` validation on create/update (firebase.google.com/docs/rules/insecure-rules).
- Recent platform-level changes (2025–2026, via Firebase release notes) are tooling-focused, not language-breaking: Firestore Security Rules can now be viewed/edited/deployed directly in the Google Cloud console with ruleset history/clone/restore (reported ~July 2026), and a Rules Simulator became available in the Cloud console (reported ~September 2026); no new `rules_version` (e.g. a v3) was found.
- Testing guidance: use the Firebase Local Emulator Suite for automated rules unit tests, or the Rules Simulator in console for ad-hoc checks, before deploying to production (firebase.google.com/docs/rules/get-started).

**Recommendations**
- Write firestore.rules with `rules_version = '2';` and the standard `service cloud.firestore { match /databases/{database}/documents { ... } }` wrapper, extending the existing file rather than replacing it, per the PRD constraint.
- Implement role checks (logging vs admin) as a reusable function, e.g. `function hasRole(role) { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role; }`, consistent with the existing RoleGuard/useRole convention — but budget for the `get()` call against the 10-calls-per-request quota on any single request path.
- Do not try to hide valuation/cost fields from the logging role by filtering within a shared `items`/`batches` query — because Firestore rules reject a query outright if any potential result could violate the rule, put cost-layer/valuation data the logging role must not see in a separate collection or subcollection with its own `allow get/list` rule restricted to admin.
- Validate all writes with `request.resource.data`: enforce required fields on stock-in receipts (date, quantity, unitCost, optional expiry), require a non-empty `reason` field on write-offs/adjustments (expired/damaged/lost) at the rules level (AC 6), and reject updates/creates to issues/write-offs that also touch `events.amountSpent` or any `invoices/*` document (AC 13) — the latter should be enforced by scoping rules per-collection so the inventory rules have no write path into `events`/`invoices` at all.
- For on-hand/negative-stock and over-issue rejection (AC 2), keep that logic in the pure FIFO functions (AC 14) and Cloud Functions/API layer — Firestore rules can validate individual document shape but cannot reliably sum across a batches collection to check an aggregate on-hand quantity, so don't rely on rules alone for that invariant.
- Test rules locally with the Firebase Emulator Suite (and/or the Rules Simulator) for the role-based allow/deny cases in ACs 6, 11, 12 before considering the firestore.rules changes complete; no production deployment is in scope per the constraints.
- Use `rules_version = '2'` query constraints (`request.query.limit`, etc.) if any list endpoint needs to cap result size, since v1 rules don't expose `request.query` at all.

**current version:** Firestore Security Rules language v2 (rules_version = '2'); no v3 exists as of this research

**api surface**
- rules_version = '2';
- service cloud.firestore { match /databases/{database}/documents { ... } }
- match /collection/{docId} { allow get, list, create, update, delete: if <condition>; }
- request.auth, request.auth.uid
- resource.data, request.resource.data
- request.time
- get(/databases/$(database)/documents/...), exists(/databases/$(database)/documents/...)
- custom function helpers with let bindings for role checks (e.g. hasRole(role))
- request.resource.data.keys().hasOnly([...]) / hasAll([...]) for required-field validation (e.g. write-off reason)
- Firebase CLI: firebase deploy --only firestore:rules

**pitfalls**
- Queries are all-or-nothing: a list/query request is denied entirely if any potential result document could fail the rule — field-level hiding of valuation data inside a shared query is not possible; use a separate collection/doc instead.
- rules_version must be '2' to use recursive wildcards, collection-group rules, and request.query (limit/orderBy/offset) — v1 is still the silent default if the declaration is omitted.
- Document-access quota: only 10 get()/exists()/getAfter() calls per single request (20 for multi-doc/transactions/batched writes) — role-check functions that call get() on a user doc consume this budget and can silently start failing if composed with other lookups.
- Function call stack depth capped at 20, max 7 arguments, max 10 let-bindings, no recursive/cyclical function calls — deeply nested helper functions can hit compiler limits.
- Ruleset size caps: 256 KB source / 250 KB compiled — extending firestore.rules for a new inventory module should stay mindful of cumulative size with existing rules.
- Checking only `request.auth != null` is a common insecure pattern flagged by official docs — must pair with explicit role/ownership checks for the logging-vs-admin split (AC 11/12).
- Collection-group rules (`match /{path=**}/[COLLECTION_ID]/{doc}`) apply to every collection with that name at any depth — reusing a subcollection name elsewhere in the existing data model could unintentionally widen or narrow access.
- Tooling/console changes (rules editing and simulator moving into the Google Cloud console, reported mid-to-late 2026) are workflow changes, not rules-language breaking changes, but should be noted if deployment instructions reference the older Firebase console UI exclusively [uncertain].

*As of: 2026-10-28 (pages fetched live; quotas page reflects current documented limits, no v3 rules language found)*

**Sources**
- [Structuring Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-structure) (official-docs) -- "Cloud Firestore Security Rules always begin with the service cloud.firestore declaration... the match /databases/{database}/documents declaration specifies that rules should match any Firestore database in the project."
- [Writing conditions for Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions) (official-docs) -- "request.auth ... request.resource.data ... get(path) ... exists(path) ... getAfter(path)."
- [Security Rules language](https://firebase.google.com/docs/rules/rules-language) (official-docs) -- "rules_version = '2'; service cloud.firestore { ... } ... Functions can contain only a single return statement."
- [Get started with Firebase Security Rules](https://firebase.google.com/docs/rules/get-started) (official-docs) -- "Use the Firebase Emulator for unit tests in local environments, or the Rules Simulator for quick validation ... then deploy."
- [Firestore Security Rules and queries (Securely query data)](https://firebase.google.com/docs/firestore/security/rules-query) (official-docs) -- "Security rules are not filters—queries are all or nothing ... the rules engine evaluates queries against their potential result set, not actual documents."
- [Avoid insecure rules](https://firebase.google.com/docs/rules/insecure-rules) (official-docs) -- "allow read, write: if true ... anyone who guesses your project ID can steal, modify, or delete the data."
- [Firestore quotas and limits](https://firebase.google.com/docs/firestore/quotas) (official-docs) -- "Maximum number of exists(), get(), and getAfter() calls per request: 10 for single-document requests and query requests; 20 for multi-document reads, transactions, and batched writes."
- [Firebase Release Notes](https://firebase.google.com/support/releases) (official-docs) -- "You can now view, manage, and deploy Firestore Security Rules directly in the Google Cloud console for Firestore (Standard and Enterprise editions)."


### Official documentation: Tailwind CSS
*Find the OFFICIAL documentation for "Tailwind CSS": its current stable version, how it is installed or enabled, the API surface this build will use, and any breaking changes or pitfalls in the last 3 years.*

Tailwind CSS v4 (currently v4.3 per the official docs site) is a CSS-first, zero-config framework that integrates with Next.js via the `@tailwindcss/postcss` PostCSS plugin rather than a `tailwind.config.js` file. For this build (Next.js 15 App Router + MUI), installation is `npm install tailwindcss @tailwindcss/postcss postcss`, a `postcss.config.mjs` registering the plugin, and a single `@import "tailwindcss";` line in `app/globals.css` — no separate config file is required unless custom theme tokens are needed. The main risk for this stack is Tailwind's Preflight base-style reset and the v4 default border-color change (`currentColor` instead of `gray-200`) potentially clashing with MUI's own CSS baseline/reset, which should be verified visually once both libraries are wired up together.

**Key findings**
- Current stable version shown on the official docs site is v4.3 [uncertain]
- v4 install for Next.js: `npm install tailwindcss @tailwindcss/postcss postcss`, create `postcss.config.mjs` with `{ plugins: { "@tailwindcss/postcss": {} } }`, add `@import "tailwindcss";` to `app/globals.css` — no `tailwind.config.js` is required by default
- v4 requires Safari 16.4+, Chrome 111+, Firefox 128+ due to use of modern CSS (`@property`, `color-mix()`); v3.4 should be used instead if older browser support is needed
- v3 `@tailwind base; @tailwind components; @tailwind utilities;` directives are replaced in v4 by a single `@import "tailwindcss";`
- PostCSS plugin package renamed from `tailwindcss` to `@tailwindcss/postcss`; CLI package renamed to `@tailwindcss/cli`
- Several utilities removed/renamed in v4: `bg-opacity-*`/`text-opacity-*`/`border-opacity-*` → opacity modifier syntax (e.g. `bg-black/50`); `flex-shrink-*`→`shrink-*`; `flex-grow-*`→`grow-*`; `overflow-ellipsis`→`text-ellipsis`
- Default border color changed from `gray-200` to `currentColor` in v4; default ring width changed from 3px to 1px and default ring color from `blue-500` to `currentColor`
- Custom utility authoring API changed from `@layer utilities { .foo {} }` to `@utility foo { ... }`
- Variant stacking order for compound variants was reversed (right-to-left in v3 → left-to-right in v4), affecting patterns like `first:*:pt-0`
- Arbitrary-value CSS variable syntax changed from square brackets (`bg-[--brand-color]`) to parentheses (`bg-(--brand-color)`)
- The `corePlugins` config option used in v3 to disable built-in utilities is no longer supported in v4
- An automated migration tool is provided: `npx @tailwindcss/upgrade`, intended to be run on a separate branch with manual diff review

**Recommendations**
- Use Tailwind v4 with the `@tailwindcss/postcss` PostCSS plugin and a CSS-first `@import "tailwindcss";` setup in `app/globals.css`, matching the official Next.js framework guide, rather than a legacy `tailwind.config.js`-driven v3 setup
- Because this build pairs Tailwind with MUI, explicitly test for Preflight/base-style collisions (especially the v4 default border-color and ring changes) once both are in the same app, and scope Tailwind utility classes to avoid fighting MUI component styling
- Do not use v3-era opacity utilities (`bg-opacity-*`, etc.), `flex-shrink-*`/`flex-grow-*`, or `@layer utilities` custom utility syntax — these are removed/changed in v4 and would silently fail or warn
- If any arbitrary-value CSS variable or comma-separated grid template syntax is used, apply v4 syntax (parentheses for vars, underscores instead of commas) since v3 syntax is a breaking change
- Confirm the exact Tailwind version pinned in package.json at implementation time rather than relying on the docs site's displayed version, since the exact patch/minor (v4.3) could not be cross-verified against the npm registry or GitHub releases in this research pass

**current version:** v4.3 [uncertain]

**api surface**
- `npm install tailwindcss @tailwindcss/postcss postcss` (dependency install)
- `postcss.config.mjs` with `plugins: { "@tailwindcss/postcss": {} }`
- `@import "tailwindcss";` in `app/globals.css`
- Standard utility classes (layout, spacing, color, flex/grid) used directly in JSX className props across the Next.js App Router components
- Optional `@theme` / CSS custom-property based customization instead of `tailwind.config.js` (v4 CSS-first config)
- `@utility` directive if any custom utility classes are authored

**pitfalls**
- v4 requires modern browsers only (Safari 16.4+, Chrome 111+, Firefox 128+) — no fallback for older browsers without staying on v3.4
- v3 `@tailwind base/components/utilities` directives no longer work in v4 — must use `@import "tailwindcss";`
- PostCSS/CLI package names changed (`tailwindcss`→`@tailwindcss/postcss`, separate `@tailwindcss/cli`) — using the old package name as the PostCSS plugin will break the build
- Default border and ring colors changed to `currentColor` in v4, which can visually break existing v3-styled components (including possible MUI border conflicts) if not explicitly set
- Several v3 utilities were renamed or removed (`shadow-sm`→`shadow-xs`, `shadow`→`shadow-sm`, `outline-none`→`outline-hidden`, `ring`→`ring-3`, opacity utilities, `flex-shrink-*`/`flex-grow-*`) — copy-pasted v3-era snippets/tutorials may use stale class names
- `corePlugins` option is removed in v4, so any plan to disable specific core utilities via config will not work
- Arbitrary CSS variable syntax and comma-separated grid/bg-position values changed syntax in v4, so v3-style arbitrary value classes are a breaking change, not just a deprecation

*As of: 2026-10-28 (Tailwind CSS docs site displaying v4.3; exact release date not independently confirmed)*

**Sources**
- [Installing Tailwind CSS with PostCSS](https://tailwindcss.com/docs/installation/using-postcss) (official-docs) -- "npm install tailwindcss @tailwindcss/postcss postcss ... @import "tailwindcss";"
- [Upgrade guide](https://tailwindcss.com/docs/upgrade-guide) (official-docs) -- "Tailwind CSS v4.0 requires Safari 16.4, Chrome 111, and Firefox 128 ... npx @tailwindcss/upgrade"
- [Installing Tailwind CSS with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs) (official-docs) -- "npm install tailwindcss @tailwindcss/postcss postcss ... Create a postcss.config.mjs file ... Add an @import to ./app/globals.css"
- [Tailwind CSS Installation (version indicator)](https://tailwindcss.com/docs/installation) (official-docs) -- "this documentation is for Tailwind CSS v4.3 ... displayed as "v4.3" right after the Tailwind CSS logo"


### Official documentation: MUI (Material UI)
*Find the OFFICIAL documentation for "MUI (Material UI)": its current stable version, how it is installed or enabled, the API surface this build will use, and any breaking changes or pitfalls in the last 3 years.*

The current stable release line is Material UI v9 (latest point release v9.5.0, published ~2026-10-09), which runs on React 17/18/19, Node 14+, and requires @emotion/react + @emotion/styled as peer packages. For this inventory module, the build will use core layout/data-display components (Table, Grid with the new `size` prop API, Dialog, Snackbar/Alert, Select/RadioGroup, TextField, CircularProgress/Skeleton, Button) plus MUI's theming (ThemeProvider/CssBaseline) for RoleGuard-gated screens; no MUI X DataGrid is assumed unless added separately. The main pitfalls for a project starting fresh on v9 are: the old `Grid` component is now `GridLegacy` (don't use xs/sm props directly—use the v7+ `size={{xs:12}}` object API), deprecated `component`/`componentsProps` props have been fully removed, and some accessibility-driven prop removals (e.g. Dialog's `disableEscapeKeyDown`) will break code copied from older v5/v6 tutorials or AI-generated snippets.

**Key findings**
- Current stable version: Material UI (core) v9.5.0, part of a coordinated v9 release across Material UI and MUI X; v10.0.0-alpha.0 already published as of 2026-10-09, so v9 is the safe production target.
- Install command: `npm install @mui/material @emotion/react @emotion/styled` (Emotion is the default/recommended styling engine, especially for SSR with Next.js).
- Peer dependency support: React ^17.0.0, ^18.0.0, or ^19.0.0 — this build (React 19) is directly supported with no extra shims.
- If using React 18 or below (not this build's case), `react-is` version must be overridden to match the installed React major version because MUI v9 bundles react-is@19 internally.
- styled-components is explicitly documented as NOT compatible with server-rendered Material UI apps due to babel plugin limitations — irrelevant here since Emotion is the default and Next.js SSR is in use.
- Since MUI v7 (carried into v9), the legacy 12-column `Grid` with `xs`/`sm` props is renamed `GridLegacy`; the former `Grid2` (originally `Unstable_Grid2` in v5, stabilized as `Grid2` in v6) now occupies the `Grid` import name and uses `size={{ xs: 12, sm: 6 }}` / `offset={{ xs: 2 }}` instead of per-breakpoint props.
- MUI v6 (still in effect for v9) removed deprecated ListItem button-related props (`button`, `selected`, etc.) — use `ListItemButton` for clickable list rows.
- MUI v9's breaking changes vs v8 center on removing deprecated `component` and `componentsProps` props library-wide, plus accessibility changes: Backdrop no longer sets `aria-hidden` by default, and Dialog/Modal dropped the `disableEscapeKeyDown` prop.
- MUI v9 also reworks `sx` prop internals for up to ~30% performance improvement on heavy `sx` usage and claims a ~3% bundle-size reduction versus v7.
- Minimum supported environment since v6 (still true in v9): Node.js 14+, Chrome 109+, TypeScript 4.7+; IE 11 support was fully dropped in v6, shrinking bundle size by ~2.5MB.

**Recommendations**
- Install with `npm install @mui/material @emotion/react @emotion/styled` and keep React 19 as-is; no react-is override needed for this stack.
- Use the modern `Grid` component with the `size={{ xs: 12, sm: 6 }}` prop object for the stock screen's layout (item cards, batch list) — never import `GridLegacy` or write bare `xs={12}` props, since AI-generated code or older tutorials may still suggest the pre-v7 syntax.
- Use `ListItemButton` (not a clickable `ListItem`) for selectable rows such as 'choose batch to adjust' or event-linked issue rows.
- For the write-off reason requirement (radio/select, required field) and AI-suggestion confirm/edit screen, use `RadioGroup`/`Select` with MUI's built-in `required` + `error`/`helperText` props, paired with your own validation, rather than relying on any deprecated prop-based validation.
- For the oversized-image/Claude-API-failure error state, use `Alert`/`Snackbar` with explicit error state components rather than relying on default behavior, since Backdrop's `aria-hidden` default changed in v9 and could subtly affect modal/dialog accessibility if you build custom overlays.
- Avoid any `component` or `componentsProps` usage copied from pre-v9 examples — these were removed in v9; use `slots`/`slotProps` instead where component customization is needed.
- Pin an exact MUI version range (e.g. `^9.5.0`) rather than `latest`, since v10.0.0-alpha.0 is already circulating and could be pulled in accidentally by a loose range during `npm install`.

**current version:** 9.5.0 (Material UI core, v9 major line; v10.0.0-alpha.0 exists but is not stable)

**api surface**
- @mui/material: Table/TableHead/TableBody/TableRow/TableCell (on-hand quantity + batch list view)
- Grid (post-v7 Grid2-based API, size={{xs,...}} prop) for responsive layout
- TextField, Select, RadioGroup/FormControlLabel (receipt form, write-off reason, stock-take counted quantity)
- Dialog/DialogTitle/DialogContent/DialogActions (confirm/edit AI-suggested count before write)
- Button, IconButton
- Alert, Snackbar (handled error states for oversized image / Claude API failure)
- CircularProgress / Skeleton (loading states during AI vision call)
- ListItemButton (selectable batch/event rows)
- ThemeProvider, CssBaseline (app-level theming, consistent with existing RBAC-gated screens)
- sx prop for styling (benefits from v9 sx performance improvements)

**pitfalls**
- Legacy Grid (xs/sm props) was renamed GridLegacy as of v7 and remains so in v9; the current `Grid` import is the former Grid2 and requires the `size`/`offset` object props — mixing old and new syntax is a common AI-code pitfall.
- ListItem's clickable props (button, selected, disabled, autoFocus) were removed in v6 and remain removed in v9; must use ListItemButton.
- v9 removed deprecated `component` and `componentsProps` props library-wide — use `slots`/`slotProps` instead.
- v9 changed default a11y behavior: Backdrop no longer sets aria-hidden by default; Dialog/Modal no longer accept `disableEscapeKeyDown`.
- styled-components is not compatible with server-rendered MUI apps (relevant since this build is Next.js SSR/App Router) — stick with the default Emotion engine.
- If the stack were ever downgraded to React ≤18, `react-is` must be version-overridden to avoid runtime prop-check errors since MUI v9 bundles react-is@19 internally — not an issue for this build's React 19, but a trap if dependencies drift.
- v10.0.0-alpha.0 is already published; an unpinned `npm install @mui/material@latest` could pull a pre-release — pin to the v9.x range explicitly.

*As of: 2026-10-28 (MUI core v9.5.0, published ~2026-10-09; v10.0.0-alpha.0 exists but is not stable)*

**Sources**
- [Material UI – Installation](https://mui.com/material-ui/getting-started/installation/) (official-docs) -- "npm install @mui/material @emotion/react @emotion/styled ... React: ^17.0.0, ^18.0.0, or ^19.0.0"
- [Material UI – Upgrade to v6](https://mui.com/material-ui/migration/upgrade-to-v6/) (official-docs) -- "support for IE 11 has been completely removed ... Old: xs={12} sm={6} xsOffset={2} New: size={{ xs: 12, sm: 6 }} offset={{ xs: 2, sm: 3 }}"
- [Material UI – Versions](https://mui.com/material-ui/getting-started/versions/) (official-docs) -- "v9 is the current stable major version of Material UI, marked with a checkmark (✓) as recommended for production use."
- [Introducing Material UI v9](https://mui.com/blog/introducing-material-ui-v9/) (official-docs) -- "the main breaking changes are related to the removal of deprecated props such as component and componentsProps across the library ... Backdrop no longer includes aria-hidden by default ... Dialog and Modal: removed disableEscapeKeyDown prop"
- [@mui/material - npm](https://www.npmjs.com/package/@mui/material) (other) -- "The latest version of @mui/material is 9.5.0, last published 19 days ago ... a v10.0.0-alpha.0 pre-release version was published on October 9, 2026"


### Official documentation: Vitest
*Find the OFFICIAL documentation for "Vitest": its current stable version, how it is installed or enabled, the API surface this build will use, and any breaking changes or pitfalls in the last 3 years.*

Vitest's official docs (vitest.dev) confirm the current stable line is v5 (5.0.5), which bumped its minimum runtime to Node.js >=22.12.0 and Vite >=6.4.0 — a real constraint to check against this project's Node version before adopting it. For this build (pure FIFO unit-test functions with no Firestore/network calls, per acceptance criteria 1 and 14), the relevant API surface is small: `describe`, `test`/`it` (plus `.each` for parameterized FIFO layer-consumption cases), `expect` assertions, and `vi` (mocks/spies, though likely minimal since FIFO logic should be pure). If the dev environment is pinned to Node 20, the previous major, Vitest 4.1.12, officially supports Node ^20.0.0/^22.0.0/>=24.0.0 and should be used instead of forcing a Node upgrade. Config is near-zero: Vitest auto-reads an existing `vite.config.*` or a dedicated `vitest.config.*`, which is sufficient for a Node-environment unit-test suite with no DOM/browser mode needed here.

**Key findings**
- Current stable version per vitest.dev and npm/unpkg package.json is 5.0.5 (v5.0.0 major released 2024-09-03, confirmed via GitHub releases page).
- Vitest 5.0 package.json 'engines' field: Node.js "^22.12.0 || ^24.0.0 || >=26.0.0"; 'peerDependencies.vite': "^6.4.0 || ^7.0.0 || ^8.0.0" (required).
- The previous major, Vitest 4.1.12, has engines "^20.0.0 || ^22.0.0 || >=24.0.0" and vite peer "^6.0.0 || ^7.0.0 || ^8.0.0" — this is the version to use if the project's Node runtime is 20.x.
- Install command per official Getting Started guide: `npm install -D vitest` (yarn users additionally need `vite` as an explicit peer per the v5 migration guide).
- Vitest auto-detects and reads an existing `vite.config.*`; a separate `vitest.config.*` can be used for test-only settings and takes priority when both exist.
- Core API confirmed from official docs: `describe(name, body)`, `test`/`it` with `.skip`/`.only`/`.todo`/`.concurrent`/`.each`/`.for`, hook functions `beforeEach`/`afterEach`/`beforeAll`/`afterAll`, the `expect(value)` assertion API, and the `vi` utility object for mocking (`vi.fn`, `vi.mock`, `vi.spyOn`, `vi.hoisted`).
- `vi.mock` calls are hoisted to the top of the file and always execute before imports; in v5, hoisted calls (`vi.mock`, `vi.unmock`, `vi.hoisted`) must be at module top-level or Vitest throws an error (previously more lenient).
- In v5, `clearMocks` now defaults to `true`, automatically clearing mock call history before each test — a behavior change from earlier majors where it defaulted to `false`.
- v5 removed `test.sequential`/`describe.sequential` in favor of `concurrent: false`, and removed deprecated entry points / the previously-inlined `expect` package sharing state with Vitest's `expect`.
- v5 changed unawaited async `expect` assertions to fail the test outright, where earlier versions auto-awaited with only a warning — relevant if any FIFO tests use async setup.
- Documented common pitfalls: Vitest does not respect `tsconfig.json` `baseUrl` automatically (needs `vite-tsconfig-paths` or relative imports); CommonJS/ESM interop can break for packages with malformed exports (fix via `server.deps.inline`); worker pool quirks (e.g. `fetch` + `pool: 'threads'` termination issues) are unlikely to matter for this project's pure-function tests but are worth knowing if coverage/CI issues arise.

**Recommendations**
- Check the project's actual Node version first: if it is Node 20.x, install Vitest 4.x (e.g. `npm install -D vitest@^4`) rather than v5, since v5 hard-requires Node >=22.12.0 and will fail to install/run otherwise; if Node is already >=22.12, v5 is fine and is the officially current stable line.
- Since the PRD requires `devDependencies` in `package.json` plus a foreground `npm install` (not `--no-save`), run `npm install -D vitest` (or the pinned major matching the Node version) in the foreground as specified by the build constraints.
- For the FIFO pure-function tests (criteria 1 and 14), the only API surface actually needed is `describe`, `test`/`it`, `test.each` (for the partial-layer/multi-layer/over-issue/zero-cost-donated-layer cases), and `expect` — mocking (`vi`) is likely unnecessary since the FIFO functions must have no Firestore or network calls.
- No custom `vitest.config.ts` is strictly required if there's no existing `vite.config.*` for this Next.js project; a minimal `vitest.config.ts` with `test: { environment: 'node' }` is enough for pure-function unit tests and avoids pulling in jsdom/happy-dom unnecessarily.
- Avoid relying on `baseUrl`/path-alias resolution in test files unless `vite-tsconfig-paths` is added, since Vitest does not read `tsconfig.json` paths by default — a documented, repeat source of import-resolution failures.
- If upgrading Vitest later, review the official migration guide for the specific major jump, since v5 changed default `clearMocks` behavior and tightened `vi.mock`/`vi.hoisted` placement rules, which can silently change test isolation behavior.

**current version:** 5.0.5 (latest stable; fallback: 4.1.12 for Node 20 environments)

**api surface**
- describe(name, fn) — group FIFO test suites (e.g. per-item, per-scenario)
- test(name, fn) / it(name, fn) — individual FIFO test cases
- test.each(cases)([...]) — parameterized tests for partial/multi-layer consumption scenarios
- expect(value).toBe/.toEqual/.toThrow(...) — assertions for on-hand quantities, layer remainders, over-issue rejection errors
- beforeEach/afterEach — reset in-memory FIFO state fixtures between tests
- vi.fn()/vi.spyOn() — only if isolating any boundary calls; not required for pure FIFO math per constraint
- npm install -D vitest — add as devDependency per build constraint
- vitest.config.ts with test.environment: 'node' — minimal config for pure-function unit tests

**pitfalls**
- Vitest 5.x requires Node.js >=22.12.0 and Vite >=6.4.0 — will not install/run correctly on Node 20; must pin to Vitest 4.x (Node ^20/^22/>=24) if the project's runtime is Node 20
- v5 changed clearMocks default to true, altering mock-state behavior between tests compared to earlier versions
- v5 requires vi.mock/vi.unmock/vi.hoisted calls to be at module top-level, throwing where earlier versions were more lenient
- v5 removed test.sequential/describe.sequential in favor of concurrent: false
- v5 makes unawaited async expect assertions fail tests outright instead of just warning
- Vitest does not read tsconfig.json baseUrl/path aliases by default, a common source of import-resolution failures without vite-tsconfig-paths
- CommonJS/ESM interop issues can arise for dependencies with malformed export fields, requiring server.deps.inline workarounds

*As of: Vitest v5.0.5 (v5.0.0 major released 2024-09-03); Vitest v4.1.12 as fallback for Node 20 environments; information fetched from vitest.dev and package registries on 2026-10-28*

**Sources**
- [Vitest — Getting Started Guide](https://vitest.dev/guide/) (official-docs) -- "Vitest requires Vite >=v6.4.0 and Node >=v22.12.0."
- [Vitest — API Reference](https://vitest.dev/api/) (official-docs) -- "describe(name, body) ... test(name, body?, timeout?) ... vi — Utility for mocking and test utilities"
- [Vitest — Mocking Guide](https://vitest.dev/guide/mocking.html) (official-docs) -- "A vi.mock call is hoisted to top of the file. It will always be executed before all imports."
- [Vitest — Common Errors](https://vitest.dev/guide/common-errors.html) (official-docs) -- "Vitest doesn't automatically respect tsconfig.json's baseUrl setting—you'll need to install vite-tsconfig-paths plugin or rewrite paths as relative imports."
- [Vitest — Migration Guide](https://vitest.dev/guide/migration.html) (official-docs) -- "Vitest 5.0 requires Vite >= 6.4.0 and Node.js >= 22.12.0. ... clearMocks now defaults to true, clearing mock history before each test"
- [vitest-dev/vitest — Releases](https://github.com/vitest-dev/vitest/releases) (repo) -- "v5.0.0 ... Vitest 5 is officially out"
- [vitest package.json (unpkg, latest/v5)](https://unpkg.com/vitest/package.json) (official-docs) -- ""engines": { "node": "^22.12.0 || ^24.0.0 || >=26.0.0" }, "peerDependencies": { "vite": "^6.4.0 || ^7.0.0 || ^8.0.0" }"
- [vitest@4 package.json (unpkg)](https://unpkg.com/vitest@4/package.json) (official-docs) -- ""version": "4.1.12", "engines": { "node": "^20.0.0 || ^22.0.0 || >=24.0.0" }"


### Official documentation: Anthropic Claude API (Messages / Vision)
*Find the OFFICIAL documentation for "Anthropic Claude API (Messages / Vision)": its current stable version, how it is installed or enabled, the API surface this build will use, and any breaking changes or pitfalls in the last 3 years.*

The official Anthropic docs (platform.claude.com, the current home for docs.claude.com) describe the Messages API as the single endpoint (POST /v1/messages) used for both text and vision; vision is not a separate product but an `image` content block type within a normal Messages request. For this build, a Next.js API route should call the Anthropic SDK server-side, send the user's photo as a `base64` image content block alongside a text instruction asking for item + count, and parse the JSON-ish response client-side for user confirmation before writing to Firestore (satisfying AC7/AC8). The API requires the `x-api-key` header and an `anthropic-version` header; the latest documented version is `2026-10-21`, with `2023-06-01` as the long-standing baseline most SDKs still default to. Key operational limits to respect: 10MB max base64 image size on the direct API, 32MB max total request size, and specific error types (`429 rate_limit_error`, `529 overloaded_error`, `413 request_too_large`) that must be translated into the 'handled error state' required by AC8 rather than a crash/500.

**Key findings**
- Vision is implemented via an `image` content block inside a normal POST https://api.anthropic.com/v1/messages request, with `source.type` of `base64`, `url`, or `file` (Files API) — confirmed by reading platform.claude.com/docs/en/build-with-claude/vision.
- Supported image formats: image/jpeg, image/png, image/gif, image/webp. Animated GIFs: only first frame used.
- Max image size: 10 MB base64-encoded on the direct Claude API (5 MB on Bedrock, 10 MB on claude.ai). Max dimensions 8000x8000 px; above 20 images in one request a stricter per-image pixel limit kicks in.
- Overall Messages API request size limit is 32 MB (returns 413 request_too_large if exceeded); Files API allows up to 500 MB uploads.
- Required headers: `x-api-key` (API key) and `anthropic-version` (e.g. `2023-06-01` or the current `2026-10-21`). Client SDKs set this header automatically.
- Current/latest API version per the versioning page is `2026-10-21`; it removed `temperature`/`top_p`/`top_k` params (400 error if sent) and tightened a few document/citation block rules — not relevant to this build's simple vision-classification call, but worth knowing the SDK default version may differ.
- Error shape is consistent JSON: `{type:'error', error:{type, message}, request_id}`. Error types relevant to this build's error-state requirement: 400 invalid_request_error, 401 authentication_error, 413 request_too_large (oversized image), 429 rate_limit_error, 500 api_error, 504 timeout_error, 529 overloaded_error.
- Official SDK auto-retries transient errors (connection errors, 429, 5xx) twice by default with exponential backoff, honoring `retry-after`.
- Claude's own counting is explicitly called out as approximate ('Claude can give approximate counts of objects in an image but might not always be precisely accurate, especially with large numbers of small objects') — directly supports AC7's requirement that a human must confirm/edit the AI suggestion before it is ever written to Firestore.
- Uploaded images are not stored beyond the request (ephemeral) and are not used for model training, per the vision page's FAQ.
- Resolution/token cost: images are billed in 28x28px 'visual token' patches; a typical ~1000x1000px photo costs roughly 1,296–1,521 visual tokens depending on model resolution tier — relevant for estimating per-photo cost for a nonprofit's budget.
- Model identifiers shown throughout current docs examples (e.g. claude-opus-5-5, claude-sonnet-5, claude-sonnet-5-5, claude-haiku-5-5) reflect the Anthropic model lineup as of the docs' last update; pick the cheapest/fastest vision-capable model available at build time for a simple 'what item + how many' classification task.

**Recommendations**
- Call the Messages API only from a Next.js API route (server-side), using the official `@anthropic-ai/sdk` (or `anthropic` Python if applicable) so the API key stays in an environment variable and never reaches the client — matches the locked constraint and the SDK's built-in retry/backoff handling.
- Resize/compress the photographed image client-side (or in the API route) before base64-encoding to stay well under the 10 MB per-image / 32 MB total request limits, and return a clear 'image too large' error to the UI if it still exceeds limits (AC8).
- Send the image as a `base64` `image` content block plus a text instruction asking Claude to return a structured suggestion (item name + quantity); use `output_config`/structured-output or careful prompt instructions to get parseable JSON back, but always require explicit user confirm/edit before any Firestore write (AC7).
- Wrap the Anthropic API call in a try/catch that maps known error types (429, 500, 504, 529, 413, invalid_request_error) to a user-facing 'AI suggestion unavailable, please enter manually' state rather than letting the request 500 or crash the UI (AC8).
- Pin a specific `anthropic-version` header (or rely on the latest SDK's default) rather than hardcoding an old date, and periodically check the versioning page for breaking changes before upgrading the SDK.
- Do not rely on Claude's count as authoritative — treat it purely as a pre-fill suggestion, consistent with Anthropic's own documented counting-accuracy limitation.
- Choose the lowest-cost vision-capable model in the current lineup (smallest resolution tier / lowest per-token price) for this low-stakes 'suggest item + count' use case rather than a frontier/high-resolution model, since the nonprofit use case doesn't need maximum fidelity and the docs show high-resolution tiers can cost ~3x more in visual tokens.

**current version:** anthropic-version header: 2026-10-21 (latest); 2023-06-01 is the long-standing baseline most SDKs still send by default [uncertain]

**api surface**
- POST https://api.anthropic.com/v1/messages (Messages API) — called server-side from a Next.js API route
- Request headers: x-api-key, anthropic-version, content-type: application/json
- Request body: { model, max_tokens, messages: [{ role: 'user', content: [ {type:'image', source:{type:'base64', media_type, data}}, {type:'text', text} ] }] }
- Response: { id, type, role, content: [{type:'text', text}], model, stop_reason, usage:{input_tokens, output_tokens} }
- Error response shape: { type:'error', error:{type, message}, request_id }
- Official Anthropic SDK (e.g. @anthropic-ai/sdk) client.messages.create(...) with built-in retry/backoff

**pitfalls**
- Image + overall request size limits: 10MB per base64 image, 32MB total request — oversized photos from a phone camera can easily exceed this and must be compressed/resized server-side before sending.
- Above 20 images in a single request, a much stricter per-image pixel limit applies — not directly relevant for a single stock-count photo, but relevant if future features batch multiple photos.
- API version 2026-10-21 removed `temperature`, `top_p`, `top_k` params entirely (400 error on any model) — avoid using these if copying older example code.
- Several recent model-specific breaking changes around `thinking` configuration (adaptive vs enabled vs disabled vs between_tools) differ by model — if using extended/adaptive thinking features, must match the exact model's supported mode or get a 400 invalid_request_error; for a simple vision classification call, thinking is unnecessary so this can largely be avoided by omitting the `thinking` parameter.
- 429 rate_limit_error can also mean a spend-cap was hit (no retry-after header, keeps failing) — don't assume all 429s are transient and retryable the same way.
- Claude's own object-counting is documented as approximate for images with many small objects — must not be trusted as ground truth, reinforcing AC7's human-confirmation requirement.
- Streaming responses can error mid-stream after an initial 200 OK — if streaming is used for the vision call (not required for this build), standard try/catch on the initial response won't catch it.

*As of: Anthropic API version 2026-10-21 (versioning page); vision/messages/errors docs fetched live from platform.claude.com on 2026-10-28*

**Sources**
- [Vision - Claude Docs](https://platform.claude.com/docs/en/build-with-claude/vision) (official-docs) -- "On the API, provide images to Claude as `image` content blocks using one of three source types: 1. A base64-encoded image embedded in the request body 2. A URL reference to an image hosted online 3. A `file_id` returned by the Files API"
- [Messages API Reference - Claude Docs](https://platform.claude.com/docs/en/api/messages) (official-docs) -- "**`x-api-key`** (required): Your Anthropic API key ... Content Blocks ... Image Block: {"type": "image", "source": {"type": "base64|url|file", ...}}"
- [Versions - Claude Docs](https://platform.claude.com/docs/en/api/versioning) (official-docs) -- "When making API requests, you must send an `anthropic-version` request header. For example, `anthropic-version: 2026-10-21`. ... Anthropic recommends using the latest API version whenever possible."
- [Claude API errors - Claude Docs](https://platform.claude.com/docs/en/api/errors) (official-docs) -- "429 - `rate_limit_error`: Your organization has hit a rate limit ... 529 - `overloaded_error`: The API is temporarily overloaded. ... Messages API | 32 MB"


### IAS 2 FIFO cost-flow rules and donated inventory treatment
*What does IAS 2 require for FIFO cost-layer consumption and for valuing donated (fair-value, possibly zero-cost) inventory, so the engine and its explanations are defensible for coursework?*

IAS 2 (paras 25 and 27) permits only two cost formulas, FIFO or weighted average, and bans LIFO: FIFO assumes the earliest-acquired/produced units are deemed consumed first, so the remaining balance is always valued at the most recent costs — this maps directly onto a strict oldest-batch-first consumption engine with partial and multi-layer draws. IAS 2 itself contains no provision for inventory received at no cost (donations); it is silent on this scenario because it assumes a purchase/production cost already exists. The closest authoritative treatment is IAS 2's public-sector counterpart, IPSAS 12, which requires inventory acquired through a non-exchange transaction (e.g. a donation) to be measured at fair value as at the date of acquisition [uncertain], and inventory held for distribution at no or nominal charge to be measured at the lower of cost and current replacement cost [uncertain] — though these specific paragraph citations could not be independently confirmed by opening a primary IPSAS 12 text, only via secondary search summaries. US GAAP (ASC 820, per ASU 2020-07) independently confirms the same fair-value-at-receipt principle for nonprofit in-kind donations, which is directly on point for this build's non-profit context. For coursework defensibility, the build should apply IAS 2's layer mechanics literally and explicitly document, as a separate judgment call, that donated-layer unit cost (which may legitimately be zero) is assigned using the fair-value-at-acquisition principle borrowed from IPSAS 12/nonprofit GAAP rather than from IAS 2 itself.

**Key findings**
- IAS 2 para 25 (IFRS Foundation issued text, current through the 2025 edition): cost of inventories is assigned using FIFO or weighted average only; the same formula must be used for inventories of similar nature/use; LIFO is not a permitted formula. Confirmed via a page opened directly (ifrsbuddy.com), which summarizes the official clause.
- IAS 2 para 27: FIFO assumes items purchased/produced first are deemed sold/consumed first, so ending inventory reflects the most recently acquired costs — i.e., strict chronological layer consumption, matching an oldest-batch-first engine.
- No text addressing donated, gifted, or zero-cost inventory could be found within IAS 2 itself across multiple searches and the opened secondary summary (ifrsbuddy.com) — this appears to be a genuine, documented gap in the standard rather than a search failure.
- IPSAS 12 (the public-sector/not-for-profit sibling standard to IAS 2) reportedly requires inventory acquired via a non-exchange transaction to be measured at fair value as at the date of acquisition (cited as paragraph 16 in secondary sources), and inventory held for distribution at no/nominal charge to be measured at the lower of cost and current replacement cost (cited as an adjacent paragraph). [uncertain] — the primary IPSAS 12 PDF could not be opened/decoded by the fetch tool across five separate attempts (IFAC, PSASB Kenya, UN), so this is relied on via search-engine summaries only, not a page read directly.
- US GAAP (ASC 820, confirmed via a directly opened article) requires nonprofits to record qualifying contributed nonfinancial assets, including donated inventory, at fair value on receipt, using a documented, supportable valuation methodology (observable prices, comparable transactions, or replacement cost) — explicitly warning that a donor's own stated value is not sufficient by itself. ASU 2020-07, effective for annual periods after 15 June 2021, additionally requires such contributions to be presented as a separate line item with disclosed valuation technique and inputs.
- No candidate paper from the provided leads could be verified as directly addressing FIFO layer mechanics or donated-inventory valuation: the one plausibly relevant title (MDPI IJFS 2023, 'Qualitative Analysis of IAS 2 Capability...') returned HTTP 403 on every fetch attempt and so is not cited, consistent with the rule against citing unopened papers.

**Recommendations**
- Implement the FIFO engine to mirror IAS 2 paras 25/27 literally: layers are consumed in strict chronological (received-date) order, partial-layer consumption is normal, a single issue can span multiple layers, and no formula other than FIFO is offered (do not build in a LIFO or average-cost toggle — it would misrepresent the standard being cited).
- For donated stock, create a cost layer with date, quantity, and a unit cost of zero (or an assigned fair value if the donation has a known market value), and treat it exactly like a purchased layer for FIFO sequencing purposes — it still gets consumed in date order, it is just valued at zero (or fair value) in the cost report.
- In code comments/README or the coursework write-up (not in-app user text), explicitly note that IAS 2 does not itself address donated/zero-cost inventory, and that the zero/fair-value-cost convention is adopted by analogy to IPSAS 12 / nonprofit GAAP practice rather than derived from IAS 2 — this anticipates the exact ambiguity the MDPI paper lead (unverified) suggests markers may probe.
- Do not attempt to implement NRV write-down logic (IAS 2 paras 28-33) for this build — it is for period-end balance-sheet valuation, not for an operational FIFO issue/write-off ledger; keep write-offs (expired/damaged/lost) as explicit movement records instead, which is simpler and already required by the acceptance criteria.
- Flag the IPSAS 12 paragraph numbers in this research as unverified; if the coursework write-up needs an exact citation, the student should pull the live paragraph text from an IFAC-issued IPSAS 12 PDF directly rather than relying on this summary.

*As of: IAS 2 cost-formula provisions per IFRS Foundation issued text (2021-2025 editions, unchanged on this point); US GAAP in-kind donation fair-value rules per ASU 2020-07, effective for annual periods after 15 June 2021; IPSAS 12 donated-inventory provisions as of 2024-2025 IFAC-issued text [uncertain, not independently opened]. Retrieved 2026-10-28.*

**Sources**
- [IAS 2 FIFO vs Weighted Average (LIFO Banned)](https://ifrsbuddy.com/learn/en/ias-2-cost-formulas) (article) -- "FIFO and weighted average are the only permitted cost formulas; consistent application by inventory class... FIFO assumes the oldest units purchased are sold first."
- [GAAP Requires Nonprofits to Report In-Kind Donations on Financial Statements](https://hbkcpa.com/insights/gaap-requires-nonprofits-to-report-in-kind-donations-on-financial-statements/) (article) -- "nonprofits must record qualifying contributed nonfinancial assets at fair value when the contribution is received... A donor's statement of the amount it believes an item is worth does not, by itself, necessarily establish the fair value that should be recorded."


### Atomic multi-document stock mutations with Firestore transactions
*How to structure a Firestore transaction that reads multiple cost-layer docs, mutates several of them, and writes a movement record atomically without race conditions?*

A Firestore transaction for FIFO issue/write-off should read all the item's cost-layer documents (oldest-first) with transaction.get()/getAll() before any write, compute the FIFO consumption in a pure in-memory function, then within the same transaction callback call update() on each mutated layer and create() (not set()) for the new movement/write-off document. Firestore enforces that all reads in a transaction happen before any writes, applies writes only if none of the read documents changed, and automatically retries the whole callback on contention, so the callback must be side-effect-free outside of Firestore calls and must re-validate on-hand quantity on every retry rather than trusting values computed outside the transaction. This naturally satisfies 'no partial writes' and 'reject over-issue, write nothing' because an insufficient-quantity check that throws inside the callback aborts the entire transaction with zero documents touched.

**Key findings**
- Firebase official docs state: 'Read operations must be executed before write operations' inside a transaction function, and 'Transactions never partially apply writes. All writes execute at the end of a successful transaction.' (firebase.google.com/docs/firestore/manage-data/transactions)
- Firebase docs explicitly warn transaction functions 'should not directly modify application state' and may run more than once, so any FIFO math must be recomputed from the values read inside that specific transaction attempt, not memoized from an earlier read.
- Google Cloud's transaction-contention page (last updated 2026-10-26 UTC) states contention is retried automatically, and after enough retries fails with 'ABORTED: Too much contention on these documents. Please try again.' It also documents two concurrency modes: pessimistic (default on Standard edition, locks read docs until commit) and optimistic (default on Enterprise edition, validates at commit and retries on conflict); mobile/web client SDKs always use optimistic concurrency regardless of edition.
- The Admin Node.js SDK Transaction class (googleapis.dev reference) exposes get(ref|query) and getAll(...refs) for pessimistically-locked reads, and set(), update(), create(), delete() for writes; create() fails if the document already exists and update() fails if it does not — useful for guaranteeing the movement/write-off doc is a fresh, never-duplicated record.
- Default maxAttempts for automatic transaction retries is commonly cited as 5 across Firebase/Google Cloud client libraries (JS, Go, Java, Python) per aggregated search results, but this exact numeric default was not confirmed by directly opening an official reference page that enumerates it in this session [uncertain].

**Recommendations**
- Run the FIFO issue/write-off logic entirely inside a single Admin SDK runTransaction() callback: first read the item's layer docs ordered oldest-first (via a query snapshot or getAll on known layer IDs), sum remainingQty, and abort by throwing if requested quantity exceeds on-hand — this guarantees AC2 (no negative stock, no movement written on over-issue) because Firestore discards all writes on a thrown error.
- Keep the pure FIFO allocation math (which layers to decrement, by how much) in a standalone, Firestore-free function per AC14/AC1, and call that function from inside the transaction callback using only the snapshot data just read — do not pass in data computed before the transaction started, since retries re-run the callback.
- Within the same transaction, use update() on each partially/fully consumed layer document and create() for the new movement document, never set(), so a retried or duplicated movement write fails loudly instead of silently overwriting.
- Scope each transaction to one item's layers plus one new movement doc; don't batch multiple unrelated items into one transaction, since Firestore's contention model locks/validates only the documents actually read, and wider transactions increase the chance of ABORTED retries.
- Because client-side Firestore SDKs always use optimistic concurrency and server-side Admin SDK on Standard-edition Firestore defaults to pessimistic locking, run this logic from the Next.js API route using the Admin SDK so behavior is predictable and server-controlled, consistent with the constraint that mutation logic stays server-side.
- Treat ABORTED-after-retries as a user-facing 'please retry' error state in the UI rather than a crash, since the docs confirm Firestore itself gives up after a bounded number of automatic retries under heavy contention.
- For write-offs and stock-take adjustments, apply the identical pattern (read current layers/on-hand inside the transaction, validate reason/variance server-side, then update layers + create one adjustment movement) so firestore.rules enforcing required reason fields and role checks are backed by equivalent validation in the transaction, not just the client UI.

*As of: 2026-10-26 (transaction-data-contention page shows this last-updated date); other Firebase/Firestore docs pages fetched same session, no explicit version number stated on the general transactions page*

**Sources**
- [Transactions and batched writes | Firestore | Firebase](https://firebase.google.com/docs/firestore/manage-data/transactions) (official-docs) -- "Read operations must be executed before write operations. ... Transactions never partially apply writes. All writes execute at the end of a successful transaction."
- [Data contention in transactions | Firestore in Native mode | Google Cloud Documentation](https://docs.cloud.google.com/firestore/docs/transaction-data-contention) (official-docs) -- "ABORTED: Too much contention on these documents. Please try again. ... Mobile/web SDKs always use optimistic concurrency controls."
- [Transaction - Documentation (Node.js Admin SDK)](https://googleapis.dev/nodejs/firestore/latest/Transaction.html) (official-docs) -- "getAll(...documentRefsOrReadOptions) - Retrieves multiple documents with pessimistic locks. ... create(documentRef, data) - Creates a new document. Fails if the document already exists at that location."


### Two-tier RBAC in firestore.rules for new collections
*What rule patterns correctly scope read/write per collection (items, layers, movements, counts) to a logging role vs an admin role, matching the existing role field on `users`?*

Scope the two-tier RBAC by writing a reusable Firestore Rules function that does a single get() on /databases/$(database)/documents/users/$(request.auth.uid) and reads its role field, then gate each new collection's read/write rules on that role matching 'logging' or 'admin'. Items, layers, movements, and counts should each get their own match block (nested or flat) with allow create/update split from allow delete/write-off-specific fields so that logging-tier users can create receipts/issues/counts while only admin can write off, adjust, or read valuation fields; this mirrors Firebase's documented get()-based admin-field pattern and keeps calls within the 10 get()/exists() per single-document request limit (20 for batched/transactional writes) as long as the role lookup is written once as a function and reused, since repeated calls to the same path are cached and don't count twice.

**Key findings**
- Firebase's official rules-conditions doc gives the canonical RBAC pattern: allow delete: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.admin == true; — i.e. read the caller's own user document and check a field on it.
- Per the same doc, get()/exists()/getAfter() calls are capped at 10 for single-document requests and query requests, and 20 for multi-document reads, transactions, and batched writes; exceeding the limit causes the request to be denied.
- Cached calls (same document path requested again within the same rules evaluation) do not count against these limits, so defining one isAdmin()/getRole() helper function and calling it from multiple allow clauses in the same request is safe and cheap.
- Each get()/exists() call executes a real read against Firestore and is billed even if the rule ultimately denies the request, per the official docs — relevant for cost when four new collections (items, layers, movements, counts) each check the role on every operation.
- The rules-structure doc confirms match blocks can be nested per collection (e.g. match /items/{itemId} { ... } alongside match /movements/{movementId} { ... }) and that granular operations (get, list, create, update, delete) can be split within a single match block, which is how logging-tier 'create issues/receipts/counts' can be allowed while delete/write-off/adjust are restricted to admin within the same collection.

**Recommendations**
- Define one shared function, e.g. function getUserRole() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; }, and reuse it across all four new collections rather than inlining get() calls repeatedly, to stay well under the 10/20 call ceilings and to centralize the role-field read so it keeps matching the existing users.role convention referenced in the codebase's RoleGuard/useRole.
- Split operations per collection: allow create for logging and admin on items/layers/movements/counts (receipts, issues, counts), but restrict allow delete and any write-off/adjustment-type writes, plus any valuation-bearing read, to admin only — matching acceptance criteria 11 and 12 exactly.
- Do not rely on request.resource.data alone to infer 'this is a write-off' for rule purposes if write-offs are just movement documents with a reason field; instead consider a discriminant field (e.g. movementType) that rules can check directly, since Firestore rules cannot execute arbitrary business logic to distinguish issue-vs-writeoff otherwise.
- Enforce the 'no write-off without a reason' acceptance criterion (AC6) at the rules layer too, not just the UI, by requiring request.resource.data.reason is one of an allowed enum when movementType == 'writeoff', so firestore.rules is the final backstop as the PRD constraint requires rules to be extended, not replaced.
- Because each role check is a billed read, and this module is accounting-sensitive but low-traffic (society refreshment stock), the per-call read cost is acceptable; do not attempt to avoid it by caching role in a custom claim unless the existing codebase already uses custom claims elsewhere — stay consistent with whatever the existing RoleGuard/useRole implementation already reads (likely the users document's role field, per the question's own phrasing).

*As of: Firebase documentation accessed 2026-10-28; no explicit last-updated date shown on the fetched pages, content describes the current (v2) Firestore Security Rules behavior.*

**Sources**
- [Access data with security rules | Firestore](https://firebase.google.com/docs/firestore/security/rules-conditions) (official-docs) -- "allow delete: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.admin == true;"
- [Get started with Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-structure) (official-docs) -- "Maximum 10 exists(), get(), and getAfter() calls per single-document request, and a maximum of 20 for multi-document reads, transactions, and batched writes"


### Calling Claude's vision API from a Next.js Route Handler
*What is the correct request shape for sending an image to Claude's messages/vision endpoint server-side, including size limits and structured-output handling for item/count/confidence?*

Claude's Messages API accepts images as a content block (`{"type":"image","source":{...}}`) inside a `user` message, alongside a `text` block, sent as a normal POST to `https://api.anthropic.com/v1/messages` with `x-api-key` and `anthropic-version` headers. For this build, the Next.js route handler should base64-encode the uploaded photo (JPEG/PNG/WebP/GIF, ≤10MB base64-encoded, ≤8000x8000px, ideally resized to ≤1568px long edge to control token cost) and send one image + one text instruction per request. For reliable item/count/confidence extraction, define a custom tool with an `input_schema` describing those fields and have Claude return a `tool_use` block instead of parsing free-text JSON; on models that support it, force the call with `tool_choice:{"type":"tool","name":"..."}` plus `strict:true` for schema guarantees, but note some newer models reject forced `tool_choice` and require `auto` + `strict` or the separate structured-outputs feature instead.

**Key findings**
- Image content block shape: `{"type":"image","source":{"type":"base64","media_type":"image/jpeg","data":"<base64>"}}` placed in the `content` array of a `user` message, typically before a `{"type":"text","text":"..."}` block since Claude performs best with image-before-text ordering.
- Supported image formats: image/jpeg, image/png, image/gif, image/webp. Animated GIFs are not supported — only the first frame is used.
- Size/dimension limits (Claude API, not Bedrock/GCP): max 10MB per image when base64-encoded; max 8000x8000px dimensions. Amazon Bedrock caps base64 image size at 5MB.
- If a single request contains more than 20 image/document blocks total (including resent history and tool_result images), a stricter per-image pixel limit applies and oversized images are rejected with `invalid_request_error`; staying at ≤20 images or resizing each image's long edge to ≤2000px avoids this.
- Overall request size limits can bind before the 600-image/request cap: 32MB for standard API endpoints (lower on Bedrock/GCP). For repeated or multi-image use, the Files API lets you upload once and reference by `file_id` to shrink payload size — not required for this build's single-photo-per-request flow but worth knowing.
- Token cost model: images are tiled into 28x28px patches (`visual tokens` = ceil(w/28) × ceil(h/28)). Standard tier models cap at 1568px long edge / 1568 visual tokens; high-resolution tier (Claude 4.7 and later) caps at 2576px long edge / 4784 visual tokens. Oversized images are auto-downscaled preserving aspect ratio unless the image block sets a `transformations`/`oversized_image:"error"` option to reject instead of resize.
- Required headers for a direct REST call: `x-api-key: $ANTHROPIC_API_KEY`, `anthropic-version: 2023-06-01`, `content-type: application/json`, POST to `https://api.anthropic.com/v1/messages`.
- Structured output for item/count/confidence should use tool use: define a tool with `input_schema` (JSON Schema, e.g. properties `item`, `count`, `confidence`, `required: ["item","count"]`). Claude's response then contains a `tool_use` content block whose `input` field is the schema-conformant object — the route handler reads `response.content.find(b => b.type === 'tool_use').input`.
- `tool_choice` options are `auto` (default, Claude decides), `any` (must call some tool), `tool` (must call the named tool), `none`. Forcing `any`/`tool` prefixes the assistant turn with the tool call and skips any `thinking`/explanatory text block.
- Forced tool_choice (`any` or `tool`) is NOT supported on some current models — the docs list Claude Opus 5.5, Sonnet 5.5, Fable 5.1, and Mythos 5.1 as returning a 400 'forced tool use not supported' error for `any`/`tool`; `auto` and `none` still work on those models. The documented workaround is `tool_choice:"auto"` combined with `strict:true` on the tool definition, or Anthropic's separate 'structured outputs' feature, to still guarantee schema-valid output.
- `strict:true` on a tool definition guarantees Claude's `tool_use.input` exactly matches the declared JSON Schema (strict tool use), which is the mechanism to rely on for guaranteed item/count/confidence shape regardless of whether `tool_choice` can be forced on the chosen model.
- Known accuracy limitation from Anthropic's own docs: 'Claude can give approximate counts of objects in an image but might not always be precisely accurate, especially with large numbers of small objects' — directly relevant since the product requires a human to confirm/correct the AI-suggested count (acceptance criterion 7).

**Recommendations**
- Implement the Claude call only inside a Next.js Route Handler (e.g. `app/api/inventory/ai-count/route.ts`), reading `ANTHROPIC_API_KEY` from `process.env` server-side; never send the key or call `api.anthropic.com` from client code, matching the constraint that the key is never exposed client-side.
- In the route handler, validate and resize/compress the uploaded image before encoding to base64 (check size against your own app limit, e.g. reject >8-10MB uploads server-side) so acceptance criterion 8 ('oversized image returns a handled error state') is enforced by your own check, not just by Anthropic's 10MB/8000px limits.
- Send exactly one `image` content block (base64, correct `media_type`) plus one instructional `text` block per request — well within all image-count and request-size limits for this single-photo-per-count use case.
- Define a single custom tool (e.g. `record_stock_count`) with `input_schema` properties for `item` (string), `count` (integer), and `confidence` (number 0-1 or enum low/medium/high), and set `strict:true` on it so the structured response is schema-guaranteed.
- Prefer `tool_choice:{"type":"auto"}` with `strict:true` over forcing `tool_choice:{"type":"tool",...}`, since forced tool_choice is rejected on some current models and `auto`+`strict` works across more models while still guaranteeing schema conformance when the tool is called; have the prompt instruct Claude to always call the tool.
- Wrap the Anthropic SDK call in try/catch and map API errors (400 schema/image errors, network failures, rate limits) to a handled JSON error response (e.g. 422/502) from the route — the UI must show a retry/error state, never a raw 500 or crash, satisfying acceptance criterion 8.
- Never auto-write the parsed `tool_use.input` to Firestore from the route handler — return it to the client for on-screen confirmation/edit, and only persist after explicit user confirmation, to satisfy acceptance criterion 7.
- Pin the actual model ID to whatever is current and available in your Anthropic SDK/account at implementation time rather than copying a documentation example verbatim — the docs page fetched shows forward-looking model names (e.g. `claude-opus-5-5`); confirm the exact model string against your installed `@anthropic-ai/sdk` version and Anthropic console before hardcoding it.

*As of: Documentation pages fetched live on 2026-10-28 from platform.claude.com (current official Anthropic docs at time of research; no separate dated changelog entry found on the vision/tool-use pages themselves)*

**Sources**
- [Vision - Claude Docs](https://platform.claude.com/docs/en/build-with-claude/vision) (official-docs) -- "The maximum size per image is: 10 MB (base64-encoded) on the Claude API... The maximum dimensions for each image are 8000x8000 px... Claude supports JPEG, PNG, GIF, and WebP images... Animations are unsupported, and only the first frame is used."
- [Tool use with Claude - Claude Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) (official-docs) -- "To have Claude call a function that you define, pass a tool with an `input_schema`, then run the call when Claude returns a `tool_use` block."
- [Define tools - Claude Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools) (official-docs) -- "Not every model and setting supports forced tool use. Where it isn't supported, `tool_choice: {"type": "any"}` and `tool_choice: {"type": "tool", "name": "..."}` fail... Claude Opus 5.5, Claude Sonnet 5.5, Claude Fable 5.1, and Claude Mythos 5.1 ... `any` and `tool` return a 400 error."


### Vitest setup for deterministic TS unit tests in this repo
*What vitest config and test patterns best suit testing pure FIFO functions (partial layers, multi-layer issues, edge cases) in a Next.js/TypeScript project?*

For testing pure FIFO functions (no Firestore/network calls) in this Next.js 15/TypeScript project, Vitest's default `node` test environment is the right fit — no jsdom/DOM setup is needed for these files, only for React component tests elsewhere in the app. Official Next.js App Router guidance (lastUpdated 2026-08-25) specifies installing `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`, creating a `vitest.config.mts` with `tsconfigPaths()` and `react()` plugins and `environment: 'jsdom'` for component tests, while FIFO unit-test files can simply omit/override that environment (defaulting to `node`) since Vitest 5 requires Node >=22.12.0 and Vite >=6.4.0. Table-driven edge cases (partial layer consumption, multi-layer issue, over-issue rejection, zero-cost donated layers) map cleanly onto Vitest's `test.each`/object-based parameterized tests. Test files must contain `.test.` or `.spec.` in the filename, and `package.json`'s `test` script should run `vitest run` (not the default watch mode) so `npm test` executes once and exits for CI/acceptance-criteria purposes.

**Key findings**
- Vitest 5 (current, released 2026-09-03, latest patch 5.0.5 as of 2026-10-15) requires Node >=v22.12.0 and Vite >=v6.4.0, per the official Getting Started guide (vitest.dev/guide/).
- Vitest's built-in test environments are node (default), jsdom, happy-dom, and edge-runtime; per-file override is done via a `// @vitest-environment <name>` control comment at the top of a test file (vitest.dev/guide/environment).
- Next.js's official App Router Vitest guide (nextjs.org/docs/app/guides/testing/vitest, lastUpdated 2026-08-25) specifies TypeScript deps `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`, a `vitest.config.mts` using `defineConfig` from `vitest/config` with `plugins: [tsconfigPaths(), react()]` and `test: { environment: 'jsdom' }`, and a `package.json` script `"test": "vitest"`.
- The same Next.js guide explicitly warns: 'Since async Server Components are new to the React ecosystem, Vitest currently does not support them... we recommend using E2E tests for async components' — not a blocker for pure FIFO functions, but relevant if other parts of the Inventory module use async Server Components.
- Vitest test files must contain `.test.` or `.spec.` in their filename to be picked up by default `include` patterns (vitest.dev/guide/).
- `test.each` supports array-tuple, named-object, and tagged-template-literal syntaxes for parameterized/table-driven tests, e.g. `test.each([{a:1,b:1,expected:2}, ...])('add($a,$b) -> $expected', ({a,b,expected}) => {...})` (vitest.dev/api/).
- Running `npm run test` with the Next.js-recommended script invokes Vitest's default watch mode; a one-shot CI run requires `vitest run` instead — the official guide's sample script does not do this by default.

**Recommendations**
- Keep FIFO pure-function test files in a plain Node environment (Vitest's default) — do not add a `jsdom` environment or DOM-related setup to those files; reserve jsdom only for component/UI tests elsewhere in the repo.
- Set `package.json`'s `test` script to `vitest run` (not bare `vitest`) so `npm test` exits after one pass, satisfying the 'all pass via npm test' acceptance criterion in CI-like execution.
- Use `test.each`/`describe.each` with named-object rows to enumerate FIFO edge cases explicitly: partial layer consumption, multi-layer issue spanning 2+ cost layers, over-issue rejection (quantity > on-hand), and zero-cost donated layers — one row per scenario keeps the suite readable and easy to extend.
- Add `vite-tsconfig-paths` to the Vitest plugin list if the repo uses TS path aliases (e.g. `@/lib/...`) so FIFO module imports resolve the same way in tests as in the Next.js app.
- If component tests and pure-function tests coexist, use the `// @vitest-environment jsdom` control comment on component test files rather than setting `environment: 'jsdom'` globally, so the FIFO test files keep the faster default `node` environment.
- Structure FIFO logic as pure functions with no Firestore/network imports (per the locked PRD's constraint and AC14); this is also what keeps them trivially testable under Vitest's default `node` environment without mocks.

*As of: 2026-10-28 (Vitest 5.0.5, released 2026-10-15; Next.js App Router Vitest guide lastUpdated 2026-08-25)*

**Sources**
- [Vitest — Getting Started](https://vitest.dev/guide/) (official-docs) -- "Vitest requires Vite >=v6.4.0 and Node >=v22.12.0... Test files must contain .test. or .spec. in their filename."
- [Vitest — Test Environment](https://vitest.dev/guide/environment) (official-docs) -- "Control comments are comments that start with @vitest-environment and are followed by the environment name... node (default), jsdom, happy-dom, edge-runtime"
- [Next.js Docs — How to set up Vitest with Next.js (App Router)](https://nextjs.org/docs/app/guides/testing/vitest) (official-docs) -- "Since async Server Components are new to the React ecosystem, Vitest currently does not support them... npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths"
- [Vitest API Reference (test.each)](https://vitest.dev/api/#test-each) (official-docs) -- "test.each([{ a: 1, b: 1, expected: 2 }, { a: 1, b: 2, expected: 3 }])('add($a, $b) -> $expected', ({ a, b, expected }) => { expect(a + b).toBe(expected) })"
- [Configuring Vitest](https://vitest.dev/config/) (official-docs) -- "environment - listed as a config option; globals - available as a configuration option"
- [vitest-dev/vitest Discussion #4968 — Specific vitest environment for specific tests](https://github.com/vitest-dev/vitest/discussions/4968) (repo) -- "You cannot change specific test functions because the whole file runs in a specified environment... Or you can also set environmentMatchGlobs option specifying the environment based on the glob patterns."


### Storing and linking count photos as audit attachments
*What is the secure pattern for uploading a stock-count photo to Firebase Storage and referencing it from a Firestore count document, with access restricted by role?*

The secure pattern is: client uploads the photo directly to Firebase Storage under a path keyed by the inventory item/count (e.g. /inventory/counts/{countId}/{fileId}.jpg), with storage.rules gating both read and write by the user's role (via custom claims or a mirrored Firestore role lookup) and validating file size/content-type at write time; the Firestore count document then stores only the storage path (not a public download URL) plus audit metadata. Because getDownloadURL() mints a long-lived token that bypasses rule re-evaluation on every subsequent fetch, role-restricted photos (e.g. valuation-tier-only attachments) should be read back with getBytes()/getBlob() (SDK v9.5+), which re-checks security rules on each call, rather than persisting or embedding a getDownloadURL token. Role checks in storage.rules should mirror the same role source used by Firestore rules/RoleGuard/useRole to avoid rule drift between the two services, and if Firestore lookups from storage.rules are needed, use firestore.get()/firestore.exists() with fully-qualified paths, noting the 2-document-per-evaluation limit and added latency/billing.

**Key findings**
- Custom claims are read in Storage rules via request.auth.token.<claim>, e.g. `allow write: if request.auth.token.role == 'admin';` — same claim namespace as Firestore rules (firebase.google.com/docs/storage/security/rules-conditions, current as of 2026-10-20).
- Cross-service rules expose firestore.get() and firestore.exists() in storage.rules; paths must be fully specified as /databases/(default)/documents/collection/doc, with $(variable) escaping for interpolated path segments (firebase.blog cross-service rules announcement, 2022-09-28; still the documented syntax as of the 2026-10-20 rules-conditions doc).
- Cross-service Firestore reads from storage.rules are capped at 2 unique documents per rule evaluation (repeat reads of the same doc are cached and don't count); add ~75ms latency same-region or ~200ms cross-region; and are billed as Firestore reads even when the request is denied (firebase.blog, 2022-09-28).
- File validation at upload time uses request.resource.size (bytes) and request.resource.contentType.matches('image/.*') inside the write rule (firebase.google.com/docs/storage/security/rules-conditions).
- Rules Version 2 (`rules_version = '2';`) is required for recursive wildcards ({path=**}) and the list operation when organizing photo paths hierarchically (firebase.google.com/docs/storage/security/core-syntax, current as of 2026-10-20).
- getDownloadURL() returns a URL containing an access token that, once generated, bypasses further security-rule evaluation for anyone holding the link — it is evaluated once at mint time, not on each access (firebase.google.com/docs/storage/web/download-files, current as of 2026-10-21; corroborated by firebase-js-sdk GitHub issue #5342 discussing this as a known, longstanding caveat).
- getBytes() and getBlob() (web SDK v9.5+) and getStream() (Node) download data directly through the SDK and re-evaluate security rules on every call, giving tighter per-request access control than a cached download URL (firebase.google.com/docs/storage/web/download-files, 2026-10-21).
- Best-practice guidance for role checks in rules generally recommends custom claims over per-request Firestore lookups specifically to avoid extra billable reads and latency, reserving firestore.get()/exists() for cases where claims aren't available or roles change too often to re-mint tokens (search synthesis grounded in the rules-conditions and cross-service-rules docs above).

**Recommendations**
- Upload count photos directly from the client to Storage at a path like /inventory/counts/{countId}/{fileId}.jpg or /inventory/items/{itemId}/counts/{countId}/{fileId}.jpg, so storage.rules can pattern-match the same role/ownership logic used for the corresponding Firestore count document.
- Gate storage.rules on request.auth.token.role (custom claim mirroring the Firestore role field used by RoleGuard/useRole) for both read and write, rather than relying only on client-side hiding, so AC11/AC12 role separation (logging vs admin) is enforced server-side for attachments too.
- If the role is not available as a custom claim, use firestore.get()/firestore.exists() against the user's role document, but keep this to at most one lookup per rule to stay under the 2-document cap and minimize added latency/Firestore billing.
- Validate request.resource.size (e.g. reject >5–10MB, consistent with AC8's oversized-image handling) and request.resource.contentType.matches('image/.*') in the write rule itself, in addition to client-side validation, so the UI's 'handled error state' for oversized images is backed by a server-enforced limit.
- Store only the Storage path (not a getDownloadURL string) on the Firestore count document (e.g. photoPath: 'inventory/counts/abc123/xyz.jpg'); resolve a short-lived display URL on read, or use getBytes()/getBlob() when rendering role-restricted photos, since persisting a getDownloadURL token effectively grants indefinite access to anyone who later reads that Firestore field, undermining the Firestore-side role rules on AC6/AC9/AC11.
- Set rules_version = '2' in storage.rules and use a single nested match block per inventory photo path so write (upload) and read (view) permissions can diverge by role without duplicating path logic.
- Record audit metadata (uploadedBy uid, uploadedAt timestamp, and the AI suggestion vs confirmed values) on the Firestore count document itself rather than in Storage object metadata, since AC7 requires the AI suggestion to never be persisted until a user confirms/edits it — the photo write and the Firestore write should be treated as separate steps, with the Firestore count only created/updated after confirmation.

*As of: Firebase documentation pages fetched 2026-10-20/2026-10-21 UTC; cross-service rules feature originally announced 2022-09-28 and still current per the 2026-10-20 rules-conditions doc.*

**Sources**
- [Use conditions in Firebase Cloud Storage Security Rules](https://firebase.google.com/docs/storage/security/rules-conditions) (official-docs) -- "No more than two Firestore documents may be accessed in a single Rules evaluation... Mint a Firebase Authentication custom token that contains additional information."
- [Announcing cross-service Security Rules](https://firebase.blog/posts/2022/09/announcing-cross-service-security-rules/) (article) -- "We enforce a limit of two Firestore document queries per rules evaluation... You will be billed for the Firestore reads, even if your rules reject the request."
- [Download files with Cloud Storage on Web](https://firebase.google.com/docs/storage/web/download-files) (official-docs) -- "getBytes() and getBlob()... allow for finer-grained access control via Firebase Security Rules... Re-evaluate security rules on every call."
- [Basic Security Rules / core syntax (Cloud Storage for Firebase)](https://firebase.google.com/docs/storage/security/core-syntax) (official-docs) -- "security rules are not filters... recursive wildcards match zero or more path items in Version 2."
- [Firebase Storage READ security rules: almost pointless, as currently implemented. · Issue #5342 · firebase/firebase-js-sdk](https://github.com/firebase/firebase-js-sdk/issues/5342) (forum) -- "getDownloadURL() creates a TOKENIZED URL, which BYPASSES the above security rules."


### Client-side CSV export for date-range summaries
*What client-side CSV generation approach matches the existing finance module's export pattern, for opening/received/issued/written-off/closing rows?*

I could not inspect the actual PMU EMS finance module source (no repo access), so the exact existing export pattern there is unverifiable; however, the standard, well-established client-side CSV pattern for a Next.js/React/TypeScript app with no backend involvement is to build the CSV string in the browser and trigger a download via a Blob and an anchor element, with no server round-trip. For structured rows like opening/received/issued/written-off/closing per item, the common approach is either hand-rolled string-joining or Papa.unparse() (papaparse) over an array-of-objects, then wrapping the result in a Blob with MIME type text/csv and triggering download via URL.createObjectURL plus a temporary <a download> element, followed by URL.revokeObjectURL to release memory. This recommendation should be treated as a general best-practice match rather than a confirmed match to the finance module's actual code.

**Key findings**
- Papa.unparse(data[, config]) converts an array of arrays or an array of objects into a CSV string; config supports quotes, delimiter, header, newline, and escapeFormulae options (source: papaparse.com/docs, opened directly).
- papaparse's escapeFormulae option (default behavior varies by version) prepends a `'` to cells starting with =, +, -, @ to prevent CSV/formula injection when values are opened in spreadsheet software — relevant since cost/quantity totals will be numeric but item names are user-entered text.
- Latest published papaparse version on the npm registry is 5.7.0 (verified via https://registry.npmjs.org/papaparse/latest).
- papaparse has no bundled TypeScript types; the DefinitelyTyped package @types/papaparse (latest 5.5.2, verified via npm registry) supplies types for TypeScript projects.
- The browser download pattern — Blob + URL.createObjectURL(blob) + a temporary <a download> element + a.click() + URL.revokeObjectURL(url) — is the standard client-side file-download mechanism; URL.createObjectURL is Baseline widely available since July 2015 and is explicitly NOT available in Service Workers due to memory-leak risk (verified via MDN).
- MDN explicitly instructs calling URL.revokeObjectURL() after the object URL is no longer needed to avoid memory leaks.

**Recommendations**
- Match whatever the finance module already does if it exists (confirm by reading that module's export code directly before implementing) — do not assume this research substitutes for checking the actual sibling module's pattern, since that could not be verified here.
- If no finance-module precedent is found, use a dependency-free Blob + <a download> approach for the date-range summary CSV (opening/received/issued/written-off/closing + cost columns) to avoid adding papaparse purely for export when the row shape is simple and fixed.
- If papaparse is already a dependency (e.g., used for CSV import elsewhere), reuse Papa.unparse() for consistency rather than hand-rolling a second CSV serializer.
- Enable or replicate escapeFormulae-style sanitization (prefixing a leading `'` on fields starting with =, +, -, @) if any user-entered text (item names, write-off reasons) could end up in exported cells, to prevent formula-injection when opened in Excel/Sheets.
- Always call URL.revokeObjectURL() after triggering the download to avoid leaking the blob URL, and perform the whole export client-side (no new Next.js API route) since the data needed (date-range summary rows) is already computed/rendered on screen — this keeps the CSV export consistent with the 'the CSV export's totals match the on-screen totals' acceptance criterion by deriving the CSV directly from the same on-screen aggregate rather than a second fetch/query.

*As of: 2026-10-28 (papaparse 5.7.0 and @types/papaparse 5.5.2 per npm registry; MDN URL.createObjectURL status as currently published)*

**Sources**
- [Documentation - Papa Parse](https://www.papaparse.com/docs) (official-docs) -- "Papa.unparse(data[, config]) ... writes out correct delimited text strings given an array of arrays or an array of objects."
- [papaparse — npm registry metadata (latest)](https://registry.npmjs.org/papaparse/latest) (official-docs) -- "Version: 5.7.0 ... Repository: https://github.com/mholt/PapaParse"
- [@types/papaparse — npm registry metadata (latest)](https://registry.npmjs.org/@types/papaparse/latest) (official-docs) -- "Version: 5.5.2 ... TypeScript definitions for papaparse"
- [URL: createObjectURL() static method - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static) (official-docs) -- "Status: Widely Available ... Always call URL.revokeObjectURL() after use to prevent memory leaks ... NOT available in Service Workers (memory leak risk)"
- [GitHub - mholt/PapaParse](https://github.com/mholt/PapaParse) (repo) -- "Fast and powerful CSV parser for the browser that supports web workers and streaming large files. Converts CSV to JSON and JSON to CSV."

## Documentation sources

- [Next.js Docs — What is Next.js?](https://nextjs.org/docs)
- [The latest Next.js news (blog index)](https://nextjs.org/blog)
- [route.js — API Reference | Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route)
- [How to upgrade to version 15](https://nextjs.org/docs/app/guides/upgrading/version-15)
- [serverActions — next.config.js options](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)
- [React Versions](https://react.dev/versions)
- [React v19](https://react.dev/blog/2024/12/05/react-19)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [React 19.2](https://react.dev/blog/2025/10/01/react-19-2)
- [TypeScript - Download / Installing TypeScript](https://www.typescriptlang.org/download)
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [TypeScript tsconfig Reference](https://www.typescriptlang.org/tsconfig)
- [ts-jest: Using TypeScript 7](https://kulshekhar.github.io/ts-jest/docs/next/guides/typescript-7)
- [Firebase Authentication (overview)](https://firebase.google.com/docs/auth)
- [Get Started with Firebase Authentication on Web](https://firebase.google.com/docs/auth/web/start)
- [Add Firebase to your JavaScript project](https://firebase.google.com/docs/web/setup)
- [Firebase JavaScript SDK Release Notes](https://firebase.google.com/support/release-notes/js)
- [Control Access with Custom Claims and Security Rules](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Cloud Firestore Documentation (Firebase)](https://firebase.google.com/docs/firestore)
- [Transactions and batched writes | Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Usage and limits | Firestore](https://firebase.google.com/docs/firestore/quotas)
- [Get started with Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Writing conditions for Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Get started with Cloud Firestore](https://firebase.google.com/docs/firestore/quickstart)
- [Structuring Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-structure)
- [Security Rules language](https://firebase.google.com/docs/rules/rules-language)
- [Get started with Firebase Security Rules](https://firebase.google.com/docs/rules/get-started)
- [Firestore Security Rules and queries (Securely query data)](https://firebase.google.com/docs/firestore/security/rules-query)
- [Avoid insecure rules](https://firebase.google.com/docs/rules/insecure-rules)
- [Firebase Release Notes](https://firebase.google.com/support/releases)
- [Installing Tailwind CSS with PostCSS](https://tailwindcss.com/docs/installation/using-postcss)
- [Upgrade guide](https://tailwindcss.com/docs/upgrade-guide)
- [Installing Tailwind CSS with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [Tailwind CSS Installation (version indicator)](https://tailwindcss.com/docs/installation)
- [Material UI – Installation](https://mui.com/material-ui/getting-started/installation/)
- [Material UI – Upgrade to v6](https://mui.com/material-ui/migration/upgrade-to-v6/)
- [Material UI – Versions](https://mui.com/material-ui/getting-started/versions/)
- [Introducing Material UI v9](https://mui.com/blog/introducing-material-ui-v9/)
- [Vitest — Getting Started Guide](https://vitest.dev/guide/)
- [Vitest — API Reference](https://vitest.dev/api/)
- [Vitest — Mocking Guide](https://vitest.dev/guide/mocking.html)
- [Vitest — Common Errors](https://vitest.dev/guide/common-errors.html)
- [Vitest — Migration Guide](https://vitest.dev/guide/migration.html)
- [vitest package.json (unpkg, latest/v5)](https://unpkg.com/vitest/package.json)
- [vitest@4 package.json (unpkg)](https://unpkg.com/vitest@4/package.json)
- [Vision - Claude Docs](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Messages API Reference - Claude Docs](https://platform.claude.com/docs/en/api/messages)
- [Versions - Claude Docs](https://platform.claude.com/docs/en/api/versioning)
- [Claude API errors - Claude Docs](https://platform.claude.com/docs/en/api/errors)
- [Data contention in transactions | Firestore in Native mode | Google Cloud Documentation](https://docs.cloud.google.com/firestore/docs/transaction-data-contention)
- [Transaction - Documentation (Node.js Admin SDK)](https://googleapis.dev/nodejs/firestore/latest/Transaction.html)
- [Tool use with Claude - Claude Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [Define tools - Claude Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- [Vitest — Test Environment](https://vitest.dev/guide/environment)
- [Next.js Docs — How to set up Vitest with Next.js (App Router)](https://nextjs.org/docs/app/guides/testing/vitest)
- [Vitest API Reference (test.each)](https://vitest.dev/api/#test-each)
- [Configuring Vitest](https://vitest.dev/config/)
- [Use conditions in Firebase Cloud Storage Security Rules](https://firebase.google.com/docs/storage/security/rules-conditions)
- [Download files with Cloud Storage on Web](https://firebase.google.com/docs/storage/web/download-files)
- [Basic Security Rules / core syntax (Cloud Storage for Firebase)](https://firebase.google.com/docs/storage/security/core-syntax)
- [Documentation - Papa Parse](https://www.papaparse.com/docs)
- [papaparse — npm registry metadata (latest)](https://registry.npmjs.org/papaparse/latest)
- [@types/papaparse — npm registry metadata (latest)](https://registry.npmjs.org/@types/papaparse/latest)
- [URL: createObjectURL() static method - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static)

Documentation items with no official source: Official documentation: Firebase Storage.

## Academic literature

- **Qualitative Analysis of IAS 2 Capability for Handling the Financial Information Generated by Cost Techniques** (2023), cited 23x -- [link](https://doi.org/10.3390/ijfs11020067) / [PDF](https://www.mdpi.com/2227-7072/11/2/67/pdf?version=1684213249) _(via openalex)_
- **Fair Value and Cost Accounting, Depreciation Methods, Recognition and Measurement for Fixed Assets** (2014), cited 6x -- [link](https://doi.org/10.35808/ijeba/51) / [PDF](https://www.ijeba.com/journal/51/download) _(via openalex)_
- **Compliance with IAS 2 in consolidated financial statements of PSE listed companies** (2019), cited 4x -- [link](https://doi.org/10.18267/j.efaj.230) / [PDF](http://efaj.vse.cz/doi/10.18267/j.efaj.230.pdf) _(via openalex)_
- **Empirically Investigating Saudi Arabian Accountants’ Readiness to Implement IAS 2** (2017), cited 1x -- [link](https://doi.org/10.21272/fmir.1(3).5-21.2017) / [PDF](http://armgpublishing.sumdu.edu.ua/wp-content/uploads/2016/12/files/fmir/issue3/Muna-Ali-Al-Mousa_FMIR_issue3_2017.pdf) _(via openalex)_
- **Analysis of the Application of IAS 2 Inventories in Financial Reporting** (2026), cited 0x -- [link](https://doi.org/10.69882/adba.iteb.2026075) / [PDF](https://journals.adbascientific.com/iteb/article/download/181/139) _(via openalex)_
- **Determinants and consequences of fair value accounting adoption: evidence from China** (2020), cited 0x -- [link](https://orca.cardiff.ac.uk/130235/1/2020yerphd.pdf) / [PDF](https://orca.cardiff.ac.uk/130235/1/2020yerphd.pdf) _(via openalex)_
- **Optimization Algorithm for Inventory Allocation in Gravity-Flow Racks with Classical and Quantum-Hybrid Computing** (2024) -- [link](https://arxiv.org/abs/2411.11756) / [PDF](https://arxiv.org/pdf/2411.11756v2) _(via arxiv)_
- **2-Approximation Algorithms for Perishable Inventory Control When FIFO Is an Optimal Issuing Policy** (2016) -- [link](https://arxiv.org/abs/1605.01442) / [PDF](https://arxiv.org/pdf/1605.01442v2) _(via arxiv)_

## Prior art

- [LibreChat-AI/LibreChat](https://github.com/LibreChat-AI/LibreChat) -- 46414 stars, TypeScript, licence MIT. Enhanced ChatGPT Clone: Features Agents, MCP, Skills, DeepSeek, Anthropic, AWS, OpenAI, Responses API, Azure, Groq, o1, GPT-5, Mistral, OpenRouter, Vertex AI, Gemini, Artifacts, AI model switching, message search, Code Interpreter, langchain, DALL-E-3, OpenAPI Actions, Functions, Secure Multi-User Auth, Presets, open-source for self-hosting. Active
- [graniet/llm](https://github.com/graniet/llm) -- 366 stars, Rust, licence MIT. A powerful Rust library and CLI tool to unify and orchestrate multiple LLM, Agent and voice backends (OpenAI, Claude, Gemini, Ollama, ElevenLabs...) with a single, extensible API. Build, chain, evaluate, and serve complex multi-step AI workflows — including speech-to-text, text-to-speech, completions, vision, and reasoning.
- [GautamVhavle/CatGPT-Gateway](https://github.com/GautamVhavle/CatGPT-Gateway) -- 314 stars, Python, licence MIT. Turn your ChatGPT or Claude account into a fully working OpenAI-compatible API. No API keys needed. Supports tool calling, vision, file attachments, and image generation.

**Patterns worth reusing**

**Patterns worth reusing:**

- **LibreChat** — Keep API keys server-side only, read from env vars, never exposed to client; this matches the constraint that the Claude vision key must live in a Next.js API route env var. Its monorepo/workspace layout (`api`, `client`, `packages/*`) is a reasonable model if the inventory module's AI-suggestion logic is ever split into a shared package, though for this build a single Next.js API route is simpler and sufficient. Its attachment/upload pipeline (route content based on type, validate before processing) is a useful shape for the "photograph a box → send to Claude" flow: validate file size/type server-side before calling the vision API, and return a distinct handled error type for oversized uploads vs. API failures (maps directly to acceptance criterion 8).

- **graniet/llm** (Rust, not directly portable) — The idea of a structured-output/validation layer wrapping a vision call is useful conceptually: treat Claude's suggested item/count as untrusted structured output requiring a validation step before use, never written directly to the data layer. This maps to "AI suggestion must be confirmed before Firestore write" (criterion 7) — implement as a client-side confirm/edit step, not a Rust crate dependency.

**What NOT to copy:**
- **CatGPT-Gateway** is unrelated and architecturally inappropriate here — it automates browser logins to impersonate ChatGPT/Claude accounts and bypass official APIs, which is a ToS-bypass pattern, not a legitimate SDK integration. Don't borrow any of its browser-automation or auth-impersonation approach; this build must call the official Anthropic API key over HTTPS from a server route.
- Don't pull in LibreChat's full multi-model/agent/MCP architecture — it's built for a general chat product, not a single server-side vision call for stock photos; adopting its scope would be large over-engineering for this feature.

**Licence:** All three repos are MIT — code copying would be legally permitted, but none of their actual code is a good fit for this domain (chat UI, Rust CLI, browser automation); only the ideas above transfer.

_No repositories matched "FIFO inventory management open source Firestore"; retried as "fifo inventory management"._
_No repositories matched "Next.js Firestore inventory tracker reference implementation"; retried as "next.js firestore inventory"._
_No repositories matched "Claude vision API stock count image recognition example"; retried as "claude vision api"._

## Open uncertainties

- Official documentation: TypeScript: `current_version`
- Official documentation: TypeScript: `pitfalls`
- Official documentation: Firestore: `pitfalls`
- Official documentation: Firestore Security Rules: `pitfalls`
- Official documentation: Tailwind CSS: `key_findings`
- Official documentation: Tailwind CSS: `current_version`
- Official documentation: Tailwind CSS: `as_of`
- Official documentation: Anthropic Claude API (Messages / Vision): `current_version`
- IAS 2 FIFO cost-flow rules and donated inventory treatment: `summary`
- IAS 2 FIFO cost-flow rules and donated inventory treatment: `key_findings`
- IAS 2 FIFO cost-flow rules and donated inventory treatment: `as_of`
- Atomic multi-document stock mutations with Firestore transactions: `key_findings`
- Vitest setup for deterministic TS unit tests in this repo: `key_findings`

## Not researched

- docs-firebase-storage: "uncertain" names "key_findings[0]", which is not a field of this result. "uncertain" names "key_findings[6]", which is not a field of this result.

## Independent check

Researched by claude-code; checked by claude-code (claude-code (sonnet) reviewed work written by claude-code (sonnet): the same model. This works, but a model tends to favour its own output; a second model, ideally from another family, would make the check more independent.). Verdict: **pass**.

I opened the primary cited sources for every build-critical claim (Next.js Route Handlers/Server Actions, React, TypeScript 7.0, Firebase/Firestore SDK and rules, Vitest, MUI, Tailwind, Anthropic Messages/Vision API) and each matched the report's stated facts, version numbers, and dates verbatim or near-verbatim. The one claim the report itself flagged [uncertain] (IPSAS 12 para 16 fair-value treatment of donated inventory) I was able to independently confirm via a primary-adjacent source, upgrading it from unverifiable to supported. No planted instructions (commands to run, secrets to exfiltrate, PRD edits, review/test disabling) were found anywhere in the report text — all recommendations are ordinary engineering advice addressed to whoever implements the feature.

Claims NOT confirmed (treat as uncertain downstream):
- [unverifiable] React's current stable release is 19.3 (19.3.0, released 2026-09-09) -- react.dev/versions could not be loaded (repeated connection errors in this session); not contradicted by anything else found, and consistent with the React 19.2 blog post dating pattern, but not independently re-confirmed
