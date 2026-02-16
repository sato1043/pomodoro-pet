/**
 * タイマーイベントを購読してSFXを再生する橋渡しモジュール。
 * PhaseCompleted(work) でwork完了音、PhaseStarted(congrats) でファンファーレを鳴らす。
 * break/long-break中はBGMをループ再生し、残り30秒でgetset音に切り替える。
 */

import type { EventBus } from '../../domain/shared/EventBus'
import type { TimerEvent } from '../../domain/timer/events/TimerEvents'
import type { SfxPlayer } from '../../infrastructure/audio/SfxPlayer'
import type { PomodoroEvent } from './PomodoroEvents'

export interface TimerSfxConfig {
  workStartUrl: string
  workStartGain: number
  workCompleteUrl: string
  workCompleteGain: number
  fanfareUrl: string
  fanfareGain: number
  breakStartUrl: string
  breakStartGain: number
  breakChillUrl: string
  breakChillGain: number
  breakGetsetUrl: string
  breakGetsetGain: number
  exitUrl: string
  exitGain: number
}

/** 環境音制御用の最小インターフェース */
export interface AudioControl {
  readonly currentPreset: string
  switchPreset(preset: string): void
}

const GETSET_TRIGGER_IDS = new Set(['break-getset', 'long-break-getset'])
const CROSSFADE_MS = 3000

const DEFAULT_CONFIG: TimerSfxConfig = {
  workStartUrl: './audio/work-start.mp3',
  workStartGain: 1.0,
  workCompleteUrl: './audio/work-complete.mp3',
  workCompleteGain: 1.0,
  fanfareUrl: './audio/fanfare.mp3',
  fanfareGain: 1.0,
  breakStartUrl: './audio/break-start.mp3',
  breakStartGain: 1.0,
  breakChillUrl: './audio/break-chill.mp3',
  breakChillGain: 1.0,
  breakGetsetUrl: './audio/break-getset.mp3',
  breakGetsetGain: 1.0,
  exitUrl: './audio/pomodoro-exit.mp3',
  exitGain: 1.0
}

export function bridgeTimerToSfx(
  bus: EventBus,
  sfx: SfxPlayer,
  config: Partial<TimerSfxConfig> = {},
  audioControl?: AudioControl
): () => void {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  let savedPreset: string | null = null
  let pendingWorkComplete = false

  function restorePreset(): void {
    sfx.stop()
    if (audioControl && savedPreset !== null) {
      audioControl.switchPreset(savedPreset)
      savedPreset = null
    }
  }

  const unsubPhaseCompleted = bus.subscribe<TimerEvent>('PhaseCompleted', (event) => {
    if (event.type === 'PhaseCompleted' && event.phase === 'work') {
      // 次のPhaseStartedで判定するため遅延（congrats→long-breakの場合はスキップ）
      pendingWorkComplete = true
    }
    if (event.type === 'PhaseCompleted' && (event.phase === 'break' || event.phase === 'long-break')) {
      restorePreset()
    }
  })

  const unsubPhaseStarted = bus.subscribe<TimerEvent>('PhaseStarted', (event) => {
    if (event.type === 'PhaseStarted' && event.phase === 'work') {
      sfx.play(cfg.workStartUrl, cfg.workStartGain).catch(() => {
        // 再生失敗時は無視
      })
    }
    if (event.type === 'PhaseStarted' && event.phase === 'congrats') {
      // congrats（→long-break）の場合はwork-completeをスキップしファンファーレのみ
      pendingWorkComplete = false
      sfx.play(cfg.fanfareUrl, cfg.fanfareGain).catch(() => {
        // 再生失敗時は無視
      })
    }
    if (event.type === 'PhaseStarted' && event.phase === 'break') {
      // breakの場合はwork-completeを再生
      if (pendingWorkComplete) {
        pendingWorkComplete = false
        sfx.play(cfg.workCompleteUrl, cfg.workCompleteGain).catch(() => {
          // 再生失敗時は無視
        })
      }
    }
    if (event.type === 'PhaseStarted' && (event.phase === 'break' || event.phase === 'long-break')) {
      sfx.play(cfg.breakStartUrl, cfg.breakStartGain).catch(() => {
        // 再生失敗時は無視
      })
      if (audioControl) {
        savedPreset = audioControl.currentPreset
        audioControl.switchPreset('silence')
      }
      sfx.playLoop(cfg.breakChillUrl, CROSSFADE_MS, cfg.breakChillGain).catch(() => {
        // 再生失敗時は無視
      })
    }
  })

  const unsubTrigger = bus.subscribe<TimerEvent>('TriggerFired', (event) => {
    if (event.type === 'TriggerFired' && GETSET_TRIGGER_IDS.has(event.triggerId)) {
      sfx.playLoop(cfg.breakGetsetUrl, CROSSFADE_MS, cfg.breakGetsetGain).catch(() => {
        // 再生失敗時は無視（playLoopが内部でクロスフェード処理）
      })
    }
  })

  const unsubPaused = bus.subscribe<TimerEvent>('TimerPaused', (event) => {
    if (event.type === 'TimerPaused') {
      sfx.stop()
    }
  })

  const unsubReset = bus.subscribe<TimerEvent>('TimerReset', (event) => {
    if (event.type === 'TimerReset') {
      restorePreset()
    }
  })

  const unsubAborted = bus.subscribe<PomodoroEvent>('PomodoroAborted', (event) => {
    if (event.type === 'PomodoroAborted') {
      sfx.play(cfg.exitUrl, cfg.exitGain).catch(() => {})
    }
  })

  return () => {
    unsubPhaseCompleted()
    unsubPhaseStarted()
    unsubTrigger()
    unsubPaused()
    unsubReset()
    unsubAborted()
  }
}
