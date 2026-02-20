'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { BlockTree, type BlockRenderers, generateId } from 'dnd-block-tree'
import type { FileSystemBlock } from './types'
import { CONTAINER_TYPES } from './types'
import { FolderBlock } from './blocks/FolderBlock'
import { FileBlock } from './blocks/FileBlock'
import { DiffView } from '../DiffView'
import { Button } from '@/components/ui/button'
import { Folder, File, GripVertical, Plus, RotateCcw, Trash2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeatureSettings {
  showDropPreview: boolean
  activationDistance: number
}

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
        'selection-ring cursor-pointer rounded-lg',
        isSelected && 'selected'
      )}
    >
      {children}
    </div>
  )
}

export function FileTree() {
  const [blocks, setBlocks] = useState<FileSystemBlock[]>(INITIAL_BLOCKS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [settings, setSettings] = useState<FeatureSettings>({
    showDropPreview: true,
    activationDistance: 8,
  })
  const initialBlocksRef = useRef(INITIAL_BLOCKS)

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedId(null)
  }, [])

  const addItem = useCallback(
    (type: FileSystemBlock['type']) => {
      let parentId: string | null = null
      let order = 0

      if (selectedId) {
        const selected = blocks.find(b => b.id === selectedId)
        if (selected) {
          if (selected.type === 'folder') {
            parentId = selected.id
            order = blocks.filter(b => b.parentId === selected.id).length
          } else {
            parentId = selected.parentId
            const siblings = blocks.filter(b => b.parentId === selected.parentId)
            order = siblings.findIndex(b => b.id === selectedId) + 1
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
      setSelectedId(newBlock.id)
    },
    [blocks, selectedId]
  )

  const addFolder = useCallback(() => addItem('folder'), [addItem])
  const addFile = useCallback(() => addItem('file'), [addItem])

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

  const renderers: BlockRenderers<FileSystemBlock> = useMemo(
    () => ({
      folder: (props) => (
        <SelectableBlock
          id={props.block.id}
          isSelected={selectedId === props.block.id}
          onSelect={handleSelect}
        >
          <FolderBlock {...props} />
        </SelectableBlock>
      ),
      file: (props) => (
        <SelectableBlock
          id={props.block.id}
          isSelected={selectedId === props.block.id}
          onSelect={handleSelect}
        >
          <FileBlock {...props} />
        </SelectableBlock>
      ),
    }),
    [selectedId, handleSelect]
  )

  return (
    <div className="space-y-4">
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

      <div className="grid lg:grid-cols-[1fr,300px] gap-4">
        <div onClick={handleClearSelection}>
          <BlockTree
            blocks={blocks}
            renderers={renderers}
            containerTypes={CONTAINER_TYPES}
            onChange={setBlocks}
            dragOverlay={renderDragOverlay}
            className="flex flex-col gap-1"
            dropZoneClassName="h-0.5 rounded transition-all duration-150"
            dropZoneActiveClassName="bg-primary h-1"
            indentClassName="ml-4 pl-2 border-l border-border/30"
            showDropPreview={settings.showDropPreview}
            activationDistance={settings.activationDistance}
          />
        </div>

        <div className="space-y-4">
          {/* Feature Toggles */}
          <div className="rounded-xl border border-border/30 bg-card/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Settings className="h-4 w-4" />
              Feature Toggles
            </div>

            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
              <span className="text-sm">Live Drop Preview</span>
              <input
                type="checkbox"
                checked={settings.showDropPreview}
                onChange={(e) => setSettings(s => ({ ...s, showDropPreview: e.target.checked }))}
                className="w-4 h-4 accent-primary"
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
                className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>

          <DiffView blocks={blocks} getLabel={getBlockLabel} />
        </div>
      </div>
    </div>
  )
}
