# bandapp-web

[![CI](https://github.com/DevilFlow92/bandapp-web/actions/workflows/ci.yml/badge.svg)](https://github.com/DevilFlow92/bandapp-web/actions/workflows/ci.yml)

> Management dashboard for music associations — members, students, courses, services, enrollments, sheet music, documents and accounting in one place.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Radix%20%2B%20Tailwind-000000)](https://ui.shadcn.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack%20Query-v5-FF4154?logo=reactquery&logoColor=white)](https://tanstack.com/query)
[![Playwright](https://img.shields.io/badge/Playwright-e2e-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)

## Overview

**bandapp-web** is the web frontend for managing music associations (*bande*) — the people, the courses they run, the services they perform, enrollments, archived sheet music, and the paperwork that goes with all of it. It's built for association administrators who need a fast, role-aware dashboard instead of spreadsheets, and it also exposes a minimal read-only portal for students.

The app is a single-page client that talks to [**associazione-api**](https://github.com/DevilFlow92/associazione-api), a FastAPI backend, over a cookie-authenticated REST API.

## Key features

- **Multi-band context** — one account can manage several associations; the active band is chosen right after login and scopes every request.
- **Cookie-based session auth** — route access is gated by `AuthGuard`, and permission-based sections by `PermissionGuard`.
- **Role-Based Access Control (RBAC)** — fine-grained permission checks (e.g., `anagrafica:write`, `corsi:write`, `contabilita:write`, `utenti:read`) control UI visibility and route access. Permissions are configured on a per-role basis in the admin panel.
- **Anagrafica** — full CRUD for Soci (members), Allievi (students), Esterni (external collaborators) and Committenti (clients), each with a member/student detail page and enrollment history.
- **Corsi (courses)** — course rosters with enrollments (*iscrizioni corso*), per-student *scheda alunno* (programme/notes), lezioni & presenze tracking, and course payments.
- **Portale Alunno** — a dedicated, minimal-layout portal (`/portale`) where a student account sees only its own enrollments, lesson calendar & attendance, programme and payments (read-only).
- **Servizi & Prove** — CRUD for services performed by the band and rehearsals, with receipts (*ricevute*) rendered with expandable rows for line-item detail.
- **Modulistica** — a TipTap-based rich text template editor with mergefields (e.g. `socio.nome`, `iscrizione_corso.tipo_corso`); templates generate real `.docx`/`.pdf` documents from live entity data and can be linked back to the record they were generated for (e.g. an iscrizione).
- **Cascading location picker** — `ComuneSelect` resolves Stato → Regione → Provincia → Comune step by step.
- **Accounting** — bookkeeping entries (*movimenti*), chart of accounts (*voci*), financial reports (*rendiconti*), and a quote-payment reconciliation view (*check quote*) — all permission-gated.
- **Dashboard** with real-time KPIs and charts (Recharts).
- **Document upload & download** via multipart requests.
- **Admin panel** (Users + Roles) — manage users, assign roles, and configure fine-grained permissions per role.
- **Global `ErrorBoundary`** so a render failure degrades gracefully instead of blanking the app.

## Tech stack

| Layer          | Technology                            |
| -------------- | ------------------------------------- |
| Framework      | React 19 + TypeScript                 |
| Build          | Vite                                  |
| UI             | shadcn/ui (Radix + Tailwind CSS)      |
| Data fetching  | TanStack Query v5                     |
| Forms          | React Hook Form + Zod                 |
| Rich text      | TipTap (Modulistica template editor)  |
| Charts         | Recharts                              |
| HTTP           | Axios (`withCredentials`)             |
| Routing        | React Router DOM v7                   |
| Icons          | Lucide React                          |
| E2E testing    | Playwright                            |

## Authentication & permissions

**Cookie-based session auth.** The session lives in an httpOnly cookie set and managed by the backend, so the JavaScript layer never touches the credential — it's immune to token theft via XSS. Axios is configured once with `withCredentials: true`, and a response interceptor redirects to `/login` on any `401`.

**Permission gates.** Route-level access is controlled by `PermissionGuard`, which checks the user's permissions against a resource-action pair (e.g., `corsi:write`, `contabilita:read`). Sections that require specific permissions — write actions in Anagrafica/Servizi/Corsi, Accounting, Admin — are hidden from users who lack them, both in the sidebar navigation and at the route level.

**Student portal.** `/portale` shares the same auth/band context but renders through `PortaleLayout` instead of `AppLayout`, and scopes every query to the logged-in student's own `persona`/enrollments — there's no cross-student visibility.

## Architecture decisions

**`BandaContext` as the request scope.** The active band is selected per session and persisted to `sessionStorage`, then read by every feature hook so the UI and the API stay in sync. Choosing a different band re-scopes the whole app without a full reload.

**Hooks co-located by feature.** Each domain owns a `use*.ts` hook (`useSoci`, `useCorsi`, `useModulistica`, …) that encapsulates its queries and mutations. Pages stay thin — they compose hooks and render, rather than fetching inline — which keeps data logic testable and the component tree readable.

**Lazy, guarded API calls.** Feature queries use TanStack Query's `enabled` flag tied to band selection, so no request fires before a band is chosen. This avoids wasted/failing calls on first paint and keeps the cache keyed cleanly per band.

**Permission-driven UI.** The `usePermission` hook returns a boolean for each permission string; components use this to show/hide buttons, columns, and sections. Permission checks are idempotent and cached by TanStack Query, so re-renders are efficient.

**Sibling components over shared abstractions for mature flows.** Where a new feature needs a flow that's structurally similar to an existing, already-production one (e.g. generating a Modulistica document for an *iscrizione corso* vs. an *iscrizione* socio), a dedicated sibling component is preferred over parametrizing the existing one — it avoids risking regressions in a flow already relied upon, at the cost of some duplication.

## Getting started

```bash
npm install
cp .env.example .env   # set VITE_API_URL
npm run dev
```

`.env.example` defaults to the local backend:

```
VITE_API_URL=http://localhost:8000/api/v1
```

> **Requires the [associazione-api](https://github.com/DevilFlow92/associazione-api) backend** running on `localhost:8000`. Because auth is cookie-based, the API must be reachable on a same-site origin for credentials to flow.

### Scripts

| Command              | Description                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`         | Start the Vite dev server with HMR            |
| `npm run build`       | Type-check (`tsc -b`) and build               |
| `npm run preview`     | Serve the production build locally            |
| `npm run typecheck`   | Type-check only, no build (`tsc -b --noEmit`) |
| `npm run lint`        | Run ESLint                                    |
| `npm run lint:fix`    | Run ESLint with autofix                       |
| `npm run format`      | Format the codebase with Prettier             |
| `npm run format:check`| Check formatting without writing              |
| `npm run test:e2e`    | Run the Playwright end-to-end suite (`e2e/`)  |

### End-to-end tests

Playwright specs live in `e2e/`. They exercise real flows against a running dev server and a running local backend, creating and tearing down their own test data via direct API calls (see `e2e/helpers.ts`). Set `E2E_EMAIL` / `E2E_PASSWORD` (an existing local user) before running:

```bash
E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e
```

## Routes & permissions

| Path | Guard | Permission | Purpose |
|------|-------|-----------|---------|
| `/login` | None | — | Public login page |
| `/reset-password` | None | — | Password reset |
| `/banda` | `AuthGuard` | — | Band selection (after login) |
| `/` | `AppLayout` | — | Dashboard (home) |
| `/soci`, `/soci/:id` | — | — | Members CRUD + detail/enrollment history |
| `/soci/nuovo` | `PermissionGuard` | `anagrafica:write` | New member wizard |
| `/allievi` | — | — | Students CRUD |
| `/allievi/nuovo` | `PermissionGuard` | `corsi:write` | New student wizard |
| `/esterni` | — | — | External collaborators |
| `/esterni/nuovo` | `PermissionGuard` | `anagrafica:write` | New external collaborator wizard |
| `/committenti` | — | — | Clients CRUD |
| `/servizi` | — | — | Services CRUD |
| `/servizi/nuovo` | `PermissionGuard` | `servizi:write` | New service wizard |
| `/prove` | — | — | Rehearsals CRUD |
| `/prove/nuovo` | `PermissionGuard` | `servizi:write` | New rehearsal wizard |
| `/corsi` | — | — | Courses + roster (enrollments, *scheda alunno*, lezioni/presenze; write gated by `iscrizioni:write`) |
| `/spartiti` | — | — | Sheet music archive |
| `/documenti` | — | — | Documents |
| `/modulistica`, `/modulistica/:id` | — | — | Document templates list + TipTap editor |
| `/contabilita/*` | `PermissionGuard` | `contabilita:read` | Accounting — configurazione, voci, movimenti, rendiconto, check-quote (write gated by `contabilita:write`) |
| `/admin/utenti` | `PermissionGuard` | `utenti:read` | User management (write gated by `utenti:write`) |
| `/admin/ruoli` | `PermissionGuard` | `ruoli:read` | Role & permission management (write gated by `ruoli:write`) |
| `/portale` | `AuthGuard` + `PortaleLayout` | — | Student portal home: own enrollments |
| `/portale/iscrizioni/:id/lezioni` | `AuthGuard` + `PortaleLayout` | — | Student's own lesson calendar & attendance |
| `/portale/iscrizioni/:id/programma` | `AuthGuard` + `PortaleLayout` | — | Student's own *scheda alunno* (programme/notes) |
| `/portale/iscrizioni/:id/pagamenti` | `AuthGuard` + `PortaleLayout` | — | Student's own course payments (read-only) |

**Note:** Permission strings are resource-action pairs (e.g., `corsi:write`, `contabilita:write`). The `PermissionGuard` component checks the current user's permissions; if denied, the user is redirected to `/`. UI elements (buttons, form fields, table columns) also check permissions inline via `usePermission` and hide accordingly, even on routes with no route-level guard.

## Project structure

```
src/
├── components/         # Feature components + shared UI (shadcn/ui)
│   ├── layout/        # AppLayout, PortaleLayout, AuthGuard, PermissionGuard
│   ├── admin/         # Admin panel components
│   ├── anagrafica/    # Shared anagrafica building blocks
│   ├── attivita/      # Shared "Attività" building blocks
│   ├── committenti/   # Client forms & pickers
│   ├── contabilita/   # Accounting UI
│   ├── corsi/         # Courses, enrollments, scheda alunno, document generation
│   ├── allievi/       # Student forms & modals
│   ├── documenti/     # Document manager
│   ├── esterni/       # External collaborator forms
│   ├── indirizzi/     # Address / ComuneSelect picker
│   ├── iscrizioni/    # Member enrollment forms, dialogs & document generation
│   ├── modulistica/   # TipTap template editor, entity selector, mergefields
│   ├── prove/         # Rehearsal forms
│   ├── ricevute/      # Receipt rendering
│   ├── servizi/       # Service forms & modals
│   ├── soci/          # Member forms & modals
│   ├── spartiti/      # Sheet music forms
│   └── ui/            # shadcn/ui primitives
├── context/           # BandaContext — active-band scope
├── hooks/             # One API hook per feature (use*.ts)
├── pages/             # Route-level pages, incl. pages/portale/ (student portal)
├── lib/               # Axios client + utilities (e.g. mergefield extraction)
├── types/             # TypeScript interfaces per domain
└── assets/            # Static assets

e2e/                   # Playwright end-to-end specs + API test-data helpers
```

## Deployment

The app is configured for **Vercel** (see `vercel.json`). CI/CD runs on every push:
- Type check via `tsc -b`
- Vite build to `dist/`
- Deployment preview / production

Set `VITE_API_URL` as an environment variable in Vercel; it defaults to the example in `.env.example`.

## Backend

The companion API lives in a separate repository: **[DevilFlow92/associazione-api](https://github.com/DevilFlow92/associazione-api)** (FastAPI). It owns authentication, the cookie session, RBAC, and all persistence.

Ensure the API is running on `http://localhost:8000` for local development (or point `VITE_API_URL` to its actual URL).
