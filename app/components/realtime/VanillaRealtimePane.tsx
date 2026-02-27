'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  createBlockTreeController,
  createDefaultRenderer,
  createDeferredSync,
  LayoutAnimation,
  type BlockTreeController,
  type RenderBlockContext,
} from '@dnd-block-tree/vanilla'
import type { ProductivityBlock } from '../productivity/types'
import { CONTAINER_TYPES } from '../productivity/types'
import { useSyncChannel, type SyncMessage, type BusyReason } from './SyncChannelProvider'
import { INITIAL_BLOCKS, simulateReorder } from './shared'
import { createGripIcon, createChevronIcon, createCheckIcon, createStickyNoteIcon } from '../vanilla-icons'

function renderBlock(block: ProductivityBlock, ctx: RenderBlockContext): HTMLElement {
  if (block.type === 'section') return renderSection(block, ctx)
  if (block.type === 'task') return renderTask(block, ctx)
  return renderNote(block, ctx)
}

function createKeyBadge(order: number | string): HTMLElement {
  const badge = document.createElement('span')
  badge.className = 'font-mono text-[10px] text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded shrink-0'
  badge.textContent = String(order)
  return badge
}

function renderSection(block: ProductivityBlock, ctx: RenderBlockContext): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = `rounded-xl border border-border/50 bg-card w-full min-w-0 max-w-full transition-all duration-200${ctx.isDragging ? ' opacity-40 scale-[0.98]' : ''}`

  const header = document.createElement('div')
  header.className = 'flex items-center gap-2 p-2 folder-header group min-w-0'

  header.appendChild(createGripIcon('h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle'))

  const chevronBtn = document.createElement('button')
  chevronBtn.className = 'p-1 shrink-0 rounded-md transition-colors hover:bg-muted/80 active:scale-95'
  const chevronWrap = document.createElement('div')
  chevronWrap.className = `transition-transform duration-200${ctx.isExpanded ? ' rotate-90' : ''}`
  chevronWrap.appendChild(createChevronIcon(false, 'h-4 w-4 text-muted-foreground'))
  chevronBtn.appendChild(chevronWrap)
  if (ctx.onToggleExpand) {
    chevronBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      ctx.onToggleExpand!()
    })
  }
  header.appendChild(chevronBtn)

  const title = document.createElement('span')
  title.className = 'font-semibold text-foreground flex-1 min-w-0 truncate cursor-text select-none'
  title.textContent = block.title
  title.setAttribute('data-title-id', block.id)
  title.title = 'Double-click to edit'
  header.appendChild(title)

  header.appendChild(createKeyBadge(block.order))
  wrapper.appendChild(header)

  if (ctx.isExpanded && ctx.children) {
    const childrenWrap = document.createElement('div')
    childrenWrap.className = 'px-2 pb-2 folder-children w-full min-w-0 max-w-full'
    childrenWrap.appendChild(ctx.children)
    wrapper.appendChild(childrenWrap)
  }

  return wrapper
}

function renderTask(block: ProductivityBlock, ctx: RenderBlockContext): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = `flex items-center gap-2 p-2 rounded-lg border border-border/30 bg-card/50 block-item group w-full min-w-0 max-w-full${ctx.isDragging ? ' opacity-40 scale-[0.98]' : ''}`

  wrapper.appendChild(createGripIcon('h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle'))

  const checkBtn = document.createElement('button')
  checkBtn.className = `h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
    block.completed
      ? 'bg-primary border-primary checkbox-complete'
      : 'border-muted-foreground/40 hover:border-primary hover:scale-110'
  }`
  if (block.completed) {
    checkBtn.appendChild(createCheckIcon('h-3 w-3 text-primary-foreground'))
  }
  checkBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    wrapper.dispatchEvent(new CustomEvent('toggle-task', { bubbles: true, detail: { id: block.id } }))
  })
  wrapper.appendChild(checkBtn)

  const title = document.createElement('span')
  title.className = `flex-1 min-w-0 truncate transition-all duration-200 cursor-text select-none${block.completed ? ' line-through text-muted-foreground/60' : ''}`
  title.textContent = block.title
  title.setAttribute('data-title-id', block.id)
  title.title = 'Double-click to edit'
  wrapper.appendChild(title)

  wrapper.appendChild(createKeyBadge(block.order))
  return wrapper
}

