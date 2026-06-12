# Technical Requirements Document — ExampleHR Time-Off Module

**Author:** abuzar  
**Date:** 2026-06-13  
**Status:** Final

---

## 1. Problem Statement

ExampleHR employees need to request time off while HCM (e.g. Workday, SAP SuccessFactors) remains the authoritative source of truth for leave balances. The UX must be:

- **Instant** — submitting a request feels instantaneous; no loading spinners on the happy path.
- **Honest** — the UI never permanently misrepresents approval state, even when the HCM call is slow or partially fails.
- **Recoverable** — contradictions from HCM (insufficient balance at approval time, network blips, silent failures) are surfaced clearly and never leave the UI in a permanently wrong state.
- **Cross-tab consistent** — a submission in one browser tab must reflect immediately in any other open tab on the same origin.

---

## 2. Architecture Decision: Option C Selected

**TanStack Query v5 + SSE (with `refetchInterval` fallback) + Explicit Reservation Ledger (`useReducer` + `localStorage` + `BroadcastChannel`)**

### 2.1 Rejected Alternatives

#### Option A — TanStack Query + Zustand
Rejected because two separate state stores (Query cache for server state, Zustand for optimistic state) create synchronisation debt. Under React 19 concurrent mode, a rollback requires a snapshot of the Zustand store at the exact moment the mutation fired. If a second mutation overlaps the same cell before the first confirms, the snapshot is stale and rollback corrupts the balance display. The explicit Reservation Ledger (Option C) avoids this by making optimistic state a first-class reducer that is never mixed with server cache.

#### Option B — TanStack Query `onMutate` snapshots only
Rejected because TanStack Query's built-in snapshot/rollback (`onMutate` + `context`) is designed for a short window (the duration of a single inflight request). Concurrent requests to the same balance cell overwrite each other's snapshot contexts. When both requests land, only the most-recent `onError` rollback fires. The older mutation's optimistic entry is orphaned with no mechanism to remove it. A dedicated reducer with unique reservation IDs per mutation solves this cleanly.

---

## 3. Core Concepts

### 3.1 Reservation Ledger

The ledger is a client-side list of *reservations* — each representing "this employee has claimed N days from this balance cell and we are waiting for HCM to confirm." Every reservation has a lifecycle state:

```
pending → confirmed        (HCM accepted the request)
pending → rolled-back      (HCM rejected — insufficient balance, network error)
pending → silent-failure-detected  (HCM returned 200 but never committed)
pending → expired          (pending for > 5 min without resolution — sweep cleanup)
```

**`displayedAvailable = hcmBalance.available − Σ(pending.days for this cell)`**

This derived value is what the employee sees. It is computed on every render from the latest HCM balance (from TanStack Query) and the current pending reservations. No state duplication — no sync needed between an "optimistic balance" and a "real balance."

### 3.2 Action Encapsulation

`dispatch` is **never exported** from the Reservation context. All state transitions go through named methods (`addReservation`, `confirmReservation`, `rollbackReservation`, `silentFailureDetected`, `expireReservation`) in `useReservations`. This prevents callers from issuing arbitrary actions, enforces the state machine boundary, and makes the call sites self-documenting.

---

## 4. Gap Analysis and Decisions

### Gap 1 — SSE Limitation (single-process mock)

**Decision: Keep SSE + document production upgrade path + add `refetchInterval: 60_000` fallback.**

The mock SSE handler (`/api/hcm/events/route.ts`) uses a module-level `Set<ReadableStreamDefaultController>` subscriber registry. This works correctly within a single Next.js process (dev server) because all Route Handlers share module scope.

**Production upgrade path:** Replace the module-level `Set` with a Redis pub/sub channel. The SSE handler interface (`addSubscriber`, `removeSubscriber`, `notifySubscribers`) is identical — only the backing store changes. A Redis subscriber registers on connection and unregisters on disconnect. `notifySubscribers` publishes to the channel; all connected pods fan the event out to their local subscribers. No client-visible API change.

TanStack Query `refetchInterval: 60_000` is configured as a background safety net. Even if SSE drops, balance data refreshes every minute. The `useHcmEvents` hook disables this interval while SSE is live to avoid redundant fetches (not yet implemented in this version — left as a production hardening step).

### Gap 2 — Silent Failure Handling

**Decision: Event-first verification with exponential backoff timeout floor.**

