/**
 * タイマーイベントを購読してSFXを再生する橋渡しモジュール。
 * PhaseCompleted(work) でファンファーレを鳴らす。
 */

import type { EventBus } from '../../domain/shared/EventBus'
import type { TimerEvent } from '../../domain/timer/events/TimerEvents'
import type { SfxPlayer } from '../../infrastructure/audio/SfxPlayer'

const DEFAULT_FANFARE_URL = './audio/fanfare.mp3'

export function bridgeTimerToSfx(
  bus: EventBus,
  sfx: SfxPlayer,
  fanfareUrl: string = DEFAULT_FANFARE_URL
): () => void {
  const unsub = bus.subscribe<TimerEvent>('PhaseCompleted', (event) => {
    if (event.type === 'PhaseCompleted' && event.phase === 'work') {
      sfx.play(fanfareUrl).catch(() => {
        // 再生失敗時は無視（ユーザー操作前のAudioContext制限など）
      })
    }
  })

  return unsub
}
