// NEVER export dispatch. All state transitions go through these named methods.
import { useReservationContext } from './ReservationContext'

export function useReservations() {
  const { reservations, _dispatch } = useReservationContext()

  return {
    reservations,

    addReservation(id: string, employeeId: string, locationId: string, days: number) {
      _dispatch({ type: 'ADD', payload: { id, employeeId, locationId, days } })
    },

    confirmReservation(id: string, requestId: string) {
      _dispatch({ type: 'CONFIRM', payload: { id, requestId } })
    },

    rollbackReservation(id: string, reason?: string) {
      _dispatch({ type: 'ROLLBACK', payload: { id, reason } })
    },

    silentFailureDetected(id: string) {
      _dispatch({ type: 'SILENT_FAILURE_DETECTED', payload: { id } })
    },

    expireReservation(id: string) {
      _dispatch({ type: 'EXPIRE', payload: { id } })
    },
  }
}