When the HCM POST handler rolls the dice on `SILENT_FAILURE_RATE = 0.05`, it returns a plausible-looking `200 OK` with a fake request ID — but does not commit anything to the store and does not emit an SSE event.

The client handles this with a two-layer verification strategy in `useSubmitRequest.onSuccess`:

1. **SSE listener (fast path):** A one-shot `EventSource` opens immediately. If the matching `request_created` event arrives (typically < 1 s under normal conditions), the listener resolves `confirmed` and closes.

2. **Exponential-backoff fetches (safety net):** Three `setTimeout` callbacks at absolute offsets **t+1500 ms, t+3500 ms, t+7500 ms** each call `GET /api/hcm/requests/:id`. Any fetch that returns the request triggers `confirmReservation`. If all three return null, the third resolves `false` → `silentFailureDetected(reservationId)` + `toast.error`.

**Why three graduated reads instead of a fixed 2-second window?** A fixed window would produce false positives during legitimate HCM slow-down periods. Three reads at increasing intervals give HCM progressively more time — by t+7500 ms (7.5 s of consistent absence) we have high confidence of a real silent failure rather than a slow-but-honest response.

The same pattern is used in `useApproveRequest` and `useDenyRequest` for manager approval/denial confirmation.

### Gap 3 — Ledger Persistence

**Decision: Write ledger to `localStorage` on every dispatch; use it as cold-start hydration only.**

`ReservationProvider` writes the full ledger array to `localStorage['hcm-reservation-ledger']` in a `useEffect` triggered on every state change. On mount, `useReducer`'s third initialiser argument calls `readLedger()` — a synchronous, SSR-safe read that restores the full ledger.

Any `pending` reservation older than 5 minutes in the hydrated state will be caught by `useReservationExpiry`'s 60-second sweep (which runs immediately one minute after mount). For reservations pending between 0 – 5 minutes at hydration time, the user's session is assumed still relevant; they will either be confirmed by an arriving SSE event or swept at the next 60-second tick.

### Gap 4 — Cross-Tab Consistency + Persistence

**Decision: BroadcastChannel for live sync only. `localStorage` for cold-start hydration only. Never mix.**

| Mechanism | Purpose | Survives page close? |
|---|---|---|
| `BroadcastChannel` | Live cross-tab sync — dispatches fan out to all same-origin tabs instantly | No — ephemeral |
| `localStorage` | Cold-start hydration — restores state when all tabs are closed and a new one opens | Yes — persistent |

**Why both, and why they don't overlap:**
- BroadcastChannel is ephemeral: it only works while at least one tab is open. If all tabs close mid-reservation, the in-flight state would be lost.
- `localStorage` covers the browser-close case. It also survives navigations within the same tab.
- Combining them naively creates a race: `localStorage.setItem` fires a `storage` event in other tabs. If we also listen to `storage` in addition to BroadcastChannel, each tab processes the action **twice** — once from the channel message, once from the storage event triggered by the write. The architectural rule is: **never subscribe to the `storage` event**. All live sync is owned exclusively by BroadcastChannel.

---

## 5. Cache Invalidation Strategy

TanStack Query maintains separate entries for:
- `['balance', employeeId, locationId]` — single balance cell (employee and manager reads)
- `['balances', employeeId]` — all cells for an employee (batch)
- `['requests', employeeId?]` — request list (filtered or all)
- `['request', id]` — single request

**Invalidation triggers:**
1. **Mutation `onSuccess`** (direct) — `useSubmitRequest`, `useApproveRequest`, `useDenyRequest` all call `queryClient.invalidateQueries` for the affected keys after the event-first verification resolves.
2. **SSE event** (broadcast) — `useHcmEvents` listens to the shared SSE stream and calls `invalidateQueries` for the `balance` + `balances` keys on any event, and additionally for `request` + `requests` when the event carries a `requestId`.

**Manager freshness:** `BalanceAtDecisionTime` uses `staleTime: 0` so every card mount triggers a fresh fetch regardless of what the employee's session has already cached. This prevents the manager from accidentally approving a request based on a stale balance.

---

## 6. Background Refresh vs In-Flight Action Reconciliation

A background `refetchInterval: 60_000` refetch runs continuously. This creates a potential conflict: what if a refetch returns a balance that *appears* lower because the employee's pending reservation hasn't been confirmed yet?

**Resolution:** `useDisplayedBalance` always computes `displayed = hcmBalance.available − pendingDays`. A background refetch updates `hcmBalance`. The `pendingDays` are read from the Reservation Ledger, which is not affected by the refetch. So the displayed balance remains correct — it automatically accounts for pending reservations regardless of when the background refetch lands.

