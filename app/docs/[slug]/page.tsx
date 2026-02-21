import { promises as fs } from 'fs'
import path from 'path'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeShiki from '@shikijs/rehype'
import { shikiConfig } from '@/lib/shiki-config'
import { docsMDXComponents } from '@/lib/mdx-components'
import { DOC_SECTIONS } from '@/lib/docs-nav'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return DOC_SECTIONS
    .filter(s => s.href !== '/docs' && s.href !== '/docs/changelog')
    .map(s => ({ slug: s.href.replace('/docs/', '') }))
}

export default async function DocSlugPage({ params }: PageProps) {
  const { slug } = await params
  const filePath = path.join(process.cwd(), 'content/docs', `${slug}.mdx`)

  let source: string
  try {
    source = await fs.readFile(filePath, 'utf-8')
  } catch {
    notFound()
  }

  return (
    <div className="space-y-12">
      <MDXRemote
        source={source}
        components={docsMDXComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [
              rehypeSlug,
              [rehypeShiki, shikiConfig],
            ],
          },
        }}
      />
    </div>
  )
}
