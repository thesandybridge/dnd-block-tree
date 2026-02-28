import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { BlockTree, useDevToolsCallbacks, BlockTreeDevTools, type BlockRenderers, generateId, initFractionalOrder } from '@dnd-block-tree/react'
import type { FileSystemBlock } from './types'
import { CONTAINER_TYPES } from './types'
import { FolderBlock } from './blocks/FolderBlock'
import { FileBlock } from './blocks/FileBlock'
import { SettingsPanel, type SettingsTab } from '../shared/SettingsPanel'
import { DragDropTab } from '../shared/settings/DragDropTab'
import { TreeTab } from '../shared/settings/TreeTab'
import { AnimationTab } from '../shared/settings/AnimationTab'
import { SensorsTab } from '../shared/settings/SensorsTab'
import { DEFAULT_SETTINGS, type BaseSettings } from '../shared/settings/types'
import { Button } from '@thesandybridge/ui/components'
import { Folder, File, GripVertical, Plus, RotateCcw, Trash2, GripHorizontal, Trees, Sparkles, Radio } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

const INITIAL_BLOCKS: FileSystemBlock[] = [
  { id: '1', type: 'folder', name: 'src', parentId: null, order: 0 },
  { id: '2', type: 'folder', name: 'components', parentId: '1', order: 0 },
  { id: '3', type: 'file', name: 'Button.tsx', parentId: '2', order: 0, extension: 'tsx', size: '2.4 KB' },
  { id: '4', type: 'file', name: 'Card.tsx', parentId: '2', order: 1, extension: 'tsx', size: '1.8 KB' },
  { id: '5', type: 'file', name: 'Input.tsx', parentId: '2', order: 2, extension: 'tsx', size: '3.2 KB' },
  { id: '6', type: 'folder', name: 'utils', parentId: '1', order: 1 },
  { id: '7', type: 'file', name: 'helpers.ts', parentId: '6', order: 0, extension: 'ts', size: '1.1 KB' },
  { id: '8', type: 'file', name: 'constants.ts', parentId: '6', order: 1, extension: 'ts', size: '0.5 KB' },
  { id: '9', type: 'file', name: 'index.ts', parentId: '1', order: 2, extension: 'ts', size: '0.3 KB' },
  { id: '10', type: 'file', name: 'App.tsx', parentId: '1', order: 3, extension: 'tsx', size: '4.2 KB' },
  { id: '11', type: 'folder', name: 'public', parentId: null, order: 1 },
  { id: '12', type: 'file', name: 'logo.svg', parentId: '11', order: 0, extension: 'svg', size: '2.1 KB' },
  { id: '13', type: 'file', name: 'favicon.png', parentId: '11', order: 1, extension: 'png', size: '4.5 KB' },
  { id: '14', type: 'file', name: 'README.md', parentId: null, order: 2, extension: 'md', size: '3.2 KB' },
  { id: '15', type: 'file', name: 'package.json', parentId: null, order: 3, size: '1.8 KB' },
]

const BLOCK_DEFAULTS = {
  folder: { name: 'New Folder' },
  file: { name: 'new-file.txt', extension: 'txt', size: '0 KB' },
} as const

function renderDragOverlay(block: FileSystemBlock) {
  const isFolder = block.type === 'folder'
  const Icon = isFolder ? Folder : File

  return (
    <div className="bg-card border border-primary shadow-lg rounded-lg p-2 text-sm w-48 drag-overlay">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <Icon className={cn('h-4 w-4', isFolder ? 'text-primary' : 'text-muted-foreground')} />
        <span className="font-medium text-foreground truncate">{block.name}</span>
      </div>
    </div>
  )
}

function getBlockLabel(block: FileSystemBlock): string {
  return block.name
}

interface SelectableBlockProps {
  id: string
  isSelected: boolean
  onSelect: (id: string) => void
  children: React.ReactNode
}

function SelectableBlock({ id, isSelected, onSelect, children }: SelectableBlockProps) {
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
        'selection-ring cursor-pointer rounded-lg w-full min-w-0 max-w-full',
        isSelected && 'selected'
      )}
    >
      {children}
    </div>
  )
}

