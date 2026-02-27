import { useRef, useEffect } from 'react'
import { mount, unmount } from 'svelte'
import FileTreeDemo from './FileTreeDemo.svelte'

export function SvelteFileTree() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const component = mount(FileTreeDemo, { target: ref.current! })
    return () => unmount(component)
  }, [])
  return <div ref={ref} />
}
