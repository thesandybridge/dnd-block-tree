import type {
  BaseBlock,
  BlockTreeInstance,
  CoreCollisionDetection,
  Rect,
} from '@dnd-block-tree/core'
import {
  createBlockTree,
  createStickyCollision,
  EventEmitter,
} from '@dnd-block-tree/core'
import type {
  BlockTreeControllerOptions,
  ControllerEvents,
  DragState,
  Unsubscribe,
  VanillaSensorConfig,
} from './types'
import { measureDropZoneRects, detectCollision } from './collision-bridge'
import { DragOverlay } from './drag-overlay'
import { PointerSensor } from './sensors/pointer-sensor'
import { TouchSensor } from './sensors/touch-sensor'
import { KeyboardSensor } from './sensors/keyboard-sensor'
import type { SensorCallbacks } from './sensors/types'
import type { Sensor } from './sensors/types'
import { createBlockHistory, type BlockHistory } from './history'

export interface BlockTreeController<T extends BaseBlock = BaseBlock> {
  // Mounting
  mount(container: HTMLElement): void
  unmount(): void

  // Registration
  registerDraggable(id: string, element: HTMLElement): Unsubscribe
  registerDropZone(id: string, element: HTMLElement): Unsubscribe

  // State reads
  getDragState(): DragState
  getBlocks(): T[]
  getEffectiveBlocks(): T[]
  getExpandedMap(): Record<string, boolean>
  getBlock(id: string): T | undefined

  // Actions
  toggleExpand(id: string): void
  setExpandAll(expanded: boolean): void
  addBlock(type: T['type'], parentId?: string | null): T
  deleteBlock(id: string): void
  setBlocks(blocks: T[]): void

  // Selection
  select(id: string, mode: 'single' | 'toggle' | 'range'): void
  clearSelection(): void
  getSelectedIds(): Set<string>

  // History (opt-in)
  enableHistory(maxSteps?: number): void
  undo(): T[] | null
  redo(): T[] | null
  canUndo(): boolean
  canRedo(): boolean

  // Events
  on<K extends keyof ControllerEvents<T>>(event: K, handler: ControllerEvents<T>[K]): Unsubscribe

  // Overlay
  setOverlayRenderer(render: (block: T) => HTMLElement): void

  // Tree instance (escape hatch)
  getTree(): BlockTreeInstance<T>

  // Cleanup
  destroy(): void
}

