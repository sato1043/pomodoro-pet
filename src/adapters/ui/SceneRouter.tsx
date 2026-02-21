import { useState, useRef, useCallback } from 'react'
import { useAppDeps } from './AppContext'
import { useEventBusCallback } from './hooks/useEventBus'
import type { AppSceneEvent } from '../../application/app-scene/AppScene'
import { SceneFree } from './SceneFree'
import { ScenePomodoro } from './ScenePomodoro'
import { SceneTransition, type SceneTransitionRef } from './SceneTransition'

type ActiveScene = 'free' | 'pomodoro'

export function SceneRouter(): JSX.Element {
  const { bus, orchestrator } = useAppDeps()

  const [activeScene, setActiveScene] = useState<ActiveScene>(() => {
    const current = orchestrator.sceneManager.currentScene
    return current === 'pomodoro' ? 'pomodoro' : 'free'
  })

  const sceneTransitionRef = useRef<SceneTransitionRef>(null)

  const switchScene = useCallback((next: ActiveScene) => {
    if (sceneTransitionRef.current && !sceneTransitionRef.current.isPlaying) {
      sceneTransitionRef.current.playBlackout(() => {
        setActiveScene(next)
      })
    } else {
      setActiveScene(next)
    }
  }, [])

  useEventBusCallback<AppSceneEvent>(bus, 'AppSceneChanged', (event) => {
    if (event.type === 'AppSceneChanged') {
      const next: ActiveScene = event.scene === 'pomodoro' ? 'pomodoro' : 'free'
      if (next !== activeScene) {
        switchScene(next)
      }
    }
  })

  return (
    <>
      {activeScene === 'free' && <SceneFree />}
      {activeScene === 'pomodoro' && <ScenePomodoro />}
      <SceneTransition ref={sceneTransitionRef} />
    </>
  )
}
