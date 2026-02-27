import { createFileRoute } from '@tanstack/react-router'
import { getDocComponent } from '@/lib/docs-loader'
import { docsMDXComponents } from '@/lib/mdx-components'

export const Route = createFileRoute('/docs/$slug')({
  component: DocPage,
})

function DocPage() {
  const { slug } = Route.useParams()
  const Content = getDocComponent(slug)
  if (!Content) return <div>Page not found</div>
  return (
    <div className="space-y-12">
      <Content components={docsMDXComponents} />
    </div>
  )
}
