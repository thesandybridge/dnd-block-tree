import type { BaseBlock } from '../types'

export interface MergeBlockVersionsOptions {
  /**
   * Fields that the `structure` array owns (default: `['parentId', 'order']`).
   * All other fields are taken from `content`.
   */
  structuralFields?: string[]
}

const DEFAULT_STRUCTURAL_FIELDS = ['parentId', 'order']

/**
 * Merge two concurrent versions of a block array where each version owns
 * different fields. The `content` array owns all non-structural fields
 * (e.g. title, completed) while the `structure` array owns structural
 * fields (parentId, order) and determines array membership/ordering.
 *
 * Blocks only in `content` are dropped. Blocks only in `structure` are
 * kept as-is. Blocks in both get content fields from `content` and
 * structural fields from `structure`.
 *
 * @param content - Array owning content fields (title, completed, etc.)
 * @param structure - Array owning structural fields and determining membership
 * @param options - Optional configuration for which fields are structural
 * @returns Merged array following `structure`'s membership and ordering
 *
 * @example
 * ```ts
 * // Local user edited title, remote user reordered
 * const merged = mergeBlockVersions(localBlocks, remoteBlocks)
 * // Result: remote ordering with local content edits
 * ```
 */
export function mergeBlockVersions<T extends BaseBlock>(
  content: T[],
  structure: T[],
  options?: MergeBlockVersionsOptions
): T[] {
  const fields = options?.structuralFields ?? DEFAULT_STRUCTURAL_FIELDS
  const contentById = new Map(content.map(b => [b.id, b]))

  return structure.map(s => {
    const c = contentById.get(s.id)
    if (!c) return s

    // Start with content block, overlay structural fields from structure
    const merged = { ...c } as Record<string, unknown>
    for (const field of fields) {
      if (field in s) {
        merged[field] = (s as Record<string, unknown>)[field]
      }
    }
    return merged as T
  })
}
