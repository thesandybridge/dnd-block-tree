'use client'

import { useCallback, useEffect, useRef, useMemo, useState } from 'react'
import { BlockTree, useBlockHistory, useDeferredSync, useLayoutAnimation, initFractionalOrder, generateKeyBetween } from '@dnd-block-tree/react'
import type { ProductivityBlock } from '../productivity/types'
import { CONTAINER_TYPES } from '../productivity/types'
import { GripVertical } from 'lucide-react'
import { useSyncChannel, type SyncMessage, type BusyReason } from './SyncChannelProvider'
import { createRealtimeRenderers } from './blocks'

const INITIAL_BLOCKS: ProductivityBlock[] = initFractionalOrder([
  { id: '1', type: 'section', title: 'Project Planning', parentId: null, order: 0 },
  { id: '2', type: 'task', title: 'Define project scope', parentId: '1', order: 0, completed: true },
  { id: '3', type: 'task', title: 'Create timeline', parentId: '1', order: 1 },
  { id: '4', type: 'note', title: 'Remember to include buffer time', parentId: '1', order: 2 },
  { id: '5', type: 'section', title: 'Development', parentId: null, order: 1 },
  { id: '6', type: 'task', title: 'Set up dev environment', parentId: '5', order: 0, completed: true },
  { id: '7', type: 'task', title: 'Implement core features', parentId: '5', order: 1 },
  { id: '8', type: 'task', title: 'Write unit tests', parentId: '5', order: 2 },
])

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

/**
 * Simulate a remote reorder: pick a random leaf block and move it
 * to a different position within its parent using fractional indexing.
 */
function simulateReorder(blocks: ProductivityBlock[]): ProductivityBlock[] | null {
  const leaves = blocks.filter(b => b.type !== 'section')
  if (leaves.length < 2) return null

  const target = leaves[Math.floor(Math.random() * leaves.length)]
  const siblings = blocks
    .filter(b => b.parentId === target.parentId && b.id !== target.id)
    .sort((a, b) => String(a.order) < String(b.order) ? -1 : 1)

  if (siblings.length === 0) return null

  const insertIdx = Math.floor(Math.random() * (siblings.length + 1))
  const lo = insertIdx > 0 ? String(siblings[insertIdx - 1].order) : null
  const hi = insertIdx < siblings.length ? String(siblings[insertIdx].order) : null

  const newKey = generateKeyBetween(lo, hi)

  return blocks.map(b =>
    b.id === target.id ? { ...b, order: newKey } : b
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
