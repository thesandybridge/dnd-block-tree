import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import * as Collapsible from '@radix-ui/react-collapsible'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { Button, Sheet, SheetTrigger, SheetContent, SheetClose } from '@thesandybridge/ui/components'
import { ThemePicker } from './ThemePicker'
import { Layers, Github, ArrowLeft, Menu, ChevronRight, X } from 'lucide-react'
import { DOC_NAV, UNGROUPED_NAV, DOC_SECTIONS, type DocNavItem, type DocNavGroup } from '@/lib/docs-nav'
import { ICON_MAP } from '@/lib/docs-icons'

function NavLink({ item, isActive, onClick }: { item: DocNavItem; isActive: boolean; onClick?: () => void }) {
  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-md transition-colors ${
        isActive
          ? 'bg-muted text-foreground font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {ICON_MAP[item.icon]}
      {item.title}
    </Link>
  )
}

function MobileNavGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: DocNavGroup
  pathname: string
  onNavigate: () => void
}) {
  const hasActive = group.items.some(item => item.href === pathname)

  return (
    <Collapsible.Root defaultOpen={hasActive}>
      <Collapsible.Trigger className="flex items-center justify-between w-full px-3 py-2.5 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider hover:text-muted-foreground transition-colors group">
        {group.title}
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-90" />
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="space-y-0.5 pt-0.5 pb-1">
          {group.items.map(item => (
            <NavLink
              key={item.id}
              item={item}
              isActive={pathname === item.href}
              onClick={onNavigate}
            />
          ))}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

function getPageTitle(pathname: string): string {
  const item = DOC_SECTIONS.find(s => s.href === pathname)
  return item?.title ?? 'Docs'
}

export function DocsHeader() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { pathname } = useLocation()
  const pageTitle = getPageTitle(pathname)
  const isSubpage = pathname !== '/docs'

  return (
    <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to={isSubpage ? '/docs' : '/'}>
            <Button variant="ghost" size="sm" className="gap-2 px-2 sm:px-3">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{isSubpage ? 'Docs' : 'Back'}</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <span className="font-mono font-semibold text-base sm:text-lg truncate max-w-[180px] sm:max-w-none">
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
            <SheetContent side="right" className="w-72 !p-0 !gap-0" showCloseButton={false}>
              <div className="flex items-center justify-between px-4 h-14 border-b border-border/50 shrink-0">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="font-mono font-semibold text-sm">Navigation</span>
                </div>
                <SheetClose className="rounded-sm opacity-70 hover:opacity-100 transition-opacity">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </SheetClose>
              </div>
              <ScrollArea.Root className="flex-1 min-h-0">
                <ScrollArea.Viewport className="h-full w-full">
                  <nav className="px-3 py-4 space-y-2">
                    {DOC_NAV.map(group => (
                      <MobileNavGroup
                        key={group.title}
                        group={group}
                        pathname={pathname}
                        onNavigate={() => setMobileNavOpen(false)}
                      />
                    ))}
                    <div className="border-t border-border/50 pt-3 mt-3 space-y-0.5">
                      {UNGROUPED_NAV.map(item => (
                        <NavLink
                          key={item.id}
                          item={item}
                          isActive={pathname === item.href}
                          onClick={() => setMobileNavOpen(false)}
                        />
                      ))}
                    </div>
                  </nav>
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar
                  orientation="vertical"
                  className="flex select-none touch-none p-0.5 transition-colors w-2 hover:bg-border/50"
                >
                  <ScrollArea.Thumb className="relative flex-1 rounded-full bg-border" />
                </ScrollArea.Scrollbar>
              </ScrollArea.Root>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
