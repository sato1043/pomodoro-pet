/**
 * AppSceneChangedイベントを購読し、ポモドーロ中のOSスリープを抑制する橋渡しモジュール。
 * 設定でpreventSleepが有効かつscene='pomodoro'の場合のみスリープ抑制を開始する。
 */

import type { EventBus } from '../../domain/shared/EventBus'
import type { AppSceneEvent } from '../app-scene/AppScene'

export interface SleepPreventionPort {
  start(): void
  stop(): void
}

export function bridgePomodoroToSleepPrevention(
  bus: EventBus,
  port: SleepPreventionPort,
  isEnabled: () => boolean
): () => void {
  let active = false

  const unsubscribe = bus.subscribe<AppSceneEvent>('AppSceneChanged', (event) => {
    if (event.scene === 'pomodoro') {
      if (!active && isEnabled()) {
        port.start()
        active = true
      }
    } else {
      if (active) {
        port.stop()
        active = false
      }
    }
  })

  return () => {
    unsubscribe()
    if (active) {
      port.stop()
      active = false
    }
  }
}
