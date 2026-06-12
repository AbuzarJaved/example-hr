# ExampleHR — Time-Off Module

Frontend assessment: optimistic time-off requests with HCM (Workday/SAP) as the authoritative source of truth.

## Architecture

- **Next.js 16.2.9** (App Router, Turbopack)
- **React 19** (Server + Client Components)
- **TanStack Query v5** — server state, cache invalidation via SSE
- **Reservation Ledger** — `useReducer` + `localStorage` + `BroadcastChannel` for optimistic cross-tab state
- **MSW v2** — Storybook story-level HTTP mocking
- **Storybook 10.4.4** (`@storybook/nextjs-vite`) — UI state catalog + interaction tests
- **Vitest 3** — unit + integration tests (52 passing)
- **Playwright** — E2E tests against live Next.js dev server

See [TRD.md](./TRD.md) for the full architecture decision record.

## Quick Start

```bash
npm install
npm run dev          # App on http://localhost:3000
```

Navigate to `/employee` (Alice's dashboard) or `/manager` (Diana's approval queue).

## Commands

```bash
# Development
npm run dev           # Next.js dev server (Turbopack) on :3000
npm run build         # Production build
npm run lint          # ESLint

# Testing
npm run test          # Vitest — unit + integration (52 tests)
npm run test:watch    # Vitest in watch mode
npm run coverage      # Coverage report (target: 80%+ on src/lib/)
npm run test:e2e      # Playwright E2E (requires dev server running on :3000)
npm run test:e2e:ui   # Playwright interactive mode

# Storybook
npm run storybook     # Storybook on http://localhost:6006
npm run build-storybook  # Static Storybook build

# Deployment
npm run chromatic     # Publish Storybook to Chromatic for visual review
```

## Key Invariants

1. **`displayedAvailable` is never negative** — the submit button disables when `days > available`.
2. **Pending reservations survive HCM background refreshes** — only explicit actions (CONFIRM / ROLLBACK / EXPIRE / SILENT_FAILURE_DETECTED) change reservation state.
3. **Manager always sees a fresh balance at decision time** — `BalanceAtDecisionTime` uses `staleTime: 0`.
4. **Silent failures show a toast** — 3 graduated verification fetches at t+1500/3500/7500 ms before declaring failure.
5. **`dispatch` is never exported** — all state transitions go through named methods in `useReservations`.

## Project Structure

```
src/
├── app/                   # Next.js App Router pages + API routes
│   ├── api/hcm/           # Mock HCM: balance, requests, SSE, debug
│   ├── employee/          # Employee dashboard (EmployeeView)
│   └── manager/           # Manager approval queue (ManagerView)
├── components/
│   ├── balance/           # BalanceCard, BalanceGrid, StaleIndicator
│   ├── manager/           # PendingRequestCard, ApprovalActions, BalanceAtDecisionTime
│   ├── request/           # RequestForm, RequestList, OptimisticRequestRow
│   └── ui/                # Badge, Banner, Dialog, Spinner
├── lib/
│   ├── hcm/               # Mock store, typed client, HCM types
│   ├── query/             # TanStack Query hooks (useBalance, useSubmitRequest, …)
│   └── reservations/      # Ledger reducer, persistence, BroadcastChannel context
├── stories/               # Storybook stories + MSW handlers/scenarios
└── tests/
    ├── unit/              # Reducer, persistence, expiry unit tests
    └── integration/       # Hook integration tests (MockEventSource + MSW)
tests/e2e/                 # Playwright E2E specs
TRD.md                     # Architecture decision record
```