The only time a refetch could temporarily show a confusing value is during silent failure: `hcmBalance` stays unchanged (HCM didn't commit) but `pendingDays` counts the reservation. The `StaleIndicator` banner ("Balance updated since you loaded") appears on re-fetches triggered by SSE — not on routine background polls — so users are not notified of phantom changes.

---

## 7. Test Strategy

| Layer | Tool | Guards |
|---|---|---|
| Reservation reducer | Vitest unit (12 tests) | All state machine transitions; concurrent dispatch ordering; rollback; silent-failure-detected |
| Balance derivation | Vitest unit (in persistence tests) | `hcmBalance − pending` math; SSR guard; stale-pending detection |
| `localStorage` persistence | Vitest unit (11 tests) | SSR-safe read/write; malformed JSON fallback; `stalePendingIds` threshold |
| Expiry sweep | Vitest unit (4 tests) | Timer fires EXPIRE for > 5 min pending; does not fire for recent pending |
| Mutation hooks (happy path) | Vitest integration (3 tests) | Optimistic pending → SSE confirm; wrong-cell SSE ignored |
| Silent failure detection | Vitest integration (2 tests) | 3 mismatches → `silentFailureDetected` + toast; SSE-before-timeout cancels backoff |
| Rollback paths | Vitest integration (3 tests) | 422/500/network errors all produce `rolled-back` status |
| SSE reconciliation | Vitest integration (4 tests) | `balance_updated` / `request_approved` invalidate correct query keys; unmount closes connection; malformed data silently ignored |
| Hydration | Vitest integration (6 tests) | localStorage restore; malformed JSON guard; expiry sweep with fake timers |
| Cross-tab sync | Vitest integration (4 tests) | Incoming BroadcastChannel ADD/CONFIRM/ROLLBACK applied; outgoing actions posted |
| Manager approval | Vitest integration (3 tests) | Approve/deny SSE path; 3-mismatch toast error |
| All UI states | Storybook (SB 10 + `@storybook/addon-vitest`) | Every named state renders; ApprovalActions play function verifies approve interaction |
| Employee + manager full flow | Playwright E2E (3 tests) | Submit → optimistic → manager approves → confirmed; deny flow; redirect |

**Deliberate choice: no mocks in integration tests.** All integration tests use `msw/node`'s `setupServer` to intercept fetch at the network level, not to stub application logic. This catches bugs in `client.ts` and route handler shape mismatches that application-level stubs would hide.

---

## 8. SSE Production Upgrade Path

```
Dev (current)                     Production (upgrade)
─────────────────────             ──────────────────────────────────
module-level Set<Controller>  →   Redis pub/sub subscriber registry
notifySubscribers(event)      →   redisClient.publish('hcm:events', JSON.stringify(event))
addSubscriber(controller)     →   const sub = redis.duplicate(); sub.subscribe('hcm:events', ...)
removeSubscriber(controller)  →   sub.unsubscribe() + sub.quit()
```

The SSE Route Handler interface is unchanged. Horizontally-scaled pods all subscribe to the same Redis channel. When any pod's HCM write succeeds, it publishes. Every pod fans the event to its local connections. No client-side changes required.

---

## 9. Key Invariants the Test Suite Enforces

1. **`displayedAvailable` is never negative** — `useDisplayedBalance` clamps at `Math.max(0, ...)` and the form disables submission when `days > displayed`.

2. **A pending reservation is never silently discarded** — only an explicit `CONFIRM`, `ROLLBACK`, `SILENT_FAILURE_DETECTED`, or `EXPIRE` action can remove it from the `pending` state. Background HCM balance refreshes do not touch the reservation ledger.

3. **The manager always sees a fresh balance at decision time** — `BalanceAtDecisionTime` uses `staleTime: 0` and `refetchInterval: false`, so it is never served from the employee's cached session.

4. **A silent failure always results in a visible toast and a `silent-failure-detected` reservation** — it is never swallowed silently. Three graduated verification fetches provide the timeout floor.

5. **On page reload, no `pending` reservation older than 5 minutes is left unresolved** — `useReservationExpiry` sweeps every 60 seconds and dispatches `EXPIRE` for stale entries.

6. **`dispatch` is never exported** — all state transitions go through named methods in `useReservations`. The context field is prefixed `_dispatch` to signal internal-only access.
