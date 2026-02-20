'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, Code2, Zap, Wrench, FileText } from 'lucide-react'
import { DOC_SECTIONS, type DocSection } from '@/lib/docs-nav'

const ICON_MAP: Record<string, React.ReactNode> = {
  Package: <Package className="h-4 w-4" />,
  Code2: <Code2 className="h-4 w-4" />,
  Zap: <Zap className="h-4 w-4" />,
  Wrench: <Wrench className="h-4 w-4" />,
  FileText: <FileText className="h-4 w-4" />,
}

function SidebarLink({ section, isActive, isDocsPage }: { section: DocSection; isActive: boolean; isDocsPage: boolean }) {
  const isRoute = !!section.href
  const href = isRoute ? section.href! : isDocsPage ? `#${section.id}` : `/docs#${section.id}`
  const className = `flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
    isActive
      ? 'bg-muted text-foreground font-medium'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`

  // Use Link only for route-level navigation (e.g. /docs/changelog)
  // Use <a> for anchor links — plain <a> handles cross-page hash scrolling correctly
  if (isRoute) {
    return (
      <Link href={href} className={className}>
        {ICON_MAP[section.icon]}
        {section.title}
      </Link>
    )
  }

  return (
    <a href={href} className={className}>
      {ICON_MAP[section.icon]}
      {section.title}
    </a>
  )
}

export function DocsSidebar() {
  const pathname = usePathname()
  const isDocsPage = pathname === '/docs'
  const isChangelog = pathname === '/docs/changelog'
  const [activeId, setActiveId] = useState<string>('installation')

  useEffect(() => {
    if (!isDocsPage) return

    const sectionIds = DOC_SECTIONS.filter(s => !s.href).map(s => s.id)

    function updateActive() {
      const scrollY = window.scrollY + 100 // offset for sticky header
      let current = sectionIds[0]

      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= scrollY) {
          current = id
        }
      }

      setActiveId(current)
    }

    updateActive()
    window.addEventListener('scroll', updateActive, { passive: true })
    return () => window.removeEventListener('scroll', updateActive)
  }, [isDocsPage])

  return (
    <aside className="hidden lg:block w-56 shrink-0 border-r border-border/50 p-6 sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto">
      <nav className="space-y-1">
        {DOC_SECTIONS.map(section => (
          <SidebarLink
            key={section.id}
            section={section}
            isDocsPage={isDocsPage}
            isActive={
              isChangelog
                ? section.id === 'changelog'
                : activeId === section.id
            }
          />
        ))}
      </nav>
    </aside>
  )
}
