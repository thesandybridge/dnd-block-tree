/**
 * Minimal typed event emitter (no dependencies).
 * Returns an unsubscribe function from `on()` for easy cleanup.
 */
export class EventEmitter<Events extends { [K in keyof Events]: (...args: any[]) => void }> {
  private handlers = new Map<keyof Events, Set<(...args: any[]) => void>>()

  on<K extends keyof Events>(event: K, handler: Events[K]): () => void {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(handler)
    return () => this.off(event, handler)
  }

  off<K extends keyof Events>(event: K, handler: Events[K]): void {
    this.handlers.get(event)?.delete(handler)
  }

  emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): void {
    const set = this.handlers.get(event)
    if (set) {
      for (const handler of set) {
        handler(...args)
      }
    }
  }

  removeAllListeners(event?: keyof Events): void {
    if (event) {
      this.handlers.delete(event)
    } else {
      this.handlers.clear()
    }
  }
}
