export interface InteractionHistory {
  readonly recentClicks: number
  readonly totalFeedingsToday: number
}

export interface InteractionTracker {
  readonly history: InteractionHistory
  recordClick(): void
  recordFeeding(): void
  tick(deltaMs: number): void
  resetDaily(): void
}

const CLICK_WINDOW_MS = 3000

export function createInteractionTracker(): InteractionTracker {
  const clickTimestamps: number[] = []
  let totalFeedingsToday = 0
  let elapsedMs = 0

  function pruneOldClicks(): void {
    while (clickTimestamps.length > 0 && (elapsedMs - clickTimestamps[0]) > CLICK_WINDOW_MS) {
      clickTimestamps.shift()
    }
  }

  return {
    get history(): InteractionHistory {
      pruneOldClicks()
      return {
        recentClicks: clickTimestamps.length,
        totalFeedingsToday,
      }
    },

    recordClick(): void {
      clickTimestamps.push(elapsedMs)
    },

    recordFeeding(): void {
      totalFeedingsToday++
    },

    tick(deltaMs: number): void {
      elapsedMs += deltaMs
    },

    resetDaily(): void {
      totalFeedingsToday = 0
    },
  }
}
