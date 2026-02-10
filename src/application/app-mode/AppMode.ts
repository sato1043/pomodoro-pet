export type AppMode = 'free' | 'pomodoro'

export type AppModeEvent = {
  type: 'AppModeChanged'
  mode: AppMode
  timestamp: number
}
