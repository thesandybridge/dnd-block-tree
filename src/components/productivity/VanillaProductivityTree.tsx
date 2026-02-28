import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  createBlockTreeController,
  createDefaultRenderer,
  LayoutAnimation,
  generateId,
  type BlockTreeController,
  type RenderBlockContext,
} from '@dnd-block-tree/vanilla'
import type { ProductivityBlock } from './types'
import { CONTAINER_TYPES } from './types'
import { SettingsPanel, type SettingsTab } from '../shared/SettingsPanel'
import { DragDropTab } from '../shared/settings/DragDropTab'
import { TreeTab } from '../shared/settings/TreeTab'
import { AnimationTab } from '../shared/settings/AnimationTab'
import { SensorsTab } from '../shared/settings/SensorsTab'
import { Toggle } from '../shared/settings/Toggle'
import { DEFAULT_PRODUCTIVITY_SETTINGS, type ProductivitySettings } from '../shared/settings/types'
import { Button } from '@thesandybridge/ui/components'
import { Plus, RotateCcw, Trash2, Undo2, Redo2, GripHorizontal, Trees, Sparkles, Radio } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { createGripIcon, createChevronIcon, createCheckIcon, createStickyNoteIcon } from '../vanilla-icons'

const INITIAL_BLOCKS: ProductivityBlock[] = [
  { id: '1', type: 'section', title: 'Project Planning', parentId: null, order: 0 },
  { id: '2', type: 'task', title: 'Define project scope', parentId: '1', order: 0, completed: true },
  { id: '3', type: 'task', title: 'Create timeline', parentId: '1', order: 1, dueDate: 'Tomorrow' },
  { id: '4', type: 'note', title: 'Remember to include buffer time for unexpected delays', parentId: '1', order: 2 },
  { id: '5', type: 'section', title: 'Development', parentId: null, order: 1 },
  { id: '6', type: 'task', title: 'Set up development environment', parentId: '5', order: 0, completed: true },
  { id: '7', type: 'task', title: 'Implement core features', parentId: '5', order: 1, dueDate: 'Next Week' },
  { id: '8', type: 'task', title: 'Write unit tests', parentId: '5', order: 2 },
  { id: '9', type: 'section', title: 'Documentation', parentId: null, order: 2 },
  { id: '10', type: 'task', title: 'Write API documentation', parentId: '9', order: 0 },
  { id: '11', type: 'note', title: 'Use OpenAPI spec format', parentId: '9', order: 1 },
]

const BLOCK_TITLES: Record<ProductivityBlock['type'], string> = {
  section: 'New Section',
  task: 'New Task',
  note: 'New Note',
}

function renderBlock(block: ProductivityBlock, ctx: RenderBlockContext): HTMLElement {
  if (block.type === 'section') return renderSection(block, ctx)
  if (block.type === 'task') return renderTask(block, ctx)
  return renderNote(block, ctx)
}

