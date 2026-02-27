'use client'

import { useState, useCallback } from 'react'
import { SyncChannelProvider, type BusyReason } from './SyncChannelProvider'
import { RealtimePane } from './RealtimePane'
import { VanillaRealtimePane } from './VanillaRealtimePane'
import { useIsMobile } from '@/hooks/use-mobile'
import { Radio, Pencil, GripVertical } from 'lucide-react'

const PEER_LABELS: Record<string, string> = {
  'user-a': 'User A',
  'user-b': 'User B',
}

const BUSY_CONFIG: Record<BusyReason, { icon: typeof Radio; color: string; text: string }> = {
  editing: {
    icon: Pencil,
    color: 'text-amber-500',
    text: 'is editing — the other pane is simulating remote reorders (queued until edit finishes)',
  },
  dragging: {
    icon: GripVertical,
    color: 'text-blue-500',
    text: 'is dragging — the other pane is simulating remote reorders (queued until drop)',
  },
}

interface RealtimeDemoProps {
  framework?: 'react' | 'vanilla'
}

export function RealtimeDemo({ framework = 'react' }: RealtimeDemoProps) {
  const isMobile = useIsMobile()
  const [remoteBusy, setRemoteBusy] = useState<{ peerId: string; reason: BusyReason } | null>(null)

  const handleRemoteBusy = useCallback((peerId: string, reason: BusyReason | null) => {
    if (reason) {
      setRemoteBusy({ peerId, reason })
    } else {
      setRemoteBusy(null)
    }
  }, [])

  const config = remoteBusy ? BUSY_CONFIG[remoteBusy.reason] : null
  const BusyIcon = config?.icon

  return (
    <SyncChannelProvider>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {remoteBusy && config && BusyIcon ? (
            <>
              <BusyIcon className={`h-3 w-3 ${config.color} animate-pulse`} />
              <span>{PEER_LABELS[remoteBusy.peerId] ?? remoteBusy.peerId} {config.text}</span>
            </>
          ) : (
            <>
              <Radio className="h-3 w-3 text-green-500 animate-pulse" />
              <span>Both trees share state via sync channel — drag or double-click to edit</span>
            </>
          )}
        </div>
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {framework === 'vanilla' ? (
            <>
              <VanillaRealtimePane
                peerId="user-a"
                label="User A"
                accentColor="bg-blue-500"
                onRemoteBusy={handleRemoteBusy}
              />
              <VanillaRealtimePane
                peerId="user-b"
                label="User B"
                accentColor="bg-green-500"
                onRemoteBusy={handleRemoteBusy}
              />
            </>
          ) : (
            <>
              <RealtimePane
                peerId="user-a"
                label="User A"
                accentColor="bg-blue-500"
                onRemoteBusy={handleRemoteBusy}
              />
              <RealtimePane
                peerId="user-b"
                label="User B"
                accentColor="bg-green-500"
                onRemoteBusy={handleRemoteBusy}
              />
            </>
          )}
        </div>
      </div>
    </SyncChannelProvider>
  )
}
