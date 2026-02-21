import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEventBus, type EventBus } from '../../../src/domain/shared/EventBus'
import type { TimerEvent } from '../../../src/domain/timer/events/TimerEvents'
import type { PomodoroEvent } from '../../../src/application/timer/PomodoroEvents'
import type { TimerConfig } from '../../../src/domain/timer/value-objects/TimerConfig'
import type { StatisticsService } from '../../../src/application/statistics/StatisticsService'
import { bridgeTimerToStatistics } from '../../../src/application/statistics/StatisticsBridge'
import * as StatisticsTypes from '../../../src/domain/statistics/StatisticsTypes'

function createMockStatisticsService(): StatisticsService & {
  addWorkPhase: ReturnType<typeof vi.fn>
  addBreakPhase: ReturnType<typeof vi.fn>
  addCompletedCycle: ReturnType<typeof vi.fn>
  addAbortedCycle: ReturnType<typeof vi.fn>
} {
  return {
    loadFromStorage: vi.fn().mockResolvedValue(undefined),
    getDailyStats: vi.fn().mockReturnValue(StatisticsTypes.emptyDailyStats()),
    getRange: vi.fn().mockReturnValue([]),
    addWorkPhase: vi.fn(),
    addBreakPhase: vi.fn(),
    addCompletedCycle: vi.fn(),
    addAbortedCycle: vi.fn(),
  }
}

const TEST_CONFIG: TimerConfig = {
  workDurationMs: 25 * 60 * 1000,
  breakDurationMs: 5 * 60 * 1000,
  longBreakDurationMs: 15 * 60 * 1000,
  setsPerCycle: 2,
}

describe('StatisticsBridge', () => {
  let bus: EventBus
  let statsService: ReturnType<typeof createMockStatisticsService>
  let unsubscribe: () => void

  beforeEach(() => {
    bus = createEventBus()
    statsService = createMockStatisticsService()
    vi.spyOn(StatisticsTypes, 'todayKey').mockReturnValue('2025-01-15')
    unsubscribe = bridgeTimerToStatistics(bus, statsService, () => TEST_CONFIG)
  })

  it('PhaseCompleted(work)でaddWorkPhaseが呼ばれる', () => {
    const event: TimerEvent = { type: 'PhaseCompleted', phase: 'work', timestamp: Date.now() }
    bus.publish('PhaseCompleted', event)

    expect(statsService.addWorkPhase).toHaveBeenCalledWith('2025-01-15', 25 * 60 * 1000)
  })

  it('PhaseCompleted(break)でaddBreakPhaseが呼ばれる', () => {
    const event: TimerEvent = { type: 'PhaseCompleted', phase: 'break', timestamp: Date.now() }
    bus.publish('PhaseCompleted', event)

    expect(statsService.addBreakPhase).toHaveBeenCalledWith('2025-01-15', 5 * 60 * 1000)
  })

  it('PhaseCompleted(long-break)でaddBreakPhaseがlongBreakDurationMsで呼ばれる', () => {
    const event: TimerEvent = { type: 'PhaseCompleted', phase: 'long-break', timestamp: Date.now() }
    bus.publish('PhaseCompleted', event)

    expect(statsService.addBreakPhase).toHaveBeenCalledWith('2025-01-15', 15 * 60 * 1000)
  })

  it('PhaseCompleted(congrats)では何も記録されない', () => {
    const event: TimerEvent = { type: 'PhaseCompleted', phase: 'congrats', timestamp: Date.now() }
    bus.publish('PhaseCompleted', event)

    expect(statsService.addWorkPhase).not.toHaveBeenCalled()
    expect(statsService.addBreakPhase).not.toHaveBeenCalled()
  })

  it('PomodoroCompletedでaddCompletedCycleが呼ばれる', () => {
    const event: PomodoroEvent = { type: 'PomodoroCompleted', timestamp: Date.now() }
    bus.publish('PomodoroCompleted', event)

    expect(statsService.addCompletedCycle).toHaveBeenCalledWith('2025-01-15')
  })

  it('PomodoroAbortedでaddAbortedCycleが呼ばれる', () => {
    const event: PomodoroEvent = { type: 'PomodoroAborted', timestamp: Date.now() }
    bus.publish('PomodoroAborted', event)

    expect(statsService.addAbortedCycle).toHaveBeenCalledWith('2025-01-15')
  })

  it('解除関数で全購読が解除される', () => {
    unsubscribe()

    bus.publish('PhaseCompleted', { type: 'PhaseCompleted', phase: 'work', timestamp: Date.now() })
    bus.publish('PomodoroCompleted', { type: 'PomodoroCompleted', timestamp: Date.now() })
    bus.publish('PomodoroAborted', { type: 'PomodoroAborted', timestamp: Date.now() })

    expect(statsService.addWorkPhase).not.toHaveBeenCalled()
    expect(statsService.addCompletedCycle).not.toHaveBeenCalled()
    expect(statsService.addAbortedCycle).not.toHaveBeenCalled()
  })
})
