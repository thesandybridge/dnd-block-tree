<script lang="ts">
  import { BlockTree, createBlockHistory, initFractionalOrder, generateKeyBetween } from '@dnd-block-tree/svelte'
  import type { BaseBlock } from '@dnd-block-tree/svelte'
  import type { Snippet } from 'svelte'

  interface ProductivityBlock extends BaseBlock {
    type: 'section' | 'task' | 'note'
    title: string
    completed?: boolean
  }

  const CONTAINER_TYPES = ['section'] as const

  const INITIAL_BLOCKS: ProductivityBlock[] = initFractionalOrder([
    { id: '1', type: 'section', title: 'Project Planning', parentId: null, order: 0 },
    { id: '2', type: 'task', title: 'Define project scope', parentId: '1', order: 0, completed: true },
    { id: '3', type: 'task', title: 'Create timeline', parentId: '1', order: 1 },
    { id: '4', type: 'note', title: 'Remember to include buffer time', parentId: '1', order: 2 },
    { id: '5', type: 'section', title: 'Development', parentId: null, order: 1 },
    { id: '6', type: 'task', title: 'Set up dev environment', parentId: '5', order: 0, completed: true },
    { id: '7', type: 'task', title: 'Implement core features', parentId: '5', order: 1 },
    { id: '8', type: 'task', title: 'Write unit tests', parentId: '5', order: 2 },
  ]) as ProductivityBlock[]

  type SyncMessage =
    | { type: 'blocks'; blocks: ProductivityBlock[] }
    | { type: 'busy'; reason: 'editing' | 'dragging'; active: boolean }

  interface Props {
    label?: string
    accentColor?: string
    onPublish?: (msg: SyncMessage) => void
    onSubscribe?: (handler: (msg: SyncMessage) => void) => (() => void)
  }

  let {
    label = 'User',
    accentColor = 'bg-blue-500',
    onPublish,
    onSubscribe,
  }: Props = $props()

  const history = createBlockHistory<ProductivityBlock>(INITIAL_BLOCKS)

  // --- Inline editing state ---
  let editingId = $state<string | null>(null)
  let editDraft = $state('')

  function startEdit(id: string) {
    const block = history.blocks.find(b => b.id === id)
    if (!block) return
    editingId = id
    editDraft = block.title
    onPublish?.({ type: 'busy', reason: 'editing', active: true })
  }

  function commitEdit() {
    if (!editingId) return
    const trimmed = editDraft.trim()
    if (trimmed) {
      const newBlocks = history.blocks.map(b =>
        b.id === editingId ? { ...b, title: trimmed } : b
      ) as ProductivityBlock[]
      history.set(newBlocks)
      onPublish?.({ type: 'busy', reason: 'editing', active: false })
      onPublish?.({ type: 'blocks', blocks: newBlocks })
    } else {
      onPublish?.({ type: 'busy', reason: 'editing', active: false })
    }
    editingId = null
  }

  function cancelEdit() {
    editingId = null
    onPublish?.({ type: 'busy', reason: 'editing', active: false })
  }

  // --- Drag / change handlers ---
  function handleChange(newBlocks: ProductivityBlock[]) {
    history.set(newBlocks as ProductivityBlock[])
    onPublish?.({ type: 'blocks', blocks: newBlocks as ProductivityBlock[] })
  }

  function handleDragStart() {
    onPublish?.({ type: 'busy', reason: 'dragging', active: true })
  }

  function handleDragEnd() {
    onPublish?.({ type: 'busy', reason: 'dragging', active: false })
  }

  function toggleTask(id: string) {
    const newBlocks = history.blocks.map(b =>
      b.id === id && b.type === 'task' ? { ...b, completed: !b.completed } : b
    ) as ProductivityBlock[]
    history.set(newBlocks)
    onPublish?.({ type: 'blocks', blocks: newBlocks })
  }

  // --- Simulation ---
  function simulateReorder(): ProductivityBlock[] | null {
    const blocks = history.blocks
    const leaves = blocks.filter(b => b.type !== 'section')
    if (leaves.length < 2) return null

    const target = leaves[Math.floor(Math.random() * leaves.length)]
    const siblings = blocks
      .filter(b => b.parentId === target.parentId && b.id !== target.id)
      .sort((a, b) => String(a.order) < String(b.order) ? -1 : 1)

    if (siblings.length === 0) return null

    const insertIdx = Math.floor(Math.random() * (siblings.length + 1))
    const lo = insertIdx > 0 ? String(siblings[insertIdx - 1].order) : null
    const hi = insertIdx < siblings.length ? String(siblings[insertIdx].order) : null
    const newKey = generateKeyBetween(lo, hi)

    const newBlocks = blocks.map(b =>
      b.id === target.id ? { ...b, order: newKey } : b
    ) as ProductivityBlock[]
    history.set(newBlocks)
    onPublish?.({ type: 'blocks', blocks: newBlocks })
    return newBlocks
  }

  function handleManualSimulate() {
    simulateReorder()
  }

  // --- Auto-simulation when peer is busy ---
  let simulationInterval: ReturnType<typeof setInterval> | null = null

  function startAutoSimulation() {
    if (simulationInterval) return
    simulationInterval = setInterval(() => {
      simulateReorder()
    }, 2000)
  }

  function stopAutoSimulation() {
    if (simulationInterval) {
      clearInterval(simulationInterval)
      simulationInterval = null
    }
  }

  // --- Svelte actions (real DOM listeners, not delegated) ---

  /** Stops pointerdown from bubbling to @dnd-kit's PointerSensor on DraggableBlock */
  function preventDrag(node: HTMLElement) {
    node.addEventListener('pointerdown', (e) => e.stopPropagation())
  }

  /** Focus + select input, and prevent drag sensor from capturing pointer events */
  function autofocus(node: HTMLInputElement) {
    node.addEventListener('pointerdown', (e) => e.stopPropagation())
    node.focus()
    node.select()
  }

  /** Double-click to edit: uses real DOM listener so it fires before @dnd-kit's sensor */
  function dblClickEdit(node: HTMLElement, blockId: string) {
    node.addEventListener('pointerdown', (e) => e.stopPropagation())
    node.addEventListener('dblclick', (e) => {
      e.stopPropagation()
      startEdit(blockId)
    })
  }

  // --- Subscribe to external changes ---
  $effect(() => {
    if (!onSubscribe) return
    const unsub = onSubscribe((msg) => {
      if (msg.type === 'blocks') {
        history.set(msg.blocks)
      } else if (msg.type === 'busy') {
        if (msg.active) {
          startAutoSimulation()
        } else {
          stopAutoSimulation()
        }
      }
    })
    return () => {
      unsub?.()
      stopAutoSimulation()
    }
  })
