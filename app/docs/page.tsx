'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '../components/ThemeToggle'
import { CodeBlock } from '../components/CodeBlock'
import { Footer } from '../components/Footer'
import { Layers, Github, ArrowLeft, Package, Wrench, Zap, Code2 } from 'lucide-react'

const INSTALL_CODE = `npm install dnd-block-tree @dnd-kit/core @dnd-kit/utilities`

const BASIC_USAGE = `import { BlockTree, type BaseBlock, type BlockRenderers } from 'dnd-block-tree'
import { useState } from 'react'

// Define your block type
interface MyBlock extends BaseBlock {
  type: 'section' | 'task' | 'note'
  title: string
}

// Create renderers for each type
const renderers: BlockRenderers<MyBlock, ['section']> = {
  section: ({ block, children, isExpanded, onToggleExpand }) => (
    <div className="border rounded p-2">
      <button onClick={onToggleExpand}>
        {isExpanded ? '▼' : '▶'} {block.title}
      </button>
      {isExpanded && <div className="ml-4">{children}</div>}
    </div>
  ),
  task: ({ block }) => <div className="p-2">{block.title}</div>,
  note: ({ block }) => <div className="p-2 italic">{block.title}</div>,
}

function App() {
  const [blocks, setBlocks] = useState<MyBlock[]>([
    { id: '1', type: 'section', title: 'Tasks', parentId: null, order: 0 },
    { id: '2', type: 'task', title: 'Do something', parentId: '1', order: 0 },
  ])

  return (
    <BlockTree
      blocks={blocks}
      renderers={renderers}
      containerTypes={['section']}
      onChange={setBlocks}
    />
  )
}`

const CALLBACKS_CODE = `<BlockTree
  blocks={blocks}
  renderers={renderers}
  containerTypes={['section']}
  onChange={setBlocks}
  // Drag lifecycle callbacks
  onDragStart={(e) => {
    console.log('Started dragging:', e.block)
    // Return false to prevent drag
  }}
  onDragMove={(e) => {
    console.log('Dragging over:', e.overZone)
  }}
  onDragEnd={(e) => {
    console.log('Dropped at:', e.targetZone)
    if (!e.cancelled) {
      // Sync with server, analytics, etc.
    }
  }}
  onDragCancel={(e) => {
    console.log('Drag cancelled')
  }}
  // Block movement callback
  onBlockMove={(e) => {
    console.log('Block moved from:', e.from, 'to:', e.to)
    // Great for real-time sync
  }}
  // UI state callbacks
  onExpandChange={(e) => {
    console.log('Container expanded:', e.expanded)
  }}
  onHoverChange={(e) => {
    console.log('Hovering zone:', e.zoneType)
  }}
/>`

const CUSTOMIZATION_CODE = `<BlockTree
  blocks={blocks}
  renderers={renderers}
  containerTypes={['section']}
  onChange={setBlocks}
  // Filter which blocks can be dragged
  canDrag={(block) => !block.locked}
  // Filter valid drop targets
  canDrop={(draggedBlock, targetZone, targetBlock) => {
    // Prevent dropping sections into tasks
    if (draggedBlock.type === 'section' && targetBlock?.type === 'task') {
      return false
    }
    return true
  }}
  // Custom collision detection algorithm
  collisionDetection={customCollisionFn}
  // Sensor configuration
  sensors={{
    activationDistance: 10,  // Pixels before drag starts
    activationDelay: 200,    // OR use delay instead
    tolerance: 5,            // Movement tolerance during delay
  }}
  // Initial expand state
  initialExpanded="all"  // 'all' | 'none' | string[]
  // Live preview during drag (default: true)
  showDropPreview={true}
/>`

const TYPES_CODE = `// Base block interface - extend for your types
interface BaseBlock {
  id: string
  type: string
  parentId: string | null
  order: number
}

// Event types
interface DragStartEvent<T> {
  block: T
  blockId: string
}

interface DragMoveEvent<T> {
  block: T
  blockId: string
  overZone: string | null
  coordinates: { x: number; y: number }
}

interface DragEndEvent<T> {
  block: T
  blockId: string
  targetZone: string | null
  cancelled: boolean
}

interface BlockMoveEvent<T> {
  block: T
  from: { parentId: string | null; index: number }
  to: { parentId: string | null; index: number }
  blocks: T[]  // All blocks after the move
}

// Renderer props
interface BlockRendererProps<T> {
  block: T
  isDragging?: boolean
  depth: number
}

interface ContainerRendererProps<T> extends BlockRendererProps<T> {
  children: ReactNode
  isExpanded: boolean
  onToggleExpand: () => void
}`

const EXPORTS_CODE = `// Components
export { BlockTree } from './components/BlockTree'
export { TreeRenderer } from './components/TreeRenderer'
export { DropZone } from './components/DropZone'
export { DragOverlay } from './components/DragOverlay'

// Hooks (for building custom implementations)
export { createBlockState } from './hooks/useBlockState'
export { createTreeState } from './hooks/useTreeState'

// Collision detection
export { weightedVerticalCollision, closestCenterCollision } from './core/collision'

// Sensors
export { useConfiguredSensors, getSensorConfig } from './core/sensors'

// Utilities
export {
  cloneMap,
  cloneParentMap,
  computeNormalizedIndex,
  buildOrderedBlocks,
  reparentBlockIndex,
  getDescendantIds,
  deleteBlockAndDescendants,
} from './utils/blocks'

export { extractUUID, debounce, generateId } from './utils/helper'

// Types (see Types section for details)
export type { BaseBlock, BlockRenderers, ... } from './core/types'`

