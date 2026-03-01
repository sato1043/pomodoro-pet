export type AppScene = 'free' | 'pomodoro' | 'settings' | 'fureai' | 'gallery'

export type AppSceneEvent = {
  type: 'AppSceneChanged'
  scene: AppScene
  timestamp: number
}
