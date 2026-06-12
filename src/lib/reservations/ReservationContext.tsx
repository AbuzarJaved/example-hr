'use client'

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react'
import { reservationReducer, initialState } from './reservationReducer'
import { readLedger, writeLedger } from './persistence'
import { useReservationExpiry } from './useReservationExpiry'
import type { ReservationAction, ReservationState } from './types'

const CHANNEL_NAME = 'hcm-reservation-ledger'

interface ReservationContextValue {
  reservations: ReservationState
  // dispatch is internal — consumers must use useReservations() named methods
  _dispatch: Dispatch<ReservationAction>
}

const ReservationContext = createContext<ReservationContextValue | null>(null)

export function useReservationContext(): ReservationContextValue {
  const ctx = useContext(ReservationContext)
  if (!ctx) throw new Error('useReservationContext must be used inside ReservationProvider')
  return ctx
}

export function ReservationProvider({ children }: { children: ReactNode }) {
  const [reservations, dispatch] = useReducer(
    reservationReducer,
    initialState,
    // Cold-start hydration from localStorage (SSR-safe — readLedger guards typeof window)
    () => readLedger(),
  )

  const channelRef = useRef<BroadcastChannel | null>(null)

  // BroadcastChannel — live cross-tab sync only (ephemeral; not for cold-start hydration)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel

    // Receive actions from other tabs and apply them locally
    channel.onmessage = (event: MessageEvent<ReservationAction>) => {
      dispatch(event.data)
    }

    return () => {
      channel.close()
      channelRef.current = null
    }
  }, [])

  // localStorage — write on every state change for future cold-start hydration.
  // NEVER subscribe to the storage event — cross-tab live sync is owned by BroadcastChannel.
  useEffect(() => {
    writeLedger(reservations)
  }, [reservations])

  // Dispatch wrapper that also fans out to BroadcastChannel so other open tabs stay in sync
  const broadcastDispatch: Dispatch<ReservationAction> = (action) => {
    dispatch(action)
    channelRef.current?.postMessage(action)
  }

  useReservationExpiry(reservations, broadcastDispatch)

  return (
    <ReservationContext.Provider value={{ reservations, _dispatch: broadcastDispatch }}>
      {children}
    </ReservationContext.Provider>
  )
}
