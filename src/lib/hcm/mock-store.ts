import type { HcmBalance, HcmEmployee, HcmEvent, HcmRequest, LeaveType } from './types'

export const SILENT_FAILURE_RATE = 0.05

const LEAVE_TYPES: LeaveType[] = ['annual', 'sick', 'personal']

export const employees: HcmEmployee[] = [
  { id: 'emp-001', name: 'Alice Johnson', role: 'employee' },
  { id: 'emp-002', name: 'Bob Smith', role: 'employee' },
  { id: 'emp-003', name: 'Charlie Davis', role: 'employee' },
  { id: 'mgr-001', name: 'Diana Chen', role: 'manager' },
]

const balanceMap = new Map<string, HcmBalance>()
const requestMap = new Map<string, HcmRequest>()
let requestCounter = 1

function seedBalances() {
  const seeds: Array<{ employeeId: string; locationId: LeaveType; total: number }> = [
    { employeeId: 'emp-001', locationId: 'annual', total: 15 },
    { employeeId: 'emp-001', locationId: 'sick', total: 10 },
    { employeeId: 'emp-001', locationId: 'personal', total: 5 },
    { employeeId: 'emp-002', locationId: 'annual', total: 10 },
    { employeeId: 'emp-002', locationId: 'sick', total: 10 },
    { employeeId: 'emp-002', locationId: 'personal', total: 3 },
    { employeeId: 'emp-003', locationId: 'annual', total: 20 },
    { employeeId: 'emp-003', locationId: 'sick', total: 12 },
    { employeeId: 'emp-003', locationId: 'personal', total: 8 },
  ]
  for (const { employeeId, locationId, total } of seeds) {
    balanceMap.set(`${employeeId}:${locationId}`, {
      employeeId,
      locationId,
      available: total,
      used: 0,
      total,
    })
  }
}

seedBalances()

// Module-level SSE subscriber registry (single-process dev pattern).
// Production upgrade: replace this Set with a Redis pub/sub subscriber list;
// the notifySubscribers call-site and SSE event format remain identical.
const subscribers = new Set<ReadableStreamDefaultController>()
const encoder = new TextEncoder()

let silentFailMode = false

export function shouldSilentFail(): boolean {
  return silentFailMode || Math.random() < SILENT_FAILURE_RATE
}

export function toggleSilentFail(): boolean {
  silentFailMode = !silentFailMode
  return silentFailMode
}

export function isSilentFailMode(): boolean {
  return silentFailMode
}

export function addSubscriber(controller: ReadableStreamDefaultController): void {
  subscribers.add(controller)
}

export function removeSubscriber(controller: ReadableStreamDefaultController): void {
  subscribers.delete(controller)
}

export function notifySubscribers(event: HcmEvent): void {
  const payload = encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
  for (const controller of subscribers) {
    try {
      controller.enqueue(payload)
    } catch {
      subscribers.delete(controller)
    }
  }
}

export function getBalance(employeeId: string, locationId: string): HcmBalance | undefined {
  return balanceMap.get(`${employeeId}:${locationId}`)
}

export function getBalancesForEmployee(employeeId: string): HcmBalance[] {
  return LEAVE_TYPES.map(lt => balanceMap.get(`${employeeId}:${lt}`)).filter(
    (b): b is HcmBalance => b !== undefined,
  )
}

export function getAllBalances(): HcmBalance[] {
  return Array.from(balanceMap.values())
}

export function setBalance(
  employeeId: string,
  locationId: string,
  available: number,
): HcmBalance | null {
  const key = `${employeeId}:${locationId}`
  const existing = balanceMap.get(key)
  if (!existing) return null
  const updated: HcmBalance = { ...existing, available, used: existing.total - available }
  balanceMap.set(key, updated)
  return updated
}

export type CreateRequestInput = Omit<HcmRequest, 'id' | 'status' | 'submittedAt'>
export type StoreError = { error: string; code: string }

export function createRequest(data: CreateRequestInput): HcmRequest | StoreError {
  const balance = getBalance(data.employeeId, data.locationId)
  if (!balance) return { error: 'Balance record not found', code: 'BALANCE_NOT_FOUND' }
  if (balance.available < data.days) return { error: 'Insufficient balance', code: 'INSUFFICIENT_BALANCE' }

  const id = `req-${String(requestCounter++).padStart(4, '0')}`
  const request: HcmRequest = { ...data, id, status: 'pending', submittedAt: Date.now() }
  requestMap.set(id, request)
  return request
}

export function getRequest(id: string): HcmRequest | undefined {
  return requestMap.get(id)
}

export function getRequestsForEmployee(employeeId: string): HcmRequest[] {
  return Array.from(requestMap.values()).filter(r => r.employeeId === employeeId)
}

export function getAllRequests(): HcmRequest[] {
  return Array.from(requestMap.values())
}

export function approveRequest(id: string, reviewedBy: string): HcmRequest | StoreError {
  const request = requestMap.get(id)
  if (!request) return { error: 'Request not found', code: 'NOT_FOUND' }
  if (request.status !== 'pending') return { error: 'Request is not pending', code: 'INVALID_STATE' }

  const balance = getBalance(request.employeeId, request.locationId)
  if (!balance) return { error: 'Balance record not found', code: 'BALANCE_NOT_FOUND' }
  if (balance.available < request.days) return { error: 'Insufficient balance', code: 'INSUFFICIENT_BALANCE' }

  const updatedBalance = setBalance(request.employeeId, request.locationId, balance.available - request.days)!
  const updated: HcmRequest = { ...request, status: 'approved', reviewedAt: Date.now(), reviewedBy }
  requestMap.set(id, updated)

  notifySubscribers({
    type: 'request_approved',
    employeeId: request.employeeId,
    locationId: request.locationId,
    requestId: id,
    balance: updatedBalance,
    timestamp: Date.now(),
  })
  return updated
}

export function denyRequest(id: string, reviewedBy: string, notes?: string): HcmRequest | StoreError {
  const request = requestMap.get(id)
  if (!request) return { error: 'Request not found', code: 'NOT_FOUND' }
  if (request.status !== 'pending') return { error: 'Request is not pending', code: 'INVALID_STATE' }

  const updated: HcmRequest = { ...request, status: 'denied', reviewedAt: Date.now(), reviewedBy, notes }
  requestMap.set(id, updated)

  notifySubscribers({
    type: 'request_denied',
    employeeId: request.employeeId,
    locationId: request.locationId,
    requestId: id,
    timestamp: Date.now(),
  })
  return updated
}

export function triggerAnniversaryBonus(
  employeeId: string,
  locationId: string,
  amount: number,
  delayMs = 3000,
): void {
  setTimeout(() => {
    const existing = balanceMap.get(`${employeeId}:${locationId}`)
    if (!existing) return
    const updated: HcmBalance = {
      ...existing,
      available: existing.available + amount,
      total: existing.total + amount,
    }
    balanceMap.set(`${employeeId}:${locationId}`, updated)
    notifySubscribers({
      type: 'balance_updated',
      employeeId,
      locationId: locationId as LeaveType,
      balance: updated,
      timestamp: Date.now(),
    })
  }, delayMs)
}

export function resetStore(): void {
  balanceMap.clear()
  seedBalances()
  requestMap.clear()
  requestCounter = 1
  silentFailMode = false
}

export { LEAVE_TYPES }
