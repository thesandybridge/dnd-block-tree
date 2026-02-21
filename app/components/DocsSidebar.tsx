'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen, Package, Settings, Code2, Zap, Wrench, FileText,
  Undo2, Keyboard, CheckSquare, Shield, GitBranch, ArrowRightLeft,
  Smartphone, Server, Play, List, Crosshair,
} from 'lucide-react'
import { DOC_NAV, UNGROUPED_NAV, type DocNavItem } from '@/lib/docs-nav'

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

export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:block w-56 shrink-0 border-r border-border/50 p-6 sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto">
      <nav className="space-y-6">
        {DOC_NAV.map(group => (
          <div key={group.title}>
            <div className="px-3 mb-1 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <SidebarLink
                  key={item.id}
                  item={item}
                  isActive={pathname === item.href}
                />
              ))}
            </div>
          </div>
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
