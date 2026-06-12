'use client'

import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { submitRequest, verifyRequestExists, type SubmitRequestPayload } from '@/lib/hcm/client'
import type { HcmEvent } from '@/lib/hcm/types'
import { useReservations } from '@/lib/reservations/useReservations'
import { keys } from './keys'

function clientUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `res-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useSubmitRequest() {
  const queryClient = useQueryClient()
  const { addReservation, confirmReservation, rollbackReservation, silentFailureDetected } =
    useReservations()

  // Tracks the reservation created in mutationFn so onError can roll it back
  const pendingReservationId = useRef<string | null>(null)

  return useMutation({
    mutationFn: async (payload: SubmitRequestPayload) => {
      const reservationId = clientUuid()
      pendingReservationId.current = reservationId
      addReservation(reservationId, payload.employeeId, payload.locationId, payload.days)

      const result = await submitRequest(payload)
      return { reservationId, ...result }
    },

    onSuccess: ({ reservationId, request }) => {
      pendingReservationId.current = null

      const { id: requestId, employeeId, locationId } = request
      let resolved = false
      let mismatchCount = 0
      const timeouts: ReturnType<typeof setTimeout>[] = []

      // One-shot SSE listener — fast path (<1s under normal conditions)
      const es = new EventSource('/api/hcm/events')

      const resolve = (confirmed: boolean) => {
        if (resolved) return
        resolved = true
        es.close()
        timeouts.forEach(clearTimeout)

        if (confirmed) {
          confirmReservation(reservationId, requestId)
        } else {
          silentFailureDetected(reservationId)
          toast.error('Your request could not be confirmed. Please retry.')
        }

        queryClient.invalidateQueries({ queryKey: keys.balance(employeeId, locationId) })
        queryClient.invalidateQueries({ queryKey: keys.balances(employeeId) })
        queryClient.invalidateQueries({ queryKey: keys.requests(employeeId) })
      }

      es.onmessage = (e: MessageEvent) => {
        if (!e.data) return
        try {
          const event: HcmEvent = JSON.parse(e.data)
          if (
            event.type === 'request_created' &&
            event.employeeId === employeeId &&
            event.locationId === locationId &&
            event.requestId === requestId
          ) {
            resolve(true)
          }
        } catch {}
      }

      // Exponential backoff verification — safety net if SSE is delayed or dropped
      const verify = async () => {
        if (resolved) return
        try {
          const found = await verifyRequestExists(requestId)
          if (found) {
            resolve(true)
          } else {
            mismatchCount++
            if (mismatchCount >= 3) resolve(false)
          }
        } catch {
          mismatchCount++
          if (mismatchCount >= 3) resolve(false)
        }
      }

      timeouts.push(setTimeout(verify, 1500))
      timeouts.push(setTimeout(verify, 3500))
      timeouts.push(setTimeout(verify, 7500))
    },

    onError: () => {
      if (pendingReservationId.current) {
        rollbackReservation(pendingReservationId.current, 'hcm-error')
        pendingReservationId.current = null
      }
    },
  })
}
