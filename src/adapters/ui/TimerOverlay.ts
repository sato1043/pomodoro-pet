import type { PomodoroSession } from '../../domain/timer/entities/PomodoroSession'
import type { TimerConfig } from '../../domain/timer/value-objects/TimerConfig'
import { createConfig } from '../../domain/timer/value-objects/TimerConfig'
import type { PhaseType } from '../../domain/timer/value-objects/TimerPhase'
import { buildCyclePlan, cycleTotalMs } from '../../domain/timer/value-objects/CyclePlan'
import type { CyclePhase } from '../../domain/timer/value-objects/CyclePlan'
import type { EventBus } from '../../domain/shared/EventBus'
import type { AppModeManager } from '../../application/app-mode/AppModeManager'
import type { AppModeEvent } from '../../application/app-mode/AppMode'
import type { AppSettingsService } from '../../application/settings/AppSettingsService'
import type { AudioAdapter } from '../../infrastructure/audio/AudioAdapter'
import type { SfxPlayer } from '../../infrastructure/audio/SfxPlayer'
import { createVolumeControl } from './VolumeControl'
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

function phaseMinLabel(phase: CyclePhase): string {
  const min = Math.round(phase.durationMs / 60000)
  switch (phase.type) {
    case 'work': return `${min}min work`
    case 'break': return `${min}min break`
    case 'long-break': return `${min}min long break`
  }
}

function phaseColor(type: PhaseType): { filled: string; unfilled: string } {
  switch (type) {
    case 'work': return { filled: 'rgba(76,175,80,0.85)', unfilled: 'rgba(76,175,80,0.2)' }
    case 'break': return { filled: 'rgba(66,165,245,0.85)', unfilled: 'rgba(66,165,245,0.2)' }
    case 'long-break': return { filled: 'rgba(171,71,188,0.85)', unfilled: 'rgba(171,71,188,0.2)' }
  }
}

function buildFlowText(
  plan: CyclePhase[],
  phaseType: PhaseType,
  currentSet: number
): string {
  // 計画内で現在のフェーズを探す
  const idx = plan.findIndex(p => p.setNumber === currentSet && p.type === phaseType)
  if (idx < 0) return ''

  const current = plan[idx]
  const next = idx + 1 < plan.length ? plan[idx + 1] : null

  if (current.type !== 'work' || !next) {
    return `▸ ${phaseMinLabel(current)}`
  }
  return `▸ ${phaseMinLabel(current)} → ${phaseMinLabel(next)}`
}

function buildProgressDots(completedSets: number, totalSets: number): string {
  const dots = Array.from({ length: totalSets }, (_, i) =>
    i < completedSets ? '●' : '○'
  ).join('')
  return `[${dots}]`
}

function msToMinutes(ms: number): number {
  return Math.round(ms / 60000)
}

function resolveSelected(options: number[], selected: number): number {
  return options.includes(selected) ? selected : options[0]
}

function buildButtonGroup(name: string, options: number[], selected: number): string {
  const resolved = resolveSelected(options, selected)
  return options.map(v => {
    const active = v === resolved ? ' active' : ''
    return `<button class="timer-cfg-btn${active}" data-cfg="${name}" data-value="${v}">${v}</button>`
  }).join('')
}

// --- Timeline Summary pure functions ---

interface TimelineSetView {
  label: string
  phases: CyclePhase[]
  endTime: Date
}

function segLabel(type: PhaseType): string {
  switch (type) {
    case 'work': return 'W'
    case 'break': return 'B'
    case 'long-break': return 'LB'
  }
}

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h > 0 && m > 0) return `${h}h ${m}min`
  if (h > 0) return `${h}h`
  return `${m}min`
}

function fmtDateLine(date: Date): string {
  const h = date.getHours()
  const mi = String(date.getMinutes()).padStart(2, '0')
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 || 12
  return `<div class="tl-clock">${String(h12).padStart(2, '0')}<span class="tl-blink">:</span>${mi}<span class="tl-date-sub">${ampm}</span></div>`
}

