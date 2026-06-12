import type { HcmBalance } from '@/lib/hcm/types'
import { useReservations } from '@/lib/reservations/useReservations'

export function useDisplayedBalance(
  balance: HcmBalance | undefined,
  employeeId: string,
  locationId: string,
): number | undefined {
  const { reservations } = useReservations()

  if (!balance) return undefined

  const pendingDays = reservations
    .filter(
      r =>
        r.employeeId === employeeId &&
        r.locationId === locationId &&
        r.status === 'pending',
    )
    .reduce((sum, r) => sum + r.days, 0)

  return Math.max(0, balance.available - pendingDays)
}
