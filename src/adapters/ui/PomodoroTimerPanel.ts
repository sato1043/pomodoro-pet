import type { PomodoroStateMachine } from '../../domain/timer/entities/PomodoroStateMachine'
import type { TimerConfig } from '../../domain/timer/value-objects/TimerConfig'
import type { PhaseType } from '../../domain/timer/value-objects/TimerPhase'
import { buildCyclePlan } from '../../domain/timer/value-objects/CyclePlan'
import type { PomodoroOrchestrator } from '../../application/timer/PomodoroOrchestrator'

// --- 純粋関数（FreeTimerPanelからもimportされる） ---

export function phaseColor(type: PhaseType): { filled: string; unfilled: string } {
  switch (type) {
    case 'work': return { filled: 'rgba(76,175,80,0.85)', unfilled: 'rgba(76,175,80,0.2)' }
    case 'break': return { filled: 'rgba(66,165,245,0.85)', unfilled: 'rgba(66,165,245,0.2)' }
    case 'long-break': return { filled: 'rgba(171,71,188,0.85)', unfilled: 'rgba(171,71,188,0.2)' }
    case 'congrats': return { filled: 'rgba(255,213,79,0.85)', unfilled: 'rgba(255,213,79,0.2)' }
  }
}

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
    case 'congrats': return 'CONGRATS'
  }
}

const OVERLAY_BASE_BG = 'rgba(0, 0, 0, 0.75)'

export function overlayTintBg(type: PhaseType, progress: number): string {
  const rgb = (() => {
    switch (type) {
      case 'work': return '76,175,80'
      case 'break': return '66,165,245'
      case 'long-break': return '171,71,188'
      case 'congrats': return '255,213,79'
    }
  })()
  const alpha = 0.04 + progress * 0.20
  return `linear-gradient(to bottom, transparent, rgba(${rgb},${alpha.toFixed(3)})), ${OVERLAY_BASE_BG}`
}

// --- SVGアイコン ---

const pauseIconSvg = '<svg width="11" height="11" viewBox="0 0 11 11"><rect x="2" y="1" width="2.5" height="9" rx="0.5" fill="currentColor"/><rect x="6.5" y="1" width="2.5" height="9" rx="0.5" fill="currentColor"/></svg>'
const resumeIconSvg = '<svg width="11" height="11" viewBox="0 0 11 11"><polygon points="2,1 10,5.5 2,10" fill="currentColor"/></svg>'
const stopIconSvg = '<svg width="11" height="11" viewBox="0 0 11 11"><rect x="1" y="1" width="9" height="9" rx="1" fill="currentColor"/></svg>'

const RING_CIRCUMFERENCE = 2 * Math.PI * 90

// --- コンポーネント ---

export interface PomodoroTimerPanelConfig {
  readonly session: PomodoroStateMachine
  readonly config: TimerConfig
  readonly orchestrator: PomodoroOrchestrator
}

export interface PomodoroTimerPanelHandle {
  readonly container: HTMLDivElement
  readonly pauseResumeEl: HTMLElement
  readonly stopEl: HTMLElement
  readonly dotsEl: HTMLElement
  readonly style: string
  updateDisplay(): void
  applyTint(target: HTMLElement): void
}

