import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAppDeps } from './AppContext'
import { useEventBusCallback, useEventBusTrigger } from './hooks/useEventBus'
import type { TimerEvent } from '../../domain/timer/events/TimerEvents'
import type { AppSceneEvent } from '../../application/app-scene/AppScene'
import {
  createDisplayTransitionState,
  toDisplayScene,
  displaySceneToMode,
  type DisplayScene,
  type DisplayTransitionState,
} from '../../application/app-scene/DisplayTransition'
import { overlayTintBg } from './PomodoroTimerPanel'
import { FreeTimerPanel } from './FreeTimerPanel'
import { PomodoroTimerPanel } from './PomodoroTimerPanel'
import { CongratsPanel } from './CongratsPanel'
import { SceneTransition, type SceneTransitionRef } from './SceneTransition'
import * as overlayStyles from './styles/timer-overlay.css'

type DisplayMode = 'free' | 'pomodoro' | 'congrats'

export function TimerOverlay(): JSX.Element {
  const { bus, session, config, orchestrator } = useAppDeps()

  const [mode, setMode] = useState<DisplayMode>(() => {
    const initialScene = orchestrator.sceneManager.currentScene
    const ds = toDisplayScene(initialScene, null)
    return displaySceneToMode(ds)
  })
  const [congratsKey, setCongratsKey] = useState(0)

  const sceneTransitionRef = useRef<SceneTransitionRef>(null)
  const displayTransitionRef = useRef<DisplayTransitionState>(() => {
    const initialScene = orchestrator.sceneManager.currentScene
    return createDisplayTransitionState(toDisplayScene(initialScene, null))
  })

  // displayTransitionの初期化（refの遅延初期化）
  useEffect(() => {
    const initialScene = orchestrator.sceneManager.currentScene
    displayTransitionRef.current = createDisplayTransitionState(toDisplayScene(initialScene, null))
  }, [orchestrator])

  // microtaskコアレシングによるトランジション実行
  const pendingTargetRef = useRef<DisplayScene | null>(null)
  const flushScheduledRef = useRef(false)

  const flushTransition = useCallback(() => {
    flushScheduledRef.current = false
    const target = pendingTargetRef.current
    if (!target) return
    pendingTargetRef.current = null

    const dt = displayTransitionRef.current
    const effect = dt.resolve(target)
    const doSwitch = (): void => {
      const newMode = displaySceneToMode(target)
      setMode(newMode)
      if (newMode === 'congrats') {
        setCongratsKey(k => k + 1)
      }
      dt.advance(target)
    }

    if (effect.type === 'blackout' && sceneTransitionRef.current && !sceneTransitionRef.current.isPlaying) {
      sceneTransitionRef.current.playBlackout(doSwitch)
    } else {
      doSwitch()
    }
  }, [])

  const requestTransition = useCallback((target: DisplayScene) => {
    pendingTargetRef.current = target
    if (!flushScheduledRef.current) {
      flushScheduledRef.current = true
      queueMicrotask(flushTransition)
    }
  }, [flushTransition])

  // EventBus購読
  useEventBusCallback<TimerEvent>(bus, 'PhaseStarted', (event) => {
    if (event.type === 'PhaseStarted') {
      requestTransition(toDisplayScene('pomodoro', event.phase))
    }
  })

  useEventBusCallback<AppSceneEvent>(bus, 'AppSceneChanged', (event) => {
    if (event.type === 'AppSceneChanged') {
      if (event.scene === 'free' || event.scene === 'pomodoro') {
        requestTransition(toDisplayScene(event.scene, null))
      }
    }
  })

  // TimerTicked / TimerReset で再レンダリング
  useEventBusTrigger(bus, 'TimerTicked', 'TimerReset', 'TimerPaused')

  // overlay背景のティント計算
  const overlayBackground = mode === 'pomodoro'
    ? (() => {
        const phase = session.currentPhase.type
        const dur = session.currentPhase.durationMs
        const progress = Math.max(0, Math.min(1, (dur - session.remainingMs) / dur))
        return overlayTintBg(phase, progress)
      })()
    : undefined

  // 旧命令型コードと同じDOM構造を再現するため、document.bodyへポータル化
  // #app-root内ではなくbody直下に配置することでpointer-events階層の問題を回避
  return createPortal(
    <>
      <div id="timer-overlay" className={overlayStyles.overlay} style={{
          ...(overlayBackground ? { background: overlayBackground } : {}),
        }}>
        {mode !== 'pomodoro' && mode !== 'congrats' && (
          <div className={overlayStyles.title}>Pomodoro Pet</div>
        )}

        {mode === 'free' && (
          <FreeTimerPanel />
        )}

        {mode === 'pomodoro' && (
          <PomodoroTimerPanel
            session={session}
            config={config}
            orchestrator={orchestrator}
          />
        )}

        {mode === 'congrats' && (
          <CongratsPanel triggerKey={congratsKey} />
        )}

      </div>
      <SceneTransition ref={sceneTransitionRef} />
    </>,
    document.body
  )
}
