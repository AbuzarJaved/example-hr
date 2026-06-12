import type { Reservation, ReservationAction, ReservationState } from './types'

export const initialState: ReservationState = []

export function reservationReducer(
  state: ReservationState,
  action: ReservationAction,
): ReservationState {
  const now = Date.now()

  switch (action.type) {
    case 'ADD': {
      const { id, employeeId, locationId, days } = action.payload
      const reservation: Reservation = {
        id,
        employeeId,
        locationId,
        days,
        requestId: null,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      }
      return [...state, reservation]
    }

    case 'CONFIRM': {
      const { id, requestId } = action.payload
      return state.map(r =>
        r.id === id ? { ...r, requestId, status: 'confirmed', updatedAt: now } : r,
      )
    }

    case 'ROLLBACK': {
      const { id } = action.payload
      return state.map(r =>
        r.id === id ? { ...r, status: 'rolled-back', updatedAt: now } : r,
      )
    }

    case 'SILENT_FAILURE_DETECTED': {
      const { id } = action.payload
      return state.map(r =>
        r.id === id ? { ...r, status: 'silent-failure-detected', updatedAt: now } : r,
      )
    }

    case 'EXPIRE': {
      const { id } = action.payload
      return state.map(r =>
        r.id === id ? { ...r, status: 'expired', updatedAt: now } : r,
      )
    }

    default:
      return state
  }
}
