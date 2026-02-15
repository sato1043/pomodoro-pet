import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPomodoroOrchestrator, phaseToPreset, type PomodoroOrchestrator } from '../../../src/application/timer/PomodoroOrchestrator'
import { createPomodoroStateMachine, type PomodoroStateMachine } from '../../../src/domain/timer/entities/PomodoroStateMachine'
import { createAppSceneManager, type AppSceneManager } from '../../../src/application/app-scene/AppSceneManager'
import { createEventBus, type EventBus } from '../../../src/domain/shared/EventBus'
import { createConfig } from '../../../src/domain/timer/value-objects/TimerConfig'
import { CONGRATS_DURATION_MS } from '../../../src/domain/timer/value-objects/CyclePlan'
import type { TimerEvent } from '../../../src/domain/timer/events/TimerEvents'
import type { AppSceneEvent } from '../../../src/application/app-scene/AppScene'
import type { CharacterBehavior } from '../../../src/domain/character/value-objects/BehaviorPreset'

describe('PomodoroOrchestrator', () => {
  let bus: EventBus
  let sceneManager: AppSceneManager
  let session: PomodoroStateMachine
  let orchestrator: PomodoroOrchestrator
  let behaviorChanges: CharacterBehavior[]

  const testConfig = createConfig(3000, 2000, 4000, 4)

  beforeEach(() => {
    bus = createEventBus()
    sceneManager = createAppSceneManager()
    session = createPomodoroStateMachine(testConfig)
    behaviorChanges = []

    orchestrator = createPomodoroOrchestrator({
      bus,
      sceneManager,
      session,
      onBehaviorChange: (preset) => { behaviorChanges.push(preset) }
    })
  })

  describe('phaseToPreset', () => {
    it('workはmarch-cycleにマッピングされる', () => {
      expect(phaseToPreset('work')).toBe('march-cycle')
    })

    it('breakはrest-cycleにマッピングされる', () => {
      expect(phaseToPreset('break')).toBe('rest-cycle')
    })

    it('long-breakはjoyful-restにマッピングされる', () => {
      expect(phaseToPreset('long-break')).toBe('joyful-rest')
    })

    it('congratsはcelebrateにマッピングされる', () => {
      expect(phaseToPreset('congrats')).toBe('celebrate')
    })
  })

  describe('startPomodoro', () => {
    it('sceneをpomodoroに遷移しタイマーを開始する', () => {
      orchestrator.startPomodoro()

      expect(sceneManager.currentScene).toBe('pomodoro')
      expect(session.isRunning).toBe(true)
    })

    it('AppSceneChanged(pomodoro)をEventBusに発行する', () => {
      const received: AppSceneEvent[] = []
      bus.subscribe<AppSceneEvent>('AppSceneChanged', (e) => received.push(e))

      orchestrator.startPomodoro()

      expect(received).toHaveLength(1)
      expect(received[0]).toMatchObject({ type: 'AppSceneChanged', scene: 'pomodoro' })
    })

    it('PhaseStarted(work)をEventBusに発行する', () => {
      const received: TimerEvent[] = []
      bus.subscribe<TimerEvent>('PhaseStarted', (e) => received.push(e))

      orchestrator.startPomodoro()

      expect(received).toHaveLength(1)
      expect(received[0]).toMatchObject({ type: 'PhaseStarted', phase: 'work' })
    })

    it('onBehaviorChangeにmarch-cycleを直接呼び出す', () => {
      orchestrator.startPomodoro()

      expect(behaviorChanges).toContain('march-cycle')
    })

    it('既にpomodoroの時は何もしない', () => {
      orchestrator.startPomodoro()
      behaviorChanges = []

      orchestrator.startPomodoro()

      expect(behaviorChanges).toHaveLength(0)
    })
  })

  describe('exitPomodoro', () => {
    it('sceneをfreeに遷移しタイマーをリセットする', () => {
      orchestrator.startPomodoro()
      orchestrator.exitPomodoro()

      expect(sceneManager.currentScene).toBe('free')
      expect(session.isRunning).toBe(false)
    })

    it('AppSceneChanged(free)をEventBusに発行する', () => {
      orchestrator.startPomodoro()

      const received: AppSceneEvent[] = []
      bus.subscribe<AppSceneEvent>('AppSceneChanged', (e) => received.push(e))

      orchestrator.exitPomodoro()

      expect(received).toHaveLength(1)
      expect(received[0]).toMatchObject({ type: 'AppSceneChanged', scene: 'free' })
    })

    it('onBehaviorChangeにautonomousを直接呼び出す', () => {
      orchestrator.startPomodoro()
      behaviorChanges = []

      orchestrator.exitPomodoro()

      expect(behaviorChanges).toContain('autonomous')
    })

    it('freeの時にexitPomodoroしても何もしない', () => {
      const received: AppSceneEvent[] = []
      bus.subscribe<AppSceneEvent>('AppSceneChanged', (e) => received.push(e))

      orchestrator.exitPomodoro()

      expect(received).toHaveLength(0)
      expect(behaviorChanges).toHaveLength(0)
    })
  })

  describe('pause', () => {
    it('タイマーを一時停止しautonomousに切り替える', () => {
      orchestrator.startPomodoro()
      behaviorChanges = []

      orchestrator.pause()

      expect(session.isRunning).toBe(false)
      expect(behaviorChanges).toEqual(['autonomous'])
    })

    it('TimerPausedをEventBusに発行する', () => {
      orchestrator.startPomodoro()

      const received: TimerEvent[] = []
      bus.subscribe<TimerEvent>('TimerPaused', (e) => received.push(e))

      orchestrator.pause()

      expect(received).toHaveLength(1)
    })

    it('停止中にpauseしても何もしない', () => {
      orchestrator.pause()
      expect(behaviorChanges).toHaveLength(0)
    })
  })

  describe('resume', () => {
    it('タイマーを再開し現フェーズのプリセットに復帰する', () => {
      orchestrator.startPomodoro()
      orchestrator.pause()
      behaviorChanges = []

      orchestrator.resume()

      expect(session.isRunning).toBe(true)
      expect(behaviorChanges).toEqual(['march-cycle'])
    })

    it('PhaseStartedをEventBusに発行する', () => {
      orchestrator.startPomodoro()
      orchestrator.pause()

      const received: TimerEvent[] = []
      bus.subscribe<TimerEvent>('PhaseStarted', (e) => received.push(e))

      orchestrator.resume()

      expect(received).toHaveLength(1)
    })
  })

  describe('tick', () => {
    it('PhaseStarted時にonBehaviorChangeを直接呼び出す', () => {
      orchestrator.startPomodoro()
      behaviorChanges = []

      // work(3s)完了 → break開始
      orchestrator.tick(3000)

      expect(behaviorChanges).toContain('rest-cycle')
    })

    it('TimerTickedをEventBusに発行する', () => {
      orchestrator.startPomodoro()

      const received: TimerEvent[] = []
      bus.subscribe<TimerEvent>('TimerTicked', (e) => received.push(e))

      orchestrator.tick(1000)

      expect(received).toHaveLength(1)
    })

    it('CycleCompleted時に自動でexitPomodoroする', () => {
      const singleSetConfig = createConfig(3000, 2000, 4000, 1)
      const s = createPomodoroStateMachine(singleSetConfig)
      const orch = createPomodoroOrchestrator({
        bus,
        sceneManager,
        session: s,
        onBehaviorChange: (preset) => { behaviorChanges.push(preset) }
      })

      orch.startPomodoro()
      behaviorChanges = []

      // work(3s) → break(2s) → congrats(5s) → CycleCompleted → auto exit
      orch.tick(3000) // work完了
      orch.tick(2000) // break完了 → congrats
      orch.tick(CONGRATS_DURATION_MS) // congrats完了 → CycleCompleted

      expect(sceneManager.currentScene).toBe('free')
      expect(s.isRunning).toBe(false)
      expect(behaviorChanges).toContain('autonomous')
    })

    it('CycleCompleted時にAppSceneChanged(free)がEventBusに発行される', () => {
      const singleSetConfig = createConfig(3000, 2000, 4000, 1)
      const s = createPomodoroStateMachine(singleSetConfig)
      const orch = createPomodoroOrchestrator({
        bus,
        sceneManager,
        session: s,
        onBehaviorChange: () => {}
      })

      orch.startPomodoro()

      const received: AppSceneEvent[] = []
      bus.subscribe<AppSceneEvent>('AppSceneChanged', (e) => received.push(e))

      orch.tick(3000)
      orch.tick(2000)
      orch.tick(CONGRATS_DURATION_MS)

      const freeEvents = received.filter(e => e.scene === 'free')
      expect(freeEvents).toHaveLength(1)
    })
  })
})
