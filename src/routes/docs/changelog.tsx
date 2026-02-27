import { createFileRoute } from '@tanstack/react-router'
import changelogMd from '../../../packages/react/CHANGELOG.md?raw'

export const Route = createFileRoute('/docs/changelog')({
  component: ChangelogPage,
})

function ChangelogPage() {
  return (
    <div className="space-y-12">
      <div className="prose-changelog">
        <ChangelogContent markdown={changelogMd} />
      </div>
    </div>
  )
}

function ChangelogContent({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n')
  const elements: React.ReactNode[] = []
  let codeBlock: string[] | null = null
  let listItems: string[] = []

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 mb-4 text-muted-foreground">
          {listItems.map((item, i) => (
            <li key={i} className="text-muted-foreground text-sm">{item}</li>
          ))}
        </ul>
      )
      listItems = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('```')) {
      if (codeBlock !== null) {
        elements.push(
          <pre key={`code-${i}`} className="bg-muted rounded-lg p-4 text-sm font-mono overflow-x-auto mb-4">
            <code>{codeBlock.join('\n')}</code>
          </pre>
        )
        codeBlock = null
      } else {
        flushList()
        codeBlock = []
      }
      continue
    }

    if (codeBlock !== null) {
      codeBlock.push(line)
      continue
    }

    if (line.startsWith('# ')) {
      flushList()
      elements.push(
        <h1 key={`h1-${i}`} className="text-3xl font-bold mb-6">{line.slice(2)}</h1>
      )
    } else if (line.startsWith('## ')) {
      flushList()
      elements.push(
        <h2 key={`h2-${i}`} className="text-2xl font-bold mb-4 mt-8 flex items-center gap-2">{line.slice(3)}</h2>
      )
    } else if (line.startsWith('### ')) {
      flushList()
      elements.push(
        <h3 key={`h3-${i}`} className="text-lg font-semibold mb-2 mt-6">{line.slice(4)}</h3>
      )
    } else if (line.startsWith('- ')) {
      listItems.push(line.slice(2))
    } else if (line.trim() === '') {
      flushList()
    } else {
      flushList()
      elements.push(
        <p key={`p-${i}`} className="text-muted-foreground mb-4 text-sm">{parseInline(line)}</p>
      )
    }
  }
  flushList()

  return <>{elements}</>
}

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  // Split on **bold** and `code` patterns using matchAll
  const pattern = /\*\*(.+?)\*\*|`(.+?)`/g
  let lastIndex = 0

  for (const match of text.matchAll(pattern)) {
    const idx = match.index ?? 0
    if (idx > lastIndex) {
      parts.push(text.slice(lastIndex, idx))
    }
    if (match[1]) {
      parts.push(<strong key={idx} className="text-foreground">{match[1]}</strong>)
    } else if (match[2]) {
      parts.push(
        <code key={idx} className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono text-foreground">
          {match[2]}
        </code>
      )
    }
    lastIndex = idx + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}
