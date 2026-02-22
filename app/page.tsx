'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@thesandybridge/ui/components'
import { ThemePicker } from './components/ThemePicker'
import { CodeBlock } from './components/CodeBlock'
import { ProductivityTree } from './components/productivity/ProductivityTree'
import { FileTree } from './components/filesystem/FileTree'
import { Footer } from './components/Footer'
import { Layers, FolderTree, Github, BookOpen } from 'lucide-react'
import Link from 'next/link'

type DemoTab = 'productivity' | 'filesystem'

const FEATURES = [
  {
    title: 'Weighted Collision Detection',
    description:
      'Custom algorithm that scores drop zones by edge distance with bottom bias for natural drag behavior.',
  },
  {
    title: 'Smart Drop Zones',
    description:
      'Only one before-zone rendered, none around active block. Prevents visual clutter and accidental drops.',
  },
  {
    title: '8px Activation Distance',
    description:
      'Prevents accidental drags. Pointer must move 8px before drag starts, allowing normal clicks.',
  },
  {
    title: 'Snapshot-Based Computation',
    description:
      'State captured at drag start. All preview computations use snapshot, ensuring consistent behavior.',
  },
] as const

const USAGE_CODE = `import { BlockTree } from '@dnd-block-tree/react'

const renderers = {
  section: (props) => <SectionBlock {...props} />,
  task: (props) => <TaskBlock {...props} />,
  note: (props) => <NoteBlock {...props} />,
}

function App() {
  const [blocks, setBlocks] = useState(initialBlocks)

  return (
    <BlockTree
      blocks={blocks}
      renderers={renderers}
      containerTypes={['section']}
      onChange={setBlocks}
    />
  )
}`

const BADGES = [
  '8px activation distance',
  'Smart drop zones',
  'Debounced preview',
  'Snapshot-based',
] as const

export default function Home() {
  const [activeTab, setActiveTab] = useState<DemoTab>('productivity')

  const setProductivityTab = useCallback(() => setActiveTab('productivity'), [])
  const setFilesystemTab = useCallback(() => setActiveTab('filesystem'), [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <span className="font-mono font-semibold text-base sm:text-lg">dnd-block-tree</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/docs" className="gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Docs</span>
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <a
                href="https://github.com/thesandybridge/dnd-block-tree"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4" />
              </a>
            </Button>
            <ThemePicker />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              <span className="text-primary">Drag-and-Drop</span> Block Trees
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              A headless React library for building hierarchical drag-and-drop interfaces. Bring
              your own components, we handle the complexity.
            </p>
            <div className="flex gap-3 justify-center mb-8">
              <Button asChild>
                <Link href="/docs">Read the Docs</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/docs/getting-started">Get Started</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {BADGES.map(badge => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/50 px-3 py-1 text-xs text-muted-foreground"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="px-3 sm:px-6 pb-16">
          <div className="max-w-4xl mx-auto">
            <Card className="corona-glow">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">Interactive Demo</CardTitle>
                    <CardDescription>Try dragging blocks to reorder them</CardDescription>
                  </div>
                  <div className="flex gap-1 p-1 bg-muted rounded-lg self-start sm:self-auto">
                    <Button
                      variant={activeTab === 'productivity' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={setProductivityTab}
                      className="gap-2"
                    >
                      <Layers className="h-4 w-4" />
                      <span className="hidden sm:inline">Productivity</span>
                      <span className="sm:hidden">Tasks</span>
                    </Button>
                    <Button
                      variant={activeTab === 'filesystem' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={setFilesystemTab}
                      className="gap-2"
                    >
                      <FolderTree className="h-4 w-4" />
                      <span className="hidden sm:inline">File System</span>
                      <span className="sm:hidden">Files</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activeTab === 'productivity' ? <ProductivityTree /> : <FileTree />}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="px-6 pb-16">
          <div className="max-w-4xl mx-auto">
            <Card className="corona-glow">
              <CardHeader>
                <CardTitle className="text-lg">Usage Example</CardTitle>
                <CardDescription>Simple API for complex interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock language="tsx" code={USAGE_CODE} />
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="px-6 pb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Features</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {FEATURES.map(feature => (
                <Card key={feature.title} className="corona-glow corona-glow-hover">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
