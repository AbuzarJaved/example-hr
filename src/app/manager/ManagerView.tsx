'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRequests } from '@/lib/hcm/client'
import { keys } from '@/lib/query/keys'
import { useHcmEvents } from '@/lib/query/useHcmEvents'
import { PendingRequestCard } from '@/components/manager/PendingRequestCard'
import { StaleIndicator } from '@/components/balance/StaleIndicator'
import { Spinner } from '@/components/ui/Spinner'
import type { HcmRequest } from '@/lib/hcm/types'

interface ManagerViewProps {
  managerId: string
  managerName: string
}

export function ManagerView({ managerId, managerName }: ManagerViewProps) {
  useHcmEvents()

  const queryClient = useQueryClient()
  const [staleVisible, setStaleVisible] = useState(false)
  const initializedRef = useRef(false)

  const { data: allRequests, isLoading, isError } = useQuery({
    queryKey: keys.requests(),
    queryFn: () => getRequests().then(r => r.requests),
    refetchInterval: 60_000,
  })

  // Show StaleIndicator when SSE triggers a request or balance cache update
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(event => {
      if (event.type !== 'updated') return
      const qk = event.query.queryKey
      if (!Array.isArray(qk)) return
      if (qk[0] !== 'requests' && qk[0] !== 'balance') return
      if (!initializedRef.current) {
        initializedRef.current = true
        return
      }
      setStaleVisible(true)
    })
    return unsubscribe
  }, [queryClient])

  const pending = allRequests?.filter((r: HcmRequest) => r.status === 'pending') ?? []
  const decided = allRequests?.filter((r: HcmRequest) => r.status !== 'pending') ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Manager Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Reviewing as {managerName}</p>
      </div>

      <StaleIndicator visible={staleVisible} onDismiss={() => setStaleVisible(false)} />

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-zinc-400">
          <Spinner />
        </div>
      )}

      {isError && (
        <p className="py-4 text-sm text-red-600" role="alert">
          Could not load requests. Please refresh.
        </p>
      )}

      {!isLoading && !isError && (
        <>
          <section aria-labelledby="pending-heading">
            <h2
              id="pending-heading"
              className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500"
            >
              Awaiting Review
              {pending.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {pending.length}
                </span>
              )}
            </h2>

            {pending.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-400">
                No pending requests — all clear.
              </p>
            ) : (
              <ul className="space-y-4" aria-label="Pending requests">
                {pending.map(req => (
                  <li key={req.id}>
                    <PendingRequestCard request={req} reviewedBy={managerId} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {decided.length > 0 && (
            <section aria-labelledby="decided-heading">
              <h2
                id="decided-heading"
                className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500"
              >
                Recent Decisions
              </h2>
              <ul className="space-y-2" aria-label="Decided requests">
                {decided.map(req => (
                  <li key={req.id}>
                    <PendingRequestCard request={req} reviewedBy={managerId} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
