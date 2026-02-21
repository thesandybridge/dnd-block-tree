'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button, Sheet, SheetTrigger, SheetContent } from '@thesandybridge/ui/components'
import { ThemePicker } from './ThemePicker'
import {
  Layers, Github, ArrowLeft, Menu,
  BookOpen, Package, Settings, Code2, Zap, Wrench, FileText,
  Undo2, Keyboard, CheckSquare, Shield, GitBranch, ArrowRightLeft,
  Smartphone, Server, Play, List, Crosshair,
} from 'lucide-react'
import { DOC_NAV, UNGROUPED_NAV, DOC_SECTIONS, type DocNavItem } from '@/lib/docs-nav'

const ICON_MAP: Record<string, React.ReactNode> = {
  BookOpen: <BookOpen className="h-4 w-4" />,
  Package: <Package className="h-4 w-4" />,
  Settings: <Settings className="h-4 w-4" />,
  Code2: <Code2 className="h-4 w-4" />,
  Zap: <Zap className="h-4 w-4" />,
  Wrench: <Wrench className="h-4 w-4" />,
  FileText: <FileText className="h-4 w-4" />,
  Undo2: <Undo2 className="h-4 w-4" />,
  Keyboard: <Keyboard className="h-4 w-4" />,
  CheckSquare: <CheckSquare className="h-4 w-4" />,
  Shield: <Shield className="h-4 w-4" />,
  GitBranch: <GitBranch className="h-4 w-4" />,
  ArrowRightLeft: <ArrowRightLeft className="h-4 w-4" />,
  Smartphone: <Smartphone className="h-4 w-4" />,
  Server: <Server className="h-4 w-4" />,
  Play: <Play className="h-4 w-4" />,
  List: <List className="h-4 w-4" />,
  Crosshair: <Crosshair className="h-4 w-4" />,
}

function NavLink({ item, onClick }: { item: DocNavItem; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
    >
      {ICON_MAP[item.icon]}
      {item.title}
    </Link>
  )
}

function getPageTitle(pathname: string): string {
  const item = DOC_SECTIONS.find(s => s.href === pathname)
  return item?.title ?? 'Docs'
}

export function DocsHeader() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)
  const isSubpage = pathname !== '/docs'

  return (
    <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href={isSubpage ? '/docs' : '/'}>
            <Button variant="ghost" size="sm" className="gap-2 px-2 sm:px-3">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{isSubpage ? 'Docs' : 'Back'}</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <span className="font-mono font-semibold text-base sm:text-lg">
              {pageTitle}
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
              <nav className="space-y-6">
                {DOC_NAV.map(group => (
                  <div key={group.title}>
                    <div className="px-3 mb-1 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                      {group.title}
                    </div>
                    <div className="space-y-0.5">
                      {group.items.map(item => (
                        <NavLink
                          key={item.id}
                          item={item}
                          onClick={() => setMobileNavOpen(false)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <div className="border-t border-border/50 pt-4 space-y-0.5">
                  {UNGROUPED_NAV.map(item => (
                    <NavLink
                      key={item.id}
                      item={item}
                      onClick={() => setMobileNavOpen(false)}
                    />
                  ))}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
