import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAppDeps } from './AppContext'
import { useEventBusCallback, useEventBusTrigger } from './hooks/useEventBus'
import type { TimerEvent } from '../../domain/timer/events/TimerEvents'
import {
  createDisplayTransitionState,
  toDisplayScene,
  type DisplayScene,
} from '../../application/app-scene/DisplayTransition'
import { overlayTintBg } from './PomodoroTimerPanel'
import { PomodoroTimerPanel } from './PomodoroTimerPanel'
import { CongratsPanel } from './CongratsPanel'
import { SceneTransition, type SceneTransitionRef } from './SceneTransition'
import * as overlayStyles from './styles/overlay.css'

type PomodoroMode = 'pomodoro' | 'congrats'

function displaySceneToMode(ds: DisplayScene): PomodoroMode {
  return ds === 'pomodoro:congrats' ? 'congrats' : 'pomodoro'
}

export function OverlayPomodoro(): JSX.Element {
  const { bus, session, config, orchestrator } = useAppDeps()

  const [mode, setMode] = useState<PomodoroMode>(() => {
    const phase = session.currentPhase.type
    const ds = toDisplayScene('pomodoro', phase)
    return displaySceneToMode(ds)
  })
  const [congratsKey, setCongratsKey] = useState(0)

  const sceneTransitionRef = useRef<SceneTransitionRef>(null)
  const displayTransitionRef = useRef(
    createDisplayTransitionState(toDisplayScene('pomodoro', session.currentPhase.type))
  )

  const handleTransition = useCallback((target: DisplayScene) => {
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

  useEventBusCallback<TimerEvent>(bus, 'PhaseStarted', (event) => {
    if (event.type === 'PhaseStarted') {
      handleTransition(toDisplayScene('pomodoro', event.phase))
    }
  })

  useEventBusTrigger(bus, 'TimerTicked', 'TimerReset', 'TimerPaused')

  const overlayBackground = mode === 'pomodoro'
    ? (() => {
        const phase = session.currentPhase.type
        const dur = session.currentPhase.durationMs
        const progress = Math.max(0, Math.min(1, (dur - session.remainingMs) / dur))
        return overlayTintBg(phase, progress)
      })()
    : undefined

  return createPortal(
    <>
      <div data-testid="overlay-pomodoro" className={overlayStyles.overlay} style={{
          ...(overlayBackground ? { background: overlayBackground } : {}),
        }}>
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
