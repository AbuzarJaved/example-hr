import type {
  BalanceResponse,
  BalancesResponse,
  ErrorResponse,
  HcmRequest,
  LeaveType,
  RequestResponse,
  RequestsResponse,
} from './types'

const BASE = '/api/hcm'

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err: ErrorResponse = await res.json().catch(() => ({ error: res.statusText }))
    throw Object.assign(new Error(err.error), { code: err.code, status: res.status })
  }
  return res.json() as Promise<T>
}

export async function getBalance(employeeId: string, locationId: string): Promise<BalanceResponse> {
  const res = await fetch(`${BASE}/balance?employeeId=${encodeURIComponent(employeeId)}&locationId=${encodeURIComponent(locationId)}`)
  return parseResponse<BalanceResponse>(res)
}

export async function getBalances(employeeId?: string): Promise<BalancesResponse> {
  const url = employeeId ? `${BASE}/balances?employeeId=${encodeURIComponent(employeeId)}` : `${BASE}/balances`
  const res = await fetch(url)
  return parseResponse<BalancesResponse>(res)
}

export interface SubmitRequestPayload {
  employeeId: string
  locationId: LeaveType
  startDate: string
  endDate: string
  days: number
}

export async function submitRequest(payload: SubmitRequestPayload): Promise<RequestResponse> {
  const res = await fetch(`${BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse<RequestResponse>(res)
}

export async function getRequests(employeeId?: string): Promise<RequestsResponse> {
  const url = employeeId ? `${BASE}/requests?employeeId=${encodeURIComponent(employeeId)}` : `${BASE}/requests`
  const res = await fetch(url)
  return parseResponse<RequestsResponse>(res)
}

export async function getRequest(id: string): Promise<RequestResponse> {
  const res = await fetch(`${BASE}/requests/${encodeURIComponent(id)}`)
  return parseResponse<RequestResponse>(res)
}

export interface ReviewRequestPayload {
  action: 'approve' | 'deny'
  reviewedBy: string
  notes?: string
}

export async function reviewRequest(id: string, payload: ReviewRequestPayload): Promise<RequestResponse> {
  const res = await fetch(`${BASE}/requests/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse<RequestResponse>(res)
}

export interface AnniversaryBonusPayload {
  employeeId: string
  locationId: string
  amount: number
  delayMs?: number
}

export async function triggerAnniversaryBonus(payload: AnniversaryBonusPayload): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${BASE}/debug`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'anniversary_bonus', ...payload }),
  })
  return parseResponse(res)
}

export async function toggleSilentFail(): Promise<{ ok: boolean; silentFailMode: boolean }> {
  const res = await fetch(`${BASE}/debug`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'toggle_silent_fail' }),
  })
  return parseResponse(res)
}

export function createSseConnection(onEvent: (event: MessageEvent) => void): EventSource {
  const es = new EventSource(`${BASE}/events`)
  es.onmessage = onEvent
  return es
}

// Typed helper for identifying a balance cell uniquely
export function balanceCellKey(employeeId: string, locationId: string): string {
  return `${employeeId}:${locationId}`
}

// Verify that a request was actually created (used by event-first verification)
export async function verifyRequestExists(requestId: string): Promise<HcmRequest | null> {
  try {
    const { request } = await getRequest(requestId)
    return request
  } catch {
    return null
  }
}
