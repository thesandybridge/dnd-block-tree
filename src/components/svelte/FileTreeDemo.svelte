<script lang="ts">
  import { BlockTree, generateId, initFractionalOrder } from '@dnd-block-tree/svelte'
  import type { BaseBlock, AnimationConfig } from '@dnd-block-tree/svelte'
  import type { Snippet } from 'svelte'

  interface FileSystemBlock extends BaseBlock {
    type: 'folder' | 'file'
    name: string
    size?: string
    extension?: string
  }

  interface Settings {
    showDropPreview: boolean
    activationDistance: number
    previewDebounce: number
    multiSelect: boolean
    orderingStrategy: 'integer' | 'fractional'
    maxDepth: number
    initialExpanded: 'all' | 'none'
    expandDuration: number
    easing: string
  }

  const CONTAINER_TYPES = ['folder'] as const

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

  type FileCategory = 'code' | 'image' | 'text' | 'generic'
  function getFileCategory(ext?: string): FileCategory {
    if (!ext) return 'generic'
    if (['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'json'].includes(ext)) return 'code'
    if (['png', 'jpg', 'svg', 'gif'].includes(ext)) return 'image'
    if (['md', 'txt'].includes(ext)) return 'text'
    return 'generic'
  }

  function getFileColor(ext?: string): string {
    return ext ? (FILE_ICON_COLORS[ext] ?? 'text-muted-foreground/70') : 'text-muted-foreground/70'
  }

  interface Props {
    onSettingsSubscribe?: (handler: (settings: Settings) => void) => (() => void)
  }

  let { onSettingsSubscribe }: Props = $props()

  let blocks = $state<FileSystemBlock[]>([...INITIAL_BLOCKS])
  let selectedIds = $state(new Set<string>())
  let lastSelectedId = $state<string | null>(null)
  let treeKey = $state(0)

  // --- Settings state (synced from React wrapper) ---
  let settings = $state<Settings>({
    showDropPreview: true,
    activationDistance: 8,
    previewDebounce: 150,
    multiSelect: false,
    orderingStrategy: 'integer',
    maxDepth: 0,
    initialExpanded: 'all',
    expandDuration: 0,
    easing: 'ease',
  })

  let prevOrderingStrategy = $state(settings.orderingStrategy)

  $effect(() => {
    if (!onSettingsSubscribe) return
    return onSettingsSubscribe((s) => {
      settings = s
    })
  })

  // Re-key blocks when ordering strategy changes
  $effect(() => {
    if (settings.orderingStrategy !== prevOrderingStrategy) {
      prevOrderingStrategy = settings.orderingStrategy
      if (settings.orderingStrategy === 'fractional') {
        blocks = initFractionalOrder(blocks) as FileSystemBlock[]
      } else {
        blocks = blocks.map((b) => ({
          ...b,
          order: blocks.filter(s => s.parentId === b.parentId).findIndex(s => s.id === b.id),
        }))
      }
    }
  })

  // Derived settings for BlockTree
  const effectiveMaxDepth = $derived(settings.maxDepth > 0 ? settings.maxDepth : undefined)
  const animationConfig = $derived<AnimationConfig | undefined>(
    settings.expandDuration > 0
      ? { expandDuration: settings.expandDuration, easing: settings.easing }
      : undefined
  )

  function handleChange(newBlocks: FileSystemBlock[]) {
    blocks = newBlocks as FileSystemBlock[]
  }

  function addItem(type: FileSystemBlock['type']) {
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

    const newBlock: FileSystemBlock = type === 'folder'
      ? { id: generateId(), type: 'folder', name: 'New Folder', parentId, order }
      : { id: generateId(), type: 'file', name: 'new-file.txt', parentId, order, extension: 'txt', size: '0 KB' }

    blocks = [...blocks, newBlock]
    selectedIds = new Set([newBlock.id])
    lastSelectedId = newBlock.id
  }

  function deleteSelected() {
    if (selectedIds.size === 0) return
    const toDelete = new Set<string>()
    const stack = [...selectedIds]

    while (stack.length > 0) {
      const id = stack.pop()!
      toDelete.add(id)
      blocks.filter(b => b.parentId === id).forEach(b => stack.push(b.id))
    }

    blocks = blocks.filter(b => !toDelete.has(b.id))
    selectedIds = new Set()
    lastSelectedId = null
  }

  function reset() {
    blocks = [...INITIAL_BLOCKS]
    selectedIds = new Set()
    lastSelectedId = null
    treeKey++
  }

  function selectBlock(id: string) {
    if (!settings.multiSelect) {
      selectedIds = new Set([id])
    }
    lastSelectedId = id
  }

  function handleSelectionChange(ids: Set<string>) {
    selectedIds = ids
    if (ids.size === 1) {
      lastSelectedId = [...ids][0]
    } else if (ids.size === 0) {
      lastSelectedId = null
    }
  }

  function clearSelection(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-block-id]')) return
    selectedIds = new Set()
    lastSelectedId = null
  }
</script>

<div class="space-y-4 w-full max-w-full min-w-0 overflow-hidden">
  <!-- Toolbar -->
  <div class="flex flex-wrap items-center gap-2">
    <div class="flex gap-1 p-1 bg-muted rounded-lg">
      <button
        onclick={() => addItem('folder')}
        class="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-md hover:bg-background/80 transition-colors"
      >
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Folder
      </button>
      <button
        onclick={() => addItem('file')}
        class="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-md hover:bg-background/80 transition-colors"
      >
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        File
      </button>
    </div>

    <div class="flex gap-1">
      <button
        onclick={deleteSelected}
        disabled={selectedIds.size === 0}
        class="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        Delete
      </button>
      <button
        onclick={reset}
        class="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-md border border-border hover:bg-muted transition-colors"
      >
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        Reset
      </button>
    </div>
  </div>

  <!-- Tree -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div onclick={(e: MouseEvent) => clearSelection(e)} class="min-w-0 w-full max-w-full overflow-x-hidden">
    {#key treeKey}
      <BlockTree
        {blocks}
        containerTypes={CONTAINER_TYPES}
        onChange={handleChange}
        class="flex flex-col gap-1 w-full"
        dropZoneClass="h-0.5 rounded transition-all duration-150"
        dropZoneActiveClass="bg-primary h-1"
        showDropPreview={settings.showDropPreview}
        activationDistance={settings.activationDistance}
        previewDebounce={settings.previewDebounce}
        multiSelect={settings.multiSelect}
        {selectedIds}
        onSelectionChange={handleSelectionChange}
        orderingStrategy={settings.orderingStrategy}
        maxDepth={effectiveMaxDepth}
        initialExpanded={settings.initialExpanded}
        animation={animationConfig}
        {renderBlock}
        {dragOverlay}
      />
    {/key}
  </div>
</div>

{#snippet renderBlock({ block, isDragging, depth, isExpanded, isSelected, onToggleExpand, children }: { block: FileSystemBlock, isDragging: boolean, depth: number, isExpanded: boolean, isSelected: boolean, onToggleExpand: (() => void) | null, children: Snippet | null })}
  {#if block.type === 'folder'}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      onclick={() => selectBlock(block.id)}
      class="selection-ring cursor-pointer rounded-lg w-full min-w-0 max-w-full"
      class:selected={isSelected}
    >
      <div
        class="rounded-lg border border-border/30 bg-card/50 w-full min-w-0 max-w-full transition-all duration-200 {isDragging ? 'opacity-40 scale-[0.98]' : ''}"
      >
        <div class="flex items-center gap-2 p-2 folder-header group min-w-0 transition-colors duration-150 hover:bg-muted/40">
          <svg class="h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>

          {#if onToggleExpand}
            <button
              onclick={(e: MouseEvent) => { e.stopPropagation(); onToggleExpand?.() }}
              class="p-0.5 shrink-0 rounded transition-colors hover:bg-muted/80 active:scale-95"
              aria-label="Toggle expand"
            >
              <div class="transition-transform duration-200" class:rotate-90={isExpanded}>
                <svg class="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </button>
          {/if}

          {#if isExpanded}
            <svg class="h-4 w-4 shrink-0 text-primary transition-colors duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>
          {:else}
            <svg class="h-4 w-4 shrink-0 text-primary/70 transition-colors duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
          {/if}

          <span class="font-medium text-foreground text-sm flex-1 min-w-0 truncate">
            {block.name}
          </span>
        </div>

        {#if isExpanded && children}
          <div class="px-2 pb-2 folder-children w-full min-w-0 max-w-full">
            {@render children()}
          </div>
        {/if}
      </div>
    </div>

  {:else}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      onclick={() => selectBlock(block.id)}
      class="selection-ring cursor-pointer rounded-lg w-full min-w-0 max-w-full"
      class:selected={isSelected}
    >
      <div
        class="flex items-center gap-2 p-2 rounded-md w-full min-w-0 max-w-full block-item group transition-all duration-150 {isDragging ? 'opacity-40 scale-[0.98]' : ''}"
      >
        <svg class="h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>

        {#if getFileCategory(block.extension) === 'code'}
          <svg class="h-4 w-4 shrink-0 transition-colors {getFileColor(block.extension)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/></svg>
        {:else if getFileCategory(block.extension) === 'image'}
          <svg class="h-4 w-4 shrink-0 transition-colors {getFileColor(block.extension)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><circle cx="10" cy="12" r="2"/><path d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22"/></svg>
        {:else if getFileCategory(block.extension) === 'text'}
          <svg class="h-4 w-4 shrink-0 transition-colors {getFileColor(block.extension)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 13H8"/><path d="M16 17H8"/><path d="M16 13h-2"/></svg>
        {:else}
          <svg class="h-4 w-4 shrink-0 transition-colors {getFileColor(block.extension)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
        {/if}

        <span class="flex-1 min-w-0 text-sm text-foreground truncate">
          {block.name}
        </span>

        {#if block.size}
          <span class="hidden sm:inline text-[11px] text-muted-foreground/60 tabular-nums shrink-0">
            {block.size}
          </span>
        {/if}
      </div>
    </div>
  {/if}
{/snippet}

{#snippet dragOverlay(block: FileSystemBlock)}
  {@const isFolder = block.type === 'folder'}
  <div class="bg-card border border-primary shadow-lg rounded-lg p-2 text-sm w-48 drag-overlay">
    <div class="flex items-center gap-2">
      <svg class="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
      {#if isFolder}
        <svg class="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
      {:else}
        <svg class="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
      {/if}
      <span class="font-medium text-foreground truncate">{block.name}</span>
    </div>
  </div>
{/snippet}
