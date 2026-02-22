import type { Disposable } from '../types'

/** Collect multiple cleanup functions into a single disposable */
export function createDisposable(): Disposable & { add(fn: () => void): void } {
  const cleanups: (() => void)[] = []

  return {
    add(fn: () => void) {
      cleanups.push(fn)
    },
    dispose() {
      for (const fn of cleanups.reverse()) {
        fn()
      }
      cleanups.length = 0
    },
  }
}
