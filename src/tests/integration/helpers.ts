import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReservationProvider } from '@/lib/reservations/ReservationContext'
import type { HcmEvent } from '@/lib/hcm/types'
import type { ReservationAction } from '@/lib/reservations/types'

// ── MockEventSource ───────────────────────────────────────────────────────────
// Replaces the browser EventSource so hooks that open SSE connections work in
// jsdom. Tests control what events arrive by calling instance.fire(event).

export class MockEventSource {
  static instances: MockEventSource[] = []
  static clear() {
    MockEventSource.instances = []
  }

  url: string
  readyState = 1 // OPEN
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  close() {
    this.readyState = 2 // CLOSED
  }

  fire(event: HcmEvent) {
    if (this.readyState === 2 || !this.onmessage) return
    this.onmessage(new MessageEvent('message', { data: JSON.stringify(event) }))
  }
}

// ── MockBroadcastChannel ──────────────────────────────────────────────────────
// Replaces the browser BroadcastChannel. Tests simulate a cross-tab dispatch by
// calling instance.receive(action), which feeds the action into the provider's
// onmessage handler exactly as a real postMessage from another tab would.

export class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = []
  static clear() {
    MockBroadcastChannel.instances = []
  }

  name: string
  onmessage: ((e: MessageEvent) => void) | null = null

  constructor(name: string) {
    this.name = name
    MockBroadcastChannel.instances.push(this)
  }

  postMessage(_data: unknown) {
    // no-op — cross-tab broadcast is not under test unless explicitly triggered
  }

  close() {
    MockBroadcastChannel.instances = MockBroadcastChannel.instances.filter(c => c !== this)
  }

  // Simulate an action arriving from another tab
  receive(action: ReservationAction) {
    this.onmessage?.(new MessageEvent('message', { data: action }))
  }
}

// ── Provider wrapper ──────────────────────────────────────────────────────────

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

export function createWrapper(queryClient?: QueryClient) {
  const qc = queryClient ?? makeQueryClient()
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(ReservationProvider, null, children),
    )
  }
}

// Wrapper without ReservationProvider (for hooks that don't use reservations)
export function createQueryWrapper(queryClient?: QueryClient) {
  const qc = queryClient ?? makeQueryClient()
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children)
  }
}
