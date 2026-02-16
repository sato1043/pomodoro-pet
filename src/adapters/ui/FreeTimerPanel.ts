import type { TimerConfig } from '../../domain/timer/value-objects/TimerConfig'
import { createConfig } from '../../domain/timer/value-objects/TimerConfig'
import type { PhaseType } from '../../domain/timer/value-objects/TimerPhase'
import { buildCyclePlan, cycleTotalMs } from '../../domain/timer/value-objects/CyclePlan'
import type { CyclePhase } from '../../domain/timer/value-objects/CyclePlan'
import type { PomodoroOrchestrator } from '../../application/timer/PomodoroOrchestrator'
import type { AppSettingsService } from '../../application/settings/AppSettingsService'
import type { AudioAdapter } from '../../infrastructure/audio/AudioAdapter'
import type { SfxPlayer } from '../../infrastructure/audio/SfxPlayer'
import { createVolumeControl } from './VolumeControl'

// --- 純粋関数 ---

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
    case 'congrats': return 'C'
  }
}

function fmtDurationMs(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const min = Math.round(ms / 60000)
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
  const displayPlan = plan.filter(p => p.type !== 'congrats')
  const views: TimelineSetView[] = []
  let cursor = startTime.getTime()
  let currentSetNum = 0
  let currentPhases: CyclePhase[] = []

  for (const phase of displayPlan) {
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

function buildTimelineBarHTML(timerConfig: TimerConfig): string {
  const plan = buildCyclePlan(timerConfig)
  const setViews = buildSetViews(plan, new Date())

  const displayFlex = (phase: CyclePhase): number => {
    if (phase.type === 'work') return phase.durationMs
    if (phase.type === 'long-break') return timerConfig.breakDurationMs * 2
    return timerConfig.breakDurationMs * 1.5
  }

  const barParts: string[] = []
  setViews.forEach((sv, si) => {
    if (si > 0) barParts.push('<span class="tl-set-sep"></span>')
    sv.phases.forEach(phase => {
      barParts.push(
        `<span class="tl-seg tl-seg-${phase.type}" style="flex:${displayFlex(phase)}">${segLabel(phase.type)}</span>`
      )
    })
  })

  return `<div class="tl-bar">${barParts.join('')}</div>`
}

function buildTimelineHTML(timerConfig: TimerConfig): string {
  const plan = buildCyclePlan(timerConfig)
  const now = new Date()
  const setViews = buildSetViews(plan, now)
  const displayPlan = plan.filter(p => p.type !== 'congrats')
  const totalMs = cycleTotalMs(displayPlan)

  const wLabel = fmtDurationMs(timerConfig.workDurationMs)
  const bLabel = fmtDurationMs(timerConfig.breakDurationMs)

  const dateLine = fmtDateLine(now)
  const configLine =
    `(<span class="tl-config-work">${wLabel}</span> + ` +
    `<span class="tl-config-break">${bLabel}</span>) ` +
    `× ${timerConfig.setsPerCycle} Sets = <span class="tl-config-total">${fmtDurationMs(totalMs)}</span>`

  const labels = setViews.map(sv =>
    `<span class="tl-set-label">${sv.label}</span>`
  ).join('')

  const bar = buildTimelineBarHTML(timerConfig)

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

// --- コンポーネント ---

export interface FreeTimerPanelConfig {
  readonly config: TimerConfig
  readonly settingsService: AppSettingsService
  readonly orchestrator: PomodoroOrchestrator
  readonly audio: AudioAdapter
  readonly sfx: SfxPlayer | null
  readonly debugTimer: boolean
}

export interface FreeTimerPanelHandle {
  readonly container: HTMLDivElement
  readonly style: string
  syncSettings(): void
  refreshVolume(): void
  dispose(): void
}

export function createFreeTimerPanel(panelConfig: FreeTimerPanelConfig): FreeTimerPanelHandle {
  const { config, settingsService, orchestrator, audio, sfx, debugTimer } = panelConfig

  // 選択肢の定義
  const workOptions = [25, 50, 90]
  const breakOptions = [5, 10, 15]
  const longBreakOptions = [15, 30, 60]
  const setsOptions = [1, 2, 3, 4]

  // 現在の選択値
  let selectedWork = resolveSelected(workOptions, msToMinutes(config.workDurationMs))
  let selectedBreak = resolveSelected(breakOptions, msToMinutes(config.breakDurationMs))
  let selectedLongBreak = resolveSelected(longBreakOptions, msToMinutes(config.longBreakDurationMs))
  let selectedSets = resolveSelected(setsOptions, config.setsPerCycle)

  // 折りたたみ状態
  let settingsExpanded = false

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

  function buildSummaryHTML(): string {
    return buildTimelineHTML(createConfig(
      selectedWork * 60000, selectedBreak * 60000, selectedLongBreak * 60000, selectedSets
    ))
  }

  const container = document.createElement('div')
  container.className = 'timer-free-mode'
  container.id = 'timer-free-mode'
  container.innerHTML = `
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
  `

  // VolumeControlをスロットに挿入
  const soundSlot = container.querySelector('#timer-sound-slot') as HTMLDivElement
  soundSlot.replaceWith(volumeControl.container)

  const settingsEl = container.querySelector('#timer-settings') as HTMLDivElement
  const summaryEl = container.querySelector('#timer-settings-summary') as HTMLDivElement
  const toggleEl = container.querySelector('#timer-settings-toggle') as HTMLButtonElement
  const btnConfirmSettings = container.querySelector('#btn-confirm-settings') as HTMLButtonElement
  const btnEnterPomodoro = container.querySelector('#btn-enter-pomodoro') as HTMLButtonElement

  // 展開時のスナップショット
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
      saveSnapshot()
    } else if (!confirmedBySet) {
      restoreSnapshot()
    }
    confirmedBySet = false

    settingsEl.style.display = settingsExpanded ? '' : 'none'
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

  // ボタングループのクリックハンドラ
  function handleCfgClick(e: Event): void {
    const target = e.target as HTMLElement
    if (!target.classList.contains('timer-cfg-btn')) return

    const name = target.dataset.cfg
    const value = Number(target.dataset.value)
    if (!name || isNaN(value)) return

    switch (name) {
      case 'work': selectedWork = value; break
      case 'break': selectedBreak = value; break
      case 'long-break': selectedLongBreak = value; break
      case 'sets': selectedSets = value; break
    }

    const group = target.closest('.timer-cfg-group')
    if (group) {
      group.querySelectorAll('.timer-cfg-btn').forEach(btn => btn.classList.remove('active'))
      target.classList.add('active')
    }

    updateSummary()
  }

  container.addEventListener('click', handleCfgClick)
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

  btnEnterPomodoro.addEventListener('click', () => {
    if (!debugTimer) {
      settingsService.updateTimerConfig({
        workMinutes: selectedWork,
        breakMinutes: selectedBreak,
        longBreakMinutes: selectedLongBreak,
        setsPerCycle: selectedSets
      })
    }
    orchestrator.startPomodoro()
  })

  function syncSettings(): void {
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

  // 1秒ごとに時計を更新（折りたたみ時のみ）
  const clockInterval = setInterval(() => {
    if (!settingsExpanded) updateSummary()
  }, 1000)

  const style = `
    .timer-free-mode,
    .timer-settings-toggle {
      pointer-events: auto;
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
    .tl-set-sep { width: 2px; background: rgba(255,255,255,0.3); flex-shrink: 0; }
    .tl-times { display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 2px; font-variant-numeric: tabular-nums; }
    .tl-time-mid { flex: 1; text-align: center; }
    ${volumeControl.style}
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
  `

  return {
    container,
    style,
    syncSettings,
    refreshVolume(): void {
      volumeControl.updateAll()
    },
    dispose(): void {
      clearInterval(clockInterval)
    }
  }
}
