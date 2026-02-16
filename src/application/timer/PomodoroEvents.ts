export type PomodoroEvent =
  | { type: 'PomodoroAborted'; timestamp: number }
  | { type: 'PomodoroCompleted'; timestamp: number }