export function createBlockTreeController<T extends BaseBlock>(
  options: BlockTreeControllerOptions<T> = {}
): BlockTreeController<T> {
  const {
    initialBlocks = [],
    containerTypes = [],
    orderingStrategy,
    maxDepth,
    previewDebounce,
    canDrag,
    canDrop,
    idGenerator,
    initialExpanded,
    sensors: sensorConfig,
    onChange,
    callbacks,
  } = options

  // Core tree instance
  const stickyCollision = createStickyCollision(15)
  const tree = createBlockTree<T>({
    initialBlocks,
    containerTypes,
    orderingStrategy,
    maxDepth,
    previewDebounce,
    canDrag,
    canDrop,
    idGenerator,
    initialExpanded,
    collisionDetection: stickyCollision,
  })

  // Emitter for controller-level events
  const emitter = new EventEmitter<ControllerEvents<T>>()

  // DOM state
  let container: HTMLElement | null = null
  const draggableElements = new Map<string, HTMLElement>()
  const dropZoneElements = new Map<string, HTMLElement>()
  let snapshotRects: Map<string, Rect> | null = null

  // Selection state
  const selectedIds = new Set<string>()
  let lastSelectedId: string | null = null

  // Sensors
  const activeSensors: Sensor[] = []

  // Overlay
  const overlay = new DragOverlay()
  let overlayRenderer: ((block: T) => HTMLElement) | null = null

  // History (opt-in)
  let history: BlockHistory<T> | null = null

  // Wire core tree events to callbacks and controller emitter
  tree.on('blocks:change', (blocks) => {
    onChange?.(blocks as T[])
    if (history) {
      history.push(blocks as T[])
    }
    emitter.emit('render', blocks as T[], tree.getExpandedMap())
  })
  tree.on('expand:change', () => {
    emitter.emit('render', tree.getBlocks(), tree.getExpandedMap())
  })
  if (callbacks?.onDragStart) {
    tree.on('drag:start', (e) => callbacks.onDragStart!(e as any))
  }
  if (callbacks?.onDragEnd) {
    tree.on('drag:end', (e) => callbacks.onDragEnd!(e as any))
  }
  if (callbacks?.onBlockAdd) {
    tree.on('block:add', (e) => callbacks.onBlockAdd!(e as any))
  }
  if (callbacks?.onBlockDelete) {
    tree.on('block:delete', (e) => callbacks.onBlockDelete!(e as any))
  }
  if (callbacks?.onExpandChange) {
    tree.on('expand:change', (e) => callbacks.onExpandChange!(e as any))
  }
  if (callbacks?.onHoverChange) {
    tree.on('hover:change', (e) => callbacks.onHoverChange!(e as any))
  }

  // Sensor callbacks
  const sensorCallbacks: SensorCallbacks = {
    onDragStart(blockId: string, x: number, y: number) {
      const draggedIds = selectedIds.has(blockId) && selectedIds.size > 1
        ? [...selectedIds]
        : [blockId]

      const started = tree.startDrag(blockId, draggedIds)
      if (!started) return

      stickyCollision.reset()
      snapshotRects = measureDropZoneRects(dropZoneElements)

      // Show overlay
      const block = tree.getBlock(blockId)
      const el = draggableElements.get(blockId)
      if (block && el) {
        if (overlayRenderer) {
          overlay.show(block, el, x, y)
        } else {
          overlay.show(block, el, x, y)
        }
      }

      emitter.emit('drag:statechange', getDragState())
    },

    onDragMove(x: number, y: number) {
      if (!snapshotRects) return

      overlay.move(x, y)

      const detector = tree.getCollisionDetection()
      if (!detector) return

      const targetZone = detectCollision(detector, snapshotRects, x, y)
      if (targetZone) {
        tree.updateDrag(targetZone)
      }
    },

    onDragEnd(_x: number, _y: number) {
      const result = tree.endDrag()
      overlay.hide()
      snapshotRects = null

      if (result && callbacks?.onBlockMove) {
        // Fire block move callback
        callbacks.onBlockMove({
          block: tree.getBlock(tree.getBlocks()[0]?.id) as any,
          from: { parentId: null, index: 0 },
          to: { parentId: null, index: 0 },
          blocks: result.blocks as T[],
          movedIds: [],
        })
      }

      emitter.emit('drag:statechange', getDragState())
      emitter.emit('render', tree.getBlocks(), tree.getExpandedMap())
    },

    onDragCancel() {
      tree.cancelDrag()
      overlay.hide()
      snapshotRects = null

      emitter.emit('drag:statechange', getDragState())
      emitter.emit('render', tree.getBlocks(), tree.getExpandedMap())
    },
  }

  function getDragState(): DragState {
    return {
      isDragging: tree.getActiveId() !== null,
      activeId: tree.getActiveId(),
      hoverZone: tree.getHoverZone(),
    }
  }

  function setupSensors(): void {
    const config: VanillaSensorConfig = sensorConfig ?? {}
    if (!container) return

    if (config.pointer !== false) {
      const pointer = new PointerSensor(sensorCallbacks, {
        activationDistance: config.activationDistance,
      })
      pointer.attach(container)
      activeSensors.push(pointer)
    }

    if (config.touch !== false) {
      const touch = new TouchSensor(sensorCallbacks, {
        longPressDelay: config.longPressDelay,
        hapticFeedback: config.hapticFeedback,
      })
      touch.attach(container)
      activeSensors.push(touch)
    }

    if (config.keyboard) {
      const visibleBlocks = () => tree.getEffectiveBlocks()
      let focusedIndex = -1

      const keyboard = new KeyboardSensor({
        ...sensorCallbacks,
        onFocusPrev() {
          const blocks = visibleBlocks()
          focusedIndex = Math.max(0, focusedIndex - 1)
          const block = blocks[focusedIndex]
          if (block) focusDraggable(block.id)
        },
        onFocusNext() {
          const blocks = visibleBlocks()
          focusedIndex = Math.min(blocks.length - 1, focusedIndex + 1)
          const block = blocks[focusedIndex]
          if (block) focusDraggable(block.id)
        },
        onExpand() {
          const blocks = visibleBlocks()
          const block = blocks[focusedIndex]
          if (block && containerTypes.includes(block.type) && !tree.isExpanded(block.id)) {
            tree.toggleExpand(block.id)
          }
        },
        onCollapse() {
          const blocks = visibleBlocks()
          const block = blocks[focusedIndex]
          if (block && containerTypes.includes(block.type) && tree.isExpanded(block.id)) {
            tree.toggleExpand(block.id)
          }
        },
        onFocusFirst() {
          focusedIndex = 0
          const blocks = visibleBlocks()
          if (blocks[0]) focusDraggable(blocks[0].id)
        },
        onFocusLast() {
          const blocks = visibleBlocks()
          focusedIndex = blocks.length - 1
          if (blocks[focusedIndex]) focusDraggable(blocks[focusedIndex].id)
        },
        onToggleExpand() {
          const blocks = visibleBlocks()
          const block = blocks[focusedIndex]
          if (block && containerTypes.includes(block.type)) {
            tree.toggleExpand(block.id)
          }
        },
        onSelect() {
          const blocks = visibleBlocks()
          const block = blocks[focusedIndex]
          if (block) {
            controller.select(block.id, 'toggle')
          }
        },
      })
      keyboard.attach(container)
      activeSensors.push(keyboard)
    }
  }

  function focusDraggable(id: string): void {
    const el = draggableElements.get(id)
    if (el) el.focus()
  }

  function teardownSensors(): void {
    for (const sensor of activeSensors) {
      sensor.detach()
    }
    activeSensors.length = 0
  }

  const controller: BlockTreeController<T> = {
    mount(el: HTMLElement) {
      container = el
      setupSensors()
      // Initial render
      emitter.emit('render', tree.getBlocks(), tree.getExpandedMap())
    },

    unmount() {
      teardownSensors()
      overlay.hide()
      container = null
    },

    registerDraggable(id: string, element: HTMLElement) {
      element.setAttribute('data-draggable-id', id)
      element.setAttribute('data-block-id', id)
      draggableElements.set(id, element)
      return () => {
        draggableElements.delete(id)
      }
    },

    registerDropZone(id: string, element: HTMLElement) {
      element.setAttribute('data-zone-id', id)
      dropZoneElements.set(id, element)
      return () => {
        dropZoneElements.delete(id)
      }
    },

    getDragState,
    getBlocks: () => tree.getBlocks(),
    getEffectiveBlocks: () => tree.getEffectiveBlocks(),
    getExpandedMap: () => tree.getExpandedMap(),
    getBlock: (id) => tree.getBlock(id),

    toggleExpand(id: string) {
      tree.toggleExpand(id)
    },

    setExpandAll(expanded: boolean) {
      tree.setExpandAll(expanded)
    },

    addBlock(type, parentId = null) {
      return tree.addBlock(type, parentId)
    },

    deleteBlock(id: string) {
      tree.deleteBlock(id)
    },

    setBlocks(blocks: T[]) {
      tree.setBlocks(blocks)
    },

    select(id: string, mode: 'single' | 'toggle' | 'range') {
      if (mode === 'single') {
        selectedIds.clear()
        selectedIds.add(id)
      } else if (mode === 'toggle') {
        if (selectedIds.has(id)) {
          selectedIds.delete(id)
        } else {
          selectedIds.add(id)
        }
      } else if (mode === 'range' && lastSelectedId) {
        const blocks = tree.getBlocks()
        const startIdx = blocks.findIndex(b => b.id === lastSelectedId)
        const endIdx = blocks.findIndex(b => b.id === id)
        if (startIdx !== -1 && endIdx !== -1) {
          const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
          for (let i = from; i <= to; i++) {
            selectedIds.add(blocks[i].id)
          }
        }
      }
      lastSelectedId = id
      emitter.emit('selection:change', new Set(selectedIds))
    },

    clearSelection() {
      selectedIds.clear()
      lastSelectedId = null
      emitter.emit('selection:change', new Set())
    },

    getSelectedIds: () => new Set(selectedIds),

    enableHistory(maxSteps = 50) {
      history = createBlockHistory(tree.getBlocks(), { maxSteps })
    },

    undo() {
      if (!history) return null
      const blocks = history.undo()
      if (blocks) tree.setBlocks(blocks)
      return blocks
    },

    redo() {
      if (!history) return null
      const blocks = history.redo()
      if (blocks) tree.setBlocks(blocks)
      return blocks
    },

    canUndo: () => history?.canUndo() ?? false,
    canRedo: () => history?.canRedo() ?? false,

    on<K extends keyof ControllerEvents<T>>(event: K, handler: ControllerEvents<T>[K]): Unsubscribe {
      return emitter.on(event, handler)
    },

    setOverlayRenderer(render: (block: T) => HTMLElement) {
      overlayRenderer = render
    },

    getTree: () => tree,

    destroy() {
      teardownSensors()
      overlay.hide()
      tree.destroy()
      emitter.removeAllListeners()
      draggableElements.clear()
      dropZoneElements.clear()
      selectedIds.clear()
    },
  }

  return controller
}
