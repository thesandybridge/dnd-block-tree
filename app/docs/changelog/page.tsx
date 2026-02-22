import { promises as fs } from 'fs'
import path from 'path'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeRaw from 'rehype-raw'
import rehypeShiki from '@shikijs/rehype'
import { shikiConfig } from '@/lib/shiki-config'
import { docsMDXComponents } from '@/lib/mdx-components'

const CHANGELOG_URL =
  'https://raw.githubusercontent.com/thesandybridge/dnd-block-tree/main/packages/react/CHANGELOG.md'

async function getChangelog(): Promise<string> {
  try {
    const res = await fetch(CHANGELOG_URL, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`)
    return await res.text()
  } catch {
    const localPath = path.join(
      process.cwd(),
      'packages/react/CHANGELOG.md',
    )
    return fs.readFile(localPath, 'utf-8')
  }
}

export default async function ChangelogPage() {
  const source = await getChangelog()

  return (
    <div className="prose-changelog space-y-6">
      <MDXRemote
        source={source}
        components={docsMDXComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [
              rehypeRaw,
              rehypeSlug,
              [rehypeShiki, shikiConfig],
            ],
          },
        }}
      />
    </div>
  )
}
