export type AppScene = 'free' | 'pomodoro' | 'settings'

export type AppSceneEvent = {
  type: 'AppSceneChanged'
  scene: AppScene
  timestamp: number
}
