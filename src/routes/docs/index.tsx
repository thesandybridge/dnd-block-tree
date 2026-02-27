import { createFileRoute } from '@tanstack/react-router'
import { getDocComponent } from '@/lib/docs-loader'
import { docsMDXComponents } from '@/lib/mdx-components'

export const Route = createFileRoute('/docs/')({
  component: DocsHome,
})

function DocsHome() {
  const Content = getDocComponent('index')
  if (!Content) return <div>Not found</div>
  return (
    <div className="space-y-12">
      <Content components={docsMDXComponents} />
    </div>
  )
}