function renderSection(block: ProductivityBlock, ctx: RenderBlockContext): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = `selection-ring cursor-pointer rounded-xl border border-border/50 bg-card w-full min-w-0 max-w-full transition-all duration-200${ctx.isDragging ? ' opacity-40 scale-[0.98]' : ''}`

  const header = document.createElement('div')
  header.className = 'flex items-center gap-2 p-2 folder-header group min-w-0'

  const grip = createGripIcon('h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle')
  header.appendChild(grip)

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
  title.className = 'font-semibold text-foreground flex-1 min-w-0 truncate'
  title.textContent = block.title
  header.appendChild(title)

  const badge = document.createElement('span')
  badge.className = 'hidden sm:inline text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium shrink-0'
  badge.textContent = 'Section'
  header.appendChild(badge)

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
  wrapper.className = `selection-ring cursor-pointer flex items-center gap-2 p-2 rounded-lg border border-border/30 bg-card/50 block-item group w-full min-w-0 max-w-full${ctx.isDragging ? ' opacity-40 scale-[0.98]' : ''}`

  const grip = createGripIcon('h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle')
  wrapper.appendChild(grip)

  const checkBtn = document.createElement('button')
  checkBtn.className = `h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
    block.completed
      ? 'bg-primary border-primary checkbox-complete'
      : 'border-muted-foreground/40 hover:border-primary hover:scale-110'
  }`
  if (block.completed) {
    checkBtn.appendChild(createCheckIcon('h-3 w-3 text-primary-foreground'))
  }
  // Toggle completed is handled via controller event — we store a data attr and
  // dispatch a custom event the wrapper picks up
  checkBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    wrapper.dispatchEvent(new CustomEvent('toggle-task', { bubbles: true, detail: { id: block.id } }))
  })
  wrapper.appendChild(checkBtn)

  const title = document.createElement('span')
  title.className = `flex-1 min-w-0 truncate transition-all duration-200${block.completed ? ' line-through text-muted-foreground/60' : ''}`
  title.textContent = block.title
  wrapper.appendChild(title)

  if (block.dueDate) {
    const due = document.createElement('span')
    due.className = 'hidden sm:inline-block text-xs px-2.5 py-1 rounded-full shrink-0 bg-muted/80 text-muted-foreground transition-colors duration-150'
    due.textContent = block.dueDate
    wrapper.appendChild(due)
  }

  const badge = document.createElement('span')
  badge.className = 'hidden xs:inline text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity'
  badge.textContent = 'Task'
  wrapper.appendChild(badge)

  return wrapper
}

function renderNote(block: ProductivityBlock, ctx: RenderBlockContext): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = `selection-ring cursor-pointer flex items-start gap-2 p-2 rounded-lg border border-border/30 bg-card/50 block-item group w-full min-w-0 max-w-full${ctx.isDragging ? ' opacity-40 scale-[0.98]' : ''}`

  const grip = createGripIcon('h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle mt-0.5')
  wrapper.appendChild(grip)

  const icon = createStickyNoteIcon('h-4 w-4 shrink-0 text-primary/80 mt-0.5 transition-colors group-hover:text-primary')
  wrapper.appendChild(icon)

  const text = document.createElement('span')
  text.className = 'flex-1 min-w-0 text-sm text-muted-foreground leading-relaxed break-words'
  text.textContent = block.title
  wrapper.appendChild(text)

  const badge = document.createElement('span')
  badge.className = 'hidden xs:inline text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity'
  badge.textContent = 'Note'
  wrapper.appendChild(badge)

  return wrapper
}

