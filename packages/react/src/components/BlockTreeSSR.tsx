'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { BlockTree, type BlockTreeProps } from './BlockTree'
import type { BaseBlock } from '@dnd-block-tree/core'

export interface BlockTreeSSRProps<
  T extends BaseBlock,
  C extends readonly T['type'][] = readonly T['type'][]
> extends BlockTreeProps<T, C> {
  /** Content to render before hydration completes (default: null) */
  fallback?: ReactNode
}

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
