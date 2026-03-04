import type { EventBus } from '../../domain/shared/EventBus'
import type { PomodoroEvent } from '../timer/PomodoroEvents'
import type { EmotionHistoryService } from './EmotionHistoryService'

/**
 * EventBus のイベントを EmotionHistoryService に接続するブリッジ
 *
 * ライセンス判定は呼び出し側（main.ts）で行うため、ここでは無条件に記録する
 */
export function bridgeEmotionHistory(
  bus: EventBus,
  historyService: EmotionHistoryService
): () => void {
  const unsubCompleted = bus.subscribe<PomodoroEvent>('PomodoroCompleted', () => {
    historyService.recordEvent('pomodoroCompleted')
  })

  const unsubAborted = bus.subscribe<PomodoroEvent>('PomodoroAborted', () => {
    historyService.recordEvent('pomodoroAborted')
  })

  const unsubFed = bus.subscribe<{ type: 'FeedingSuccess' }>('FeedingSuccess', () => {
    historyService.recordEvent('fed')
  })

  return () => {
    unsubCompleted()
    unsubAborted()
    unsubFed()
  }
}
