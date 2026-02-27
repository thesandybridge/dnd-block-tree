'use client'

import { useState, useCallback } from 'react'
import { SyncChannelProvider } from './SyncChannelProvider'
import { RealtimePane } from './RealtimePane'
import { useIsMobile } from '@/hooks/use-mobile'
import { Radio, Pencil } from 'lucide-react'

const PEER_LABELS: Record<string, string> = {
  'user-a': 'User A',
  'user-b': 'User B',
}

export function RealtimeDemo() {
  const isMobile = useIsMobile()
  const [remoteEditing, setRemoteEditing] = useState<{ peerId: string; blockId: string } | null>(null)

  const handleRemoteEditing = useCallback((peerId: string, blockId: string | null) => {
    if (blockId) {
      setRemoteEditing({ peerId, blockId })
    } else {
      setRemoteEditing(null)
    }
  }, [])

  return (
    <SyncChannelProvider>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {remoteEditing ? (
            <>
              <Pencil className="h-3 w-3 text-amber-500 animate-pulse" />
              <span>{PEER_LABELS[remoteEditing.peerId] ?? remoteEditing.peerId} is editing — the other pane is simulating remote reorders (queued until edit finishes)</span>
            </>
          ) : (
            <>
              <Radio className="h-3 w-3 text-green-500 animate-pulse" />
              <span>Both trees share state via sync channel — drag or double-click to edit</span>
            </>
          )}
        </div>
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <RealtimePane
            peerId="user-a"
            label="User A"
            accentColor="bg-blue-500"
            onRemoteEditing={handleRemoteEditing}
          />
          <RealtimePane
            peerId="user-b"
            label="User B"
            accentColor="bg-green-500"
            onRemoteEditing={handleRemoteEditing}
          />
        </div>
      </div>
    </SyncChannelProvider>
  )
}
