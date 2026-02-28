import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { mount, unmount } from 'svelte'
import ProductivityTreeDemo from './ProductivityTreeDemo.svelte'
import { SettingsPanel, type SettingsTab } from '../shared/SettingsPanel'
import { DragDropTab } from '../shared/settings/DragDropTab'
import { TreeTab } from '../shared/settings/TreeTab'
import { AnimationTab } from '../shared/settings/AnimationTab'
import { SensorsTab } from '../shared/settings/SensorsTab'
import { Toggle } from '../shared/settings/Toggle'
import { DEFAULT_PRODUCTIVITY_SETTINGS, type ProductivitySettings } from '../shared/settings/types'
import { GripHorizontal, Trees, Sparkles, Radio } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

type SettingsHandler = (settings: ProductivitySettings) => void

export function SvelteProductivityTree() {
  const ref = useRef<HTMLDivElement>(null)
  const [settings, setSettings] = useState<ProductivitySettings>(DEFAULT_PRODUCTIVITY_SETTINGS)
  const isMobile = useIsMobile()

  const listenersRef = useRef<Set<SettingsHandler>>(new Set())
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    for (const fn of listenersRef.current) fn(settings)
  }, [settings])

  const onSettingsSubscribe = useCallback((handler: SettingsHandler) => {
    listenersRef.current.add(handler)
    handler(settingsRef.current)
    return () => { listenersRef.current.delete(handler) }
  }, [])

  useEffect(() => {
    const component = mount(ProductivityTreeDemo, {
      target: ref.current!,
      props: { onSettingsSubscribe },
    })
    return () => { void unmount(component) }
  }, [onSettingsSubscribe])

  const updateSettings = useCallback((patch: Partial<ProductivitySettings>) => {
    setSettings(s => ({ ...s, ...patch }))
  }, [])

  const settingsTabs: SettingsTab[] = useMemo(() => [
    {
      id: 'dragdrop',
      label: 'Drag & Drop',
      icon: GripHorizontal,
      content: (
        <DragDropTab
          settings={settings}
          onChange={updateSettings}
          extra={
            <Toggle
              label="Lock Completed Tasks"
              checked={settings.lockCompletedTasks}
              onChange={(v) => updateSettings({ lockCompletedTasks: v })}
            />
          }
        />
      ),
    },
    {
      id: 'tree',
      label: 'Tree',
      icon: Trees,
      content: <TreeTab settings={settings} onChange={updateSettings} />,
    },
    {
      id: 'animation',
      label: 'Animation',
      icon: Sparkles,
      content: <AnimationTab settings={settings} onChange={updateSettings} />,
    },
    ...(isMobile ? [{
      id: 'sensors' as const,
      label: 'Sensors',
      icon: Radio,
      content: <SensorsTab settings={settings} onChange={updateSettings} />,
    }] : []),
  ], [settings, updateSettings, isMobile])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr),300px] gap-4 w-full min-w-0">
      <div ref={ref} className="min-w-0 w-full max-w-full overflow-x-hidden" />
      <div className="space-y-4">
        <SettingsPanel tabs={settingsTabs} />
      </div>
    </div>
  )
}
