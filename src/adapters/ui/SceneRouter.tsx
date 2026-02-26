import { useState, useRef, useCallback, useEffect } from 'react'
import { useAppDeps } from './AppContext'
import { useEventBusCallback } from './hooks/useEventBus'
import type { AppSceneEvent } from '../../application/app-scene/AppScene'
import { SceneFree } from './SceneFree'
import { ScenePomodoro } from './ScenePomodoro'
import { SceneFureai } from './SceneFureai'
import { SceneTransition, type SceneTransitionRef } from './SceneTransition'
import { UpdateNotification } from './UpdateNotification'
import { LicenseToast } from './LicenseToast'

type ActiveScene = 'free' | 'pomodoro' | 'fureai'

function toActiveScene(scene: string): ActiveScene {
  if (scene === 'pomodoro') return 'pomodoro'
  if (scene === 'fureai') return 'fureai'
  return 'free'
}

export function SceneRouter(): JSX.Element {
  const { bus, orchestrator } = useAppDeps()

  const [activeScene, setActiveScene] = useState<ActiveScene>(() => {
    return toActiveScene(orchestrator.sceneManager.currentScene)
  })

  const [licenseMode, setLicenseMode] = useState<LicenseMode | null>(null)
  const [serverMessage, setServerMessage] = useState<string | undefined>(undefined)

  const sceneTransitionRef = useRef<SceneTransitionRef>(null)

  // ライセンス状態の購読
  useEffect(() => {
    if (!window.electronAPI?.onLicenseChanged) return
    const unsubscribe = window.electronAPI.onLicenseChanged((state) => {
      const s = state as LicenseState
      setLicenseMode(s.mode)
      setServerMessage(s.serverMessage)
    })
    // 初期ロード
    if (window.electronAPI.checkLicenseStatus) {
      window.electronAPI.checkLicenseStatus().then((s) => {
        const state = s as LicenseState
        setLicenseMode(state.mode)
        setServerMessage(state.serverMessage)
      })
    }
    return unsubscribe
  }, [])

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
      const next = toActiveScene(event.scene)
      if (next !== activeScene) {
        switchScene(next)
      }
    }
  })

  return (
    <>
      {activeScene === 'free' && <SceneFree />}
      {activeScene === 'pomodoro' && <ScenePomodoro />}
      {activeScene === 'fureai' && <SceneFureai />}
      <SceneTransition ref={sceneTransitionRef} />
      <UpdateNotification pomodoroActive={activeScene === 'pomodoro'} />
      <LicenseToast licenseMode={licenseMode} serverMessage={serverMessage} />
    </>
  )
}