function fmtClock(date: Date): string {
  const h = date.getHours()
  const mi = String(date.getMinutes()).padStart(2, '0')
  const h12 = h % 12 || 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${h12}:${mi}<span class="tl-ampm">${ampm}</span>`
}

function buildSetViews(plan: CyclePhase[], startTime: Date): TimelineSetView[] {
  const views: TimelineSetView[] = []
  let cursor = startTime.getTime()
  let currentSetNum = 0
  let currentPhases: CyclePhase[] = []

  for (const phase of plan) {
    if (phase.setNumber !== currentSetNum) {
      if (currentPhases.length > 0) {
        views.push({
          label: `Set ${currentSetNum}`,
          phases: currentPhases,
          endTime: new Date(cursor)
        })
      }
      currentSetNum = phase.setNumber
      currentPhases = []
    }
    currentPhases.push(phase)
    cursor += phase.durationMs
  }
  if (currentPhases.length > 0) {
    views.push({
      label: `Set ${currentSetNum}`,
      phases: currentPhases,
      endTime: new Date(cursor)
    })
  }

  return views
}

function buildTimelineBarHTML(
  w: number, b: number, lb: number, sets: number,
  activePhase?: { set: number; type: PhaseType }
): string {
  const timerConfig = createConfig(w * 60000, b * 60000, lb * 60000, sets)
  const plan = buildCyclePlan(timerConfig)
  const setViews = buildSetViews(plan, new Date())

  // B/LBの表示幅を調整して視認性を確保
  const displayFlex = (phase: CyclePhase): number => {
    const min = phase.durationMs / 60000
    if (phase.type === 'work') return min
    if (phase.type === 'long-break') return b * 2
    return b * 1.5
  }

  // activePhaseのplan内インデックスを算出
  const activeIdx = activePhase
    ? plan.findIndex(p => p.setNumber === activePhase.set && p.type === activePhase.type)
    : -1

  // バーセグメント（セット間にセパレータ）
  const barParts: string[] = []
  let flatIdx = 0
  setViews.forEach((sv, si) => {
    if (si > 0) barParts.push('<span class="tl-set-sep"></span>')
    sv.phases.forEach(phase => {
      let extraClass = ''
      let inlineStyle = `flex:${displayFlex(phase)}`
      if (activeIdx >= 0) {
        if (flatIdx === activeIdx) {
          extraClass = ' tl-seg-active'
        } else if (flatIdx < activeIdx) {
          extraClass = ' tl-seg-done'
          inlineStyle += `;background:${phaseColor(phase.type).filled}`
        }
      }
      barParts.push(
        `<span class="tl-seg tl-seg-${phase.type}${extraClass}" style="${inlineStyle}">${segLabel(phase.type)}</span>`
      )
      flatIdx++
    })
  })

  return `<div class="tl-bar">${barParts.join('')}</div>`
}

function buildTimelineHTML(w: number, b: number, lb: number, sets: number): string {
  const timerConfig = createConfig(w * 60000, b * 60000, lb * 60000, sets)
  const plan = buildCyclePlan(timerConfig)
  const now = new Date()
  const setViews = buildSetViews(plan, now)
  const totalMin = Math.round(cycleTotalMs(plan) / 60000)

  const dateLine = fmtDateLine(now)
  const configLine =
    `(<span class="tl-config-work">${w}</span> + ` +
    `<span class="tl-config-break">${b}</span>) ` +
    `× ${sets} Sets = <span class="tl-config-total">${fmtDuration(totalMin)}</span>`

  // セットラベル
  const labels = setViews.map(sv =>
    `<span class="tl-set-label">${sv.label}</span>`
  ).join('')

  const bar = buildTimelineBarHTML(w, b, lb, sets)

  // 時刻行（開始 + 各セット終了）
  const timesHTML =
    `<span>${fmtClock(now)}</span>` +
    setViews.map(sv => `<span>${fmtClock(sv.endTime)}</span>`).join('')

  return (
    `<div class="tl-container">` +
      dateLine +
      `<div class="tl-config">${configLine}</div>` +
      `<div class="tl-row">` +
        `<div class="tl-labels">${labels}</div>` +
        bar +
        `<div class="tl-times">${timesHTML}</div>` +
      `</div>` +
    `</div>`
  )
}

export interface TimerOverlayElements {
  container: HTMLDivElement
  dispose: () => void
}

export function createTimerOverlay(
  session: PomodoroSession,
  bus: EventBus,
  config: TimerConfig,
  appModeManager: AppModeManager,
  settingsService: AppSettingsService,
  audio: AudioAdapter,
  sfx: SfxPlayer | null = null,
  debugTimer = false
): TimerOverlayElements {

  // 選択肢の定義
  const workOptions = [25, 50, 90]
  const breakOptions = [5, 10, 15]
  const longBreakOptions = [15, 30, 60]
  const setsOptions = [1, 2, 3, 4]

  // 現在の選択値（ボタングループの状態）。選択肢にない値は先頭にフォールバック
  let selectedWork = resolveSelected(workOptions, msToMinutes(config.workDurationMs))
  let selectedBreak = resolveSelected(breakOptions, msToMinutes(config.breakDurationMs))
  let selectedLongBreak = resolveSelected(longBreakOptions, msToMinutes(config.longBreakDurationMs))
  let selectedSets = resolveSelected(setsOptions, config.setsPerCycle)

  // ボリュームコントロール
  const volumeControl = createVolumeControl({
    audio,
    sfx,
    onSoundChange(): void {
      if (!settingsExpanded) {
        settingsService.updateSoundConfig({
          preset: audio.currentPreset,
          volume: audio.volume,
          isMuted: audio.isMuted
        })
      }
    }
  })

  const container = document.createElement('div')
  container.id = 'timer-overlay'
  function buildSummaryHTML(): string {
    return buildTimelineHTML(selectedWork, selectedBreak, selectedLongBreak, selectedSets)
  }

  container.innerHTML = `
    <div class="timer-overlay-title">Pomodoro Pet</div>
    <div class="timer-free-mode" id="timer-free-mode">
      <button class="timer-settings-toggle" id="timer-settings-toggle">☰</button>
      <div class="timer-settings-summary" id="timer-settings-summary">
        ${buildSummaryHTML()}
      </div>
      <div class="timer-settings" id="timer-settings" style="display:none">
        <div class="timer-settings-field">
          <label class="timer-settings-label-work">Work</label>
          <div class="timer-cfg-group" id="timer-cfg-work-group">
            ${buildButtonGroup('work', workOptions, selectedWork)}
          </div>
        </div>
        <div class="timer-settings-field">
          <label class="timer-settings-label-break">Break</label>
          <div class="timer-cfg-group" id="timer-cfg-break-group">
            ${buildButtonGroup('break', breakOptions, selectedBreak)}
          </div>
        </div>
        <div class="timer-settings-field">
          <label class="timer-settings-label-long-break">Long Break</label>
          <div class="timer-cfg-group" id="timer-cfg-long-break-group">
            ${buildButtonGroup('long-break', longBreakOptions, selectedLongBreak)}
          </div>
        </div>
        <div class="timer-settings-field">
          <label>Sets</label>
          <div class="timer-cfg-group" id="timer-cfg-sets-group">
            ${buildButtonGroup('sets', setsOptions, selectedSets)}
          </div>
        </div>
      </div>
      <div id="timer-sound-slot"></div>
      <button id="btn-confirm-settings" class="timer-btn timer-btn-confirm" style="display:none">Set</button>
      <button id="btn-enter-pomodoro" class="timer-btn timer-btn-primary">Start Pomodoro</button>
    </div>
    <div class="timer-pomodoro-mode" id="timer-pomodoro-mode" style="display:none">
      <div class="timer-set-info" id="timer-set-info">Set 1 / 4</div>
      <div class="timer-phase-time">
        <span class="timer-phase" id="timer-phase">WORK</span>
        <span class="timer-display" id="timer-display">25:00</span>
      </div>
      <div class="timer-pomodoro-timeline" id="timer-pomodoro-timeline"></div>
      <div class="timer-flow" id="timer-flow">▸ 25min work → 5min break</div>
      <div class="timer-progress" id="timer-progress">[○○○○]</div>
      <div class="timer-controls">
        <button id="btn-pause" class="timer-btn">Pause</button>
        <button id="btn-resume" class="timer-btn" style="display:none">Resume</button>
        <button id="btn-exit-pomodoro" class="timer-btn timer-btn-exit">Exit</button>
      </div>
    </div>
    <div class="timer-congrats-mode" id="timer-congrats-mode" style="display:none">
      <div class="congrats-confetti" id="congrats-confetti"></div>
      <div class="congrats-message">Congratulations!</div>
      <div class="congrats-sub">Pomodoro cycle completed</div>
      <div class="congrats-hint">Click to continue</div>
    </div>
  `

  // VolumeControlをスロットに挿入
  const soundSlot = container.querySelector('#timer-sound-slot') as HTMLDivElement
  soundSlot.replaceWith(volumeControl.container)

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
    }
    .timer-free-mode,
    .timer-pomodoro-mode,
    .timer-overlay-title,
    .timer-settings-toggle,
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
    .timer-settings {
      display: inline-grid;
      grid-template-columns: auto auto;
      gap: 16px 16px;
      align-items: center;
      margin-top: 24px;
      margin-bottom: 24px;
      padding-right: 20px;
      text-align: left;
    }
    .timer-settings-field {
      display: contents;
    }
    .timer-settings-field label {
      font-size: 26px;
      color: #aaa;
      text-align: right;
    }
    .timer-settings-field label.timer-settings-label-work {
      color: #4caf50;
    }
    .timer-settings-field label.timer-settings-label-break {
      color: #42a5f5;
    }
    .timer-settings-field label.timer-settings-label-long-break {
      color: #ab47bc;
    }
    .timer-cfg-group {
      display: flex;
      gap: 6px;
      width: 210px;
    }
    .timer-cfg-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      color: #999;
      font-size: 26px;
      font-weight: 700;
      flex: 1;
      padding: 6px 0;
      cursor: pointer;
      text-align: center;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
      font-variant-numeric: tabular-nums;
    }
    .timer-cfg-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #ccc;
    }
    .timer-cfg-btn.active {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.5);
      color: #fff;
    }
    .timer-cfg-btn[data-cfg="work"] {
      background: rgba(76, 175, 80, 0.15);
      border-color: rgba(76, 175, 80, 0.3);
    }
    .timer-cfg-btn[data-cfg="work"]:hover {
      background: rgba(76, 175, 80, 0.25);
    }
    .timer-cfg-btn[data-cfg="work"].active {
      background: rgba(76, 175, 80, 0.35);
      border-color: rgba(76, 175, 80, 0.6);
    }
    .timer-cfg-btn[data-cfg="break"] {
      background: rgba(66, 165, 245, 0.15);
      border-color: rgba(66, 165, 245, 0.3);
    }
    .timer-cfg-btn[data-cfg="break"]:hover {
      background: rgba(66, 165, 245, 0.25);
    }
    .timer-cfg-btn[data-cfg="break"].active {
      background: rgba(66, 165, 245, 0.35);
      border-color: rgba(66, 165, 245, 0.6);
    }
    .timer-cfg-btn[data-cfg="long-break"] {
      background: rgba(171, 71, 188, 0.15);
      border-color: rgba(171, 71, 188, 0.3);
    }
    .timer-cfg-btn[data-cfg="long-break"]:hover {
      background: rgba(171, 71, 188, 0.25);
    }
    .timer-cfg-btn[data-cfg="long-break"].active {
      background: rgba(171, 71, 188, 0.35);
      border-color: rgba(171, 71, 188, 0.6);
    }
    .timer-settings-toggle {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: none;
      background: transparent;
      color: rgba(255, 255, 255, 0.35);
      font-size: 36px;
      cursor: pointer;
      z-index: 1001;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
      padding: 0;
      line-height: 1;
      transform: translateY(0px);
    }
    .timer-settings-toggle:hover {
      color: rgba(255, 255, 255, 0.8);
    }
    .timer-settings-summary {
      margin-top: 16px;
      margin-bottom: 16px;
    }
    .tl-container { text-align: center; margin: 16px 0 24px; }
    .tl-clock { font-size: 80px; color: #fff; text-align: center; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; transform: scaleY(1.2); }
    .tl-ampm { font-size: 0.8em; color: rgba(255,255,255,0.4); margin-left: 1px; }
    .tl-date-sub { font-size: 0.6em; color: rgba(255,255,255,0.5); font-weight: 400; }
    @keyframes tl-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
    .tl-blink { animation: tl-blink 1s step-end infinite; }
    .tl-config { font-size: 16px; color: rgba(255,255,255,0.7); margin-bottom: 12px; font-variant-numeric: tabular-nums; background: rgba(255,255,255,0.08); border-radius: 6px; padding: 6px 12px; }
    .tl-config-work { color: #4caf50; font-weight: 600; }
    .tl-config-break { color: #42a5f5; font-weight: 600; }
    .tl-config-lb { color: #ab47bc; font-weight: 600; }
    .tl-config-total { color: #fff; font-weight: 700; }
    .tl-row { margin-bottom: 8px; }
    .tl-labels { display: flex; font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 2px; }
    .tl-set-label { flex: 1; text-align: center; }
    .tl-bar { display: flex; height: 20px; border-radius: 4px; overflow: hidden; gap: 1px; }
    .tl-seg { display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.8); min-width: 0; overflow: hidden; }
    .tl-seg-work { background: rgba(76,175,80,0.6); }
    .tl-seg-break { background: rgba(66,165,245,0.6); }
    .tl-seg-long-break { background: rgba(171,71,188,0.6); }
    .timer-pomodoro-timeline .tl-seg { opacity: 0.5; }
    .timer-pomodoro-timeline .tl-seg-active { opacity: 1; }
    .timer-pomodoro-timeline .tl-seg-done { opacity: 0.85; }
    .tl-set-sep { width: 2px; background: rgba(255,255,255,0.3); flex-shrink: 0; }
    .tl-times { display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 2px; font-variant-numeric: tabular-nums; }
    .tl-time-mid { flex: 1; text-align: center; }
    ${volumeControl.style}
    .timer-pomodoro-timeline { margin: 8px 0; }
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
    .timer-btn-confirm {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.3);
      font-size: 26px;
      padding: 14px 24px;
      width: 100%;
    }
    .timer-btn-confirm:hover {
      background: rgba(255, 255, 255, 0.22);
    }
    .timer-btn-primary {
      background: rgba(76, 175, 80, 0.3);
      border-color: rgba(76, 175, 80, 0.5);
      font-size: 33px;
      padding: 20px 24px;
      margin-top: 0;
      width: 100%;
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
    .timer-congrats-mode {
      pointer-events: auto;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      padding: 40px 0;
    }
    .congrats-message {
      font-size: 42px;
      font-weight: 700;
      color: #ffd54f;
      text-shadow: 0 0 20px rgba(255, 213, 79, 0.4);
      margin-bottom: 8px;
      animation: congrats-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .congrats-sub {
      font-size: 16px;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 16px;
    }
    .congrats-hint {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.35);
      animation: congrats-blink 2s ease-in-out infinite;
    }
    @keyframes congrats-pop {
      0% { transform: scale(0.3); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes congrats-blink {
      0%, 100% { opacity: 0.35; }
      50% { opacity: 0.7; }
    }
    .congrats-confetti {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .confetti-piece {
      position: absolute;
      width: 8px;
      height: 8px;
      top: -10px;
      animation: confetti-fall linear forwards;
    }
    @keyframes confetti-fall {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      80% { opacity: 1; }
      100% { transform: translateY(250px) rotate(720deg); opacity: 0; }
    }
  `
  document.head.appendChild(style)

  const freeModeEl = container.querySelector('#timer-free-mode') as HTMLDivElement
  const pomodoroModeEl = container.querySelector('#timer-pomodoro-mode') as HTMLDivElement
  const congratsModeEl = container.querySelector('#timer-congrats-mode') as HTMLDivElement
  const confettiEl = container.querySelector('#congrats-confetti') as HTMLDivElement
  const setInfoEl = container.querySelector('#timer-set-info') as HTMLDivElement
  const displayEl = container.querySelector('#timer-display') as HTMLSpanElement
  const phaseEl = container.querySelector('#timer-phase') as HTMLSpanElement
  const flowEl = container.querySelector('#timer-flow') as HTMLDivElement
  const progressEl = container.querySelector('#timer-progress') as HTMLDivElement
  const btnConfirmSettings = container.querySelector('#btn-confirm-settings') as HTMLButtonElement
  const btnEnterPomodoro = container.querySelector('#btn-enter-pomodoro') as HTMLButtonElement
  const btnPause = container.querySelector('#btn-pause') as HTMLButtonElement
  const btnResume = container.querySelector('#btn-resume') as HTMLButtonElement
  const btnExitPomodoro = container.querySelector('#btn-exit-pomodoro') as HTMLButtonElement

  // ボタングループのクリックハンドラ
  function handleCfgClick(e: Event): void {
    const target = e.target as HTMLElement
    if (!target.classList.contains('timer-cfg-btn')) return

    const name = target.dataset.cfg
    const value = Number(target.dataset.value)
    if (!name || isNaN(value)) return

    // 選択状態を更新
    switch (name) {
      case 'work': selectedWork = value; break
      case 'break': selectedBreak = value; break
      case 'long-break': selectedLongBreak = value; break
      case 'sets': selectedSets = value; break
    }

    // 同じグループ内のactiveクラスを切り替え
    const group = target.closest('.timer-cfg-group')
    if (group) {
      group.querySelectorAll('.timer-cfg-btn').forEach(btn => btn.classList.remove('active'))
      target.classList.add('active')
    }

    // サマリーテキストを更新
    updateSummary()
  }

  freeModeEl.addEventListener('click', handleCfgClick)

  // 折りたたみトグル
  const settingsEl = container.querySelector('#timer-settings') as HTMLDivElement
  const summaryEl = container.querySelector('#timer-settings-summary') as HTMLDivElement
  const toggleEl = container.querySelector('#timer-settings-toggle') as HTMLButtonElement
  let settingsExpanded = false

  // 展開時のスナップショット（Setを押さずに閉じたら復元する）
  let savedWork = selectedWork
  let savedBreak = selectedBreak
  let savedLongBreak = selectedLongBreak
  let savedSets = selectedSets
  let savedPreset = audio.currentPreset
  let savedVolume = audio.volume
  let savedMuted = audio.isMuted
  let confirmedBySet = false

  function saveSnapshot(): void {
    savedWork = selectedWork
    savedBreak = selectedBreak
    savedLongBreak = selectedLongBreak
    savedSets = selectedSets
    savedPreset = audio.currentPreset
    savedVolume = audio.volume
    savedMuted = audio.isMuted
  }

  function restoreSnapshot(): void {
    selectedWork = savedWork
    selectedBreak = savedBreak
    selectedLongBreak = savedLongBreak
    selectedSets = savedSets
    // ボタングループのactiveクラスも復元
    const groups: Array<{ id: string; value: number }> = [
      { id: 'timer-cfg-work-group', value: selectedWork },
      { id: 'timer-cfg-break-group', value: selectedBreak },
      { id: 'timer-cfg-long-break-group', value: selectedLongBreak },
      { id: 'timer-cfg-sets-group', value: selectedSets },
    ]
    for (const { id, value } of groups) {
      const group = container.querySelector(`#${id}`)
      if (!group) continue
      group.querySelectorAll('.timer-cfg-btn').forEach(btn => {
        const el = btn as HTMLElement
        el.classList.toggle('active', Number(el.dataset.value) === value)
      })
    }
    // サウンド状態も復元
    if (audio.currentPreset !== savedPreset) audio.switchPreset(savedPreset)
    if (audio.isMuted !== savedMuted) audio.toggleMute()
    audio.setVolume(savedVolume)
    volumeControl.updateAll()
  }

  function updateSummary(): void {
    summaryEl.innerHTML = buildSummaryHTML()
  }

  function toggleSettings(): void {
    settingsExpanded = !settingsExpanded

    if (settingsExpanded) {
      // 展開時: スナップショットを保存
      saveSnapshot()
    } else if (!confirmedBySet) {
      // Setを押さずに折りたたみ: スナップショットに復元
      restoreSnapshot()
    }
    confirmedBySet = false

    settingsEl.style.display = settingsExpanded ? '' : 'none'
    // 折りたたみ時はプリセットボタンのみ非表示、ボリュームインジケーターは残す
    if (settingsExpanded) {
      volumeControl.showPresets()
    } else {
      volumeControl.hidePresets()
    }
    if (!settingsExpanded) updateSummary()
    summaryEl.style.display = settingsExpanded ? 'none' : ''
    toggleEl.textContent = settingsExpanded ? '×' : '☰'
    toggleEl.style.transform = settingsExpanded ? 'translateY(-2px)' : 'translateY(0px)'
    btnConfirmSettings.style.display = settingsExpanded ? '' : 'none'
    btnEnterPomodoro.style.display = settingsExpanded ? 'none' : ''
    const gearEl = container.querySelector('#settings-trigger') as HTMLElement | null
    if (gearEl) gearEl.style.display = settingsExpanded ? '' : 'none'
  }

  toggleEl.addEventListener('click', toggleSettings)

  btnConfirmSettings.addEventListener('click', () => {
    settingsService.updateTimerConfig({
      workMinutes: selectedWork,
      breakMinutes: selectedBreak,
      longBreakMinutes: selectedLongBreak,
      setsPerCycle: selectedSets
    })
    settingsService.updateSoundConfig({
      preset: audio.currentPreset,
      volume: audio.volume,
      isMuted: audio.isMuted
    })
    confirmedBySet = true
    toggleSettings()
  })

  function publishAppModeEvents(events: AppModeEvent[]): void {
    for (const event of events) {
      bus.publish(event.type, event)
    }
  }

  function syncButtonSelection(): void {
    const cur = settingsService.currentConfig
    selectedWork = resolveSelected(workOptions, msToMinutes(cur.workDurationMs))
    selectedBreak = resolveSelected(breakOptions, msToMinutes(cur.breakDurationMs))
    selectedLongBreak = resolveSelected(longBreakOptions, msToMinutes(cur.longBreakDurationMs))
    selectedSets = resolveSelected(setsOptions, cur.setsPerCycle)

    const groups: Array<{ id: string; value: number }> = [
      { id: 'timer-cfg-work-group', value: selectedWork },
      { id: 'timer-cfg-break-group', value: selectedBreak },
      { id: 'timer-cfg-long-break-group', value: selectedLongBreak },
      { id: 'timer-cfg-sets-group', value: selectedSets },
    ]
    for (const { id, value } of groups) {
      const group = container.querySelector(`#${id}`)
      if (!group) continue
      group.querySelectorAll('.timer-cfg-btn').forEach(btn => {
        const el = btn as HTMLElement
        el.classList.toggle('active', Number(el.dataset.value) === value)
      })
    }

    updateSummary()
  }

  function spawnConfetti(): void {
    confettiEl.innerHTML = ''
    const colors = ['#ffd54f', '#ff7043', '#42a5f5', '#66bb6a', '#ab47bc', '#ef5350']
    const count = 30
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('span')
      piece.className = 'confetti-piece'
      piece.style.left = `${Math.random() * 100}%`
      piece.style.background = colors[i % colors.length]
      piece.style.animationDuration = `${1.5 + Math.random() * 1.5}s`
      piece.style.animationDelay = `${Math.random() * 0.8}s`
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'
      piece.style.width = `${6 + Math.random() * 6}px`
      piece.style.height = `${6 + Math.random() * 6}px`
      confettiEl.appendChild(piece)
    }
  }

  function switchToMode(mode: 'free' | 'pomodoro' | 'congrats'): void {
    freeModeEl.style.display = 'none'
    pomodoroModeEl.style.display = 'none'
    congratsModeEl.style.display = 'none'

    if (mode === 'free') {
      freeModeEl.style.display = ''
      syncButtonSelection()
    } else if (mode === 'pomodoro') {
      pomodoroModeEl.style.display = ''
      updateTimerDisplay()
    } else if (mode === 'congrats') {
      congratsModeEl.style.display = ''
      spawnConfetti()
    }
  }

  const pomodoroTimelineEl = container.querySelector('#timer-pomodoro-timeline') as HTMLDivElement
  let lastActiveSet = -1
  let lastActiveType: PhaseType | '' = ''

  function updateTimerDisplay(): void {
    const phase = session.currentPhase.type
    displayEl.textContent = formatTime(session.remainingMs)
    phaseEl.textContent = phaseLabel(phase)
    phaseEl.className = `timer-phase ${phase !== 'work' ? phase : ''}`
    setInfoEl.textContent = `Set ${session.currentSet} / ${session.totalSets}`
    flowEl.textContent = buildFlowText(buildCyclePlan(config), phase, session.currentSet)
    progressEl.textContent = buildProgressDots(session.completedSets, session.totalSets)
    btnPause.style.display = session.isRunning ? '' : 'none'
    btnResume.style.display = session.isRunning ? 'none' : ''

    // タイムラインバー: フェーズ変更時のみDOM更新
    const curSet = session.currentSet
    if (curSet !== lastActiveSet || phase !== lastActiveType) {
      lastActiveSet = curSet
      lastActiveType = phase
      pomodoroTimelineEl.innerHTML = buildTimelineBarHTML(
        msToMinutes(config.workDurationMs),
        msToMinutes(config.breakDurationMs),
        msToMinutes(config.longBreakDurationMs),
        config.setsPerCycle,
        { set: curSet, type: phase }
      )
    }

    // アクティブセグメントの塗りつぶし進捗を更新
    const activeSeg = pomodoroTimelineEl.querySelector('.tl-seg-active') as HTMLElement | null
    if (activeSeg) {
      const dur = session.currentPhase.durationMs
      const progress = Math.max(0, Math.min(1, (dur - session.remainingMs) / dur))
      const pct = (progress * 100).toFixed(1)
      const c = phaseColor(phase)
      activeSeg.style.background = `linear-gradient(to right, ${c.filled} ${pct}%, ${c.unfilled} ${pct}%)`
    }
  }

  btnEnterPomodoro.addEventListener('click', () => {
    // デバッグタイマー時はデバッグ値を維持するため設定更新をスキップ
    if (!debugTimer) {
      settingsService.updateTimerConfig({
        workMinutes: selectedWork,
        breakMinutes: selectedBreak,
        longBreakMinutes: selectedLongBreak,
        setsPerCycle: selectedSets
      })
    }

    // SettingsChanged → session再作成が同期的に完了した後、pomodoroに遷移
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

  congratsModeEl.addEventListener('click', () => {
    const events = appModeManager.dismissCongrats()
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

  // 折りたたみ時は1秒ごとに時計を更新（開発時はコメントアウト）
  const clockInterval = setInterval(() => {
    if (!settingsExpanded) updateSummary()
  }, 1000)

  switchToMode(appModeManager.currentMode)

  return {
    container,
    dispose() {
      clearInterval(clockInterval)
      unsubTick()
      unsubPhase()
      unsubReset()
      unsubAppMode()
      style.remove()
      container.remove()
    }
  }
}
