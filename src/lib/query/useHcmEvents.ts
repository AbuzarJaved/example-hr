'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { HcmEvent } from '@/lib/hcm/types'
import { keys } from './keys'

export function useHcmEvents() {
  const queryClient = useQueryClient()
  // Stable ref so we can close the connection on unmount
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/hcm/events')
    esRef.current = es

    es.onmessage = (e: MessageEvent) => {
      // SSE keep-alive comments ": connected\n\n" arrive as empty data
      if (!e.data) return
      try {
        const event: HcmEvent = JSON.parse(e.data)
        queryClient.invalidateQueries({ queryKey: keys.balance(event.employeeId, event.locationId) })
        queryClient.invalidateQueries({ queryKey: keys.balances(event.employeeId) })
        if (event.requestId) {
          queryClient.invalidateQueries({ queryKey: keys.request(event.requestId) })
          queryClient.invalidateQueries({ queryKey: keys.requests(event.employeeId) })
        }
      } catch {
        // malformed event — ignore silently
      }
    }

    es.onerror = () => {
      // EventSource reconnects automatically; no manual handling needed
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [queryClient])
}
