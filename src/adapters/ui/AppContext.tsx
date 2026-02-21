import { createContext, useContext } from 'react'
import type { EventBus } from '../../domain/shared/EventBus'
import type { PomodoroStateMachine } from '../../domain/timer/entities/PomodoroStateMachine'
import type { TimerConfig } from '../../domain/timer/value-objects/TimerConfig'
import type { PomodoroOrchestrator } from '../../application/timer/PomodoroOrchestrator'
import type { AppSettingsService } from '../../application/settings/AppSettingsService'
import type { AudioAdapter } from '../../infrastructure/audio/AudioAdapter'
import type { SfxPlayer } from '../../infrastructure/audio/SfxPlayer'
import type { Character } from '../../domain/character/entities/Character'
import type { BehaviorStateMachine } from '../../domain/character/services/BehaviorStateMachine'
import type { ThreeCharacterHandle } from '../three/ThreeCharacterAdapter'
import type { StatisticsService } from '../../application/statistics/StatisticsService'

export interface AppDeps {
  readonly bus: EventBus
  readonly session: PomodoroStateMachine
  readonly config: TimerConfig
  readonly orchestrator: PomodoroOrchestrator
  readonly settingsService: AppSettingsService
  readonly audio: AudioAdapter
  readonly sfx: SfxPlayer | null
  readonly debugTimer: boolean
  readonly character: Character
  readonly behaviorSM: BehaviorStateMachine
  readonly charHandle: ThreeCharacterHandle
  readonly statisticsService: StatisticsService
}

const AppContext = createContext<AppDeps | null>(null)

export function useAppDeps(): AppDeps {
  const deps = useContext(AppContext)
  if (!deps) throw new Error('useAppDeps must be used within AppProvider')
  return deps
}

export const AppProvider = AppContext.Provider
