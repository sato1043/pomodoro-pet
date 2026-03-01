import type { AppScene, AppSceneEvent } from './AppScene'

export interface AppSceneManager {
  readonly currentScene: AppScene
  enterPomodoro(): AppSceneEvent[]
  exitPomodoro(): AppSceneEvent[]
  enterFureai(): AppSceneEvent[]
  exitFureai(): AppSceneEvent[]
  enterGallery(): AppSceneEvent[]
  exitGallery(): AppSceneEvent[]
}

export function createAppSceneManager(): AppSceneManager {
  let currentScene: AppScene = 'free'

  function now(): number {
    return Date.now()
  }

  return {
    get currentScene() { return currentScene },

    enterPomodoro(): AppSceneEvent[] {
      if (currentScene !== 'free') return []
      currentScene = 'pomodoro'
      return [{ type: 'AppSceneChanged', scene: 'pomodoro', timestamp: now() }]
    },

    exitPomodoro(): AppSceneEvent[] {
      if (currentScene !== 'pomodoro') return []
      currentScene = 'free'
      return [{ type: 'AppSceneChanged', scene: 'free', timestamp: now() }]
    },

    enterFureai(): AppSceneEvent[] {
      if (currentScene !== 'free') return []
      currentScene = 'fureai'
      return [{ type: 'AppSceneChanged', scene: 'fureai', timestamp: now() }]
    },

    exitFureai(): AppSceneEvent[] {
      if (currentScene !== 'fureai') return []
      currentScene = 'free'
      return [{ type: 'AppSceneChanged', scene: 'free', timestamp: now() }]
    },

    enterGallery(): AppSceneEvent[] {
      if (currentScene !== 'free') return []
      currentScene = 'gallery'
      return [{ type: 'AppSceneChanged', scene: 'gallery', timestamp: now() }]
    },

    exitGallery(): AppSceneEvent[] {
      if (currentScene !== 'gallery') return []
      currentScene = 'free'
      return [{ type: 'AppSceneChanged', scene: 'free', timestamp: now() }]
    }
  }
}
