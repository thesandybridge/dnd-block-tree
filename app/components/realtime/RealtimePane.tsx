'use client'

import { useCallback, useEffect, useRef, useMemo, useState } from 'react'
import { BlockTree, useBlockHistory, useDeferredSync, useLayoutAnimation } from '@dnd-block-tree/react'
import type { ProductivityBlock } from '../productivity/types'
import { CONTAINER_TYPES } from '../productivity/types'
import { GripVertical } from 'lucide-react'
import { useSyncChannel, type SyncMessage, type BusyReason } from './SyncChannelProvider'
import { createRealtimeRenderers } from './blocks'
import { INITIAL_BLOCKS, simulateReorder } from './shared'

function renderDragOverlay(block: ProductivityBlock) {
  return (
    <div className="bg-card border border-primary shadow-lg rounded-lg p-3 text-sm w-56 drag-overlay">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-primary uppercase tracking-wider font-medium">
          {block.type}
        </span>
      </div>
      <div className="font-medium text-foreground mt-1">{block.title}</div>
    </div>
  )
}


interface RealtimePaneProps {
  peerId: string
  label: string
  accentColor: string
  onRemoteBusy?: (peerId: string, reason: BusyReason | null) => void
}

export function RealtimePane({ peerId, label, accentColor, onRemoteBusy }: RealtimePaneProps) {
  const history = useBlockHistory<ProductivityBlock>(INITIAL_BLOCKS)
  const { subscribe, publish } = useSyncChannel()
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)

  const sync = useDeferredSync<ProductivityBlock>({
    onResolve: (blocks) => history.set(blocks),
  })

  // Keep a ref to current blocks for the simulation interval
  const blocksRef = useRef(history.blocks)
  blocksRef.current = history.blocks

  // Auto-simulation: when the remote peer is busy, periodically
  // reorder a random block in THIS pane and publish the change.
  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startSimulation = useCallback(() => {
    if (simulationRef.current) return
    simulationRef.current = setInterval(() => {
      const result = simulateReorder(blocksRef.current)
      if (result) {
        history.set(result)
        publish({ type: 'blocks', peerId, blocks: result })
      }
    }, 2000)
  }, [history.set, publish, peerId])

  const stopSimulation = useCallback(() => {
    if (simulationRef.current) {
      clearInterval(simulationRef.current)
      simulationRef.current = null
    }
  }, [])

  useEffect(() => stopSimulation, [stopSimulation])

  // Subscribe to remote changes — queue if this pane is busy
  useEffect(() => {
    return subscribe(peerId, (msg: SyncMessage) => {
      if (msg.type === 'busy') {
        onRemoteBusy?.(msg.peerId, msg.active ? msg.reason : null)
        if (msg.active) {
          startSimulation()
        } else {
          stopSimulation()
        }
        return
      }
      // type === 'blocks'
      sync.apply(msg.blocks)
    })
  }, [peerId, subscribe, sync.apply, onRemoteBusy, startSimulation, stopSimulation])

  // --- Helpers to enter/exit busy state ---

  const publishBusy = useCallback((reason: BusyReason, active: boolean) => {
    publish({ type: 'busy', peerId, reason, active })
  }, [publish, peerId])

  // --- Publish local block changes (non-busy path) ---

  const handleChange = useCallback((newBlocks: ProductivityBlock[]) => {
    history.set(newBlocks)
    publish({ type: 'blocks', peerId, blocks: newBlocks })
  }, [history.set, publish, peerId])

  // --- Drag handlers ---

  const handleDragStart = useCallback(() => {
    sync.enterBusy()
    publishBusy('dragging', true)
  }, [sync.enterBusy, publishBusy])

  const handleDragEnd = useCallback(() => {
    publishBusy('dragging', false)
    // onChange fires before onDragEnd, so history.blocks already
    // has the drop result — that's the latest write, discard the queue.
    queueMicrotask(() => {
      const result = sync.exitBusy(blocksRef.current, 'lww')
      const blocks = result ?? blocksRef.current
      publish({ type: 'blocks', peerId, blocks })
    })
  }, [sync.exitBusy, publishBusy, publish, peerId])

  // --- Inline editing handlers ---

  const handleStartEdit = useCallback((id: string) => {
    sync.enterBusy()
    setEditingBlockId(id)
    publishBusy('editing', true)
  }, [sync.enterBusy, publishBusy])

  const handleCommitEdit = useCallback((id: string, title: string) => {
    const edited = history.blocks.map(b =>
      b.id === id ? { ...b, title } : b
    )

    setEditingBlockId(null)
    publishBusy('editing', false)

    // Edit + reorder are non-conflicting: merge local content with remote ordering
    const merged = sync.exitBusy(edited, 'merge')
    if (merged) {
      history.set(merged)
      publish({ type: 'blocks', peerId, blocks: merged })
    } else {
      handleChange(edited)
    }
  }, [history.blocks, handleChange, sync.exitBusy, publishBusy, publish, peerId, history.set])

  const handleCancelEdit = useCallback(() => {
    setEditingBlockId(null)
    publishBusy('editing', false)

    // No local content changes — just apply remote ordering if queued
    const merged = sync.exitBusy(history.blocks, 'merge')
    if (merged) {
      history.set(merged)
      publish({ type: 'blocks', peerId, blocks: merged })
    }
  }, [sync.exitBusy, publishBusy, history.blocks, history.set, publish, peerId])

  const toggleTask = useCallback((id: string) => {
    const newBlocks = history.blocks.map(b =>
      b.id === id && b.type === 'task' ? { ...b, completed: !b.completed } : b
    )
    handleChange(newBlocks)
  }, [history.blocks, handleChange])

  // FLIP-based reorder animation
  const treeContainerRef = useRef<HTMLDivElement>(null)
  useLayoutAnimation(treeContainerRef, { duration: 250, easing: 'ease-out' })

  const renderers = useMemo(() => createRealtimeRenderers({
    editingBlockId,
    onStartEdit: handleStartEdit,
    onCommitEdit: handleCommitEdit,
    onCancelEdit: handleCancelEdit,
    onToggleTask: toggleTask,
  }), [editingBlockId, handleStartEdit, handleCommitEdit, handleCancelEdit, toggleTask])

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${accentColor}`} />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div ref={treeContainerRef} className="border border-border/50 rounded-xl p-3 bg-card/30 min-w-0 overflow-hidden">
        <BlockTree
          blocks={history.blocks}
          renderers={renderers}
          containerTypes={CONTAINER_TYPES}
          onChange={handleChange}
          dragOverlay={renderDragOverlay}
          className="flex flex-col gap-1 w-full"
          dropZoneClassName="h-0.5 rounded transition-all duration-150"
          dropZoneActiveClassName="bg-primary h-1"
          indentClassName="tree-indent-compact"
          orderingStrategy="fractional"
          initialExpanded="all"
          animation={{ expandDuration: 200, easing: 'ease-out' }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      </div>
    </div>
  )
}
