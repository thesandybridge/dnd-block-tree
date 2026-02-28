import { useRef, useEffect, useState, useCallback } from 'react'
import { mount, unmount } from 'svelte'
import { Radio, Pencil, GripVertical } from 'lucide-react'
import RealtimePaneDemo from './RealtimePaneDemo.svelte'

type SyncMessage =
  | { type: 'blocks'; blocks: any[] }
  | { type: 'busy'; reason: 'editing' | 'dragging'; active: boolean }

type MessageHandler = (msg: SyncMessage) => void

function createSyncChannel() {
  const subscribers = new Map<string, MessageHandler>()

  return {
    publish(sourceId: string, msg: SyncMessage) {
      for (const [id, handler] of subscribers) {
        if (id !== sourceId) handler(msg)
      }
    },
    subscribe(id: string, handler: MessageHandler): () => void {
      subscribers.set(id, handler)
      return () => { subscribers.delete(id) }
    },
  }
}

const PEER_LABELS: Record<string, string> = {
  a: 'User A',
  b: 'User B',
}

const BUSY_CONFIG = {
  editing: {
    Icon: Pencil,
    color: 'text-amber-500',
    text: 'is editing \u2014 the other pane is simulating remote reorders (queued until edit finishes)',
  },
  dragging: {
    Icon: GripVertical,
    color: 'text-blue-500',
    text: 'is dragging \u2014 the other pane is simulating remote reorders (queued until drop)',
  },
} as const

export function SvelteRealtimeDemo() {
  const refA = useRef<HTMLDivElement>(null)
  const refB = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<{ peerId: string; reason: 'editing' | 'dragging' } | null>(null)

  // Keep channel stable across renders
  const channelRef = useRef(createSyncChannel())
  const channel = channelRef.current

  // Track busy from incoming messages to update status bar
  const handleBusyMessage = useCallback((sourceId: string, msg: SyncMessage) => {
    if (msg.type === 'busy') {
      if (msg.active) {
        setBusy({ peerId: sourceId, reason: msg.reason })
      } else {
        setBusy(null)
      }
    }
  }, [])

  // Wrap publish to also track busy state
  const createPublisher = useCallback((sourceId: string) => {
    return (msg: SyncMessage) => {
      handleBusyMessage(sourceId, msg)
      channel.publish(sourceId, msg)
    }
  }, [channel, handleBusyMessage])

  useEffect(() => {
    const compA = mount(RealtimePaneDemo, {
      target: refA.current!,
      props: {
        label: 'User A',
        accentColor: 'bg-blue-500',
        onPublish: createPublisher('a'),
        onSubscribe: (handler: MessageHandler) => channel.subscribe('a', handler),
      },
    })
    const compB = mount(RealtimePaneDemo, {
      target: refB.current!,
      props: {
        label: 'User B',
        accentColor: 'bg-green-500',
        onPublish: createPublisher('b'),
        onSubscribe: (handler: MessageHandler) => channel.subscribe('b', handler),
      },
    })
    return () => {
      void unmount(compA)
      void unmount(compB)
    }
  }, [channel, createPublisher])

  const config = busy ? BUSY_CONFIG[busy.reason] : null
  const BusyIcon = config?.Icon

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {busy && config && BusyIcon ? (
          <>
            <BusyIcon className={`h-3 w-3 ${config.color} animate-pulse`} />
            <span>{PEER_LABELS[busy.peerId] ?? busy.peerId} {config.text}</span>
          </>
        ) : (
          <>
            <Radio className="h-3 w-3 text-green-500 animate-pulse" />
            <span>Both trees share state via sync channel &mdash; drag or double-click to edit</span>
          </>
        )}
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div ref={refA} />
        <div ref={refB} />
      </div>
    </div>
  )
}
