'use client'

import { useQuery } from '@tanstack/react-query'
import { getBalance } from '@/lib/hcm/client'
import type { LeaveType } from '@/lib/hcm/types'
import { keys } from '@/lib/query/keys'
import { Spinner } from '@/components/ui/Spinner'

interface BalanceAtDecisionTimeProps {
  employeeId: string
  locationId: LeaveType
  requestedDays: number
}

export function BalanceAtDecisionTime({
  employeeId,
  locationId,
  requestedDays,
}: BalanceAtDecisionTimeProps) {
  // staleTime: 0 guarantees a fresh HCM read every time the manager opens this card —
  // never served from the employee's cached session data.
  const { data: balance, isLoading, isError } = useQuery({
    queryKey: keys.balance(employeeId, locationId),
    queryFn: () => getBalance(employeeId, locationId).then(r => r.balance),
    staleTime: 0,
    refetchInterval: false,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Spinner size="sm" />
        Fetching current balance…
      </div>
    )
  }

  if (isError || !balance) {
    return (
      <p className="text-xs text-red-500">Could not fetch current balance.</p>
    )
  }

  const sufficient = balance.available >= requestedDays

  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs">
      <span className="text-zinc-500">Balance (as of now): </span>
      <span className={`font-semibold ${sufficient ? 'text-emerald-700' : 'text-red-600'}`}>
        {balance.available}d available
      </span>
      <span className="text-zinc-400"> / {balance.total}d total</span>
      {!sufficient && (
        <span className="ml-2 font-medium text-red-600">
          ⚠ Insufficient for {requestedDays}d request
        </span>
      )}
    </div>
  )
}
