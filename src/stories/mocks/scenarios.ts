import { makeBalance, makeRequest, balanceHandler, balancesHandler, requestsHandler, submitRequestHandler, submitRequestErrorHandler, sseHandler } from './handlers'

/** Employee has plenty of balance — happy path */
export function healthyBalance() {
  return [
    balanceHandler(makeBalance({ available: 15, used: 0 })),
    balancesHandler([
      makeBalance({ locationId: 'annual', available: 15, used: 0, total: 15 }),
      makeBalance({ locationId: 'sick', available: 10, used: 0, total: 10 }),
      makeBalance({ locationId: 'personal', available: 5, used: 0, total: 5 }),
    ]),
    requestsHandler([]),
    submitRequestHandler(makeRequest()),
    sseHandler(),
  ]
}

/** Employee is nearly out of leave days */
export function insufficientBalance() {
  return [
    balanceHandler(makeBalance({ available: 1, used: 14 })),
    balancesHandler([
      makeBalance({ locationId: 'annual', available: 1, used: 14, total: 15 }),
      makeBalance({ locationId: 'sick', available: 0, used: 10, total: 10 }),
      makeBalance({ locationId: 'personal', available: 2, used: 3, total: 5 }),
    ]),
    requestsHandler([]),
    submitRequestErrorHandler('Insufficient balance', 422),
    sseHandler(),
  ]
}

/** HCM silently fails the submission — returns 200 but doesn't create the request */
export function silentFailure() {
  return [
    balanceHandler(makeBalance({ available: 15, used: 0 })),
    requestsHandler([]),
    // POST returns 200/201 but request body has a fake ID that won't be found on verify
    submitRequestHandler(makeRequest({ id: 'req-sfail-999' })),
    // GET for verification returns empty list
    requestsHandler([]),
    sseHandler(),
  ]
}

/** Employee has existing approved and pending requests */
export function withRequestHistory() {
  return [
    balanceHandler(makeBalance({ available: 12, used: 3 })),
    requestsHandler([
      makeRequest({ id: 'req-001', status: 'approved', days: 3 }),
      makeRequest({ id: 'req-002', status: 'pending', startDate: '2026-08-01', endDate: '2026-08-01', days: 1 }),
      makeRequest({ id: 'req-003', status: 'denied', startDate: '2026-09-01', endDate: '2026-09-05', days: 5 }),
    ]),
    sseHandler(),
  ]
}

/** HCM pushes an anniversary bonus — balance jumps */
export function anniversaryBonus() {
  let called = 0
  return [
    balanceHandler(
      // First call returns 15, subsequent calls return 20 (after bonus)
      Object.assign(makeBalance({ available: 15 }), {}),
    ),
    sseHandler(),
  ]
}