function renderNote(block: ProductivityBlock, ctx: RenderBlockContext): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = `flex items-start gap-2 p-2 rounded-lg border border-border/30 bg-card/50 block-item group w-full min-w-0 max-w-full${ctx.isDragging ? ' opacity-40 scale-[0.98]' : ''}`

  wrapper.appendChild(createGripIcon('h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle mt-0.5'))
  wrapper.appendChild(createStickyNoteIcon('h-4 w-4 shrink-0 text-primary/80 mt-0.5 transition-colors group-hover:text-primary'))

  const text = document.createElement('span')
  text.className = 'flex-1 min-w-0 text-sm text-muted-foreground leading-relaxed break-words cursor-text select-none'
  text.textContent = block.title
  text.setAttribute('data-title-id', block.id)
  text.title = 'Double-click to edit'
  wrapper.appendChild(text)

  wrapper.appendChild(createKeyBadge(block.order))
  return wrapper
}

interface VanillaRealtimePaneProps {
  peerId: string
  label: string
  accentColor: string
  onRemoteBusy?: (peerId: string, reason: BusyReason | null) => void
}

export function VanillaRealtimePane({ peerId, label, accentColor, onRemoteBusy }: VanillaRealtimePaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<BlockTreeController<ProductivityBlock> | null>(null)
  const blocksRef = useRef<ProductivityBlock[]>(INITIAL_BLOCKS)
  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { subscribe, publish } = useSyncChannel()

  const publishRef = useRef(publish)
  publishRef.current = publish
  const onRemoteBusyRef = useRef(onRemoteBusy)
  onRemoteBusyRef.current = onRemoteBusy

  const startSimulation = useCallback(() => {
    if (simulationRef.current) return
    simulationRef.current = setInterval(() => {
      const controller = controllerRef.current
      if (!controller) return
      const result = simulateReorder(blocksRef.current)
      if (result) {
        controller.setBlocks(result)
        blocksRef.current = result
        publishRef.current({ type: 'blocks', peerId, blocks: result })
      }
    }, 2000)
  }, [peerId])

  const stopSimulation = useCallback(() => {
    if (simulationRef.current) {
      clearInterval(simulationRef.current)
      simulationRef.current = null
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const controller = createBlockTreeController<ProductivityBlock>({
      initialBlocks: INITIAL_BLOCKS,
      containerTypes: [...CONTAINER_TYPES],
      orderingStrategy: 'fractional',
      initialExpanded: 'all',
    })

    controller.setOverlayRenderer((block: ProductivityBlock) => {
      const el = document.createElement('div')
      el.className = 'bg-card border border-primary shadow-lg rounded-lg p-3 text-sm w-56 drag-overlay'
      const row = document.createElement('div')
      row.className = 'flex items-center gap-2'
      row.appendChild(createGripIcon('h-4 w-4 text-muted-foreground'))
      const badge = document.createElement('span')
      badge.className = 'text-xs text-primary uppercase tracking-wider font-medium'
      badge.textContent = block.type
      row.appendChild(badge)
      el.appendChild(row)
      const title = document.createElement('div')
      title.className = 'font-medium text-foreground mt-1'
      title.textContent = block.title
      el.appendChild(title)
      return el
    })

    const sync = createDeferredSync<ProductivityBlock>({
      onResolve: (blocks) => {
        controller.setBlocks(blocks)
        blocksRef.current = blocks
      },
    })

    const anim = new LayoutAnimation({ duration: 250, easing: 'ease-out' })

    // Snapshot BEFORE renderer clears DOM (subscription order matters)
    const unsubAnimSnapshot = controller.on('render', () => {
      anim.snapshot(el)
    })

    const renderer = createDefaultRenderer(controller, {
      container: el,
      containerTypes: [...CONTAINER_TYPES],
      renderBlock,
      rootClassName: 'flex flex-col gap-1',
      indentClassName: 'tree-indent-compact',
      dropZoneClassName: 'h-0.5 rounded transition-all duration-150',
      dropZoneActiveClassName: 'bg-primary h-1',
    })

    // Track blocks + animate AFTER renderer rebuilds DOM
    const unsubRender = controller.on('render', (blocks) => {
      blocksRef.current = blocks
      anim.animate(el)
    })

    // Drag lifecycle — deferred sync
    const unsubDrag = controller.on('drag:statechange', (state) => {
      if (state.isDragging) {
        sync.enterBusy()
        publishRef.current({ type: 'busy', peerId, reason: 'dragging', active: true })
      } else {
        publishRef.current({ type: 'busy', peerId, reason: 'dragging', active: false })
        queueMicrotask(() => {
          const result = sync.exitBusy(blocksRef.current, 'lww')
          const blocks = result ?? blocksRef.current
          publishRef.current({ type: 'blocks', peerId, blocks })
        })
      }
    })

    // Task toggle
    const handleToggle = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.id) {
        const blocks = controller.getBlocks()
        const updated = blocks.map(b =>
          b.id === detail.id && b.type === 'task' ? { ...b, completed: !b.completed } : b
        )
        controller.setBlocks(updated)
        publishRef.current({ type: 'blocks', peerId, blocks: updated })
      }
    }
    el.addEventListener('toggle-task', handleToggle)

    // Inline editing via double-click on title spans
    let editingBlockId: string | null = null

    function commitEdit(input: HTMLInputElement, blockId: string, originalTitle: string) {
      if (!editingBlockId) return
      editingBlockId = null
      const trimmed = input.value.trim()

      if (trimmed && trimmed !== originalTitle) {
        // Content changed — update block and merge with queued remote changes
        const edited = blocksRef.current.map(b =>
          b.id === blockId ? { ...b, title: trimmed } : b
        )
        publishRef.current({ type: 'busy', peerId, reason: 'editing' as BusyReason, active: false })
        const merged = sync.exitBusy(edited, 'merge')
        if (merged) {
          controller.setBlocks(merged)
          blocksRef.current = merged
          publishRef.current({ type: 'blocks', peerId, blocks: merged })
        } else {
          controller.setBlocks(edited)
          blocksRef.current = edited
          publishRef.current({ type: 'blocks', peerId, blocks: edited })
        }
      } else {
        // No change — just apply any queued remote ordering
        publishRef.current({ type: 'busy', peerId, reason: 'editing' as BusyReason, active: false })
        const merged = sync.exitBusy(blocksRef.current, 'merge')
        if (merged) {
          controller.setBlocks(merged)
          blocksRef.current = merged
          publishRef.current({ type: 'blocks', peerId, blocks: merged })
        }
      }
    }

    function cancelEdit() {
      if (!editingBlockId) return
      editingBlockId = null
      publishRef.current({ type: 'busy', peerId, reason: 'editing' as BusyReason, active: false })
      const merged = sync.exitBusy(blocksRef.current, 'merge')
      if (merged) {
        controller.setBlocks(merged)
        blocksRef.current = merged
        publishRef.current({ type: 'blocks', peerId, blocks: merged })
      }
    }

    const handleDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const blockId = target.getAttribute('data-title-id')
      if (!blockId || editingBlockId) return

      e.stopPropagation()
      editingBlockId = blockId

      // Enter busy state for deferred sync
      sync.enterBusy()
      publishRef.current({ type: 'busy', peerId, reason: 'editing' as BusyReason, active: true })

      // Swap span for input
      const originalTitle = target.textContent || ''
      const input = document.createElement('input')
      input.type = 'text'
      input.value = originalTitle
      input.className = 'bg-transparent border-b border-primary outline-none w-full min-w-0 ' + target.className.replace('cursor-text select-none', '').trim()

      let committed = false
      input.addEventListener('keydown', (ke) => {
        ke.stopPropagation() // Prevent drag sensor from intercepting
        if (ke.key === 'Enter') {
          ke.preventDefault()
          committed = true
          commitEdit(input, blockId, originalTitle)
        } else if (ke.key === 'Escape') {
          ke.preventDefault()
          committed = true
          cancelEdit()
        }
      })
      input.addEventListener('blur', () => {
        if (!committed) {
          commitEdit(input, blockId, originalTitle)
        }
      })

      target.replaceWith(input)
      requestAnimationFrame(() => input.select())
    }
    el.addEventListener('dblclick', handleDblClick)

    // Subscribe to remote changes
    const unsubChannel = subscribe(peerId, (msg: SyncMessage) => {
      if (msg.type === 'busy') {
        onRemoteBusyRef.current?.(msg.peerId, msg.active ? msg.reason : null)
        if (msg.active) {
          startSimulation()
        } else {
          stopSimulation()
        }
        return
      }
      sync.apply(msg.blocks)
    })

    controller.mount(el)
    controllerRef.current = controller

    return () => {
      stopSimulation()
      el.removeEventListener('toggle-task', handleToggle)
      el.removeEventListener('dblclick', handleDblClick)
      unsubAnimSnapshot()
      unsubRender()
      unsubDrag()
      unsubChannel()
      renderer()
      controller.destroy()
      controllerRef.current = null
    }
  }, [peerId, subscribe, startSimulation, stopSimulation])

  // Cleanup simulation on unmount
  useEffect(() => stopSimulation, [stopSimulation])

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${accentColor}`} />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div ref={containerRef} className="border border-border/50 rounded-xl p-3 bg-card/30 min-w-0 overflow-hidden flex flex-col gap-1 w-full" />
    </div>
  )
}
