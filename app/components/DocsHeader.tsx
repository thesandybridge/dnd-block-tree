'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button, Sheet, SheetTrigger, SheetContent } from '@thesandybridge/ui/components'
import { ThemePicker } from './ThemePicker'
import { Layers, Github, ArrowLeft, Menu, Package, Code2, Zap, Wrench, FileText } from 'lucide-react'
import { DOC_SECTIONS, type DocSection } from '@/lib/docs-nav'

const ICON_MAP: Record<string, React.ReactNode> = {
  Package: <Package className="h-4 w-4" />,
  Code2: <Code2 className="h-4 w-4" />,
  Zap: <Zap className="h-4 w-4" />,
  Wrench: <Wrench className="h-4 w-4" />,
  FileText: <FileText className="h-4 w-4" />,
}

function NavLink({ section, onClick, isDocsPage }: { section: DocSection; onClick?: () => void; isDocsPage: boolean }) {
  const isRoute = !!section.href
  const href = isRoute ? section.href! : isDocsPage ? `#${section.id}` : `/docs#${section.id}`
  const className = "flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"

  if (isRoute) {
    return (
      <Link href={href} onClick={onClick} className={className}>
        {ICON_MAP[section.icon]}
        {section.title}
      </Link>
    )
  }

  return (
    <a href={href} onClick={onClick} className={className}>
      {ICON_MAP[section.icon]}
      {section.title}
    </a>
  )
}

export function DocsHeader() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const pathname = usePathname()
  const isDocsPage = pathname === '/docs'
  const isChangelog = pathname === '/docs/changelog'

  return (
    <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href={isChangelog ? '/docs' : '/'}>
            <Button variant="ghost" size="sm" className="gap-2 px-2 sm:px-3">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{isChangelog ? 'Docs' : 'Back'}</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <span className="font-mono font-semibold text-base sm:text-lg">
              {isChangelog ? 'Changelog' : 'Docs'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
            <a
              href="https://github.com/thesandybridge/dnd-block-tree"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>
          <ThemePicker />
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 pt-12 px-4">
              <nav className="space-y-1">
                {DOC_SECTIONS.map(section => (
                  <NavLink
                    key={section.id}
                    section={section}
                    isDocsPage={isDocsPage}
                    onClick={() => setMobileNavOpen(false)}
                  />
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
