'use client'

import type { LeaveType } from '@/lib/hcm/types'
import { useBalance } from '@/lib/query/useBalance'
import { useDisplayedBalance } from '@/lib/query/useDisplayedBalance'
import { useReservations } from '@/lib/reservations/useReservations'
import { BalanceSkeleton } from './BalanceSkeleton'

interface BalanceCardProps {
  employeeId: string
  locationId: LeaveType
  label: string
}

const accentColors: Record<LeaveType, string> = {
  annual: 'border-t-blue-500',
  sick: 'border-t-amber-500',
  personal: 'border-t-emerald-500',
}

export function BalanceCard({ employeeId, locationId, label }: BalanceCardProps) {
  const { data: balance, isLoading, isError } = useBalance(employeeId, locationId)
  const displayed = useDisplayedBalance(balance, employeeId, locationId)
  const { reservations } = useReservations()

  const pendingDays = reservations
    .filter(
      r => r.employeeId === employeeId && r.locationId === locationId && r.status === 'pending',
    )
    .reduce((sum, r) => sum + r.days, 0)

  if (isLoading) return <BalanceSkeleton />

  if (isError || !balance) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
        Could not load {label} balance.
      </div>
    )
  }

  const isLow = (displayed ?? 0) <= 2

  return (
    <div
      className={`rounded-xl border-t-4 bg-white p-5 shadow-sm ${accentColors[locationId]} border border-zinc-100`}
    >
      <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">{label}</h3>

      <div className="mt-3 flex items-end gap-1">
        <span
          className={`text-4xl font-semibold tabular-nums ${isLow ? 'text-red-600' : 'text-zinc-900'}`}
        >
          {displayed ?? balance.available}
        </span>
        <span className="mb-1 text-sm text-zinc-400">days available</span>
      </div>

      {pendingDays > 0 && (
        <p className="mt-1 text-xs text-amber-600">
          {pendingDays}d reserved (pending HCM confirmation)
        </p>
      )}

      <div className="mt-3 border-t border-zinc-100 pt-3 text-xs text-zinc-400">
        {balance.used}d used · {balance.total}d total
      </div>
    </div>
  )
}
