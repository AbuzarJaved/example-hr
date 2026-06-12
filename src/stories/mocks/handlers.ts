import { http, HttpResponse } from 'msw'
import type { HcmBalance, HcmRequest } from '@/lib/hcm/types'

// ── Seed data ───────────────────────────────────────────────────────────────

export const EMPLOYEE_ID = 'emp-001'

export function makeBalance(overrides: Partial<HcmBalance> = {}): HcmBalance {
  return {
    employeeId: EMPLOYEE_ID,
    locationId: 'annual',
    available: 15,
    used: 0,
    total: 15,
    ...overrides,
  }
}

export function makeRequest(overrides: Partial<HcmRequest> = {}): HcmRequest {
  return {
    id: 'req-001',
    employeeId: EMPLOYEE_ID,
    locationId: 'annual',
    startDate: '2026-07-01',
    endDate: '2026-07-03',
    days: 3,
    status: 'pending',
    submittedAt: Date.now() - 60_000,
    ...overrides,
  }
}

// ── Handler factories ────────────────────────────────────────────────────────

export function balanceHandler(balance: HcmBalance) {
  return http.get('/api/hcm/balance', () => HttpResponse.json({ balance }))
}

export function balancesHandler(balances: HcmBalance[]) {
  return http.get('/api/hcm/balances', () => HttpResponse.json({ balances }))
}

export function requestsHandler(requests: HcmRequest[]) {
  return http.get('/api/hcm/requests', () => HttpResponse.json({ requests }))
}

export function submitRequestHandler(request: HcmRequest) {
  return http.post('/api/hcm/requests', () =>
    HttpResponse.json({ request }, { status: 201 }),
  )
}

export function submitRequestErrorHandler(message = 'Insufficient balance', status = 422) {
  return http.post('/api/hcm/requests', () =>
    HttpResponse.json({ error: message }, { status }),
  )
}

// SSE: return an empty stream so EventSource doesn't log errors
export function sseHandler() {
  return http.get('/api/hcm/events', () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(': connected\n\n'))
        // keep open but never push events — stories control data via MSW
      },
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  })
}

// ── Named scenario bundles ───────────────────────────────────────────────────

export const defaultHandlers = [
  balanceHandler(makeBalance()),
  balancesHandler([
    makeBalance({ locationId: 'annual', available: 15, used: 0, total: 15 }),
    makeBalance({ locationId: 'sick', available: 10, used: 0, total: 10 }),
    makeBalance({ locationId: 'personal', available: 5, used: 0, total: 5 }),
  ]),
  requestsHandler([]),
  submitRequestHandler(makeRequest()),
  sseHandler(),
]
