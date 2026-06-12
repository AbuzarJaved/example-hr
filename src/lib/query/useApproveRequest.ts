'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { reviewRequest, verifyRequestExists } from '@/lib/hcm/client'
import type { HcmEvent } from '@/lib/hcm/types'
import { keys } from './keys'

interface ApprovePayload {
  requestId: string
  reviewedBy: string
  employeeId: string
  locationId: string
}

interface DenyPayload extends ApprovePayload {
  notes?: string
}

function startEventFirstVerification(
  requestId: string,
  employeeId: string,
  locationId: string,
  expectedStatus: 'approved' | 'denied',
  onConfirmed: () => void,
) {
  let resolved = false
  let mismatchCount = 0
  const timeouts: ReturnType<typeof setTimeout>[] = []

  const es = new EventSource('/api/hcm/events')

  const resolve = (confirmed: boolean) => {
    if (resolved) return
    resolved = true
    es.close()
    timeouts.forEach(clearTimeout)
    if (confirmed) {
      onConfirmed()
    } else {
      toast.error('Request update could not be confirmed. Please refresh.')
    }
  }

  es.onmessage = (e: MessageEvent) => {
    if (!e.data) return
    try {
      const event: HcmEvent = JSON.parse(e.data)
      const eventType = expectedStatus === 'approved' ? 'request_approved' : 'request_denied'
      if (
        event.type === eventType &&
        event.employeeId === employeeId &&
        event.locationId === locationId &&
        event.requestId === requestId
      ) {
        resolve(true)
      }
    } catch {}
  }

  const verify = async () => {
    if (resolved) return
    try {
      const req = await verifyRequestExists(requestId)
      if (req?.status === expectedStatus) {
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
}

export function useApproveRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ requestId, reviewedBy }: ApprovePayload) =>
      reviewRequest(requestId, { action: 'approve', reviewedBy }),

    onSuccess: (data, { employeeId, locationId }) => {
      const { request } = data

      const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: keys.balance(employeeId, locationId) })
        queryClient.invalidateQueries({ queryKey: keys.balances(employeeId) })
        queryClient.invalidateQueries({ queryKey: keys.request(request.id) })
        queryClient.invalidateQueries({ queryKey: keys.requests(employeeId) })
      }

      startEventFirstVerification(request.id, employeeId, locationId, 'approved', invalidate)
    },
  })
}

export function useDenyRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ requestId, reviewedBy, notes }: DenyPayload) =>
      reviewRequest(requestId, { action: 'deny', reviewedBy, notes }),

    onSuccess: (data, { employeeId, locationId }) => {
      const { request } = data

      const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: keys.request(request.id) })
        queryClient.invalidateQueries({ queryKey: keys.requests(employeeId) })
        queryClient.invalidateQueries({ queryKey: keys.balance(employeeId, locationId) })
        queryClient.invalidateQueries({ queryKey: keys.balances(employeeId) })
      }

      startEventFirstVerification(request.id, employeeId, locationId, 'denied', invalidate)
    },
  })
}
