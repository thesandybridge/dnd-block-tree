'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { BlockTree, type BlockTreeProps } from './BlockTree'
import type { BaseBlock } from '../core/types'

export interface BlockTreeSSRProps<
  T extends BaseBlock,
  C extends readonly T['type'][] = readonly T['type'][]
> extends BlockTreeProps<T, C> {
  /** Content to render before hydration completes (default: null) */
  fallback?: ReactNode
}

/**
 * Hydration-safe wrapper for BlockTree in SSR environments.
 * Renders the fallback (or nothing) on the server and during initial hydration,
 * then mounts the full BlockTree after the client has hydrated.
 */
export function BlockTreeSSR<
  T extends BaseBlock,
  C extends readonly T['type'][] = readonly T['type'][]
>({ fallback = null, ...props }: BlockTreeSSRProps<T, C>) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{fallback}</>
  }

  return <BlockTree<T, C> {...props} />
}
