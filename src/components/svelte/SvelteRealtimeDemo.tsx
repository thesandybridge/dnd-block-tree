import { useRef, useEffect } from 'react'
import { mount, unmount } from 'svelte'
import RealtimePaneDemo from './RealtimePaneDemo.svelte'

export function SvelteRealtimeDemo() {
  const refA = useRef<HTMLDivElement>(null)
  const refB = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const compA = mount(RealtimePaneDemo, {
      target: refA.current!,
      props: { label: 'User A', accentColor: 'bg-blue-500' },
    })
    const compB = mount(RealtimePaneDemo, {
      target: refB.current!,
      props: { label: 'User B', accentColor: 'bg-green-500' },
    })
    return () => {
      void unmount(compA)
      void unmount(compB)
    }
  }, [])
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
      <div ref={refA} />
      <div ref={refB} />
    </div>
  )
}
