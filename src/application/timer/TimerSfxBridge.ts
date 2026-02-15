/**
 * タイマーイベントを購読してSFXを再生する橋渡しモジュール。
 * PhaseCompleted(work) でwork完了音、AppModeChanged(congrats) でファンファーレを鳴らす。
 */

import type { EventBus } from '../../domain/shared/EventBus'
import type { TimerEvent } from '../../domain/timer/events/TimerEvents'
import type { AppModeEvent } from '../app-mode/AppMode'
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

  const unsubAppMode = bus.subscribe<AppModeEvent>('AppModeChanged', (event) => {
    if (event.type === 'AppModeChanged' && event.mode === 'congrats') {
      sfx.play(urls.fanfareUrl).catch(() => {
        // 再生失敗時は無視
      })
    }
  })

  return () => {
    unsubPhase()
    unsubAppMode()
  }
}
