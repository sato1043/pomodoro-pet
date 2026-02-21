/**
 * タイマーイベントを購読してシステム通知を発行する橋渡しモジュール。
 * バックグラウンド時かつ通知有効時のみ通知を発行する。
 */

import type { EventBus } from '../../domain/shared/EventBus'
import type { TimerEvent } from '../../domain/timer/events/TimerEvents'
import type { PomodoroEvent } from '../timer/PomodoroEvents'

export interface NotificationPort {
  show(title: string, body: string): void
}

export function bridgeTimerToNotification(
  bus: EventBus,
  notification: NotificationPort,
  isEnabled: () => boolean,
  isFocused: () => boolean
): () => void {
  function shouldNotify(): boolean {
    return isEnabled() && !isFocused()
  }

  const unsubPhaseCompleted = bus.subscribe<TimerEvent>('PhaseCompleted', (event) => {
    if (event.type !== 'PhaseCompleted') return
    if (!shouldNotify()) return

    if (event.phase === 'work') {
      notification.show('休憩の時間', '作業お疲れ様でした')
    } else if (event.phase === 'break') {
      notification.show('作業の時間', '休憩終了、次の作業に取り掛かりましょう')
    }
    // long-break → PomodoroCompletedでカバー（重複防止）
    // congrats → 内部遷移、通知不要
  })

  const unsubPomodoroCompleted = bus.subscribe<PomodoroEvent>('PomodoroCompleted', (event) => {
    if (event.type !== 'PomodoroCompleted') return
    if (!shouldNotify()) return

    notification.show('サイクル完了！', 'ポモドーロサイクルが完了しました')
  })

  return () => {
    unsubPhaseCompleted()
    unsubPomodoroCompleted()
  }
}
