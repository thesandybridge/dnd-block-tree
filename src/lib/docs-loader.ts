import type { ComponentType } from 'react'

interface MDXModule {
  default: ComponentType
  frontmatter?: Record<string, unknown>
}

const modules = import.meta.glob<MDXModule>('/content/docs/*.mdx', {
  eager: true,
})

export function getDocComponent(slug: string): ComponentType | null {
  const key = `/content/docs/${slug}.mdx`
  const mod = modules[key]
  return mod?.default ?? null
}

export function getDocSlugs(): string[] {
  return Object.keys(modules).map((key) =>
    key.replace('/content/docs/', '').replace('.mdx', ''),
  )
}

export function getDocFrontmatter(
  slug: string,
): Record<string, unknown> | null {
  const key = `/content/docs/${slug}.mdx`
  const mod = modules[key]
  return mod?.frontmatter ?? null
}
