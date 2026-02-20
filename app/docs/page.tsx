import { promises as fs } from 'fs'
import path from 'path'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeShiki from '@shikijs/rehype'
import { shikiConfig } from '@/lib/shiki-config'
import { docsMDXComponents } from '@/lib/mdx-components'

export default async function DocsPage() {
  const filePath = path.join(process.cwd(), 'content/docs/index.mdx')
  const source = await fs.readFile(filePath, 'utf-8')

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