export function FileTree() {
  const [blocks, setBlocks] = useState<FileSystemBlock[]>(INITIAL_BLOCKS)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [settings, setSettings] = useState<BaseSettings>(DEFAULT_SETTINGS)
  const [treeKey, setTreeKey] = useState(0)
  const isMobile = useIsMobile()
  const initialBlocksRef = useRef(INITIAL_BLOCKS)

  const { callbacks: devToolsCallbacks, events: devToolsEvents, clearEvents } = useDevToolsCallbacks<FileSystemBlock>()

  const updateSettings = useCallback((patch: Partial<BaseSettings>) => {
    setSettings(s => ({ ...s, ...patch }))
  }, [])

  const settingsRef = useRef(settings)
  settingsRef.current = settings

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

  const addItem = useCallback(
    (type: FileSystemBlock['type']) => {
      let parentId: string | null = null
      let order = 0

      if (lastSelectedId) {
        const selected = blocks.find(b => b.id === lastSelectedId)
        if (selected) {
          if (selected.type === 'folder') {
            parentId = selected.id
            order = blocks.filter(b => b.parentId === selected.id).length
          } else {
            parentId = selected.parentId
            const siblings = blocks.filter(b => b.parentId === selected.parentId)
            order = siblings.findIndex(b => b.id === lastSelectedId) + 1
          }
        }
      } else {
        parentId = null
        order = blocks.filter(b => b.parentId === null).length
      }

      const newBlock: FileSystemBlock = {
        id: generateId(),
        type,
        parentId,
        order,
        ...BLOCK_DEFAULTS[type],
      } as FileSystemBlock

      setBlocks(prev => [...prev, newBlock])
      setSelectedIds(new Set([newBlock.id]))
      setLastSelectedId(newBlock.id)
    },
    [blocks, lastSelectedId]
  )

  const addFolder = useCallback(() => addItem('folder'), [addItem])
  const addFile = useCallback(() => addItem('file'), [addItem])

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return

    const toDelete = new Set<string>()
    const stack = [...selectedIds]

    while (stack.length > 0) {
      const id = stack.pop()!
      toDelete.add(id)
      blocks.filter(b => b.parentId === id).forEach(b => stack.push(b.id))
    }

    setBlocks(prev => prev.filter(b => !toDelete.has(b.id)))
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [blocks, selectedIds])

  const reset = useCallback(() => {
    setBlocks(initialBlocksRef.current)
    setSelectedIds(new Set())
    setLastSelectedId(null)
    setTreeKey(k => k + 1)
  }, [])

  // Re-key blocks when switching ordering strategy
  useEffect(() => {
    if (settings.orderingStrategy === 'fractional') {
      setBlocks(prev => initFractionalOrder(prev))
    } else {
      setBlocks(prev => prev.map((b, _, arr) => ({
        ...b,
        order: arr.filter(s => s.parentId === b.parentId).findIndex(s => s.id === b.id),
      })))
    }
  }, [settings.orderingStrategy])

  const renderers: BlockRenderers<FileSystemBlock> = useMemo(
    () => ({
      folder: (props) => (
        <SelectableBlock
          id={props.block.id}
          isSelected={selectedIds.has(props.block.id)}
          onSelect={handleSelect}
        >
          <FolderBlock {...props} />
        </SelectableBlock>
      ),
      file: (props) => (
        <SelectableBlock
          id={props.block.id}
          isSelected={selectedIds.has(props.block.id)}
          onSelect={handleSelect}
        >
          <FileBlock {...props} />
        </SelectableBlock>
      ),
    }),
    [selectedIds, handleSelect]
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
      content: <DragDropTab settings={settings} onChange={updateSettings} />,
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
          <Button variant="ghost" size="sm" onClick={addFolder} className="gap-1">
            <Plus className="h-3 w-3" />
            Folder
          </Button>
          <Button variant="ghost" size="sm" onClick={addFile} className="gap-1">
            <Plus className="h-3 w-3" />
            File
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
