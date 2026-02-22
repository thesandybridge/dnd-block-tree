'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import type { BaseBlock, BlockTreeCallbacks, DragStartEvent, DragEndEvent, BlockMoveEvent, ExpandChangeEvent, HoverChangeEvent } from '../core/types'
import { computeNormalizedIndex, validateBlockTree, getBlockDepth } from '../utils/blocks'

// ============================================================================
// Types
// ============================================================================

export interface DevToolsEventEntry {
  id: number
  timestamp: number
  type: 'dragStart' | 'dragEnd' | 'blockMove' | 'expandChange' | 'hoverChange'
  summary: string
}

export interface DevToolsCallbacks<T extends BaseBlock = BaseBlock> {
  onDragStart: NonNullable<BlockTreeCallbacks<T>['onDragStart']>
  onDragEnd: NonNullable<BlockTreeCallbacks<T>['onDragEnd']>
  onBlockMove: NonNullable<BlockTreeCallbacks<T>['onBlockMove']>
  onExpandChange: NonNullable<BlockTreeCallbacks<T>['onExpandChange']>
  onHoverChange: NonNullable<BlockTreeCallbacks<T>['onHoverChange']>
}

export interface BlockTreeDevToolsProps<T extends BaseBlock = BaseBlock> {
  blocks: T[]
  containerTypes?: readonly string[]
  events: DevToolsEventEntry[]
  onClearEvents: () => void
  /** Label function for diff view (default: block.type) */
  getLabel?: (block: T) => string
  /** Initial open state (default: false) */
  initialOpen?: boolean
  /** Position of the trigger button (default: 'bottom-left') */
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  /** Custom inline styles for the trigger button */
  buttonStyle?: React.CSSProperties
  /** Custom inline styles for the card panel */
  panelStyle?: React.CSSProperties
}

// ============================================================================
// Hook: useDevToolsCallbacks
// ============================================================================

const MAX_EVENTS = 100

export function useDevToolsCallbacks<T extends BaseBlock = BaseBlock>() {
  const [events, setEvents] = useState<DevToolsEventEntry[]>([])
  const nextIdRef = useRef(1)

  const addEvent = useCallback((type: DevToolsEventEntry['type'], summary: string) => {
    const entry: DevToolsEventEntry = {
      id: nextIdRef.current++,
      timestamp: Date.now(),
      type,
      summary,
    }
    setEvents(prev => [entry, ...prev].slice(0, MAX_EVENTS))
  }, [])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  const callbacks: DevToolsCallbacks<T> = useMemo(() => ({
    onDragStart: (event: DragStartEvent<T>) => {
      addEvent('dragStart', `Started dragging "${event.blockId}"`)
    },
    onDragEnd: (event: DragEndEvent<T>) => {
      if (event.cancelled) {
        addEvent('dragEnd', `Cancelled drag of "${event.blockId}"`)
      } else {
        addEvent('dragEnd', `Dropped "${event.blockId}" at ${event.targetZone ?? 'none'}`)
      }
    },
    onBlockMove: (event: BlockMoveEvent<T>) => {
      const fromStr = `parent=${event.from.parentId ?? 'root'}[${event.from.index}]`
      const toStr = `parent=${event.to.parentId ?? 'root'}[${event.to.index}]`
      const ids = event.movedIds.length > 1 ? ` (${event.movedIds.length} blocks)` : ''
      addEvent('blockMove', `Moved "${event.block.id}" from ${fromStr} to ${toStr}${ids}`)
    },
    onExpandChange: (event: ExpandChangeEvent<T>) => {
      addEvent('expandChange', `${event.expanded ? 'Expanded' : 'Collapsed'} "${event.blockId}"`)
    },
    onHoverChange: (event: HoverChangeEvent<T>) => {
      if (event.zoneId) {
        addEvent('hoverChange', `Hovering over zone "${event.zoneId}"`)
      }
    },
  }), [addEvent])

  return { callbacks, events, clearEvents }
}

