import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEventBus } from '../../../src/domain/shared/EventBus'
import { bridgePomodoroToSleepPrevention, type SleepPreventionPort } from '../../../src/application/sleep-prevention/SleepPreventionBridge'
import type { EventBus } from '../../../src/domain/shared/EventBus'
import type { AppSceneEvent } from '../../../src/application/app-scene/AppScene'

describe('SleepPreventionBridge', () => {
  let bus: EventBus
  let port: SleepPreventionPort

  beforeEach(() => {
    bus = createEventBus()
    port = { start: vi.fn(), stop: vi.fn() }
  })

  function publishScene(scene: AppSceneEvent['scene']): void {
    bus.publish<AppSceneEvent>('AppSceneChanged', {
      type: 'AppSceneChanged',
      scene,
      timestamp: Date.now(),
    })
  }

  it('scene=pomodoro + enabled → port.start()が呼ばれる', () => {
    bridgePomodoroToSleepPrevention(bus, port, () => true)
    publishScene('pomodoro')
    expect(port.start).toHaveBeenCalledOnce()
  })

  it('scene=pomodoro + disabled → port.start()が呼ばれない', () => {
    bridgePomodoroToSleepPrevention(bus, port, () => false)
    publishScene('pomodoro')
    expect(port.start).not.toHaveBeenCalled()
  })

  it('scene=free（pomodoro後） → port.stop()が呼ばれる', () => {
    bridgePomodoroToSleepPrevention(bus, port, () => true)
    publishScene('pomodoro')
    publishScene('free')
    expect(port.stop).toHaveBeenCalledOnce()
  })

  it('ポモドーロ中にscene=pomodoroが再度来ても二重startしない', () => {
    bridgePomodoroToSleepPrevention(bus, port, () => true)
    publishScene('pomodoro')
    publishScene('pomodoro')
    expect(port.start).toHaveBeenCalledOnce()
  })

  it('active=falseの状態でscene=freeが来てもport.stop()は呼ばれない', () => {
    bridgePomodoroToSleepPrevention(bus, port, () => true)
    publishScene('free')
    expect(port.stop).not.toHaveBeenCalled()
  })

  it('返却関数で購読解除される', () => {
    const dispose = bridgePomodoroToSleepPrevention(bus, port, () => true)
    dispose()
    publishScene('pomodoro')
    expect(port.start).not.toHaveBeenCalled()
  })

  it('返却関数呼び出し時にactive=trueならport.stop()が呼ばれる', () => {
    const dispose = bridgePomodoroToSleepPrevention(bus, port, () => true)
    publishScene('pomodoro')
    dispose()
    expect(port.stop).toHaveBeenCalledOnce()
  })

  it('返却関数呼び出し時にactive=falseならport.stop()は呼ばれない', () => {
    const dispose = bridgePomodoroToSleepPrevention(bus, port, () => true)
    dispose()
    expect(port.stop).not.toHaveBeenCalled()
  })
})