export function VanillaProductivityTree() {
  const containerRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<BlockTreeController<ProductivityBlock> | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [blockCount, setBlockCount] = useState(INITIAL_BLOCKS.length)
  const [settings, setSettings] = useState<ProductivitySettings>(DEFAULT_PRODUCTIVITY_SETTINGS)
  const [settingsKey, setSettingsKey] = useState(0)
  const isMobile = useIsMobile()

  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const updateSettings = useCallback((patch: Partial<ProductivitySettings>) => {
    setSettings(s => {
      const next = { ...s, ...patch }
      // Changing any setting that affects the controller requires remount
      setSettingsKey(k => k + 1)
      return next
    })
  }, [])

  // Setup and teardown controller
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const s = settingsRef.current
    const effectiveMaxDepth = s.maxDepth > 0 ? s.maxDepth : undefined

    const controller = createBlockTreeController<ProductivityBlock>({
      initialBlocks: INITIAL_BLOCKS,
      containerTypes: [...CONTAINER_TYPES],
      orderingStrategy: s.orderingStrategy,
      maxDepth: effectiveMaxDepth,
      previewDebounce: s.previewDebounce,
      initialExpanded: s.initialExpanded,
      sensors: {
        activationDistance: s.activationDistance,
        keyboard: s.keyboardNavigation,
      },
      canDrag: (block) => {
        if (settingsRef.current.lockCompletedTasks && block.type === 'task' && block.completed) {
          return false
        }
        return true
      },
    })

    controller.enableHistory(50)

    controller.setOverlayRenderer((block: ProductivityBlock) => {
      const el = document.createElement('div')
      el.className = 'bg-card border border-primary shadow-lg rounded-lg p-3 text-sm w-64 drag-overlay'
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

    // FLIP animation — snapshot before render, animate after
    const anim = new LayoutAnimation({ duration: 200, easing: 'ease' })

    // Subscribe BEFORE renderer so snapshot captures pre-render positions
    const unsubAnim = controller.on('render', () => {
      anim.snapshot(el)
    })

    const renderer = createDefaultRenderer(controller, {
      container: el,
      containerTypes: [...CONTAINER_TYPES],
      renderBlock,
      dropZoneClassName: 'h-0.5 rounded transition-all duration-150',
      dropZoneActiveClassName: 'bg-primary h-1',
      rootClassName: 'flex flex-col gap-1',
      indentClassName: 'tree-indent-compact',
    })

    // Sync state back to React + trigger animation after DOM rebuild
    const unsubRender = controller.on('render', (blocks) => {
      setCanUndo(controller.canUndo())
      setCanRedo(controller.canRedo())
      setBlockCount(blocks.length)
      anim.animate(el)
    })

    const unsubSelection = controller.on('selection:change', (ids) => {
      setSelectedIds(new Set(ids))
      if (ids.size === 1) {
        setLastSelectedId([...ids][0])
      } else if (ids.size === 0) {
        setLastSelectedId(null)
      }
    })

    // Listen for task toggle custom events
    const handleToggle = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.id) {
        const blocks = controller.getBlocks()
        const updated = blocks.map(b =>
          b.id === detail.id && b.type === 'task' ? { ...b, completed: !b.completed } : b
        )
        controller.setBlocks(updated)
      }
    }
    el.addEventListener('toggle-task', handleToggle)

    // Click-to-select via event delegation
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-block-id]') as HTMLElement | null
      if (target) {
        const blockId = target.getAttribute('data-block-id')
        if (blockId) {
          const mode = (e.metaKey || e.ctrlKey) ? 'toggle' : 'single'
          controller.select(blockId, mode)
        }
      }
    }
    el.addEventListener('click', handleClick)

    controller.mount(el)
    controllerRef.current = controller

    return () => {
      el.removeEventListener('click', handleClick)
      el.removeEventListener('toggle-task', handleToggle)
      unsubAnim()
      unsubRender()
      unsubSelection()
      renderer()
      controller.destroy()
      controllerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey])

  const handleUndo = useCallback(() => {
    controllerRef.current?.undo()
  }, [])

  const handleRedo = useCallback(() => {
    controllerRef.current?.redo()
  }, [])

  const addItem = useCallback((type: ProductivityBlock['type']) => {
    const controller = controllerRef.current
    if (!controller) return

    const blocks = controller.getBlocks()
    let parentId: string | null = null
    let order = 0

    if (lastSelectedId) {
      const selected = blocks.find(b => b.id === lastSelectedId)
      if (selected) {
        if (type === 'section') {
          parentId = null
          order = blocks.filter(b => b.parentId === null).length
        } else if (selected.type === 'section') {
          parentId = selected.id
          order = blocks.filter(b => b.parentId === selected.id).length
        } else {
          parentId = selected.parentId
          const siblings = blocks.filter(b => b.parentId === selected.parentId)
          order = siblings.findIndex(b => b.id === lastSelectedId) + 1
        }
      }
    } else {
      if (type === 'section') {
        parentId = null
        order = blocks.filter(b => b.parentId === null).length
      } else {
        const firstSection = blocks.find(b => b.type === 'section')
        parentId = firstSection?.id ?? null
        order = parentId ? blocks.filter(b => b.parentId === parentId).length : 0
      }
    }

    const newBlock: ProductivityBlock = {
      id: generateId(),
      type,
      title: BLOCK_TITLES[type],
      parentId,
      order,
      ...(type === 'task' ? { completed: false } : {}),
    }

    controller.setBlocks([...blocks, newBlock])
    controller.select(newBlock.id, 'single')
  }, [lastSelectedId])

  const addSection = useCallback(() => addItem('section'), [addItem])
  const addTask = useCallback(() => addItem('task'), [addItem])
  const addNote = useCallback(() => addItem('note'), [addItem])

  const deleteSelected = useCallback(() => {
    const controller = controllerRef.current
    if (selectedIds.size === 0 || !controller) return

    const blocks = controller.getBlocks()
    const toDelete = new Set<string>()
    const stack = [...selectedIds]
    while (stack.length > 0) {
      const id = stack.pop()!
      toDelete.add(id)
      blocks.filter(b => b.parentId === id).forEach(b => stack.push(b.id))
    }

    controller.setBlocks(blocks.filter(b => !toDelete.has(b.id)))
    controller.clearSelection()
  }, [selectedIds])

  const reset = useCallback(() => {
    controllerRef.current?.setBlocks(INITIAL_BLOCKS)
    controllerRef.current?.clearSelection()
  }, [])

  const handleClearSelection = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-block-id]')) return
    controllerRef.current?.clearSelection()
  }, [])

  const settingsTabs: SettingsTab[] = useMemo(() => [
    {
      id: 'dragdrop',
      label: 'Drag & Drop',
      icon: GripHorizontal,
      content: (
        <DragDropTab
          settings={settings}
          onChange={updateSettings}
          extra={
            <Toggle
              label="Lock Completed Tasks"
              checked={settings.lockCompletedTasks}
              onChange={(v) => updateSettings({ lockCompletedTasks: v })}
            />
          }
        />
      ),
    },
    {
      id: 'tree',
      label: 'Tree',
      icon: Trees,
      content: <TreeTab settings={settings} onChange={updateSettings} />,
    },
    {
      id: 'animation',
      label: 'Animation',
      icon: Sparkles,
      content: <AnimationTab settings={settings} onChange={updateSettings} />,
    },
    ...(isMobile ? [{
      id: 'sensors' as const,
      label: 'Sensors',
      icon: Radio,
      content: <SensorsTab settings={settings} onChange={updateSettings} />,
    }] : []),
  ], [settings, updateSettings, isMobile])

  return (
    <div className="space-y-4 w-full max-w-full min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <Button variant="ghost" size="sm" onClick={addSection} className="gap-1">
            <Plus className="h-3 w-3" />
            Section
          </Button>
          <Button variant="ghost" size="sm" onClick={addTask} className="gap-1">
            <Plus className="h-3 w-3" />
            Task
          </Button>
          <Button variant="ghost" size="sm" onClick={addNote} className="gap-1">
            <Plus className="h-3 w-3" />
            Note
          </Button>
        </div>

        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={deleteSelected}
            disabled={selectedIds.size === 0}
            className="gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
          <Button variant="outline" size="sm" onClick={reset} className="gap-1">
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>

        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo}
            className="gap-1"
          >
            <Undo2 className="h-3 w-3" />
            Undo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo}
            className="gap-1"
          >
            <Redo2 className="h-3 w-3" />
            Redo
          </Button>
        </div>

        <span className="text-xs text-muted-foreground ml-auto">{blockCount} blocks</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr),300px] gap-4 w-full min-w-0">
        <div onClick={handleClearSelection} className="min-w-0 w-full max-w-full overflow-x-hidden">
          <div
            ref={containerRef}
            className="flex flex-col gap-1 w-full"
          />
        </div>

        <div className="space-y-4">
          <SettingsPanel tabs={settingsTabs} />
        </div>
      </div>
    </div>
  )
}
