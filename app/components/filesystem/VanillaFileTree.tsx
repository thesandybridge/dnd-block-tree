'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  createBlockTreeController,
  createDefaultRenderer,
  LayoutAnimation,
  generateId,
  type BlockTreeController,
  type RenderBlockContext,
} from '@dnd-block-tree/vanilla'
import type { FileSystemBlock } from './types'
import { CONTAINER_TYPES } from './types'
import { SettingsPanel, type SettingsTab } from '../shared/SettingsPanel'
import { DragDropTab } from '../shared/settings/DragDropTab'
import { TreeTab } from '../shared/settings/TreeTab'
import { AnimationTab } from '../shared/settings/AnimationTab'
import { SensorsTab } from '../shared/settings/SensorsTab'
import { DEFAULT_SETTINGS, type BaseSettings } from '../shared/settings/types'
import { Button } from '@thesandybridge/ui/components'
import { Plus, RotateCcw, Trash2, GripHorizontal, Trees, Sparkles, Radio } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { createGripIcon, createChevronIcon, createFolderIcon, createFileIcon } from '../vanilla-icons'

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

const FILE_ICON_COLORS: Record<string, string> = {
  ts: 'text-blue-500',
  tsx: 'text-blue-500',
  js: 'text-yellow-500',
  jsx: 'text-yellow-500',
  py: 'text-green-500',
  rs: 'text-orange-500',
  png: 'text-purple-500',
  jpg: 'text-purple-500',
  svg: 'text-pink-500',
  gif: 'text-purple-500',
  md: 'text-muted-foreground',
  txt: 'text-muted-foreground',
  json: 'text-amber-500',
}

function renderBlock(block: FileSystemBlock, ctx: RenderBlockContext): HTMLElement {
  if (block.type === 'folder') return renderFolder(block, ctx)
  return renderFile(block, ctx)
}

function renderFolder(block: FileSystemBlock, ctx: RenderBlockContext): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = `selection-ring cursor-pointer rounded-lg border border-border/30 bg-card/50 w-full min-w-0 max-w-full transition-all duration-200${ctx.isDragging ? ' opacity-40 scale-[0.98]' : ''}`

  const header = document.createElement('div')
  header.className = 'flex items-center gap-2 p-2 folder-header group min-w-0 transition-colors duration-150 hover:bg-muted/40'

  header.appendChild(createGripIcon('h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle'))

  const chevronBtn = document.createElement('button')
  chevronBtn.className = 'p-0.5 shrink-0 rounded transition-colors hover:bg-muted/80 active:scale-95'
  const chevronWrap = document.createElement('div')
  chevronWrap.className = `transition-transform duration-200${ctx.isExpanded ? ' rotate-90' : ''}`
  chevronWrap.appendChild(createChevronIcon(false, 'h-3.5 w-3.5 text-muted-foreground'))
  chevronBtn.appendChild(chevronWrap)
  if (ctx.onToggleExpand) {
    chevronBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      ctx.onToggleExpand!()
    })
  }
  header.appendChild(chevronBtn)

  const folderColor = ctx.isExpanded ? 'text-primary' : 'text-primary/70'
  header.appendChild(createFolderIcon(ctx.isExpanded, `h-4 w-4 shrink-0 transition-colors duration-200 ${folderColor}`))

  const name = document.createElement('span')
  name.className = 'font-medium text-foreground text-sm flex-1 min-w-0 truncate'
  name.textContent = block.name
  header.appendChild(name)

  wrapper.appendChild(header)

  if (ctx.isExpanded && ctx.children) {
    const childrenWrap = document.createElement('div')
    childrenWrap.className = 'px-2 pb-2 folder-children w-full min-w-0 max-w-full'
    childrenWrap.appendChild(ctx.children)
    wrapper.appendChild(childrenWrap)
  }

  return wrapper
}

