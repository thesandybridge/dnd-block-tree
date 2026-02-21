'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as Collapsible from '@radix-ui/react-collapsible'
import { ChevronRight } from 'lucide-react'
import { DOC_NAV, UNGROUPED_NAV, type DocNavItem, type DocNavGroup } from '@/lib/docs-nav'
import { ICON_MAP } from '@/lib/docs-icons'

function SidebarLink({ item, isActive }: { item: DocNavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
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

function NavGroup({ group, pathname }: { group: DocNavGroup; pathname: string }) {
  const hasActive = group.items.some(item => item.href === pathname)

  return (
    <Collapsible.Root defaultOpen={hasActive}>
      <Collapsible.Trigger className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider hover:text-muted-foreground transition-colors group">
        {group.title}
        <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]:rotate-90" />
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="space-y-0.5 pt-1">
          {group.items.map(item => (
            <SidebarLink
              key={item.id}
              item={item}
              isActive={pathname === item.href}
            />
          ))}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:block w-56 shrink-0 border-r border-border/50 p-6 sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto">
      <nav className="space-y-4">
        {DOC_NAV.map(group => (
          <NavGroup key={group.title} group={group} pathname={pathname} />
        ))}
        <div className="border-t border-border/50 pt-4 space-y-0.5">
          {UNGROUPED_NAV.map(item => (
            <SidebarLink
              key={item.id}
              item={item}
              isActive={pathname === item.href}
            />
          ))}
        </div>
      </nav>
    </aside>
  )
}
