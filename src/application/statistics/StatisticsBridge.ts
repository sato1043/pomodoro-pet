import type { EventBus } from '../../domain/shared/EventBus'
import type { TimerEvent } from '../../domain/timer/events/TimerEvents'
import type { TimerConfig } from '../../domain/timer/value-objects/TimerConfig'
import type { PomodoroEvent } from '../timer/PomodoroEvents'
import { todayKey } from '../../domain/statistics/StatisticsTypes'
import type { StatisticsService } from './StatisticsService'

export function bridgeTimerToStatistics(
  bus: EventBus,
  statisticsService: StatisticsService,
  getConfig: () => TimerConfig
): () => void {
  const unsubPhaseCompleted = bus.subscribe<TimerEvent>('PhaseCompleted', (event) => {
    if (event.type !== 'PhaseCompleted') return
    const date = todayKey()
    const config = getConfig()

    switch (event.phase) {
      case 'work':
        statisticsService.addWorkPhase(date, config.workDurationMs)
        break
      case 'break':
        statisticsService.addBreakPhase(date, config.breakDurationMs)
        break
      case 'long-break':
        statisticsService.addBreakPhase(date, config.longBreakDurationMs)
        break
      // congrats: 内部遷移、記録不要
    }
  })

  const unsubPomodoroCompleted = bus.subscribe<PomodoroEvent>('PomodoroCompleted', (event) => {
    if (event.type !== 'PomodoroCompleted') return
    statisticsService.addCompletedCycle(todayKey())
  })

  const unsubPomodoroAborted = bus.subscribe<PomodoroEvent>('PomodoroAborted', (event) => {
    if (event.type !== 'PomodoroAborted') return
    statisticsService.addAbortedCycle(todayKey())
  })

  return () => {
    unsubPhaseCompleted()
    unsubPomodoroCompleted()
    unsubPomodoroAborted()
  }
}