function renderFile(block: FileSystemBlock, ctx: RenderBlockContext): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = `selection-ring cursor-pointer flex items-center gap-2 p-2 rounded-md w-full min-w-0 max-w-full block-item group transition-all duration-150${ctx.isDragging ? ' opacity-40 scale-[0.98]' : ''}`

  wrapper.appendChild(createGripIcon('h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle'))

  const color = (block.extension && FILE_ICON_COLORS[block.extension]) || 'text-muted-foreground/70'
  wrapper.appendChild(createFileIcon(`h-4 w-4 shrink-0 transition-colors ${color}`))

  const name = document.createElement('span')
  name.className = 'flex-1 min-w-0 text-sm text-foreground truncate'
  name.textContent = block.name
  wrapper.appendChild(name)

  if (block.size) {
    const size = document.createElement('span')
    size.className = 'hidden sm:inline text-[11px] text-muted-foreground/60 tabular-nums shrink-0'
    size.textContent = block.size
    wrapper.appendChild(size)
  }

  return wrapper
}

export function VanillaFileTree() {
  const containerRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<BlockTreeController<FileSystemBlock> | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [settings, setSettings] = useState<BaseSettings>(DEFAULT_SETTINGS)
  const [settingsKey, setSettingsKey] = useState(0)
  const isMobile = useIsMobile()

  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const updateSettings = useCallback((patch: Partial<BaseSettings>) => {
    setSettings(s => {
      const next = { ...s, ...patch }
      setSettingsKey(k => k + 1)
      return next
    })
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const s = settingsRef.current
    const effectiveMaxDepth = s.maxDepth > 0 ? s.maxDepth : undefined

    const controller = createBlockTreeController<FileSystemBlock>({
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
    })

    controller.setOverlayRenderer((block: FileSystemBlock) => {
      const isFolder = block.type === 'folder'
      const el = document.createElement('div')
      el.className = 'bg-card border border-primary shadow-lg rounded-lg p-2 text-sm w-48 drag-overlay'
      const row = document.createElement('div')
      row.className = 'flex items-center gap-2'
      row.appendChild(createGripIcon('h-4 w-4 text-muted-foreground'))
      row.appendChild(isFolder
        ? createFolderIcon(false, 'h-4 w-4 text-primary')
        : createFileIcon('h-4 w-4 text-muted-foreground'))
      const name = document.createElement('span')
      name.className = 'font-medium text-foreground truncate'
      name.textContent = block.name
      row.appendChild(name)
      el.appendChild(row)
      return el
    })

    // FLIP animation
    const anim = new LayoutAnimation({ duration: 200, easing: 'ease' })
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

    // Animate after DOM rebuild
    const unsubRenderAnim = controller.on('render', () => {
      requestAnimationFrame(() => anim.animate(el))
    })

    const unsubSelection = controller.on('selection:change', (ids) => {
      const arr = Array.from(ids)
      setSelectedId(arr.length > 0 ? arr[0] : null)
    })

    // Click-to-select via event delegation
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-block-id]') as HTMLElement | null
      if (target) {
        const blockId = target.getAttribute('data-block-id')
        if (blockId) {
          e.stopPropagation()
          controller.select(blockId, 'single')
        }
      }
    }
    el.addEventListener('click', handleClick)

    controller.mount(el)
    controllerRef.current = controller

    return () => {
      el.removeEventListener('click', handleClick)
      unsubAnim()
      unsubRenderAnim()
      unsubSelection()
      renderer()
      controller.destroy()
      controllerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey])

  const addItem = useCallback((type: FileSystemBlock['type']) => {
    const controller = controllerRef.current
    if (!controller) return

    const blocks = controller.getBlocks()
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

    controller.setBlocks([...blocks, newBlock])
    controller.select(newBlock.id, 'single')
  }, [selectedId])

  const addFolder = useCallback(() => addItem('folder'), [addItem])
  const addFile = useCallback(() => addItem('file'), [addItem])

  const deleteSelected = useCallback(() => {
    const controller = controllerRef.current
    if (!selectedId || !controller) return

    const blocks = controller.getBlocks()
    const toDelete = new Set<string>()
    const stack = [selectedId]
    while (stack.length > 0) {
      const id = stack.pop()!
      toDelete.add(id)
      blocks.filter(b => b.parentId === id).forEach(b => stack.push(b.id))
    }

    controller.setBlocks(blocks.filter(b => !toDelete.has(b.id)))
    controller.clearSelection()
  }, [selectedId])

  const reset = useCallback(() => {
    controllerRef.current?.setBlocks(INITIAL_BLOCKS)
    controllerRef.current?.clearSelection()
  }, [])

  const handleClearSelection = useCallback(() => {
    controllerRef.current?.clearSelection()
  }, [])

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
