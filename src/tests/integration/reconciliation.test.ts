import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useHcmEvents } from '@/lib/query/useHcmEvents'
import { MockEventSource, MockBroadcastChannel, createQueryWrapper, makeQueryClient } from './helpers'

const server = { listen: () => {}, close: () => {}, resetHandlers: () => {} }

beforeAll(() => {
  vi.stubGlobal('EventSource', MockEventSource)
  vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  MockEventSource.clear()
  MockBroadcastChannel.clear()
})

describe('useHcmEvents — SSE events trigger cache invalidation', () => {
  it('invalidates balance query when a balance_updated event arrives', async () => {
    const qc = makeQueryClient()
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    renderHook(() => useHcmEvents(), { wrapper: createQueryWrapper(qc) })

    // useHcmEvents opens an EventSource on mount
    await waitFor(() => MockEventSource.instances.length > 0)

    act(() => {
      MockEventSource.instances[0].fire({
        type: 'balance_updated',
        employeeId: 'emp-001',
        locationId: 'annual',
        balance: { employeeId: 'emp-001', locationId: 'annual', available: 12, used: 3, total: 15 },
        timestamp: Date.now(),
      })
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['balance', 'emp-001', 'annual'] }),
      )
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['balances', 'emp-001'] }),
      )
    })
  })

  it('also invalidates request queries when the event carries a requestId', async () => {
    const qc = makeQueryClient()
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    renderHook(() => useHcmEvents(), { wrapper: createQueryWrapper(qc) })
    await waitFor(() => MockEventSource.instances.length > 0)

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
        expect.objectContaining({ queryKey: ['request', 'req-001'] }),
      )
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['requests', 'emp-001'] }),
      )
    })
  })

  it('closes the EventSource and stops listening on unmount', async () => {
    const qc = makeQueryClient()
    const { unmount } = renderHook(() => useHcmEvents(), { wrapper: createQueryWrapper(qc) })
    await waitFor(() => MockEventSource.instances.length > 0)

    const es = MockEventSource.instances[0]
    expect(es.readyState).toBe(1) // OPEN

    unmount()

    expect(es.readyState).toBe(2) // CLOSED
  })

  it('silently ignores malformed SSE data', async () => {
    const qc = makeQueryClient()
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    renderHook(() => useHcmEvents(), { wrapper: createQueryWrapper(qc) })
    await waitFor(() => MockEventSource.instances.length > 0)

    // Fire a raw onmessage with invalid JSON — should not throw
    act(() => {
      MockEventSource.instances[0].onmessage?.(
        new MessageEvent('message', { data: 'not-valid-json' }),
      )
    })

    // No queries invalidated for garbage data
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
