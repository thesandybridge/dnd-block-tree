'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { BlockTree, type BlockRenderers, generateId } from 'dnd-block-tree'
import type { ProductivityBlock } from './types'
import { CONTAINER_TYPES } from './types'
import { SectionBlock } from './blocks/SectionBlock'
import { TaskBlock } from './blocks/TaskBlock'
import { NoteBlock } from './blocks/NoteBlock'
import { DiffView } from '../DiffView'
import { Button } from '@thesandybridge/ui/components'
import { GripVertical, Plus, RotateCcw, Trash2, Settings, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

interface FeatureSettings {
  showDropPreview: boolean
  activationDistance: number
  lockCompletedTasks: boolean
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
  const [blocks, setBlocks] = useState<ProductivityBlock[]>(INITIAL_BLOCKS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [settings, setSettings] = useState<FeatureSettings>({
    showDropPreview: true,
    activationDistance: 8,
    lockCompletedTasks: false,
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
    setBlocks(prev =>
      prev.map(b =>
        b.id === id && b.type === 'task' ? { ...b, completed: !b.completed } : b
      )
    )
  }, [])

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

      setBlocks(prev => [...prev, newBlock])
      setSelectedId(newBlock.id)
    },
    [blocks, selectedId]
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

    setBlocks(prev => prev.filter(b => !toDelete.has(b.id)))
    setSelectedId(null)
  }, [blocks, selectedId])

  const reset = useCallback(() => {
    setBlocks(initialBlocksRef.current)
    setSelectedId(null)
  }, [])

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
            canDrag={canDrag}
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