export function createPomodoroTimerPanel(panelConfig: PomodoroTimerPanelConfig): PomodoroTimerPanelHandle {
  const { session, config, orchestrator } = panelConfig

  const container = document.createElement('div')
  container.className = 'timer-pomodoro-mode'
  container.id = 'timer-pomodoro-mode'
  container.style.display = 'none'
  container.innerHTML = `
    <div class="timer-ring-container">
      <svg class="timer-ring-svg" viewBox="0 0 200 200" width="200" height="200">
        <circle class="timer-ring-bg" cx="100" cy="100" r="90"
                fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="12"/>
        <circle class="timer-ring-progress" id="timer-ring-progress" cx="100" cy="100" r="90"
                fill="none" stroke="rgba(76,175,80,0.85)" stroke-width="12"
                stroke-linecap="round"
                stroke-dasharray="565.49" stroke-dashoffset="565.49"
                transform="rotate(-90 100 100)"/>
      </svg>
      <div class="timer-ring-inner">
        <span class="timer-phase" id="timer-phase">WORK</span>
        <span class="timer-display" id="timer-display">25:00</span>
      </div>
    </div>
  `

  // pause/resume, stop, dotsはoverlay直下に配置するためコーディネーターに公開
  const pauseResumeEl = document.createElement('span')
  pauseResumeEl.id = 'btn-pause-resume'
  pauseResumeEl.className = 'timer-corner-icon'
  pauseResumeEl.style.display = 'none'
  pauseResumeEl.innerHTML = pauseIconSvg

  const stopEl = document.createElement('span')
  stopEl.id = 'btn-exit-pomodoro'
  stopEl.className = 'timer-exit-link'
  stopEl.style.display = 'none'
  stopEl.innerHTML = stopIconSvg

  const dotsEl = document.createElement('span')
  dotsEl.className = 'timer-set-dots'
  dotsEl.id = 'timer-set-dots'
  dotsEl.style.display = 'none'

  const displayEl = container.querySelector('#timer-display') as HTMLSpanElement
  const phaseEl = container.querySelector('#timer-phase') as HTMLSpanElement
  const ringProgressEl = container.querySelector('#timer-ring-progress') as SVGCircleElement

  let lastIsRunning: boolean | null = null

  function updateDisplay(): void {
    const phase = session.currentPhase.type
    const colors = phaseColor(phase)
    displayEl.textContent = formatTime(session.remainingMs)
    phaseEl.textContent = phaseLabel(phase)
    phaseEl.className = `timer-phase ${phase !== 'work' ? phase : ''}`
    if (session.isRunning !== lastIsRunning) {
      lastIsRunning = session.isRunning
      pauseResumeEl.innerHTML = session.isRunning ? pauseIconSvg : resumeIconSvg
    }

    // 円形プログレスリング更新
    const dur = session.currentPhase.durationMs
    const ringProgress = Math.max(0, Math.min(1, (dur - session.remainingMs) / dur))
    const offset = RING_CIRCUMFERENCE * (1 - ringProgress)
    ringProgressEl.style.strokeDashoffset = String(offset)
    ringProgressEl.style.stroke = colors.filled

    // タイマー数字にフェーズカラー
    displayEl.style.color = colors.filled

    // サイクル進捗ドット（フェーズ単位）
    const plan = buildCyclePlan(config).filter(p => p.type !== 'congrats')
    const currentIdx = plan.findIndex(
      p => p.setNumber === session.currentSet && p.type === phase
    )
    const dots = plan.map((p, i) => {
      const c = phaseColor(p.type)
      const color = i < currentIdx ? 'rgba(255,255,255,0.7)'
        : i === currentIdx ? c.filled
        : 'rgba(255,255,255,0.2)'
      return `<span style="color:${color}">●</span>`
    }).join('')
    dotsEl.innerHTML = dots
  }

  function applyTint(target: HTMLElement): void {
    const phase = session.currentPhase.type
    const dur = session.currentPhase.durationMs
    const ringProgress = Math.max(0, Math.min(1, (dur - session.remainingMs) / dur))
    target.style.background = overlayTintBg(phase, ringProgress)
  }

  // イベントハンドラ
  pauseResumeEl.addEventListener('click', () => {
    if (session.isRunning) {
      orchestrator.pause()
    } else {
      orchestrator.resume()
    }
    updateDisplay()
  })

  stopEl.addEventListener('click', () => {
    orchestrator.exitPomodoro()
  })

  const style = `
    .timer-set-dots {
      position: absolute;
      top: 40px;
      left: 16px;
      transform: translateY(-50%);
      font-size: 14px;
      letter-spacing: 4px;
      line-height: 1;
      pointer-events: none;
    }
    .timer-ring-container {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 200px;
      height: 200px;
      margin: 8px auto 24px;
    }
    .timer-ring-svg {
      position: absolute;
      top: 0;
      left: 0;
    }
    .timer-ring-progress {
      transition: stroke 0.3s ease;
    }
    .timer-ring-inner {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1;
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
    .timer-pomodoro-mode {
      position: relative;
    }
    .timer-corner-icon {
      position: absolute;
      top: 40px;
      right: 34px;
      transform: translateY(-50%);
      color: rgba(255, 255, 255, 0.3);
      cursor: pointer;
      transition: color 0.2s;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      padding: 4px;
      pointer-events: auto;
    }
    .timer-corner-icon:hover {
      color: rgba(255, 255, 255, 0.7);
    }
    .timer-exit-link {
      position: absolute;
      top: 40px;
      right: 14px;
      transform: translateY(-50%);
      color: rgba(255, 255, 255, 0.3);
      cursor: pointer;
      transition: color 0.2s;
      padding: 4px;
      pointer-events: auto;
      display: inline-flex;
      align-items: center;
      line-height: 1;
    }
    .timer-exit-link:hover {
      color: rgba(244, 67, 54, 0.6);
    }
  `

  return {
    container,
    pauseResumeEl,
    stopEl,
    dotsEl,
    style,
    updateDisplay,
    applyTint
  }
}