</script>

<div class="flex flex-col gap-2 min-w-0">
  <div class="flex items-center gap-2">
    <div class="w-2 h-2 rounded-full {accentColor}"></div>
    <span class="text-sm font-medium text-foreground">{label}</span>
    <button
      onclick={handleManualSimulate}
      class="ml-auto inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-border hover:bg-muted transition-colors"
    >
      <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
      Simulate Reorder
    </button>
  </div>

  <div class="border border-border/50 rounded-xl p-3 bg-card/30 min-w-0 overflow-hidden">
    <BlockTree
      blocks={history.blocks}
      containerTypes={CONTAINER_TYPES}
      onChange={handleChange}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      class="flex flex-col gap-1 w-full"
      dropZoneClass="h-0.5 rounded transition-all duration-150"
      dropZoneActiveClass="bg-primary h-1"
      orderingStrategy="fractional"
      initialExpanded="all"
      animation={{ expandDuration: 200, easing: 'ease-out' }}
      {renderBlock}
      {dragOverlay}
    />
  </div>
</div>

{#snippet renderBlock({ block, isDragging, depth, isExpanded, isSelected, onToggleExpand, children }: { block: ProductivityBlock, isDragging: boolean, depth: number, isExpanded: boolean, isSelected: boolean, onToggleExpand: (() => void) | null, children: Snippet | null })}
  {#if block.type === 'section'}
    <div
      class="rounded-xl border border-border/50 bg-card w-full min-w-0 max-w-full transition-all duration-200 {isDragging ? 'opacity-40 scale-[0.98]' : ''} {editingId === block.id ? 'ring-1 ring-primary/40' : ''}"
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

        {#if editingId === block.id}
          <input
            class="font-semibold text-foreground flex-1 min-w-0 bg-transparent border-b border-primary outline-none"
            bind:value={editDraft}
            onblur={commitEdit}
            onkeydown={(e: KeyboardEvent) => {
              e.stopPropagation()
              if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
              if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
            }}
            use:autofocus
          />
        {:else}
          <span
            class="font-semibold text-foreground flex-1 min-w-0 truncate cursor-text select-none"
            use:dblClickEdit={block.id}
            title="Double-click to edit"
          >
            {block.title}
          </span>
        {/if}

        <span class="font-mono text-[10px] text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded shrink-0">
          {String(block.order)}
        </span>
      </div>

      {#if isExpanded && children}
        <div class="px-2 pb-2 folder-children w-full min-w-0 max-w-full">
          {@render children()}
        </div>
      {/if}
    </div>

  {:else if block.type === 'task'}
    <div
      class="flex items-center gap-2 p-2 rounded-lg border border-border/30 bg-card/50 block-item group w-full min-w-0 max-w-full transition-all duration-200 {isDragging ? 'opacity-40 scale-[0.98]' : ''} {editingId === block.id ? 'ring-1 ring-primary/40' : ''}"
    >
      <svg class="h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>

      <button
        use:preventDrag
        onclick={(e: MouseEvent) => { e.stopPropagation(); toggleTask(block.id) }}
        class="h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-200 {block.completed ? 'bg-primary border-primary checkbox-complete' : 'border-muted-foreground/40 hover:border-primary hover:scale-110'}"
      >
        {#if block.completed}
          <svg class="h-3 w-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        {/if}
      </button>

      {#if editingId === block.id}
        <input
          class="flex-1 min-w-0 bg-transparent border-b border-primary outline-none"
          bind:value={editDraft}
          onblur={commitEdit}
          onkeydown={(e: KeyboardEvent) => {
            e.stopPropagation()
            if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
            if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
          }}
          use:autofocus
        />
      {:else}
        <span
          class="flex-1 min-w-0 truncate transition-all duration-200 cursor-text select-none {block.completed ? 'line-through text-muted-foreground/60' : ''}"
          use:dblClickEdit={block.id}
          title="Double-click to edit"
        >
          {block.title}
        </span>
      {/if}

      <span class="font-mono text-[10px] text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded shrink-0">
        {String(block.order)}
      </span>
    </div>

  {:else if block.type === 'note'}
    <div
      class="flex items-start gap-2 p-2 rounded-lg border border-border/30 bg-card/50 block-item group w-full min-w-0 max-w-full transition-all duration-200 {isDragging ? 'opacity-40 scale-[0.98]' : ''} {editingId === block.id ? 'ring-1 ring-primary/40' : ''}"
    >
      <svg class="h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>

      <svg class="h-4 w-4 shrink-0 text-primary/80 mt-0.5 transition-colors group-hover:text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/></svg>

      {#if editingId === block.id}
        <input
          class="flex-1 min-w-0 text-sm bg-transparent border-b border-primary outline-none"
          bind:value={editDraft}
          onblur={commitEdit}
          onkeydown={(e: KeyboardEvent) => {
            e.stopPropagation()
            if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
            if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
          }}
          use:autofocus
        />
      {:else}
        <span
          class="flex-1 min-w-0 text-sm text-muted-foreground leading-relaxed break-words cursor-text select-none"
          use:dblClickEdit={block.id}
          title="Double-click to edit"
        >
          {block.title}
        </span>
      {/if}

      <span class="font-mono text-[10px] text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded shrink-0">
        {String(block.order)}
      </span>
    </div>
  {/if}
{/snippet}

{#snippet dragOverlay(block: ProductivityBlock)}
  <div class="bg-card border border-primary shadow-lg rounded-lg p-3 text-sm w-56 drag-overlay">
    <div class="flex items-center gap-2">
      <svg class="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
      <span class="text-xs text-primary uppercase tracking-wider font-medium">
        {block.type}
      </span>
    </div>
    <div class="font-medium text-foreground mt-1">{block.title}</div>
  </div>
{/snippet}
