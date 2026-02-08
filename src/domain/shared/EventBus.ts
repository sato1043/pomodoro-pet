type EventHandler<T = unknown> = (event: T) => void

export interface EventBus {
  publish<T>(eventType: string, event: T): void
  subscribe<T>(eventType: string, handler: EventHandler<T>): () => void
}

export function createEventBus(): EventBus {
  const handlers = new Map<string, Set<EventHandler>>()

  return {
    publish<T>(eventType: string, event: T): void {
      const set = handlers.get(eventType)
      if (!set) return
      for (const handler of set) {
        handler(event)
      }
    },

    subscribe<T>(eventType: string, handler: EventHandler<T>): () => void {
      let set = handlers.get(eventType)
      if (!set) {
        set = new Set()
        handlers.set(eventType, set)
      }
      const h = handler as EventHandler
      set.add(h)
      return () => {
        set!.delete(h)
      }
    }
  }
}
