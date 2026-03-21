export type AppScene = 'free' | 'pomodoro' | 'settings' | 'fureai' | 'gallery' | 'environment'

export type AppSceneEvent = {
  type: 'AppSceneChanged'
  scene: AppScene
  timestamp: number
}
