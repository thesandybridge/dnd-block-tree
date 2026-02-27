import { useRef, useEffect } from 'react'
import { mount, unmount } from 'svelte'
import ProductivityTreeDemo from './ProductivityTreeDemo.svelte'

export function SvelteProductivityTree() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const component = mount(ProductivityTreeDemo, { target: ref.current! })
    return () => unmount(component)
  }, [])
  return <div ref={ref} />
}
