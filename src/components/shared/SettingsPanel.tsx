import { useState } from 'react'
import { Settings, ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@thesandybridge/ui/components'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

export interface SettingsTab {
  id: string
  label: string
  icon?: LucideIcon
  content: React.ReactNode
}

interface SettingsPanelProps {
  tabs: SettingsTab[]
}

export function SettingsPanel({ tabs }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? '')
  const [expanded, setExpanded] = useState(false)
  const isMobile = useIsMobile()

  const activeContent = tabs.find(t => t.id === activeTab)?.content

  return (
    <div className="rounded-xl border border-border/30 bg-card/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center justify-between w-full p-4 text-left",
          "lg:cursor-default",
          isMobile && "hover:bg-muted/30"
        )}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Settings className="h-4 w-4" />
          Settings
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform lg:hidden",
          expanded && "rotate-180"
        )} />
      </button>

      <div className={cn(
        "px-4 pb-4 space-y-3",
        isMobile && !expanded && "hidden",
        "lg:block"
      )}>
        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg flex-wrap">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className="gap-1 text-xs"
              >
                {Icon && <Icon className="h-3 w-3" />}
                {tab.label}
              </Button>
            )
          })}
        </div>

        {/* Active tab content */}
        <div className="space-y-2">
          {activeContent}
        </div>
      </div>
    </div>
  )
}
