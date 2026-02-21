import type { MDXComponents } from 'mdx/types'
import type { ComponentPropsWithoutRef, ReactElement } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@thesandybridge/ui/components'
import { CopyButton } from '@/app/components/CopyButton'

function CalloutCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  )
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-4 mt-6">{children}</div>
}

function MiniCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  )
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (!node) return ''
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (typeof node === 'object' && 'props' in node) {
    return extractText((node as ReactElement).props.children)
  }
  return ''
}

function Pre(props: ComponentPropsWithoutRef<'pre'>) {
  const text = extractText(props.children)

  return (
    <div className="relative group">
      <pre {...props} />
      <CopyButton text={text} />
    </div>
  )
}

export const docsMDXComponents: MDXComponents = {
  CalloutCard,
  CardGrid,
  MiniCard,
  h2: (props) => (
    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" {...props} />
  ),
  h3: (props) => <h3 className="text-lg font-semibold mb-2 mt-6" {...props} />,
  h4: (props) => <h4 className="text-base font-semibold mb-2 mt-4" {...props} />,
  p: (props) => <p className="text-muted-foreground mb-4" {...props} />,
  pre: Pre,
  strong: (props) => <strong className="text-foreground" {...props} />,
  a: ({ href, children, ...props }) => {
    const isExternal = href?.startsWith('http')
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="text-primary hover:underline"
        {...props}
      >
        {children}
      </a>
    )
  },
  table: (props) => (
    <div className="my-6 w-full overflow-x-auto">
      <table className="w-full text-sm border-collapse" {...props} />
    </div>
  ),
  thead: (props) => <thead className="border-b border-border" {...props} />,
  th: (props) => (
    <th className="text-left py-2 px-3 font-semibold text-foreground bg-muted/50" {...props} />
  ),
  td: (props) => (
    <td className="py-2 px-3 border-b border-border/50 text-muted-foreground" {...props} />
  ),
  tr: (props) => <tr className="border-b border-border/30" {...props} />,
  ul: (props) => <ul className="list-disc list-inside space-y-1 mb-4 text-muted-foreground" {...props} />,
  ol: (props) => <ol className="list-decimal list-inside space-y-1 mb-4 text-muted-foreground" {...props} />,
  li: (props) => <li className="text-muted-foreground" {...props} />,
  code: (props) => (
    <code className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono text-foreground" {...props} />
  ),
  hr: (props) => <hr className="my-8 border-border/50" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-l-2 border-primary/50 pl-4 my-4 text-muted-foreground italic" {...props} />
  ),
}
