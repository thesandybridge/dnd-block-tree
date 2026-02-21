/**
 * Fractional indexing utilities
 *
 * Generates lexicographically sortable string keys that allow insertion between
 * any two existing keys without reindexing siblings. Suitable for CRDT-based
 * collaborative editing.
 *
 * Alphabet: 0-9a-z (base 36). Lexicographic order matches semantic order since
 * '0' < '1' < ... < '9' < 'a' < ... < 'z' in ASCII.
 */

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
const BASE = ALPHABET.length // 36
const FLOOR = ALPHABET[0] // '0' — padding / before-operation prefix
const MID_IDX = Math.floor(BASE / 2) // 18
const MID_CHAR = ALPHABET[MID_IDX] // 'i'

function charToIdx(c: string): number {
  const n = ALPHABET.indexOf(c)
  if (n === -1) throw new Error(`Invalid fractional key character: "${c}"`)
  return n
}

/**
 * Compute the arithmetic midpoint of two strings using digit-by-digit base-36
 * arithmetic (avoids BigInt for broader target compatibility).
 *
 * Both are conceptually padded to (max_length + 1) digits. The extra digit
 * ensures the sum is always ≥ 2, so integer division always yields a midpoint
 * strictly greater than lo.
 */
function computeMidpoint(lo: string, hi: string): string {
  const len = Math.max(lo.length, hi.length) + 1

  const loD = Array.from(lo.padEnd(len, FLOOR)).map(charToIdx)
  const hiD = Array.from(hi.padEnd(len, FLOOR)).map(charToIdx)

  // Sum into a (len+1)-digit buffer to absorb the carry from position 0
  const sum = new Array<number>(len + 1).fill(0)
  let carry = 0
  for (let i = len - 1; i >= 0; i--) {
    const s = loD[i] + hiD[i] + carry
    sum[i + 1] = s % BASE
    carry = Math.floor(s / BASE)
  }
  sum[0] = carry

  // Halve the (len+1)-digit sum
  const mid = new Array<number>(len + 1).fill(0)
  let rem = 0
  for (let i = 0; i <= len; i++) {
    const val = rem * BASE + sum[i]
    mid[i] = Math.floor(val / 2)
    rem = val % 2
  }

  // mid[0] is always 0 because (lo + hi) / 2 < BASE^len
  // Drop it, then trim trailing FLOOR digits
  const digits = mid.slice(1)
  let end = digits.length
  while (end > 1 && digits[end - 1] === 0) end--

  return digits.slice(0, end).map(n => ALPHABET[n]).join('')
}

/**
 * Generate a key that sorts strictly before `hi`.
 */
function keyBefore(hi: string): string {
  const firstIdx = charToIdx(hi[0])
  if (firstIdx > 1) {
    return ALPHABET[Math.floor(firstIdx / 2)]
  }
  // hi starts with '0' or '1' — recurse with FLOOR prefix
  if (hi.length === 1) {
    return FLOOR + MID_CHAR
  }
  return FLOOR + keyBefore(hi.slice(1))
}

/**
 * Generate a key that sorts strictly between `lo` and `hi`.
 *
 * @param lo - Lower bound (null means no lower bound)
 * @param hi - Upper bound (null means no upper bound)
 */
export function generateKeyBetween(lo: string | null, hi: string | null): string {
  if (lo !== null && hi !== null) {
    if (lo >= hi) throw new Error(`lo must be strictly less than hi: "${lo}" >= "${hi}"`)
    return computeMidpoint(lo, hi)
  }
  if (lo === null && hi === null) return MID_CHAR
  if (lo === null) return keyBefore(hi!)
  // hi === null: append MID_CHAR so result sorts after lo
  return lo + MID_CHAR
}

/**
 * Generate `n` evenly distributed keys between `lo` and `hi` using binary
 * subdivision. Keys grow at O(log n) depth, avoiding unbounded length.
 *
 * @param lo - Lower bound (null means no lower bound)
 * @param hi - Upper bound (null means no upper bound)
 * @param n  - Number of keys to generate
 */
export function generateNKeysBetween(
  lo: string | null,
  hi: string | null,
  n: number
): string[] {
  if (n <= 0) return []
  if (n === 1) return [generateKeyBetween(lo, hi)]

  const keys: string[] = new Array(n)

  function fill(loKey: string | null, hiKey: string | null, from: number, to: number) {
    if (from >= to) return
    const mid = Math.floor((from + to) / 2)
    keys[mid] = generateKeyBetween(loKey, hiKey)
    fill(loKey, keys[mid], from, mid)
    fill(keys[mid], hiKey, mid + 1, to)
  }

  fill(lo, hi, 0, n)
  return keys
}

/**
 * Generate initial keys for `n` items starting from an empty list.
 */
export function generateInitialKeys(n: number): string[] {
  return generateNKeysBetween(null, null, n)
}

/**
 * Compare two fractional keys lexicographically.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
export function compareFractionalKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Assign initial fractional `order` keys to a flat array of blocks.
 *
 * Groups siblings by `parentId`, sorts each group by existing `order`, then
 * assigns evenly-distributed fractional keys via binary subdivision.
 *
 * Use this to migrate an integer-ordered (or unkeyed) dataset to fractional
 * ordering before passing blocks to a `BlockTree` with `orderingStrategy="fractional"`.
 */
export function initFractionalOrder<T extends { id: string; parentId: string | null; order: number | string }>(
  blocks: T[]
): T[] {
  const byParent = new Map<string | null, T[]>()
  for (const block of blocks) {
    const key = block.parentId ?? null
    const list = byParent.get(key) ?? []
    list.push(block)
    byParent.set(key, list)
  }

  const updated = new Map<string, T>()
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => {
      const ao = a.order, bo = b.order
      if (typeof ao === 'number' && typeof bo === 'number') return ao - bo
      return String(ao) < String(bo) ? -1 : String(ao) > String(bo) ? 1 : 0
    })
    const keys = generateNKeysBetween(null, null, siblings.length)
    siblings.forEach((block, i) => {
      updated.set(block.id, { ...block, order: keys[i] })
    })
  }

  return blocks.map(b => updated.get(b.id) ?? b)
}
