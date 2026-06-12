export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'rolled-back'
  | 'silent-failure-detected'
  | 'expired'

export interface Reservation {
  id: string
  employeeId: string
  locationId: string
  days: number
  requestId: string | null
  status: ReservationStatus
  createdAt: number
  updatedAt: number
}

export type ReservationState = Reservation[]

export type ReservationAction =
  | { type: 'ADD'; payload: { id: string; employeeId: string; locationId: string; days: number } }
  | { type: 'CONFIRM'; payload: { id: string; requestId: string } }
  | { type: 'ROLLBACK'; payload: { id: string; reason?: string } }
  | { type: 'SILENT_FAILURE_DETECTED'; payload: { id: string } }
  | { type: 'EXPIRE'; payload: { id: string } }
