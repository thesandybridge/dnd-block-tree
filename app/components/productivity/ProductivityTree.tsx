'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { BlockTree, useBlockHistory, type BlockRenderers, type OrderingStrategy, generateId, initFractionalOrder } from 'dnd-block-tree'
import type { ProductivityBlock } from './types'
import { CONTAINER_TYPES } from './types'
import { SectionBlock } from './blocks/SectionBlock'
import { TaskBlock } from './blocks/TaskBlock'
import { NoteBlock } from './blocks/NoteBlock'
import { DiffView } from '../DiffView'
import { Button } from '@thesandybridge/ui/components'
import { GripVertical, Plus, RotateCcw, Trash2, Settings, ChevronDown, Undo2, Redo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

interface FeatureSettings {
  showDropPreview: boolean
  activationDistance: number
  lockCompletedTasks: boolean
  orderingStrategy: OrderingStrategy
  maxDepth: number
  keyboardNavigation: boolean
}

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
    (e: React.MouseEvent) => {
      e.stopPropagation()
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

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [settings, setSettings] = useState<FeatureSettings>({
    showDropPreview: true,
    activationDistance: 8,
    lockCompletedTasks: false,
    orderingStrategy: 'integer',
    maxDepth: 0,
    keyboardNavigation: false,
  })
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const isMobile = useIsMobile()
  const initialBlocksRef = useRef(INITIAL_BLOCKS)
  // Use ref to avoid stale closures in callbacks
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedId(null)
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

      if (selectedId) {
        const selected = blocks.find(b => b.id === selectedId)
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
            order = siblings.findIndex(b => b.id === selectedId) + 1
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
      setSelectedId(newBlock.id)
    },
    [blocks, selectedId, setBlocks]
  )

  const addSection = useCallback(() => addItem('section'), [addItem])
  const addTask = useCallback(() => addItem('task'), [addItem])
  const addNote = useCallback(() => addItem('note'), [addItem])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return

    const toDelete = new Set<string>()
    const stack = [selectedId]

    while (stack.length > 0) {
      const id = stack.pop()!
      toDelete.add(id)
      blocks.filter(b => b.parentId === id).forEach(b => stack.push(b.id))
    }

    setBlocks(blocks.filter(b => !toDelete.has(b.id)))
    setSelectedId(null)
  }, [blocks, selectedId, setBlocks])

  const reset = useCallback(() => {
    setBlocks(initialBlocksRef.current)
    setSelectedId(null)
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
          isSelected={selectedId === props.block.id}
          onSelect={handleSelect}
          variant="section"
        >
          <SectionBlock {...props} />
        </SelectableBlock>
      ),
      task: (props) => (
        <SelectableBlock
          id={props.block.id}
          isSelected={selectedId === props.block.id}
          onSelect={handleSelect}
          variant="item"
        >
          <TaskBlock {...props} onToggle={() => toggleTask(props.block.id)} />
        </SelectableBlock>
      ),
      note: (props) => (
        <SelectableBlock
          id={props.block.id}
          isSelected={selectedId === props.block.id}
          onSelect={handleSelect}
          variant="item"
        >
          <NoteBlock {...props} />
        </SelectableBlock>
      ),
    }),
    [selectedId, handleSelect, toggleTask]
  )

  // maxDepth 0 means unlimited
  const effectiveMaxDepth = settings.maxDepth > 0 ? settings.maxDepth : undefined

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
            disabled={!selectedId}
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
            orderingStrategy={settings.orderingStrategy}
            canDrag={canDrag}
            maxDepth={effectiveMaxDepth}
            keyboardNavigation={settings.keyboardNavigation}
          />
        </div>

        <div className="space-y-4">
          {/* Feature Toggles */}
          <div className="rounded-xl border border-border/30 bg-card/30 overflow-hidden">
            <button
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className={cn(
                "flex items-center justify-between w-full p-4 text-left",
                "lg:cursor-default",
                isMobile && "hover:bg-muted/30"
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Settings className="h-4 w-4" />
                Feature Toggles
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform lg:hidden",
                settingsExpanded && "rotate-180"
              )} />
            </button>

            <div className={cn(
              "px-4 pb-4 space-y-3",
              isMobile && !settingsExpanded && "hidden",
              "lg:block"
            )}>
              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                <span className="text-sm">Live Drop Preview</span>
                <input
                  type="checkbox"
                  checked={settings.showDropPreview}
                  onChange={(e) => setSettings(s => ({ ...s, showDropPreview: e.target.checked }))}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                <span className="text-sm">Lock Completed Tasks</span>
                <input
                  type="checkbox"
                  checked={settings.lockCompletedTasks}
                  onChange={(e) => setSettings(s => ({ ...s, lockCompletedTasks: e.target.checked }))}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                <span className="text-sm">Keyboard Navigation</span>
                <input
                  type="checkbox"
                  checked={settings.keyboardNavigation}
                  onChange={(e) => setSettings(s => ({ ...s, keyboardNavigation: e.target.checked }))}
                  className="w-5 h-5"
                />
              </label>

              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Ordering Strategy</span>
                  <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {settings.orderingStrategy}
                  </span>
                </div>
                <div className="flex rounded-lg overflow-hidden border border-border/50">
                  {(['integer', 'fractional'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSettings(prev => ({ ...prev, orderingStrategy: s }))}
                      className={cn(
                        'flex-1 py-1.5 text-xs font-medium transition-colors',
                        settings.orderingStrategy === s
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {settings.orderingStrategy === 'integer'
                    ? 'All siblings reindexed 0, 1, 2… on every move.'
                    : 'Only moved block gets a new fractional key. Watch order values in the diff view.'}
                </p>
              </div>

              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Max Depth</span>
                  <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {settings.maxDepth === 0 ? 'unlimited' : settings.maxDepth}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  value={settings.maxDepth}
                  onChange={(e) => setSettings(s => ({ ...s, maxDepth: Number(e.target.value) }))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  0 = unlimited. 1 = flat list. 2 = one level of nesting.
                </p>
              </div>

              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Activation Distance</span>
                  <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {settings.activationDistance}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={settings.activationDistance}
                  onChange={(e) => setSettings(s => ({ ...s, activationDistance: Number(e.target.value) }))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <DiffView blocks={blocks} getLabel={getBlockLabel} />
        </div>
      </div>
    </div>
  )
}
