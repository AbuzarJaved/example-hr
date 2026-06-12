import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import toast from 'react-hot-toast'
import { useSubmitRequest } from '@/lib/query/useSubmitRequest'
import { useReservations } from '@/lib/reservations/useReservations'
import { MockEventSource, MockBroadcastChannel, createWrapper } from './helpers'

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
  localStorage.clear()
  vi.restoreAllMocks()
})

const PAYLOAD = {
  employeeId: 'emp-001',
  locationId: 'annual' as const,
  startDate: '2026-07-01',
  endDate: '2026-07-01',
  days: 1,
}

// Silent failure: server returns 200 with a fake request ID but the request is
// not in the store (so verification fetches return null/404 three times).
const SFAIL_REQUEST = {
  id: 'req-sfail-00001',
  employeeId: 'emp-001',
  locationId: 'annual',
  startDate: '2026-07-01',
  endDate: '2026-07-01',
  days: 1,
  status: 'pending',
  submittedAt: Date.now(),
}

describe('useSubmitRequest — silent failure detection', () => {
  it('transitions to silent-failure-detected after 3 failed verifications', async () => {
    // Capture only the verify timeouts (1500 / 3500 / 7500 ms).
    // React and TanStack internals use other delays — we pass those through.
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

    server.use(
      // Server returns 200 with a fake ID — looks like success but wasn't stored
      http.post('/api/hcm/requests', () =>
        HttpResponse.json({ request: SFAIL_REQUEST }),
      ),
      // Verification fetches can't find the request
      http.get('/api/hcm/requests/:id', () =>
        HttpResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 }),
      ),
    )

    const { result } = renderHook(
      () => ({ submit: useSubmitRequest(), res: useReservations() }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.submit.mutate(PAYLOAD))

    // Wait for mutation success (server returned 200)
    await waitFor(() => result.current.submit.isSuccess)

    // onSuccess has now run: EventSource opened, 3 setTimeout callbacks captured
    await waitFor(() => verifyCallbacks.length === 3)

    // Invoke the 3 verify callbacks sequentially (simulating timer fires)
    for (const cb of verifyCallbacks) {
      await act(async () => {
        await cb()
      })
    }

    // After 3 mismatches the hook calls silentFailureDetected + toast.error
    await waitFor(() => {
      expect(result.current.res.reservations[0].status).toBe('silent-failure-detected')
    })

    expect(toast.error).toHaveBeenCalledWith(
      'Your request could not be confirmed. Please retry.',
    )
  })

  it('cancels verification and confirms when SSE arrives before any timeout fires', async () => {
    server.use(
      http.post('/api/hcm/requests', () =>
        HttpResponse.json({ request: SFAIL_REQUEST }),
      ),
    )

    const { result } = renderHook(
      () => ({ submit: useSubmitRequest(), res: useReservations() }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.submit.mutate(PAYLOAD))
    await waitFor(() => result.current.submit.isSuccess)
    await waitFor(() => MockEventSource.instances.length > 0)

    // SSE arrives before any timeout fires → should confirm immediately
    act(() => {
      MockEventSource.instances[0].fire({
        type: 'request_created',
        employeeId: 'emp-001',
        locationId: 'annual',
        requestId: SFAIL_REQUEST.id,
        timestamp: Date.now(),
      })
    })

    await waitFor(() => {
      expect(result.current.res.reservations[0].status).toBe('confirmed')
    })

    expect(toast.error).not.toHaveBeenCalled()
  })
})