// ============================================================================
// Logo SVG
// ============================================================================

function DevToolsLogo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="8" height="5" rx="1" fill="#3b82f6" opacity="0.9" />
      <rect x="8" y="10" width="8" height="5" rx="1" fill="#10b981" opacity="0.9" />
      <rect x="14" y="18" width="8" height="5" rx="1" fill="#f59e0b" opacity="0.9" />
      <path d="M6 7 L6 10 L8 10" stroke="#888" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M12 15 L12 18 L14 18" stroke="#888" strokeWidth="1.5" fill="none" opacity="0.6" />
    </svg>
  )
}

// ============================================================================
// Diff computation (inline, no external deps)
// ============================================================================

type ChangeType = 'added' | 'moved' | 'unchanged'

interface DiffEntry<T extends BaseBlock> {
  block: T
  changeType: ChangeType
  depth: number
}

function computeDiffMap<T extends BaseBlock>(prev: T[], next: T[]): Map<string, ChangeType> {
  const prevMap = new Map(prev.map(b => [b.id, b]))
  const changeMap = new Map<string, ChangeType>()
  for (const block of next) {
    const prevBlock = prevMap.get(block.id)
    if (!prevBlock) {
      changeMap.set(block.id, 'added')
    } else if (prevBlock.parentId !== block.parentId || prevBlock.order !== block.order) {
      changeMap.set(block.id, 'moved')
    } else {
      changeMap.set(block.id, 'unchanged')
    }
  }
  return changeMap
}

function buildDiffTree<T extends BaseBlock>(blocks: T[], changeMap: Map<string, ChangeType>): DiffEntry<T>[] {
  const result: DiffEntry<T>[] = []
  const byParent = new Map<string | null, T[]>()
  for (const block of blocks) {
    const key = block.parentId ?? null
    const list = byParent.get(key) ?? []
    list.push(block)
    byParent.set(key, list)
  }
  function walk(parentId: string | null, depth: number) {
    const children = byParent.get(parentId) ?? []
    children.sort((a, b) => {
      const ao = a.order, bo = b.order
      if (typeof ao === 'number' && typeof bo === 'number') return ao - bo
      return String(ao) < String(bo) ? -1 : String(ao) > String(bo) ? 1 : 0
    })
    for (const block of children) {
      result.push({ block, changeType: changeMap.get(block.id) ?? 'unchanged', depth })
      walk(block.id, depth + 1)
    }
  }
  walk(null, 0)
  return result
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_COLORS: Record<DevToolsEventEntry['type'], string> = {
  dragStart: '#3b82f6',
  dragEnd: '#10b981',
  blockMove: '#f59e0b',
  expandChange: '#8b5cf6',
  hoverChange: '#6b7280',
}

const TYPE_LABELS: Record<DevToolsEventEntry['type'], string> = {
  dragStart: 'DRAG',
  dragEnd: 'DROP',
  blockMove: 'MOVE',
  expandChange: 'EXPAND',
  hoverChange: 'HOVER',
}

const TYPE_TOOLTIPS: Record<DevToolsEventEntry['type'], string> = {
  dragStart: 'onDragStart — a block was picked up',
  dragEnd: 'onDragEnd — a block was dropped or drag was cancelled',
  blockMove: 'onBlockMove — a block was reparented to a new position',
  expandChange: 'onExpandChange — a container was expanded or collapsed',
  hoverChange: 'onHoverChange — the pointer entered a drop zone',
}

const DEFAULT_WIDTH = 340
const DEFAULT_HEIGHT = 420
const DIFF_EXTRA_WIDTH = 300
const MIN_WIDTH = 280
const MIN_HEIGHT = 200

type AnchorCSS = { bottom?: number; top?: number; left?: number; right?: number }

function getAnchorCSS(position: BlockTreeDevToolsProps['position']): AnchorCSS {
  switch (position) {
    case 'bottom-right': return { bottom: 16, right: 16 }
    case 'top-left': return { top: 16, left: 16 }
    case 'top-right': return { top: 16, right: 16 }
    case 'bottom-left':
    default: return { bottom: 16, left: 16 }
  }
}

function computeCardOrigin(position: BlockTreeDevToolsProps['position'], width: number, height: number): { x: number; y: number } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  switch (position) {
    case 'bottom-right':
      return { x: Math.max(0, vw - 16 - width), y: Math.max(0, vh - 16 - height - 48) }
    case 'top-left':
      return { x: 16, y: 16 + 48 }
    case 'top-right':
      return { x: Math.max(0, vw - 16 - width), y: 16 + 48 }
    case 'bottom-left':
    default:
      return { x: 16, y: Math.max(0, vh - 16 - height - 48) }
  }
}

