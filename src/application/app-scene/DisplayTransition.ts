import type { PhaseType } from '../../domain/timer/value-objects/TimerPhase'
import type { AppScene } from './AppScene'

// --- 型定義 ---

export type DisplayScene =
  | 'free'
  | 'pomodoro:work'
  | 'pomodoro:break'
  | 'pomodoro:long-break'
  | 'pomodoro:congrats'

export type TransitionEffect =
  | { type: 'immediate' }
  | { type: 'blackout' }

export interface TransitionRule {
  readonly effect: TransitionEffect
}

export interface DisplaySceneNode {
  readonly transitions: Readonly<Record<string, TransitionRule>>
}

// --- 宣言的シーン遷移グラフ ---

export const DISPLAY_SCENE_GRAPH: Readonly<Record<DisplayScene, DisplaySceneNode>> = {
  'free': {
    transitions: {
      'pomodoro:work': { effect: { type: 'blackout' } }
    }
  },
  'pomodoro:work': {
    transitions: {
      'pomodoro:break':      { effect: { type: 'immediate' } },
      'pomodoro:long-break': { effect: { type: 'immediate' } },
      'pomodoro:congrats':   { effect: { type: 'immediate' } }
    }
  },
  'pomodoro:break': {
    transitions: {
      'pomodoro:work': { effect: { type: 'blackout' } }
    }
  },
  'pomodoro:long-break': {
    transitions: {
      'pomodoro:work': { effect: { type: 'blackout' } }
    }
  },
  'pomodoro:congrats': {
    transitions: {
      'free': { effect: { type: 'blackout' } }
    }
  }
}

// --- 変換ヘルパー ---

export function toDisplayScene(scene: AppScene, phase: PhaseType | null): DisplayScene {
  if (scene === 'free' || scene === 'settings') return 'free'
  if (phase === null) return 'pomodoro:work'
  return `pomodoro:${phase}` as DisplayScene
}

// --- 状態クラス ---

export interface DisplayTransitionState {
  readonly current: DisplayScene
  resolve(target: DisplayScene): TransitionEffect
  advance(target: DisplayScene): void
}

export function createDisplayTransitionState(initial: DisplayScene): DisplayTransitionState {
  let current = initial
  return {
    get current() { return current },
    resolve(target: DisplayScene): TransitionEffect {
      const node = DISPLAY_SCENE_GRAPH[current]
      return node?.transitions[target]?.effect ?? { type: 'immediate' }
    },
    advance(target: DisplayScene): void {
      current = target
    }
  }
}
