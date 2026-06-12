export type LeaveType = 'annual' | 'sick' | 'personal'

export interface HcmEmployee {
  id: string
  name: string
  role: 'employee' | 'manager'
}

export interface HcmBalance {
  employeeId: string
  locationId: LeaveType
  available: number
  used: number
  total: number
}

export interface HcmRequest {
  id: string
  employeeId: string
  locationId: LeaveType
  startDate: string
  endDate: string
  days: number
  status: 'pending' | 'approved' | 'denied'
  submittedAt: number
  reviewedAt?: number
  reviewedBy?: string
  notes?: string
}

export type HcmEventType =
  | 'request_created'
  | 'request_approved'
  | 'request_denied'
  | 'balance_updated'

export interface HcmEvent {
  type: HcmEventType
  employeeId: string
  locationId: LeaveType
  requestId?: string
  balance?: HcmBalance
  timestamp: number
}

export interface BalanceResponse {
  balance: HcmBalance
}

export interface BalancesResponse {
  balances: HcmBalance[]
}

export interface RequestResponse {
  request: HcmRequest
}

export interface RequestsResponse {
  requests: HcmRequest[]
}

export interface ErrorResponse {
  error: string
  code?: string
}
