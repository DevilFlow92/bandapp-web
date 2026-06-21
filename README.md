# bandapp-web

[![CI](https://github.com/DevilFlow92/bandapp-web/actions/workflows/ci.yml/badge.svg)](https://github.com/DevilFlow92/bandapp-web/actions/workflows/ci.yml)

> Management dashboard for music associations — members, services, enrollments, sheet music, documents and accounting in one place.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Radix%20%2B%20Tailwind-000000)](https://ui.shadcn.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack%20Query-v5-FF4154?logo=reactquery&logoColor=white)](https://tanstack.com/query)

## Overview

**bandapp-web** is the web frontend for managing music associations (*bande*) — the people, the services they perform, enrollments, archived sheet music, and the paperwork that goes with all of it. It's built for association administrators who need a fast, role-aware dashboard instead of spreadsheets.

The app is a single-page client that talks to [**associazione-api**](https://github.com/DevilFlow92/associazione-api), a FastAPI backend, over a cookie-authenticated REST API.

## Key features

- **Multi-band context** — one account can manage several associations; the active band is chosen right after login and scopes every request.
- **Cookie-based session auth** — route access is gated by `AuthGuard`, and admin-only areas by `SuperuserGuard`.
- **Full CRUD** for Soci (members), Esterni (external collaborators), Servizi (services), Iscrizioni (enrollments), Spartiti (sheet music) and Documenti (documents).
- **Member detail page** with full enrollment history for each socio.
- **Receipts per service** (*ricevute*) rendered with expandable rows for line-item detail.
- **Cascading location picker** — `ComuneSelect` resolves Stato → Regione → Provincia → Comune step by step.
- **Accounting** — bookkeeping entries (*movimenti*) and chart of accounts (*voci*).
- **Dashboard** with real-time KPIs.
- **Document upload & download** via multipart requests.
- **Admin panel** (Users + Roles) behind an RBAC-aware route guard.
- **Global `ErrorBoundary`** so a render failure degrades gracefully instead of blanking the app.

## Tech stack

| Layer          | Technology                            |
| -------------- | ------------------------------------- |
| Framework      | React 19 + TypeScript                 |
| Build          | Vite                                  |
| UI             | shadcn/ui (Radix + Tailwind CSS)      |
| Data fetching  | TanStack Query v5                     |
| Forms          | React Hook Form + Zod                 |
| HTTP           | Axios (`withCredentials`)             |
| Routing        | React Router DOM v7                   |
| Icons          | Lucide React                          |

## Architecture decisions

**Cookie-based auth, not token-in-localStorage.** The session lives in an httpOnly cookie set and managed by the backend, so the JavaScript layer never touches the credential — it's immune to token theft via XSS. Axios is configured once with `withCredentials: true`, and a response interceptor redirects to `/login` on any `401` (while avoiding a redirect loop on the login page itself).

**`BandaContext` as the request scope.** The active band is selected per session and persisted to `sessionStorage`, then read by every feature hook so the UI and the API stay in sync. Choosing a different band re-scopes the whole app without a full reload.

**Hooks co-located by feature.** Each domain owns a `use*.ts` hook (`useSoci`, `useServizi`, `useDocumenti`, …) that encapsulates its queries and mutations. Pages stay thin — they compose hooks and render, rather than fetching inline — which keeps data logic testable and the component tree readable.

**Lazy, guarded API calls.** Feature queries use TanStack Query's `enabled` flag tied to band selection, so no request fires before a band is chosen. This avoids wasted/failing calls on first paint and keeps the cache keyed cleanly per band.

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

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server with HMR   |
| `npm run build`   | Type-check (`tsc -b`) and build       |
| `npm run preview` | Serve the production build locally   |
| `npm run lint`    | Run ESLint                           |

## Project structure

```
src/
├── components/    # Feature components + shared UI (shadcn/ui)
├── context/       # BandaContext — active-band scope
├── hooks/         # One API hook per feature (use*.ts)
├── pages/         # Route-level pages
├── lib/           # Axios client + utilities
└── types/         # TypeScript interfaces per domain
```

## Backend

The companion API lives in a separate repository: **[DevilFlow92/associazione-api](https://github.com/DevilFlow92/associazione-api)** (FastAPI). It owns authentication, the cookie session, and all persistence.
