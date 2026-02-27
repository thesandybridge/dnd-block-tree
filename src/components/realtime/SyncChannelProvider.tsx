import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from 'react'
import type { ProductivityBlock } from '../productivity/types'

export type BusyReason = 'editing' | 'dragging'

export type SyncMessage =
  | { type: 'blocks'; peerId: string; blocks: ProductivityBlock[] }
  | { type: 'busy'; peerId: string; reason: BusyReason; active: boolean }

type SyncHandler = (msg: SyncMessage) => void

interface SyncChannel {
  subscribe: (peerId: string, handler: SyncHandler) => () => void
  publish: (msg: SyncMessage) => void
}

const SyncChannelContext = createContext<SyncChannel | null>(null)

export function SyncChannelProvider({ children }: { children: ReactNode }) {
  const subscribersRef = useRef<Map<string, SyncHandler>>(new Map())

  const channelRef = useRef<SyncChannel>({
    subscribe(peerId, handler) {
      subscribersRef.current.set(peerId, handler)
      return () => {
        subscribersRef.current.delete(peerId)
      }
    },
    publish(msg) {
      subscribersRef.current.forEach((handler, peerId) => {
        if (peerId !== msg.peerId) {
          handler(msg)
        }
      })
    },
  })

  return (
    <SyncChannelContext.Provider value={channelRef.current}>
      {children}
    </SyncChannelContext.Provider>
  )
}

export function useSyncChannel(): SyncChannel {
  const ctx = useContext(SyncChannelContext)
  if (!ctx) {
    throw new Error('useSyncChannel must be used within a SyncChannelProvider')
  }
  return ctx
}
