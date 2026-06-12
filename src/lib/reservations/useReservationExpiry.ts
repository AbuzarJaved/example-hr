import { useEffect, useRef } from 'react'
import type { ReservationAction, ReservationState } from './types'

const EXPIRY_SWEEP_INTERVAL_MS = 60_000
const PENDING_EXPIRY_MS = 5 * 60 * 1000

export function useReservationExpiry(
  reservations: ReservationState,
  dispatch: React.Dispatch<ReservationAction>,
) {
  // Keep a ref so the interval closure always reads the latest reservations
  // without re-registering the interval on every state change.
  const reservationsRef = useRef(reservations)
  reservationsRef.current = reservations

  useEffect(() => {
    const sweep = () => {
      const now = Date.now()
      reservationsRef.current
        .filter(r => r.status === 'pending' && now - r.createdAt > PENDING_EXPIRY_MS)
        .forEach(r => dispatch({ type: 'EXPIRE', payload: { id: r.id } }))
    }

    const id = setInterval(sweep, EXPIRY_SWEEP_INTERVAL_MS)
    return () => clearInterval(id)
  }, [dispatch])
}
