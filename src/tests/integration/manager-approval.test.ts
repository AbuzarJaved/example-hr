import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import toast from 'react-hot-toast'
import { useApproveRequest, useDenyRequest } from '@/lib/query/useApproveRequest'
import { MockEventSource, MockBroadcastChannel, createQueryWrapper, makeQueryClient } from './helpers'

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn(), dismiss: vi.fn() },
}))

const server = setupServer()

beforeAll(() => {
  vi.stubGlobal('EventSource', MockEventSource)
  vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)
  server.listen({ onUnhandledRequest: 'warn' })
})

afterAll(() => {
  server.close()
  vi.unstubAllGlobals()
})

afterEach(() => {
  server.resetHandlers()
  MockEventSource.clear()
  MockBroadcastChannel.clear()
  vi.restoreAllMocks()
})

const APPROVE_PAYLOAD = {
  requestId: 'req-001',
  reviewedBy: 'mgr-001',
  employeeId: 'emp-001',
  locationId: 'annual' as const,
}

const APPROVED_REQUEST = {
  id: 'req-001',
  employeeId: 'emp-001',
  locationId: 'annual',
  startDate: '2026-07-01',
  endDate: '2026-07-01',
  days: 1,
  status: 'approved',
  submittedAt: Date.now() - 5000,
  reviewedAt: Date.now(),
  reviewedBy: 'mgr-001',
}

describe('useApproveRequest — event-first verification', () => {
  it('invalidates balance and request queries after SSE request_approved event', async () => {
    server.use(
      http.patch('/api/hcm/requests/:id', () =>
        HttpResponse.json({ request: APPROVED_REQUEST }),
      ),
    )

    const qc = makeQueryClient()
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useApproveRequest(), {
      wrapper: createQueryWrapper(qc),
    })

    act(() => result.current.mutate(APPROVE_PAYLOAD))

    // Mutation resolves → onSuccess fires → EventSource opens
    await waitFor(() => result.current.isSuccess)
    await waitFor(() => MockEventSource.instances.length > 0)

    // Fire the SSE confirmation
    act(() => {
      MockEventSource.instances[0].fire({
        type: 'request_approved',
        employeeId: 'emp-001',
        locationId: 'annual',
        requestId: 'req-001',
        timestamp: Date.now(),
      })
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['balance', 'emp-001', 'annual'] }),
      )
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['request', 'req-001'] }),
      )
    })
  })

  it('shows error toast when 3 verification fetches all fail to confirm', async () => {
    server.use(
      http.patch('/api/hcm/requests/:id', () =>
        HttpResponse.json({ request: APPROVED_REQUEST }),
      ),
      // Verification fetches return 'pending' (never 'approved') — simulates store divergence
      http.get('/api/hcm/requests/:id', () =>
        HttpResponse.json({
          request: { ...APPROVED_REQUEST, status: 'pending' },
        }),
      ),
    )

    // Capture the 3 verify timeouts and fire them manually
    const verifyCallbacks: Array<() => void | Promise<void>> = []
    const originalSetTimeout = globalThis.setTimeout
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn, delay, ...args) => {
      if (typeof delay === 'number' && [1500, 3500, 7500].includes(delay)) {
        verifyCallbacks.push(fn as () => void)
        return 0 as unknown as NodeJS.Timeout
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (originalSetTimeout as any)(fn, delay, ...args)
    })

    const qc = makeQueryClient()
    const { result } = renderHook(() => useApproveRequest(), {
      wrapper: createQueryWrapper(qc),
    })

    act(() => result.current.mutate(APPROVE_PAYLOAD))
    await waitFor(() => result.current.isSuccess)
    await waitFor(() => verifyCallbacks.length === 3)

    for (const cb of verifyCallbacks) {
      await act(async () => { await cb() })
    }

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Request update could not be confirmed. Please refresh.',
      )
    })
  })
})

describe('useDenyRequest — event-first verification', () => {
  it('opens EventSource and listens for request_denied after PATCH', async () => {
    server.use(
      http.patch('/api/hcm/requests/:id', () =>
        HttpResponse.json({
          request: {
            ...APPROVED_REQUEST,
            status: 'denied',
            notes: 'Peak period',
          },
        }),
      ),
    )

    const qc = makeQueryClient()
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useDenyRequest(), {
      wrapper: createQueryWrapper(qc),
    })

    act(() =>
      result.current.mutate({ ...APPROVE_PAYLOAD, notes: 'Peak period' }),
    )

    await waitFor(() => result.current.isSuccess)
    await waitFor(() => MockEventSource.instances.length > 0)

    act(() => {
      MockEventSource.instances[0].fire({
        type: 'request_denied',
        employeeId: 'emp-001',
        locationId: 'annual',
        requestId: 'req-001',
        timestamp: Date.now(),
      })
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['balance', 'emp-001', 'annual'] }),
      )
    })
  })
})
