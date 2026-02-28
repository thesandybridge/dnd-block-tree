<script lang="ts">
  import { BlockTree, createBlockHistory, generateId, initFractionalOrder } from '@dnd-block-tree/svelte'
  import type { BaseBlock, AnimationConfig } from '@dnd-block-tree/svelte'
  import type { Snippet } from 'svelte'

  interface ProductivityBlock extends BaseBlock {
    type: 'section' | 'task' | 'note'
    title: string
    completed?: boolean
    dueDate?: string
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
    lockCompletedTasks: boolean
  }

  const CONTAINER_TYPES = ['section'] as const

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

  interface Props {
    onSettingsSubscribe?: (handler: (settings: Settings) => void) => (() => void)
  }

  let { onSettingsSubscribe }: Props = $props()

  const history = createBlockHistory<ProductivityBlock>(INITIAL_BLOCKS)

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
    lockCompletedTasks: false,
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
        history.set(initFractionalOrder(history.blocks))
      } else {
        const blocks = history.blocks
        history.set(blocks.map((b) => ({
          ...b,
          order: blocks.filter(s => s.parentId === b.parentId).findIndex(s => s.id === b.id),
        })))
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

  function canDrag(block: ProductivityBlock): boolean {
    if (settings.lockCompletedTasks && block.type === 'task' && block.completed) {
      return false
    }
    return true
  }

  function handleChange(newBlocks: ProductivityBlock[]) {
    history.set(newBlocks as ProductivityBlock[])
  }

  function toggleTask(id: string) {
    history.set(
      history.blocks.map(b =>
        b.id === id && b.type === 'task' ? { ...b, completed: !b.completed } : b
      )
    )
  }

  function addItem(type: ProductivityBlock['type']) {
    const blocks = history.blocks
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

    history.set([...blocks, newBlock])
    selectedIds = new Set([newBlock.id])
    lastSelectedId = newBlock.id
  }

  function deleteSelected() {
    if (selectedIds.size === 0) return
    const blocks = history.blocks
    const toDelete = new Set<string>()
    const stack = [...selectedIds]

    while (stack.length > 0) {
      const id = stack.pop()!
      toDelete.add(id)
      blocks.filter(b => b.parentId === id).forEach(b => stack.push(b.id))
    }

    history.set(blocks.filter(b => !toDelete.has(b.id)))
    selectedIds = new Set()
    lastSelectedId = null
  }

  function reset() {
    history.set(INITIAL_BLOCKS)
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
        onclick={() => addItem('section')}
        class="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-md hover:bg-background/80 transition-colors"
      >
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Section
      </button>
      <button
        onclick={() => addItem('task')}
        class="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-md hover:bg-background/80 transition-colors"
      >
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Task
      </button>
      <button
        onclick={() => addItem('note')}
        class="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-md hover:bg-background/80 transition-colors"
      >
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Note
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

    <div class="flex gap-1 p-1 bg-muted rounded-lg">
      <button
        onclick={() => history.undo()}
        disabled={!history.canUndo}
        class="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-md hover:bg-background/80 transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
        Undo
      </button>
      <button
        onclick={() => history.redo()}
        disabled={!history.canRedo}
        class="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-md hover:bg-background/80 transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
        Redo
      </button>
    </div>
  </div>

  <!-- Tree -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div onclick={(e: MouseEvent) => clearSelection(e)} class="min-w-0 w-full max-w-full overflow-x-hidden">
    {#key treeKey}
      <BlockTree
        blocks={history.blocks}
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
        {canDrag}
        {renderBlock}
        {dragOverlay}
      />
    {/key}
  </div>
</div>

{#snippet renderBlock({ block, isDragging, depth, isExpanded, isSelected, onToggleExpand, children }: { block: ProductivityBlock, isDragging: boolean, depth: number, isExpanded: boolean, isSelected: boolean, onToggleExpand: (() => void) | null, children: Snippet | null })}
  {#if block.type === 'section'}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      onclick={() => selectBlock(block.id)}
      class="selection-ring cursor-pointer w-full min-w-0 max-w-full rounded-xl"
      class:selected={isSelected}
    >
      <div
        class="rounded-xl border border-border/50 bg-card w-full min-w-0 max-w-full transition-all duration-200 {isDragging ? 'opacity-40 scale-[0.98]' : ''}"
      >
        <div class="flex items-center gap-2 p-2 folder-header group min-w-0">
          <svg class="h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>

          {#if onToggleExpand}
            <button
              onclick={(e: MouseEvent) => { e.stopPropagation(); onToggleExpand?.() }}
              class="p-1 shrink-0 rounded-md transition-colors hover:bg-muted/80 active:scale-95"
              aria-label="Toggle expand"
            >
              <div class="transition-transform duration-200" class:rotate-90={isExpanded}>
                <svg class="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </button>
          {/if}

          <span class="font-semibold text-foreground flex-1 min-w-0 truncate">
            {block.title}
          </span>

          <span class="hidden sm:inline text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium shrink-0">
            Section
          </span>
        </div>

        {#if isExpanded && children}
          <div class="px-2 pb-2 folder-children w-full min-w-0 max-w-full">
            {@render children()}
          </div>
        {/if}
      </div>
    </div>

  {:else if block.type === 'task'}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      onclick={() => selectBlock(block.id)}
      class="selection-ring cursor-pointer w-full min-w-0 max-w-full rounded-lg"
      class:selected={isSelected}
    >
      <div
        class="flex items-center gap-2 p-2 rounded-lg border border-border/30 bg-card/50 block-item group w-full min-w-0 max-w-full transition-all duration-200 {isDragging ? 'opacity-40 scale-[0.98]' : ''}"
      >
        <svg class="h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>

        <button
          onclick={(e: MouseEvent) => { e.stopPropagation(); toggleTask(block.id) }}
          class="h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-200 {block.completed ? 'bg-primary border-primary checkbox-complete' : 'border-muted-foreground/40 hover:border-primary hover:scale-110'}"
        >
          {#if block.completed}
            <svg class="h-3 w-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          {/if}
        </button>

        <span class="flex-1 min-w-0 truncate transition-all duration-200 {block.completed ? 'line-through text-muted-foreground/60' : ''}">
          {block.title}
        </span>

        {#if block.dueDate}
          <span class="hidden sm:inline-block text-xs px-2.5 py-1 rounded-full shrink-0 bg-muted/80 text-muted-foreground transition-colors duration-150">
            {block.dueDate}
          </span>
        {/if}

        <span class="hidden xs:inline text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          Task
        </span>
      </div>
    </div>

  {:else if block.type === 'note'}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      onclick={() => selectBlock(block.id)}
      class="selection-ring cursor-pointer w-full min-w-0 max-w-full rounded-lg"
      class:selected={isSelected}
    >
      <div
        class="flex items-start gap-2 p-2 rounded-lg border border-border/30 bg-card/50 block-item group w-full min-w-0 max-w-full transition-all duration-200 {isDragging ? 'opacity-40 scale-[0.98]' : ''}"
      >
        <svg class="h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>

        <svg class="h-4 w-4 shrink-0 text-primary/80 mt-0.5 transition-colors group-hover:text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/></svg>

        <span class="flex-1 min-w-0 text-sm text-muted-foreground leading-relaxed break-words">
          {block.title}
        </span>

        <span class="hidden xs:inline text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          Note
        </span>
      </div>
    </div>
  {/if}
{/snippet}

{#snippet dragOverlay(block: ProductivityBlock)}
  <div class="bg-card border border-primary shadow-lg rounded-lg p-3 text-sm w-64 drag-overlay">
    <div class="flex items-center gap-2">
      <svg class="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
      <span class="text-xs text-primary uppercase tracking-wider font-medium">
        {block.type}
      </span>
    </div>
    <div class="font-medium text-foreground mt-1">{block.title}</div>
  </div>
{/snippet}
