import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { BlockTree, useBlockHistory, useDevToolsCallbacks, BlockTreeDevTools, type BlockRenderers, generateId, initFractionalOrder } from '@dnd-block-tree/react'
import type { ProductivityBlock } from './types'
import { CONTAINER_TYPES } from './types'
import { SectionBlock } from './blocks/SectionBlock'
import { TaskBlock } from './blocks/TaskBlock'
import { NoteBlock } from './blocks/NoteBlock'
import { SettingsPanel, type SettingsTab } from '../shared/SettingsPanel'
import { DragDropTab } from '../shared/settings/DragDropTab'
import { TreeTab } from '../shared/settings/TreeTab'
import { AnimationTab } from '../shared/settings/AnimationTab'
import { SensorsTab } from '../shared/settings/SensorsTab'
import { Toggle } from '../shared/settings/Toggle'
import { DEFAULT_PRODUCTIVITY_SETTINGS, type ProductivitySettings } from '../shared/settings/types'
import { Button } from '@thesandybridge/ui/components'
import { GripVertical, Plus, RotateCcw, Trash2, Undo2, Redo2, GripHorizontal, Trees, Sparkles, Radio } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

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

function renderDragOverlay(block: ProductivityBlock) {
  return (
    <div className="bg-card border border-primary shadow-lg rounded-lg p-3 text-sm w-64 drag-overlay">
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

function getBlockLabel(block: ProductivityBlock): string {
  return block.title
}

interface SelectableBlockProps {
  id: string
  isSelected: boolean
  onSelect: (id: string) => void
  variant: 'section' | 'item'
  children: React.ReactNode
}

function SelectableBlock({ id, isSelected, onSelect, variant, children }: SelectableBlockProps) {
  const handleClick = useCallback(
    () => {
      onSelect(id)
    },
    [id, onSelect]
  )

  return (
    <div
      onClick={handleClick}
      className={cn(
        'selection-ring cursor-pointer w-full min-w-0 max-w-full',
        isSelected && 'selected',
        variant === 'section' ? 'rounded-xl' : 'rounded-lg'
      )}
    >
      {children}
    </div>
  )
}

export function ProductivityTree() {
  const history = useBlockHistory<ProductivityBlock>(INITIAL_BLOCKS)
  const blocks = history.blocks
  const setBlocks = history.set

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [settings, setSettings] = useState<ProductivitySettings>(DEFAULT_PRODUCTIVITY_SETTINGS)
  const [treeKey, setTreeKey] = useState(0)
  const isMobile = useIsMobile()
  const initialBlocksRef = useRef(INITIAL_BLOCKS)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const { callbacks: devToolsCallbacks, events: devToolsEvents, clearEvents } = useDevToolsCallbacks<ProductivityBlock>()

  const updateSettings = useCallback((patch: Partial<ProductivitySettings>) => {
    setSettings(s => ({ ...s, ...patch }))
  }, [])

  const handleSelect = useCallback((id: string) => {
    if (!settingsRef.current.multiSelect) {
      setSelectedIds(new Set([id]))
    }
    setLastSelectedId(id)
  }, [])

  const handleSelectionChange = useCallback((ids: Set<string>) => {
    setSelectedIds(ids)
    if (ids.size === 1) {
      setLastSelectedId([...ids][0])
    } else if (ids.size === 0) {
      setLastSelectedId(null)
    }
  }, [])

  const handleClearSelection = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-block-id]')) return
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [])

  const toggleTask = useCallback((id: string) => {
    setBlocks(
      blocks.map(b =>
        b.id === id && b.type === 'task' ? { ...b, completed: !b.completed } : b
      )
    )
  }, [blocks, setBlocks])

  const addItem = useCallback(
    (type: ProductivityBlock['type']) => {
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

      setBlocks([...blocks, newBlock])
      setSelectedIds(new Set([newBlock.id]))
      setLastSelectedId(newBlock.id)
    },
    [blocks, lastSelectedId, setBlocks]
  )

  const addSection = useCallback(() => addItem('section'), [addItem])
  const addTask = useCallback(() => addItem('task'), [addItem])
  const addNote = useCallback(() => addItem('note'), [addItem])

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return

    const toDelete = new Set<string>()
    const stack = [...selectedIds]

    while (stack.length > 0) {
      const id = stack.pop()!
      toDelete.add(id)
      blocks.filter(b => b.parentId === id).forEach(b => stack.push(b.id))
    }

    setBlocks(blocks.filter(b => !toDelete.has(b.id)))
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [blocks, selectedIds, setBlocks])

  const reset = useCallback(() => {
    setBlocks(initialBlocksRef.current)
    setSelectedIds(new Set())
    setLastSelectedId(null)
    setTreeKey(k => k + 1)
  }, [setBlocks])

  // Re-key blocks when switching ordering strategy
  useEffect(() => {
    if (settings.orderingStrategy === 'fractional') {
      setBlocks(initFractionalOrder(blocks))
    } else {
      setBlocks(blocks.map((b, _, arr) => ({
        ...b,
        order: arr.filter(s => s.parentId === b.parentId).findIndex(s => s.id === b.id),
      })))
    }
  // Only run when ordering strategy changes, not on every block update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.orderingStrategy])

  // Use ref-based canDrag to avoid stale closures
  const canDrag = useCallback((block: ProductivityBlock) => {
    if (settingsRef.current.lockCompletedTasks && block.type === 'task' && block.completed) {
      return false
    }
    return true
  }, [])

  const renderers: BlockRenderers<ProductivityBlock> = useMemo(
    () => ({
      section: (props) => (
        <SelectableBlock
          id={props.block.id}
          isSelected={selectedIds.has(props.block.id)}
          onSelect={handleSelect}
          variant="section"
        >
          <SectionBlock {...props} />
        </SelectableBlock>
      ),
      task: (props) => (
        <SelectableBlock
          id={props.block.id}
          isSelected={selectedIds.has(props.block.id)}
          onSelect={handleSelect}
          variant="item"
        >
          <TaskBlock {...props} onToggle={() => toggleTask(props.block.id)} />
        </SelectableBlock>
      ),
      note: (props) => (
        <SelectableBlock
          id={props.block.id}
          isSelected={selectedIds.has(props.block.id)}
          onSelect={handleSelect}
          variant="item"
        >
          <NoteBlock {...props} />
        </SelectableBlock>
      ),
    }),
    [selectedIds, handleSelect, toggleTask]
  )

  // maxDepth 0 means unlimited
  const effectiveMaxDepth = settings.maxDepth > 0 ? settings.maxDepth : undefined

  const animationConfig = useMemo(() => (
    settings.expandDuration > 0
      ? { expandDuration: settings.expandDuration, easing: settings.easing }
      : undefined
  ), [settings.expandDuration, settings.easing])

  const sensorConfig = useMemo(() => ({
    longPressDelay: settings.longPressDelay,
    tolerance: settings.tolerance,
    hapticFeedback: settings.hapticFeedback,
  }), [settings.longPressDelay, settings.tolerance, settings.hapticFeedback])

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
      <BlockTreeDevTools
        blocks={blocks}
        containerTypes={CONTAINER_TYPES}
        events={devToolsEvents}
        onClearEvents={clearEvents}
        getLabel={getBlockLabel}
        forceMount
      />
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
            onClick={history.undo}
            disabled={!history.canUndo}
            className="gap-1"
          >
            <Undo2 className="h-3 w-3" />
            Undo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={history.redo}
            disabled={!history.canRedo}
            className="gap-1"
          >
            <Redo2 className="h-3 w-3" />
            Redo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr),300px] gap-4 w-full min-w-0">
        <div onClick={handleClearSelection} className="min-w-0 w-full max-w-full overflow-x-hidden">
          <BlockTree
            key={treeKey}
            blocks={blocks}
            renderers={renderers}
            containerTypes={CONTAINER_TYPES}
            onChange={setBlocks}
            dragOverlay={renderDragOverlay}
            className="flex flex-col gap-1 w-full"
            dropZoneClassName="h-0.5 rounded transition-all duration-150"
            dropZoneActiveClassName="bg-primary h-1"
            indentClassName="tree-indent-compact"
            showDropPreview={settings.showDropPreview}
            activationDistance={settings.activationDistance}
            previewDebounce={settings.previewDebounce}
            orderingStrategy={settings.orderingStrategy}
            canDrag={canDrag}
            maxDepth={effectiveMaxDepth}
            keyboardNavigation={settings.keyboardNavigation}
            multiSelect={settings.multiSelect}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
            initialExpanded={settings.initialExpanded}
            animation={animationConfig}
            sensors={sensorConfig}
            onDragStart={devToolsCallbacks.onDragStart}
            onDragEnd={devToolsCallbacks.onDragEnd}
            onBlockMove={devToolsCallbacks.onBlockMove}
            onExpandChange={devToolsCallbacks.onExpandChange}
            onHoverChange={devToolsCallbacks.onHoverChange}
          />
        </div>

        <div className="space-y-4">
          <SettingsPanel tabs={settingsTabs} />
        </div>
      </div>
    </div>
  )
}
