/**
 * タイマーイベントを購読してSFXを再生する橋渡しモジュール。
 * PhaseCompleted(work) でwork完了音、PhaseStarted(congrats) でファンファーレを鳴らす。
 */

import type { EventBus } from '../../domain/shared/EventBus'
import type { TimerEvent } from '../../domain/timer/events/TimerEvents'
import type { SfxPlayer } from '../../infrastructure/audio/SfxPlayer'

export interface TimerSfxConfig {
  workCompleteUrl: string
  fanfareUrl: string
}

const DEFAULT_CONFIG: TimerSfxConfig = {
  workCompleteUrl: './audio/work-complete.mp3',
  fanfareUrl: './audio/fanfare.mp3'
}

export function bridgeTimerToSfx(
  bus: EventBus,
  sfx: SfxPlayer,
  config: Partial<TimerSfxConfig> = {}
): () => void {
  const urls = { ...DEFAULT_CONFIG, ...config }

  const unsubPhase = bus.subscribe<TimerEvent>('PhaseCompleted', (event) => {
    if (event.type === 'PhaseCompleted' && event.phase === 'work') {
      sfx.play(urls.workCompleteUrl).catch(() => {
        // 再生失敗時は無視（ファイル未配置・AudioContext制限など）
      })
    }
  })

  const unsubCongrats = bus.subscribe<TimerEvent>('PhaseStarted', (event) => {
    if (event.type === 'PhaseStarted' && event.phase === 'congrats') {
      sfx.play(urls.fanfareUrl).catch(() => {
        // 再生失敗時は無視
      })
    }
  })

  return () => {
    unsubPhase()
    unsubCongrats()
  }
}
