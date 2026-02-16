import type { PomodoroStateMachine } from '../../domain/timer/entities/PomodoroStateMachine'
import type { TimerConfig } from '../../domain/timer/value-objects/TimerConfig'
import type { TimerEvent } from '../../domain/timer/events/TimerEvents'
import type { EventBus } from '../../domain/shared/EventBus'
import type { AppSceneEvent } from '../../application/app-scene/AppScene'
import type { PomodoroOrchestrator } from '../../application/timer/PomodoroOrchestrator'
import type { AppSettingsService } from '../../application/settings/AppSettingsService'
import type { AudioAdapter } from '../../infrastructure/audio/AudioAdapter'
import type { SfxPlayer } from '../../infrastructure/audio/SfxPlayer'
import { createFreeTimerPanel } from './FreeTimerPanel'
import { createPomodoroTimerPanel } from './PomodoroTimerPanel'
import { createCongratsPanel } from './CongratsPanel'

export interface TimerOverlayElements {
  container: HTMLDivElement
  refreshVolume: () => void
  dispose: () => void
}

export function createTimerOverlay(
  session: PomodoroStateMachine,
  bus: EventBus,
  config: TimerConfig,
  orchestrator: PomodoroOrchestrator,
  settingsService: AppSettingsService,
  audio: AudioAdapter,
  sfx: SfxPlayer | null = null,
  debugTimer = false
): TimerOverlayElements {

  // サブコンポーネント生成
  const freePanel = createFreeTimerPanel({
    config, settingsService, orchestrator, audio, sfx, debugTimer
  })
  const pomodoroPanel = createPomodoroTimerPanel({
    session, config, orchestrator
  })
  const congratsPanel = createCongratsPanel()

  // コンテナ組み立て
  const container = document.createElement('div')
  container.id = 'timer-overlay'
  container.innerHTML = `<div class="timer-overlay-title">Pomodoro Pet</div>`

  const titleEl = container.querySelector('.timer-overlay-title') as HTMLDivElement

  // overlay直下に配置する要素
  container.appendChild(pomodoroPanel.dotsEl)
  container.appendChild(freePanel.container)
  container.appendChild(pomodoroPanel.pauseResumeEl)
  container.appendChild(pomodoroPanel.stopEl)
  container.appendChild(pomodoroPanel.container)
  container.appendChild(congratsPanel.container)

  // スタイル集約
  const style = document.createElement('style')
  style.textContent = `
    #timer-overlay {
      position: fixed;
      top: 20px;
      left: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.75);
      color: #fff;
      border-radius: 12px;
      padding: 56px 12px 28px 14px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      text-align: center;
      z-index: 1000;
      backdrop-filter: blur(8px);
      user-select: none;
      pointer-events: none;
      transition: background 0.3s ease;
    }
    .timer-overlay-title,
    #settings-trigger {
      pointer-events: auto;
    }
    .timer-overlay-title {
      position: absolute;
      top: 40px;
      left: 16px;
      transform: translateY(-50%);
      font-size: 26px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.6);
      text-align: left;
    }
    ${freePanel.style}
    ${pomodoroPanel.style}
    ${congratsPanel.style}
  `
  document.head.appendChild(style)

  // モード切替
  function switchToMode(mode: 'free' | 'pomodoro' | 'congrats'): void {
    freePanel.container.style.display = 'none'
    pomodoroPanel.container.style.display = 'none'
    congratsPanel.container.style.display = 'none'

    if (mode === 'free') {
      titleEl.style.display = ''
      pomodoroPanel.dotsEl.style.display = 'none'
      pomodoroPanel.pauseResumeEl.style.display = 'none'
      pomodoroPanel.stopEl.style.display = 'none'
      freePanel.container.style.display = ''
      container.style.background = ''
      freePanel.syncSettings()
    } else if (mode === 'pomodoro') {
      titleEl.style.display = 'none'
      pomodoroPanel.dotsEl.style.display = ''
      pomodoroPanel.pauseResumeEl.style.display = ''
      pomodoroPanel.stopEl.style.display = ''
      pomodoroPanel.container.style.display = ''
      pomodoroPanel.updateDisplay()
      pomodoroPanel.applyTint(container)
    } else if (mode === 'congrats') {
      titleEl.style.display = 'none'
      pomodoroPanel.dotsEl.style.display = 'none'
      pomodoroPanel.pauseResumeEl.style.display = 'none'
      pomodoroPanel.stopEl.style.display = 'none'
      congratsPanel.container.style.display = ''
      congratsPanel.spawnConfetti()
    }
  }

  // EventBus購読
  const unsubTick = bus.subscribe('TimerTicked', () => {
    pomodoroPanel.updateDisplay()
    pomodoroPanel.applyTint(container)
  })
  const unsubPhase = bus.subscribe<TimerEvent>('PhaseStarted', (event) => {
    if (event.type === 'PhaseStarted' && event.phase === 'congrats') {
      switchToMode('congrats')
    } else if (event.type === 'PhaseStarted') {
      switchToMode('pomodoro')
      pomodoroPanel.updateDisplay()
      pomodoroPanel.applyTint(container)
    }
  })
  const unsubReset = bus.subscribe('TimerReset', () => {
    pomodoroPanel.updateDisplay()
    pomodoroPanel.applyTint(container)
  })
  const unsubScene = bus.subscribe<AppSceneEvent>('AppSceneChanged', (event) => {
    if (event.type === 'AppSceneChanged') {
      if (event.scene === 'free' || event.scene === 'pomodoro') {
        switchToMode(event.scene)
      }
    }
  })

  // 初期シーン判定
  const initialScene = orchestrator.sceneManager.currentScene
  if (initialScene === 'free' || initialScene === 'pomodoro') {
    switchToMode(initialScene)
  }

  return {
    container,
    refreshVolume() {
      freePanel.refreshVolume()
    },
    dispose() {
      freePanel.dispose()
      unsubTick()
      unsubPhase()
      unsubReset()
      unsubScene()
      style.remove()
      container.remove()
    }
  }
}
