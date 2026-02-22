'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import type { BaseBlock, BlockIndex, BlockTreeCallbacks, DragStartEvent, DragEndEvent, BlockMoveEvent, ExpandChangeEvent, HoverChangeEvent } from '../core/types'
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
  className?: string
  style?: React.CSSProperties
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
// Component: BlockTreeDevTools
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

export function BlockTreeDevTools<T extends BaseBlock = BaseBlock>({
  blocks,
  containerTypes = [],
  events,
  onClearEvents,
  className,
  style,
}: BlockTreeDevToolsProps<T>) {
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

  const sectionStyle: React.CSSProperties = {
    marginBottom: '8px',
  }

  const headingStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    opacity: 0.6,
    marginBottom: '6px',
  }

  const statRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    padding: '2px 0',
  }

  const statValueStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '11px',
    opacity: 0.8,
  }

  const badgeStyle = (color: string): React.CSSProperties => ({
    display: 'inline-block',
    fontSize: '9px',
    fontWeight: 700,
    fontFamily: 'monospace',
    padding: '1px 5px',
    borderRadius: '3px',
    backgroundColor: color + '22',
    color,
    marginRight: '6px',
    flexShrink: 0,
  })

  const eventListStyle: React.CSSProperties = {
    maxHeight: '200px',
    overflowY: 'auto' as const,
    fontSize: '11px',
    lineHeight: '1.6',
  }

  const eventItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
    padding: '2px 0',
    borderBottom: '1px solid rgba(128,128,128,0.1)',
  }

  const timeStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '10px',
    opacity: 0.4,
    flexShrink: 0,
    minWidth: '52px',
  }

  const clearBtnStyle: React.CSSProperties = {
    fontSize: '10px',
    padding: '2px 8px',
    border: '1px solid rgba(128,128,128,0.3)',
    borderRadius: '4px',
    background: 'transparent',
    cursor: 'pointer',
    opacity: 0.7,
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
  }

  return (
    <div
      className={className}
      style={style}
      data-devtools-root=""
    >
      {/* Tree State */}
      <div style={sectionStyle} data-devtools-section="tree-state">
        <div style={headingStyle}>Tree State</div>
        <div style={statRowStyle}>
          <span>Blocks</span>
          <span style={statValueStyle}>{treeStats.blockCount}</span>
        </div>
        <div style={statRowStyle}>
          <span>Containers</span>
          <span style={statValueStyle}>{treeStats.containerCount}</span>
        </div>
        <div style={statRowStyle}>
          <span>Max Depth</span>
          <span style={statValueStyle}>{treeStats.maxDepth}</span>
        </div>
        <div style={statRowStyle}>
          <span>Validation</span>
          <span style={{
            ...statValueStyle,
            color: treeStats.validation.valid ? '#10b981' : '#ef4444',
          }}>
            {treeStats.validation.valid ? 'Valid' : `${treeStats.validation.issues.length} issue(s)`}
          </span>
        </div>
        {!treeStats.validation.valid && (
          <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px' }}>
            {treeStats.validation.issues.map((issue, i) => (
              <div key={i}>{issue}</div>
            ))}
          </div>
        )}
      </div>

      {/* Event Log */}
      <div style={sectionStyle} data-devtools-section="event-log">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={headingStyle}>Event Log ({events.length})</div>
          {events.length > 0 && (
            <button onClick={onClearEvents} style={clearBtnStyle}>Clear</button>
          )}
        </div>
        <div style={eventListStyle}>
          {events.length === 0 ? (
            <div style={{ fontSize: '11px', opacity: 0.4, padding: '8px 0' }}>
              No events yet. Drag some blocks!
            </div>
          ) : (
            events.map(event => (
              <div key={event.id} style={eventItemStyle}>
                <span style={timeStyle}>{formatTime(event.timestamp)}</span>
                <span style={badgeStyle(TYPE_COLORS[event.type])}>{TYPE_LABELS[event.type]}</span>
                <span style={{ wordBreak: 'break-word' as const }}>{event.summary}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Performance */}
      <div style={sectionStyle} data-devtools-section="performance">
        <div style={headingStyle}>Performance</div>
        <div style={statRowStyle}>
          <span>Render Count</span>
          <span style={statValueStyle}>{renderCountRef.current}</span>
        </div>
        <div style={statRowStyle}>
          <span>Last Render</span>
          <span style={statValueStyle}>{renderTime.toFixed(1)}ms</span>
        </div>
        <div style={statRowStyle}>
          <span>Block Count Delta</span>
          <span style={{
            ...statValueStyle,
            color: blockCountDelta > 0 ? '#10b981' : blockCountDelta < 0 ? '#ef4444' : undefined,
          }}>
            {blockCountDelta > 0 ? '+' : ''}{blockCountDelta}
          </span>
        </div>
      </div>
    </div>
  )
}
