'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BalanceGrid } from '@/components/balance/BalanceGrid'
import { StaleIndicator } from '@/components/balance/StaleIndicator'
import { RequestForm } from '@/components/request/RequestForm'
import { RequestList } from '@/components/request/RequestList'
import { useHcmEvents } from '@/lib/query/useHcmEvents'
import { keys } from '@/lib/query/keys'

interface EmployeeViewProps {
  employeeId: string
  employeeName: string
}

export function EmployeeView({ employeeId, employeeName }: EmployeeViewProps) {
  useHcmEvents()

  const queryClient = useQueryClient()
  const [staleVisible, setStaleVisible] = useState(false)
  const initializedRef = useRef(false)

  // Show StaleIndicator whenever TanStack Query refetches balance data after initial load
  useEffect(() => {
    const cache = queryClient.getQueryCache()
    const unsubscribe = cache.subscribe(event => {
      if (event.type !== 'updated') return
      const qk = event.query.queryKey
      if (!Array.isArray(qk) || (qk[0] !== 'balance' && qk[0] !== 'balances')) return
      if (!initializedRef.current) {
        initializedRef.current = true
        return
      }
      setStaleVisible(true)
    })
    return unsubscribe
  }, [queryClient])

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Time Off</h1>
        <p className="mt-1 text-sm text-zinc-500">Welcome, {employeeName}</p>
      </div>

      <StaleIndicator visible={staleVisible} onDismiss={() => setStaleVisible(false)} />

      <section aria-labelledby="balances-heading">
        <h2 id="balances-heading" className="mb-3 text-sm font-medium text-zinc-500 uppercase tracking-wide">
          Your Balances
        </h2>
        <BalanceGrid employeeId={employeeId} />
      </section>

      <section aria-labelledby="request-form-heading">
        <h2 id="request-form-heading" className="sr-only">Request Time Off</h2>
        <RequestForm employeeId={employeeId} />
      </section>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-3 text-sm font-medium text-zinc-500 uppercase tracking-wide">
          Request History
        </h2>
        <RequestList employeeId={employeeId} />
      </section>
    </div>
  )
}
