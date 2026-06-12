import type { Reservation } from '@/lib/reservations/types'
import { RequestStatusBadge } from './RequestStatusBadge'

interface OptimisticRequestRowProps {
  reservation: Reservation
}

const leaveLabels: Record<string, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  personal: 'Personal Leave',
}

export function OptimisticRequestRow({ reservation }: OptimisticRequestRowProps) {
  const isTerminal = ['confirmed', 'rolled-back', 'expired'].includes(reservation.status)

  return (
    <li
      className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-opacity ${
        isTerminal ? 'opacity-60' : 'border-amber-200 bg-amber-50'
      }`}
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-zinc-800">
          {leaveLabels[reservation.locationId] ?? reservation.locationId}
        </span>
        <span className="text-zinc-400">{reservation.days}d · optimistic</span>
      </div>
      <RequestStatusBadge status={reservation.status} />
    </li>
  )
}
