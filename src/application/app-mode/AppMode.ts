export type AppMode = 'free' | 'pomodoro' | 'congrats'

export type AppModeEvent = {
  type: 'AppModeChanged'
  mode: AppMode
  timestamp: number
}
