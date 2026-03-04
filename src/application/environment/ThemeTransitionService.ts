import type { EnvironmentThemeParams } from '../../domain/environment/value-objects/EnvironmentTheme'
import {
  startThemeTransition,
  tickThemeTransition,
  themeParamsEqual,
  type ThemeTransitionState,
} from '../../domain/environment/value-objects/ThemeLerp'
import { lerpThemeParams, smoothstep } from '../../domain/environment/value-objects/ThemeLerp'

export interface ThemeTransitionService {
  transitionTo(target: EnvironmentThemeParams, durationMs: number): void
  applyImmediate(target: EnvironmentThemeParams): void
  tick(deltaMs: number): EnvironmentThemeParams | null
  readonly isTransitioning: boolean
  readonly currentParams: EnvironmentThemeParams | null
}

export function createThemeTransitionService(): ThemeTransitionService {
  let current: EnvironmentThemeParams | null = null
  let transitionState: ThemeTransitionState | null = null

  return {
    transitionTo(target: EnvironmentThemeParams, durationMs: number): void {
      if (current === null) {
        current = target
        transitionState = null
        return
      }
      if (themeParamsEqual(current, target) && transitionState === null) {
        return
      }
      const from = transitionState !== null
        ? currentInterpolatedParams(transitionState)
        : current
      transitionState = startThemeTransition(from, target, durationMs)
    },

    applyImmediate(target: EnvironmentThemeParams): void {
      current = target
      transitionState = null
    },

    tick(deltaMs: number): EnvironmentThemeParams | null {
      if (transitionState === null) {
        return null
      }
      const result = tickThemeTransition(transitionState, deltaMs)
      if (result.status === 'completed') {
        current = result.params
        transitionState = null
        return result.params
      }
      transitionState = result.state
      return result.params
    },

    get isTransitioning(): boolean {
      return transitionState !== null
    },

    get currentParams(): EnvironmentThemeParams | null {
      return current
    },
  }
}

function currentInterpolatedParams(state: ThemeTransitionState): EnvironmentThemeParams {
  const rawT = state.durationMs > 0 ? state.elapsedMs / state.durationMs : 1
  const t = smoothstep(Math.min(rawT, 1))
  return lerpThemeParams(state.from, state.to, t)
}
