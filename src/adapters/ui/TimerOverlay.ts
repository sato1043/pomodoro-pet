import type { PomodoroSession } from '../../domain/timer/entities/PomodoroSession'
import type { TimerConfig } from '../../domain/timer/value-objects/TimerConfig'
import type { PhaseType } from '../../domain/timer/value-objects/TimerPhase'
import type { EventBus } from '../../domain/shared/EventBus'
import type { AppModeManager } from '../../application/app-mode/AppModeManager'
import type { AppModeEvent } from '../../application/app-mode/AppMode'
import { pauseTimer } from '../../application/timer/TimerUseCases'

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function phaseLabel(type: PhaseType): string {
  switch (type) {
    case 'work': return 'WORK'
    case 'break': return 'BREAK'
    case 'long-break': return 'LONG BREAK'
  }
}

function buildFlowText(
  phaseType: PhaseType,
  currentSet: number,
  totalSets: number,
  config: TimerConfig
): string {
  const workMin = Math.round(config.workDurationMs / 60000)

  if (phaseType === 'long-break') {
    const longMin = Math.round(config.longBreakDurationMs / 60000)
    return `▸ ${longMin}min long break`
  }

  if (currentSet >= totalSets && phaseType === 'work') {
    const longMin = Math.round(config.longBreakDurationMs / 60000)
    return `▸ ${workMin}min work → ${longMin}min long break`
  }

  const breakMin = Math.round(config.breakDurationMs / 60000)
  return `▸ ${workMin}min work → ${breakMin}min break`
}

function buildProgressDots(completedSets: number, totalSets: number): string {
  const dots = Array.from({ length: totalSets }, (_, i) =>
    i < completedSets ? '●' : '○'
  ).join('')
  return `[${dots}]`
}

export interface TimerOverlayElements {
  container: HTMLDivElement
  dispose: () => void
}

