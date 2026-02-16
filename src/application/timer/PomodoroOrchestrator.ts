/**
 * AppScene遷移・タイマー操作・キャラクター行動を一元管理するオーケストレーション層。
 *
 * 階層間連動は直接コールバックで実行し、EventBusはUI/インフラへの通知のみに使用する。
 */

import type { EventBus } from '../../domain/shared/EventBus'
import type { PomodoroStateMachine } from '../../domain/timer/entities/PomodoroStateMachine'
import type { TimerEvent } from '../../domain/timer/events/TimerEvents'
import type { PhaseType } from '../../domain/timer/value-objects/TimerPhase'
import type { AppSceneManager } from '../app-scene/AppSceneManager'
import type { AppSceneEvent } from '../app-scene/AppScene'
import type { CharacterBehavior } from '../../domain/character/value-objects/BehaviorPreset'
import type { PomodoroEvent } from './PomodoroEvents'

/** フェーズ → BehaviorPreset の純粋マッピング */
export function phaseToPreset(phase: PhaseType): CharacterBehavior {
  switch (phase) {
    case 'work': return 'march-cycle'
    case 'break': return 'rest-cycle'
    case 'long-break': return 'joyful-rest'
    case 'congrats': return 'celebrate'
  }
}

export interface PomodoroOrchestratorDeps {
  readonly bus: EventBus
  readonly sceneManager: AppSceneManager
  readonly session: PomodoroStateMachine
  readonly onBehaviorChange: (presetName: CharacterBehavior) => void
}

export interface PomodoroOrchestrator {
  startPomodoro(): void
  exitPomodoro(): void
  pause(): void
  resume(): void
  tick(deltaMs: number): void
  readonly isRunning: boolean
  readonly session: PomodoroStateMachine
  readonly sceneManager: AppSceneManager
  dispose(): void
}

export function createPomodoroOrchestrator(
  deps: PomodoroOrchestratorDeps
): PomodoroOrchestrator {
  const { bus, sceneManager, session, onBehaviorChange } = deps

  function publishTimerEvents(events: TimerEvent[]): void {
    for (const event of events) {
      bus.publish(event.type, event)
    }
  }

  function publishSceneEvents(events: AppSceneEvent[]): void {
    for (const event of events) {
      bus.publish(event.type, event)
    }
  }

  function publishPomodoroEvent(event: PomodoroEvent): void {
    bus.publish(event.type, event)
  }

  function doExitPomodoro(reason: 'abort' | 'complete'): void {
    const sceneEvents = sceneManager.exitPomodoro()
    if (sceneEvents.length === 0) return
    publishSceneEvents(sceneEvents)
    publishTimerEvents(session.reset())
    onBehaviorChange('autonomous')
    publishPomodoroEvent(
      reason === 'abort'
        ? { type: 'PomodoroAborted', timestamp: Date.now() }
        : { type: 'PomodoroCompleted', timestamp: Date.now() }
    )
  }

  return {
    get isRunning() { return session.isRunning },
    get session() { return session },
    get sceneManager() { return sceneManager },

    startPomodoro(): void {
      const sceneEvents = sceneManager.enterPomodoro()
      if (sceneEvents.length === 0) return
      publishSceneEvents(sceneEvents)
      publishTimerEvents(session.reset())
      const startEvents = session.start()
      publishTimerEvents(startEvents)
      onBehaviorChange('march-cycle')
    },

    exitPomodoro(): void {
      doExitPomodoro('abort')
    },

    pause(): void {
      const events = session.pause()
      if (events.length === 0) return
      publishTimerEvents(events)
      onBehaviorChange('autonomous')
    },

    resume(): void {
      const events = session.start()
      if (events.length === 0) return
      publishTimerEvents(events)
      onBehaviorChange(phaseToPreset(session.currentPhase.type))
    },

    tick(deltaMs: number): void {
      const events = session.tick(deltaMs)
      if (events.length === 0) return

      // CycleCompleted検出 → 自動exitPomodoro
      const hasCycleCompleted = events.some(e => e.type === 'CycleCompleted')

      // フェーズ変更検出 → 直接プリセット切替
      for (const event of events) {
        if (event.type === 'PhaseStarted') {
          onBehaviorChange(phaseToPreset(event.phase))
        }
      }

      // EventBusにUI/インフラ向け通知
      publishTimerEvents(events)

      // CycleCompleted後の自動遷移（イベント発行後に実行）
      if (hasCycleCompleted) {
        doExitPomodoro('complete')
      }
    },

    dispose(): void {
      // EventBus購読なし。外部から破棄する必要なし
    }
  }
}
