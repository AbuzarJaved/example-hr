'use client'

import { useQuery } from '@tanstack/react-query'
import { getRequests } from '@/lib/hcm/client'
import { useReservations } from '@/lib/reservations/useReservations'
import { keys } from '@/lib/query/keys'
import { RequestStatusBadge } from './RequestStatusBadge'
import { OptimisticRequestRow } from './OptimisticRequestRow'
import { Spinner } from '@/components/ui/Spinner'

interface RequestListProps {
  employeeId: string
}

export function RequestList({ employeeId }: RequestListProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: keys.requests(employeeId),
    queryFn: () => getRequests(employeeId).then(r => r.requests),
    refetchInterval: 60_000,
  })

  const { reservations } = useReservations()
  const pending = reservations.filter(
    r => r.employeeId === employeeId && r.status === 'pending',
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-zinc-400">
        <Spinner />
      </div>
    )
  }

  if (isError) {
    return (
      <p className="py-4 text-sm text-red-600" role="alert">
        Could not load requests. Please refresh.
      </p>
    )
  }

  const hasContent = (data?.length ?? 0) > 0 || pending.length > 0

  if (!hasContent) {
    return (
      <p className="py-8 text-center text-sm text-zinc-400">
        No time-off requests yet.
      </p>
    )
  }

  return (
    <ul className="space-y-2" aria-label="Time-off requests">
      {pending.map(r => (
        <OptimisticRequestRow key={r.id} reservation={r} />
      ))}

      {data?.map(req => (
        <li
          key={req.id}
          className="flex items-center justify-between rounded-lg border border-zinc-100 bg-white px-4 py-3 text-sm"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-zinc-800 capitalize">{req.locationId} Leave</span>
            <span className="text-zinc-400">
              {req.startDate} → {req.endDate} · {req.days}d
            </span>
          </div>
          <RequestStatusBadge status={req.status} />
        </li>
      ))}
    </ul>
  )
}