export function createTimerOverlay(
  session: PomodoroSession,
  bus: EventBus,
  config: TimerConfig,
  appModeManager: AppModeManager
): TimerOverlayElements {
  const container = document.createElement('div')
  container.id = 'timer-overlay'
  container.innerHTML = `
    <div class="timer-free-mode" id="timer-free-mode">
      <button id="btn-enter-pomodoro" class="timer-btn timer-btn-primary">Start Pomodoro</button>
    </div>
    <div class="timer-pomodoro-mode" id="timer-pomodoro-mode" style="display:none">
      <div class="timer-set-info" id="timer-set-info">Set 1 / 4</div>
      <div class="timer-phase-time">
        <span class="timer-phase" id="timer-phase">WORK</span>
        <span class="timer-display" id="timer-display">25:00</span>
      </div>
      <div class="timer-flow" id="timer-flow">▸ 25min work → 5min break</div>
      <div class="timer-progress" id="timer-progress">[○○○○]</div>
      <div class="timer-controls">
        <button id="btn-pause" class="timer-btn">Pause</button>
        <button id="btn-resume" class="timer-btn" style="display:none">Resume</button>
        <button id="btn-exit-pomodoro" class="timer-btn timer-btn-exit">Exit</button>
      </div>
    </div>
  `

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
      padding: 56px 28px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      text-align: center;
      z-index: 1000;
      backdrop-filter: blur(8px);
      user-select: none;
    }
    .timer-set-info {
      font-size: 12px;
      color: #aaa;
      margin-bottom: 4px;
      letter-spacing: 1px;
    }
    .timer-phase-time {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 12px;
    }
    .timer-phase {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 2px;
      color: #4caf50;
    }
    .timer-phase.break {
      color: #42a5f5;
    }
    .timer-phase.long-break {
      color: #ab47bc;
    }
    .timer-display {
      font-size: 48px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      line-height: 1.1;
    }
    .timer-flow {
      font-size: 11px;
      color: #888;
      margin: 4px 0;
    }
    .timer-progress {
      font-size: 16px;
      letter-spacing: 4px;
      margin-bottom: 12px;
    }
    .timer-controls {
      display: flex;
      gap: 8px;
      justify-content: center;
    }
    .timer-btn {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      padding: 6px 16px;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .timer-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.25);
    }
    .timer-btn:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .timer-btn-primary {
      background: rgba(76, 175, 80, 0.3);
      border-color: rgba(76, 175, 80, 0.5);
      font-size: 16px;
      padding: 10px 24px;
    }
    .timer-btn-primary:hover {
      background: rgba(76, 175, 80, 0.5);
    }
    .timer-btn-exit {
      background: rgba(244, 67, 54, 0.2);
      border-color: rgba(244, 67, 54, 0.4);
    }
    .timer-btn-exit:hover {
      background: rgba(244, 67, 54, 0.35);
    }
  `
  document.head.appendChild(style)

  const freeModeEl = container.querySelector('#timer-free-mode') as HTMLDivElement
  const pomodoroModeEl = container.querySelector('#timer-pomodoro-mode') as HTMLDivElement
  const setInfoEl = container.querySelector('#timer-set-info') as HTMLDivElement
  const displayEl = container.querySelector('#timer-display') as HTMLSpanElement
  const phaseEl = container.querySelector('#timer-phase') as HTMLSpanElement
  const flowEl = container.querySelector('#timer-flow') as HTMLDivElement
  const progressEl = container.querySelector('#timer-progress') as HTMLDivElement
  const btnEnterPomodoro = container.querySelector('#btn-enter-pomodoro') as HTMLButtonElement
  const btnPause = container.querySelector('#btn-pause') as HTMLButtonElement
  const btnResume = container.querySelector('#btn-resume') as HTMLButtonElement
  const btnExitPomodoro = container.querySelector('#btn-exit-pomodoro') as HTMLButtonElement

  function publishAppModeEvents(events: AppModeEvent[]): void {
    for (const event of events) {
      bus.publish(event.type, event)
    }
  }

  function switchToMode(mode: 'free' | 'pomodoro'): void {
    if (mode === 'free') {
      freeModeEl.style.display = ''
      pomodoroModeEl.style.display = 'none'
    } else {
      freeModeEl.style.display = 'none'
      pomodoroModeEl.style.display = ''
      updateTimerDisplay()
    }
  }

  function updateTimerDisplay(): void {
    const phase = session.currentPhase.type
    displayEl.textContent = formatTime(session.remainingMs)
    phaseEl.textContent = phaseLabel(phase)
    phaseEl.className = `timer-phase ${phase !== 'work' ? phase : ''}`
    setInfoEl.textContent = `Set ${session.currentSet} / ${session.totalSets}`
    flowEl.textContent = buildFlowText(phase, session.currentSet, session.totalSets, config)
    progressEl.textContent = buildProgressDots(session.completedSets, session.totalSets)
    btnPause.style.display = session.isRunning ? '' : 'none'
    btnResume.style.display = session.isRunning ? 'none' : ''
  }

  btnEnterPomodoro.addEventListener('click', () => {
    const events = appModeManager.enterPomodoro()
    publishAppModeEvents(events)
  })

  btnPause.addEventListener('click', () => {
    pauseTimer(session, bus)
    updateTimerDisplay()
  })

  btnResume.addEventListener('click', () => {
    // resume は PhaseStarted を再発行するため、main.ts の AppModeChanged 購読経由ではなく直接呼ぶ
    const events = session.start()
    for (const event of events) {
      bus.publish(event.type, event)
    }
    updateTimerDisplay()
  })

  btnExitPomodoro.addEventListener('click', () => {
    const events = appModeManager.exitPomodoro()
    publishAppModeEvents(events)
  })

  const unsubTick = bus.subscribe('TimerTicked', () => updateTimerDisplay())
  const unsubPhase = bus.subscribe('PhaseStarted', () => updateTimerDisplay())
  const unsubReset = bus.subscribe('TimerReset', () => updateTimerDisplay())
  const unsubAppMode = bus.subscribe<AppModeEvent>('AppModeChanged', (event) => {
    if (event.type === 'AppModeChanged') {
      switchToMode(event.mode)
    }
  })

  switchToMode(appModeManager.currentMode)

  return {
    container,
    dispose() {
      unsubTick()
      unsubPhase()
      unsubReset()
      unsubAppMode()
      style.remove()
      container.remove()
    }
  }
}