// ============================================================================
// Component: BlockTreeDevTools
// ============================================================================

export function BlockTreeDevTools<T extends BaseBlock = BaseBlock>({
  blocks,
  containerTypes = [],
  events,
  onClearEvents,
  getLabel = (b) => b.type,
  initialOpen = false,
  position = 'bottom-left',
  buttonStyle,
  panelStyle,
}: BlockTreeDevToolsProps<T>) {
  const [isOpen, setIsOpen] = useState(initialOpen)
  const [showDiff, setShowDiff] = useState(false)
  const [cardPos, setCardPos] = useState<{ x: number; y: number } | null>(null)
  const [cardSize, setCardSize] = useState<{ w: number; h: number }>({ w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT })
  const [showTooltip, setShowTooltip] = useState(false)

  // Drag state (title bar)
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; origX: number; origY: number }>({
    dragging: false, startX: 0, startY: 0, origX: 0, origY: 0,
  })

  // Resize state
  const resizeRef = useRef<{
    active: boolean
    edge: string
    startX: number; startY: number
    origX: number; origY: number
    origW: number; origH: number
  }>({ active: false, edge: '', startX: 0, startY: 0, origX: 0, origY: 0, origW: 0, origH: 0 })

  const cardRef = useRef<HTMLDivElement>(null)

  // Diff state tracking
  const prevBlocksRef = useRef<T[]>(blocks)
  const diffChangeMap = useMemo(() => computeDiffMap(prevBlocksRef.current, blocks), [blocks])
  useEffect(() => { prevBlocksRef.current = blocks }, [blocks])
  const diffTree = useMemo(() => buildDiffTree(blocks, diffChangeMap), [blocks, diffChangeMap])
  const diffStats = useMemo(() => {
    let added = 0, moved = 0
    for (const { changeType } of diffTree) {
      if (changeType === 'added') added++
      if (changeType === 'moved') moved++
    }
    return { added, moved }
  }, [diffTree])

  // Auto-widen/shrink when toggling diff
  useEffect(() => {
    setCardSize(prev => {
      const targetW = showDiff ? DEFAULT_WIDTH + DIFF_EXTRA_WIDTH : DEFAULT_WIDTH
      // Only auto-resize if at the "natural" widths (user hasn't manually resized to something custom)
      const wasDefault = Math.abs(prev.w - DEFAULT_WIDTH) < 20
      const wasExpanded = Math.abs(prev.w - (DEFAULT_WIDTH + DIFF_EXTRA_WIDTH)) < 20
      if (showDiff && (wasDefault || prev.w < targetW)) {
        return { ...prev, w: targetW }
      }
      if (!showDiff && wasExpanded) {
        return { ...prev, w: DEFAULT_WIDTH }
      }
      return prev
    })
  }, [showDiff])

  // Compute initial card position
  const getDefaultCardPos = useCallback(() => {
    return computeCardOrigin(position, cardSize.w, cardSize.h)
  }, [position, cardSize.w, cardSize.h])

  // Set card position when opening
  useEffect(() => {
    if (isOpen && !cardPos) {
      setCardPos(getDefaultCardPos())
    }
  }, [isOpen, cardPos, getDefaultCardPos])

  // ---------- Drag (title bar) ----------

  const handleDragPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: cardPos?.x ?? 0,
      origY: cardPos?.y ?? 0,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [cardPos])

  const handleDragPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const newX = dragRef.current.origX + dx
    const newY = dragRef.current.origY + dy
    const maxX = window.innerWidth - cardSize.w
    const maxY = window.innerHeight - 40
    setCardPos({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    })
  }, [cardSize.w])

  const handleDragPointerUp = useCallback(() => {
    dragRef.current.dragging = false
  }, [])

  // ---------- Resize ----------

  const handleResizePointerDown = useCallback((edge: string) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizeRef.current = {
      active: true,
      edge,
      startX: e.clientX,
      startY: e.clientY,
      origX: cardPos?.x ?? 0,
      origY: cardPos?.y ?? 0,
      origW: cardSize.w,
      origH: cardSize.h,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [cardPos, cardSize])

  const handleResizePointerMove = useCallback((e: React.PointerEvent) => {
    const r = resizeRef.current
    if (!r.active) return
    const dx = e.clientX - r.startX
    const dy = e.clientY - r.startY
    let newW = r.origW
    let newH = r.origH
    let newX = r.origX
    let newY = r.origY

    if (r.edge.includes('e')) newW = Math.max(MIN_WIDTH, r.origW + dx)
    if (r.edge.includes('w')) {
      newW = Math.max(MIN_WIDTH, r.origW - dx)
      newX = r.origX + (r.origW - newW)
    }
    if (r.edge.includes('s')) newH = Math.max(MIN_HEIGHT, r.origH + dy)
    if (r.edge.includes('n')) {
      newH = Math.max(MIN_HEIGHT, r.origH - dy)
      newY = r.origY + (r.origH - newH)
    }

    setCardSize({ w: newW, h: newH })
    setCardPos({ x: newX, y: newY })
  }, [])

  const handleResizePointerUp = useCallback(() => {
    resizeRef.current.active = false
  }, [])

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const toggleDiff = useCallback(() => {
    setShowDiff(prev => !prev)
  }, [])

  // ---------- Stats ----------

  const renderCountRef = useRef(0)
  const lastRenderTimeRef = useRef(performance.now())
  const prevBlockCountRef = useRef(blocks.length)

  renderCountRef.current++
  const renderTime = performance.now() - lastRenderTimeRef.current
  lastRenderTimeRef.current = performance.now()

  const blockCountDelta = blocks.length - prevBlockCountRef.current
  useEffect(() => {
    prevBlockCountRef.current = blocks.length
  }, [blocks.length])

  const treeStats = useMemo(() => {
    const index = computeNormalizedIndex(blocks as BaseBlock[])
    const containers = blocks.filter(b => containerTypes.includes(b.type))
    let maxDepthVal = 0
    for (const block of blocks) {
      const d = getBlockDepth(index, block.id)
      if (d > maxDepthVal) maxDepthVal = d
    }
    const validation = validateBlockTree(index)
    return {
      blockCount: blocks.length,
      containerCount: containers.length,
      maxDepth: maxDepthVal,
      validation,
    }
  }, [blocks, containerTypes])

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
  }

  // ---------- Styles ----------

  const anchor = getAnchorCSS(position)

  const triggerBtnStyle: React.CSSProperties = {
    position: 'fixed',
    ...anchor,
    zIndex: 99998,
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    background: isOpen ? 'rgba(59, 130, 246, 0.9)' : 'rgba(30, 30, 30, 0.85)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    transition: 'background 0.15s, transform 0.15s',
    ...buttonStyle,
  }

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    whiteSpace: 'nowrap',
    fontSize: 11,
    fontWeight: 500,
    padding: '4px 10px',
    borderRadius: 6,
    background: 'rgba(15, 15, 20, 0.95)',
    color: '#ccc',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
    // Position based on anchor corner
    ...(anchor.bottom !== undefined
      ? { bottom: '100%', marginBottom: 8 }
      : { top: '100%', marginTop: 8 }),
    ...(anchor.left !== undefined
      ? { left: 0 }
      : { right: 0 }),
  }

  const cardStyle: React.CSSProperties = {
    position: 'fixed',
    left: cardPos?.x ?? 0,
    top: cardPos?.y ?? 0,
    zIndex: 99999,
    width: cardSize.w,
    height: cardSize.h,
    background: 'rgba(20, 20, 24, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#e0e0e0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 12,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    ...panelStyle,
  }

  const titleBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    gap: 8,
    background: 'rgba(255,255,255,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    cursor: 'grab',
    userSelect: 'none',
    flexShrink: 0,
    touchAction: 'none',
  }

  const titleTextStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.03em',
    opacity: 0.8,
    flexShrink: 0,
  }

  const titleBtnStyle = (active?: boolean): React.CSSProperties => ({
    height: 22,
    padding: '0 8px',
    borderRadius: 4,
    border: '1px solid ' + (active ? 'rgba(59,130,246,0.5)' : 'rgba(128,128,128,0.25)'),
    background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
    color: active ? '#93b8f7' : '#999',
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.02em',
    flexShrink: 0,
  })

  const closeBtnStyle: React.CSSProperties = {
    width: 20,
    height: 20,
    borderRadius: 4,
    border: 'none',
    background: 'transparent',
    color: '#999',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    lineHeight: '1',
    padding: 0,
    flexShrink: 0,
  }

  const bodyStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 0,
  }

  const mainColumnStyle: React.CSSProperties = {
    flex: showDiff ? '0 0 50%' : '1 1 100%',
    overflow: 'auto',
    padding: '10px 12px',
    minWidth: 0,
  }

  const diffColumnStyle: React.CSSProperties = {
    flex: '0 0 50%',
    overflow: 'auto',
    padding: '10px 12px',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    minWidth: 0,
  }

  const sectionStyle: React.CSSProperties = {
    marginBottom: 8,
  }

  const headingStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    opacity: 0.6,
    marginBottom: 6,
  }

  const statRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
    padding: '2px 0',
  }

  const statValueStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: 11,
    opacity: 0.8,
  }

  const badgeStyle = (color: string): React.CSSProperties => ({
    display: 'inline-block',
    fontSize: 9,
    fontWeight: 700,
    fontFamily: 'monospace',
    padding: '1px 5px',
    borderRadius: 3,
    backgroundColor: color + '22',
    color,
    marginRight: 6,
    flexShrink: 0,
  })

  const eventListStyle: React.CSSProperties = {
    maxHeight: 160,
    overflowY: 'auto',
    fontSize: 11,
    lineHeight: '1.6',
  }

  const eventItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 4,
    padding: '2px 0',
    borderBottom: '1px solid rgba(128,128,128,0.1)',
  }

  const timeStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: 10,
    opacity: 0.4,
    flexShrink: 0,
    minWidth: 52,
  }

  const clearBtnStyle: React.CSSProperties = {
    fontSize: 10,
    padding: '2px 8px',
    border: '1px solid rgba(128,128,128,0.3)',
    borderRadius: 4,
    background: 'transparent',
    color: '#ccc',
    cursor: 'pointer',
    opacity: 0.7,
  }

  // Resize edge styles
  const EDGE_SIZE = 6
  const resizeEdge = (edge: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      zIndex: 1,
    }
    const cursors: Record<string, string> = {
      n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
      ne: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize', sw: 'nesw-resize',
    }
    const styles: Record<string, React.CSSProperties> = {
      n: { top: 0, left: EDGE_SIZE, right: EDGE_SIZE, height: EDGE_SIZE },
      s: { bottom: 0, left: EDGE_SIZE, right: EDGE_SIZE, height: EDGE_SIZE },
      e: { right: 0, top: EDGE_SIZE, bottom: EDGE_SIZE, width: EDGE_SIZE },
      w: { left: 0, top: EDGE_SIZE, bottom: EDGE_SIZE, width: EDGE_SIZE },
      ne: { top: 0, right: 0, width: EDGE_SIZE * 2, height: EDGE_SIZE * 2 },
      nw: { top: 0, left: 0, width: EDGE_SIZE * 2, height: EDGE_SIZE * 2 },
      se: { bottom: 0, right: 0, width: EDGE_SIZE * 2, height: EDGE_SIZE * 2 },
      sw: { bottom: 0, left: 0, width: EDGE_SIZE * 2, height: EDGE_SIZE * 2 },
    }
    return { ...base, cursor: cursors[edge], ...styles[edge] }
  }

  const EDGES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

  // Diff row colors
  const diffRowColor = (ct: ChangeType): React.CSSProperties => {
    if (ct === 'added') return { background: 'rgba(16,185,129,0.1)', color: '#34d399' }
    if (ct === 'moved') return { background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }
    return { color: 'rgba(200,200,200,0.5)' }
  }

  return (
    <>
      {/* Trigger Button + Tooltip */}
      <div style={{ position: 'fixed', ...anchor, zIndex: 99998 }}>
        <button
          onClick={toggle}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          style={triggerBtnStyle}
          aria-label={isOpen ? 'Close DevTools' : 'Open DevTools'}
        >
          <DevToolsLogo size={20} />
        </button>
        {showTooltip && !isOpen && (
          <div style={tooltipStyle}>dnd-block-tree DevTools</div>
        )}
      </div>

      {/* Floating Card */}
      {isOpen && cardPos && (
        <div
          ref={cardRef}
          style={cardStyle}
          data-devtools-root=""
        >
          {/* Resize handles */}
          {EDGES.map(edge => (
            <div
              key={edge}
              style={resizeEdge(edge)}
              onPointerDown={handleResizePointerDown(edge)}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
            />
          ))}

          {/* Title Bar (drag handle) */}
          <div
            style={titleBarStyle}
            onPointerDown={handleDragPointerDown}
            onPointerMove={handleDragPointerMove}
            onPointerUp={handleDragPointerUp}
          >
            <span style={titleTextStyle}>DevTools</span>
            <div style={{ flex: 1 }} />
            <button
              onClick={toggleDiff}
              style={titleBtnStyle(showDiff)}
              onPointerDown={e => e.stopPropagation()}
              title="Toggle structure diff — shows which blocks were added, moved, or unchanged"
            >
              Diff
            </button>
            <button
              onClick={toggle}
              style={closeBtnStyle}
              onPointerDown={e => e.stopPropagation()}
              aria-label="Close DevTools"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div style={bodyStyle}>
            {/* Main column */}
            <div style={mainColumnStyle}>
              {/* Tree State */}
              <div style={sectionStyle} data-devtools-section="tree-state">
                <div style={headingStyle} title="Live snapshot of the block tree structure">Tree State</div>
                <div style={statRowStyle} title="Total number of blocks in the flat array">
                  <span>Blocks</span>
                  <span style={statValueStyle}>{treeStats.blockCount}</span>
                </div>
                <div style={statRowStyle} title="Blocks whose type is in containerTypes (can have children)">
                  <span>Containers</span>
                  <span style={statValueStyle}>{treeStats.containerCount}</span>
                </div>
                <div style={statRowStyle} title="Deepest nesting level in the tree (root = 1)">
                  <span>Max Depth</span>
                  <span style={statValueStyle}>{treeStats.maxDepth}</span>
                </div>
                <div style={statRowStyle} title="Checks for cycles, orphans, and stale parent refs">
                  <span>Validation</span>
                  <span style={{
                    ...statValueStyle,
                    color: treeStats.validation.valid ? '#10b981' : '#ef4444',
                  }}>
                    {treeStats.validation.valid ? 'Valid' : `${treeStats.validation.issues.length} issue(s)`}
                  </span>
                </div>
                {!treeStats.validation.valid && (
                  <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>
                    {treeStats.validation.issues.map((issue, i) => (
                      <div key={i}>{issue}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Event Log */}
              <div style={sectionStyle} data-devtools-section="event-log">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={headingStyle} title="Chronological log of drag, drop, move, expand, and hover events">Event Log ({events.length})</div>
                  {events.length > 0 && (
                    <button onClick={onClearEvents} style={clearBtnStyle}>Clear</button>
                  )}
                </div>
                <div style={eventListStyle}>
                  {events.length === 0 ? (
                    <div style={{ fontSize: 11, opacity: 0.4, padding: '8px 0' }}>
                      No events yet. Drag some blocks!
                    </div>
                  ) : (
                    events.map(event => (
                      <div key={event.id} style={eventItemStyle}>
                        <span style={timeStyle}>{formatTime(event.timestamp)}</span>
                        <span style={badgeStyle(TYPE_COLORS[event.type])} title={TYPE_TOOLTIPS[event.type]}>{TYPE_LABELS[event.type]}</span>
                        <span style={{ wordBreak: 'break-word' }}>{event.summary}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Performance */}
              <div style={sectionStyle} data-devtools-section="performance">
                <div style={headingStyle} title="Render metrics for the DevTools component itself">Performance</div>
                <div style={statRowStyle} title="How many times this DevTools component has rendered">
                  <span>Render Count</span>
                  <span style={statValueStyle}>{renderCountRef.current}</span>
                </div>
                <div style={statRowStyle} title="Time since the previous render of this component">
                  <span>Last Render</span>
                  <span style={statValueStyle}>{renderTime.toFixed(1)}ms</span>
                </div>
                <div style={statRowStyle} title="Change in block count since the last render (+added / -removed)">
                  <span style={{
                    ...statValueStyle,
                    color: blockCountDelta > 0 ? '#10b981' : blockCountDelta < 0 ? '#ef4444' : undefined,
                  }}>
                    {blockCountDelta > 0 ? '+' : ''}{blockCountDelta}
                  </span>
                </div>
              </div>
            </div>

            {/* Diff column */}
            {showDiff && (
              <div style={diffColumnStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={headingStyle} title="Tree structure diff — compares current state to the previous render">Structure</div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, fontWeight: 500 }}>
                    {diffStats.added > 0 && (
                      <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                        {diffStats.added} new
                      </span>
                    )}
                    {diffStats.moved > 0 && (
                      <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
                        {diffStats.moved} moved
                      </span>
                    )}
                    {diffStats.added === 0 && diffStats.moved === 0 && (
                      <span style={{ opacity: 0.4 }}>No changes</span>
                    )}
                  </div>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: '1.7' }}>
                  {diffTree.map(({ block, changeType, depth }) => (
                    <div
                      key={block.id}
                      style={{
                        paddingLeft: depth * 14,
                        padding: '2px 6px 2px ' + (depth * 14 + 6) + 'px',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        ...diffRowColor(changeType),
                      }}
                    >
                      <span style={{ width: 12, textAlign: 'center', fontWeight: 700, fontSize: 10 }}>
                        {changeType === 'added' && '+'}
                        {changeType === 'moved' && '~'}
                      </span>
                      <span style={{
                        textTransform: 'uppercase',
                        fontSize: 9,
                        letterSpacing: '0.05em',
                        width: 50,
                        flexShrink: 0,
                        opacity: changeType === 'unchanged' ? 0.5 : 1,
                      }}>
                        {block.type}
                      </span>
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                      }}>
                        {getLabel(block)}
                      </span>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: 10,
                        flexShrink: 0,
                        padding: '1px 5px',
                        borderRadius: 3,
                        ...(changeType === 'added'
                          ? { background: 'rgba(16,185,129,0.2)', color: '#34d399' }
                          : changeType === 'moved'
                            ? { background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }
                            : { background: 'rgba(128,128,128,0.15)', color: 'rgba(200,200,200,0.4)' }),
                      }}>
                        {String(block.order)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