interface DocSection {
  id: string
  title: string
  icon: React.ReactNode
}

const SECTIONS: DocSection[] = [
  { id: 'installation', title: 'Installation', icon: <Package className="h-4 w-4" /> },
  { id: 'basic-usage', title: 'Basic Usage', icon: <Code2 className="h-4 w-4" /> },
  { id: 'callbacks', title: 'Callbacks & Events', icon: <Zap className="h-4 w-4" /> },
  { id: 'customization', title: 'Customization', icon: <Wrench className="h-4 w-4" /> },
  { id: 'types', title: 'Type Definitions', icon: <Code2 className="h-4 w-4" /> },
  { id: 'exports', title: 'All Exports', icon: <Package className="h-4 w-4" /> },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <span className="font-mono font-semibold text-lg">Documentation</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <a
                href="https://github.com/thesandybridge/dnd-block-tree"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4" />
              </a>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0 border-r border-border/50 p-6 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <nav className="space-y-1">
            {SECTIONS.map(section => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                {section.icon}
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 px-6 py-8 min-w-0">
          <div className="space-y-12">
            {/* Installation */}
            <section id="installation">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                Installation
              </h2>
              <p className="text-muted-foreground mb-4">
                Install the package along with its peer dependencies:
              </p>
              <CodeBlock language="bash" code={INSTALL_CODE} />
              <p className="text-sm text-muted-foreground mt-4">
                Requires React 18+ and dnd-kit/core 6+
              </p>
            </section>

            {/* Basic Usage */}
            <section id="basic-usage">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Code2 className="h-6 w-6 text-primary" />
                Basic Usage
              </h2>
              <p className="text-muted-foreground mb-4">
                Define your block type, create renderers, and render the tree:
              </p>
              <CodeBlock language="tsx" code={BASIC_USAGE} />
              <Card className="mt-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Key Concepts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">BaseBlock</strong> - All blocks must have{' '}
                    <code className="text-xs bg-muted px-1 rounded">id</code>,{' '}
                    <code className="text-xs bg-muted px-1 rounded">type</code>,{' '}
                    <code className="text-xs bg-muted px-1 rounded">parentId</code>, and{' '}
                    <code className="text-xs bg-muted px-1 rounded">order</code>.
                  </p>
                  <p>
                    <strong className="text-foreground">containerTypes</strong> - Block types that
                    can have children. These receive extra props like{' '}
                    <code className="text-xs bg-muted px-1 rounded">children</code> and{' '}
                    <code className="text-xs bg-muted px-1 rounded">isExpanded</code>.
                  </p>
                  <p>
                    <strong className="text-foreground">renderers</strong> - A map of block type to
                    render function. TypeScript ensures correct props for containers vs leaves.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Callbacks */}
            <section id="callbacks">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                Callbacks & Events
              </h2>
              <p className="text-muted-foreground mb-4">
                Hook into the drag-and-drop lifecycle for real-time sync, analytics, or custom
                behavior:
              </p>
              <CodeBlock language="tsx" code={CALLBACKS_CODE} />
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">onDragStart</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Called when drag begins. Return <code className="text-xs bg-muted px-1 rounded">false</code> to prevent.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">onDragMove</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Called during drag (debounced). Includes coordinates and hover zone.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">onBlockMove</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Called after successful drop with from/to positions. Great for server sync.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">onHoverChange</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Called when hovering different drop zones. Useful for custom indicators.
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Customization */}
            <section id="customization">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Wrench className="h-6 w-6 text-primary" />
                Customization
              </h2>
              <p className="text-muted-foreground mb-4">
                Control drag behavior, drop rules, sensors, and visual feedback:
              </p>
              <CodeBlock language="tsx" code={CUSTOMIZATION_CODE} />
              <Card className="mt-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Customization Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <strong className="text-foreground">canDrag</strong>
                    <span className="text-muted-foreground ml-2">
                      Filter which blocks can be dragged. Receives the block, returns boolean.
                    </span>
                  </div>
                  <div>
                    <strong className="text-foreground">canDrop</strong>
                    <span className="text-muted-foreground ml-2">
                      Filter valid drop targets. Receives dragged block, zone ID, and target block.
                    </span>
                  </div>
                  <div>
                    <strong className="text-foreground">collisionDetection</strong>
                    <span className="text-muted-foreground ml-2">
                      Custom collision algorithm. Default uses depth-aware detection with hysteresis that prefers nested zones at indented cursor positions.
                    </span>
                  </div>
                  <div>
                    <strong className="text-foreground">showDropPreview</strong>
                    <span className="text-muted-foreground ml-2">
                      Show a ghost preview where the block will land. Uses stable zones that don&apos;t shift during drag.
                    </span>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Types */}
            <section id="types">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Code2 className="h-6 w-6 text-primary" />
                Type Definitions
              </h2>
              <p className="text-muted-foreground mb-4">
                Full TypeScript support with comprehensive type definitions:
              </p>
              <CodeBlock language="typescript" code={TYPES_CODE} />
            </section>

            {/* Exports */}
            <section id="exports">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                All Exports
              </h2>
              <p className="text-muted-foreground mb-4">
                Everything exported from the package for building custom implementations:
              </p>
              <CodeBlock language="typescript" code={EXPORTS_CODE} />
            </section>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  )
}
