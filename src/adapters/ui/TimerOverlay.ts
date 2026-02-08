import type { PomodoroSession } from '../../domain/timer/entities/PomodoroSession'
import type { EventBus } from '../../domain/shared/EventBus'
import { startTimer, pauseTimer, resetTimer } from '../../application/timer/TimerUseCases'

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function phaseLabel(type: string): string {
  return type === 'work' ? 'WORK' : 'BREAK'
}

export interface TimerOverlayElements {
  container: HTMLDivElement
  dispose: () => void
}

export function createTimerOverlay(
  session: PomodoroSession,
  bus: EventBus
): TimerOverlayElements {
  const container = document.createElement('div')
  container.id = 'timer-overlay'
  container.innerHTML = `
    <div class="timer-phase" id="timer-phase">WORK</div>
    <div class="timer-display" id="timer-display">25:00</div>
    <div class="timer-cycles" id="timer-cycles">Cycle: 0</div>
    <div class="timer-controls">
      <button id="btn-start" class="timer-btn">Start</button>
      <button id="btn-pause" class="timer-btn" disabled>Pause</button>
      <button id="btn-reset" class="timer-btn">Reset</button>
    </div>
  `

  const style = document.createElement('style')
  style.textContent = `
    #timer-overlay {
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.75);
      color: #fff;
      border-radius: 12px;
      padding: 20px 28px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      text-align: center;
      z-index: 1000;
      backdrop-filter: blur(8px);
      min-width: 200px;
      user-select: none;
    }
    .timer-phase {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 2px;
      margin-bottom: 4px;
      color: #4caf50;
    }
    .timer-phase.break {
      color: #42a5f5;
    }
    .timer-display {
      font-size: 48px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      line-height: 1.1;
      margin-bottom: 4px;
    }
    .timer-cycles {
      font-size: 12px;
      color: #aaa;
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
  `
  document.head.appendChild(style)

  const displayEl = container.querySelector('#timer-display') as HTMLDivElement
  const phaseEl = container.querySelector('#timer-phase') as HTMLDivElement
  const cyclesEl = container.querySelector('#timer-cycles') as HTMLDivElement
  const btnStart = container.querySelector('#btn-start') as HTMLButtonElement
  const btnPause = container.querySelector('#btn-pause') as HTMLButtonElement
  const btnReset = container.querySelector('#btn-reset') as HTMLButtonElement

  function updateDisplay(): void {
    displayEl.textContent = formatTime(session.remainingMs)
    phaseEl.textContent = phaseLabel(session.currentPhase.type)
    phaseEl.className = `timer-phase ${session.currentPhase.type === 'break' ? 'break' : ''}`
    cyclesEl.textContent = `Cycle: ${session.completedCycles}`
    btnStart.disabled = session.isRunning
    btnPause.disabled = !session.isRunning
  }

  btnStart.addEventListener('click', () => {
    startTimer(session, bus)
    updateDisplay()
  })

  btnPause.addEventListener('click', () => {
    pauseTimer(session, bus)
    updateDisplay()
  })

  btnReset.addEventListener('click', () => {
    resetTimer(session, bus)
    updateDisplay()
  })

  const unsubTick = bus.subscribe('TimerTicked', () => updateDisplay())
  const unsubPhase = bus.subscribe('PhaseStarted', () => updateDisplay())
  const unsubReset = bus.subscribe('TimerReset', () => updateDisplay())

  updateDisplay()

  return {
    container,
    dispose() {
      unsubTick()
      unsubPhase()
      unsubReset()
      style.remove()
      container.remove()
    }
  }
}
