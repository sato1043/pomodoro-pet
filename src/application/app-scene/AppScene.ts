export type AppScene = 'free' | 'pomodoro' | 'settings' | 'fureai'

export type AppSceneEvent = {
  type: 'AppSceneChanged'
  scene: AppScene
  timestamp: number
}
