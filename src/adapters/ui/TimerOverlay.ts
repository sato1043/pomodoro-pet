import type { PomodoroSession } from '../../domain/timer/entities/PomodoroSession'
import type { TimerConfig } from '../../domain/timer/value-objects/TimerConfig'
import type { PhaseType } from '../../domain/timer/value-objects/TimerPhase'
import type { EventBus } from '../../domain/shared/EventBus'
import type { AppModeManager } from '../../application/app-mode/AppModeManager'
import type { AppModeEvent } from '../../application/app-mode/AppMode'
import type { AppSettingsService } from '../../application/settings/AppSettingsService'
import type { AudioAdapter } from '../../infrastructure/audio/AudioAdapter'
import { SOUND_PRESETS } from '../../infrastructure/audio/ProceduralSounds'
import type { SoundPreset } from '../../infrastructure/audio/ProceduralSounds'
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
  audio: AudioAdapter
): TimerOverlayElements {
  const svgSpeakerOn = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`
  const svgSpeakerOff = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
  let volumeBeforeMute = audio.volume

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

  function buildSoundPresets(): string {
    return SOUND_PRESETS.map(p => {
      const active = p.name === audio.currentPreset ? ' active' : ''
      return `<button class="timer-sound-preset${active}" data-preset="${p.name}">${p.label}</button>`
    }).join('')
  }

  function buildVolumeSegments(): string {
    const volLevel = Math.round(audio.volume * 10)
    return Array.from({ length: 10 }, (_, i) =>
      `<span class="timer-vol-seg${i < volLevel ? ' on' : ''}" data-seg="${i}"></span>`
    ).join('')
  }

  const container = document.createElement('div')
  container.id = 'timer-overlay'
  function buildSummaryHTML(): string {
    return `<div class="timer-summary-row"><span class="timer-summary-btn timer-summary-work">W ${selectedWork}</span><span class="timer-summary-btn timer-summary-break">B ${selectedBreak}</span><span class="timer-summary-btn timer-summary-long-break">L ${selectedLongBreak}</span></div><div class="timer-summary-row"><span class="timer-summary-btn timer-summary-sets">S ${selectedSets}</span></div>`
  }

  container.innerHTML = `
    <div class="timer-overlay-title">Pomodoro Pet</div>
    <div class="timer-free-mode" id="timer-free-mode">
      <button class="timer-settings-toggle" id="timer-settings-toggle">×</button>
      <div class="timer-settings-summary" id="timer-settings-summary" style="display:none">
        ${buildSummaryHTML()}
      </div>
      <div class="timer-settings" id="timer-settings">
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
      <div class="timer-sound-section" id="timer-sound-section">
        <div class="timer-sound-presets">${buildSoundPresets()}</div>
        <div class="timer-volume-row">
          <button class="timer-mute-btn" id="timer-mute">${audio.isMuted ? svgSpeakerOff : svgSpeakerOn}</button>
          <button class="timer-vol-btn" id="timer-vol-down">◀</button>
          ${buildVolumeSegments()}
          <button class="timer-vol-btn" id="timer-vol-up">▶</button>
        </div>
      </div>
      <div class="timer-settings-error" id="timer-settings-error"></div>
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
      padding: 56px 12px 28px 14px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      text-align: center;
      z-index: 1000;
      backdrop-filter: blur(8px);
      user-select: none;
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
      transform: translateY(-2px);
    }
    .timer-settings-toggle:hover {
      color: rgba(255, 255, 255, 0.8);
    }
    .timer-settings-summary {
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: center;
      margin-top: 24px;
      margin-bottom: 24px;
    }
    .timer-summary-row {
      display: flex;
      gap: 6px;
      width: 100%;
    }
    .timer-summary-row .timer-summary-btn {
      flex: 1;
    }
    .timer-summary-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px 0.5em;
      border-radius: 6px;
      font-size: 26px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: #fff;
    }
    .timer-summary-work {
      background: rgba(76, 175, 80, 0.35);
      border: 1px solid rgba(76, 175, 80, 0.6);
    }
    .timer-summary-break {
      background: rgba(66, 165, 245, 0.35);
      border: 1px solid rgba(66, 165, 245, 0.6);
    }
    .timer-summary-long-break {
      background: rgba(171, 71, 188, 0.35);
      border: 1px solid rgba(171, 71, 188, 0.6);
    }
    .timer-summary-sets {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.5);
    }
    .timer-sound-section {
      margin-top: 16px;
      margin-bottom: 24px;
    }
    .timer-sound-presets {
      display: flex;
      gap: 6px;
      justify-content: center;
      margin-bottom: 8px;
    }
    .timer-sound-preset {
      background: rgba(255, 255, 255, 0.1);
      color: #ccc;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 22px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .timer-sound-preset:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .timer-sound-preset.active {
      background: rgba(76, 175, 80, 0.6);
      border-color: rgba(76, 175, 80, 0.8);
      color: #fff;
    }
    .timer-volume-row {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .timer-mute-btn {
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #fff;
      border-radius: 4px;
      width: 48px;
      height: 34px;
      cursor: pointer;
      font-size: 18px;
      transition: background 0.2s;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .timer-mute-btn:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .timer-vol-btn {
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #aaa;
      border-radius: 4px;
      width: 36px;
      height: 34px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;
    }
    .timer-vol-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }
    .timer-vol-seg {
      flex: 1;
      height: 34px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: background 0.15s;
      cursor: pointer;
    }
    .timer-vol-seg.on {
      background: rgba(76, 175, 80, 0.5);
      border-color: rgba(76, 175, 80, 0.7);
    }
    .timer-settings-error {
      color: #f44336;
      font-size: 12px;
      min-height: 16px;
      margin-bottom: 4px;
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
      font-size: 33px;
      padding: 20px 24px;
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
  const errorEl = container.querySelector('#timer-settings-error') as HTMLDivElement

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

  // サウンド操作
  function updateSoundPresetUI(): void {
    container.querySelectorAll('.timer-sound-preset').forEach(btn => {
      const el = btn as HTMLElement
      el.classList.toggle('active', el.dataset.preset === audio.currentPreset)
    })
  }

  function updateMuteUI(): void {
    const muteBtn = container.querySelector('#timer-mute') as HTMLButtonElement | null
    if (muteBtn) muteBtn.innerHTML = audio.isMuted ? svgSpeakerOff : svgSpeakerOn
  }

  function syncMuteWithVolume(): void {
    if (audio.volume <= 0 && !audio.isMuted) {
      volumeBeforeMute = 0.1
      audio.toggleMute()
      updateMuteUI()
    } else if (audio.volume > 0 && audio.isMuted) {
      audio.toggleMute()
      updateMuteUI()
    }
  }

  function updateVolumeUI(): void {
    const level = Math.round(audio.volume * 10)
    container.querySelectorAll('.timer-vol-seg').forEach(seg => {
      const idx = Number((seg as HTMLElement).dataset.seg)
      seg.classList.toggle('on', idx < level)
    })
    syncMuteWithVolume()
  }

  container.querySelectorAll('.timer-sound-preset').forEach(btn => {
    btn.addEventListener('click', async () => {
      await audio.resume()
      const preset = (btn as HTMLElement).dataset.preset as SoundPreset
      if (preset) {
        audio.switchPreset(preset)
        updateSoundPresetUI()
      }
    })
  })

  const muteBtn = container.querySelector('#timer-mute') as HTMLButtonElement
  muteBtn.addEventListener('click', () => {
    if (!audio.isMuted) {
      volumeBeforeMute = audio.volume
      audio.setVolume(0)
      audio.toggleMute()
    } else {
      audio.toggleMute()
      audio.setVolume(volumeBeforeMute)
    }
    updateMuteUI()
    updateVolumeUI()
  })

  const volDown = container.querySelector('#timer-vol-down') as HTMLButtonElement
  const volUp = container.querySelector('#timer-vol-up') as HTMLButtonElement

  volDown.addEventListener('click', () => {
    audio.setVolume(Math.max(0, audio.volume - 0.1))
    updateVolumeUI()
  })

  volUp.addEventListener('click', () => {
    audio.setVolume(Math.min(1, audio.volume + 0.1))
    updateVolumeUI()
  })

  container.querySelectorAll('.timer-vol-seg').forEach(seg => {
    seg.addEventListener('click', () => {
      const idx = Number((seg as HTMLElement).dataset.seg)
      audio.setVolume((idx + 1) / 10)
      updateVolumeUI()
    })
  })

  // 折りたたみトグル
  const soundSectionEl = container.querySelector('#timer-sound-section') as HTMLDivElement
  const settingsEl = container.querySelector('#timer-settings') as HTMLDivElement
  const summaryEl = container.querySelector('#timer-settings-summary') as HTMLDivElement
  const toggleEl = container.querySelector('#timer-settings-toggle') as HTMLButtonElement
  let settingsExpanded = true

  function updateSummary(): void {
    summaryEl.innerHTML = buildSummaryHTML()
  }

  function toggleSettings(): void {
    settingsExpanded = !settingsExpanded
    settingsEl.style.display = settingsExpanded ? '' : 'none'
    // 折りたたみ時はプリセットボタンのみ非表示、ボリュームインジケーターは残す
    const presetsEl = soundSectionEl.querySelector('.timer-sound-presets') as HTMLElement | null
    if (presetsEl) presetsEl.style.display = settingsExpanded ? '' : 'none'
    summaryEl.style.display = settingsExpanded ? 'none' : ''
    toggleEl.textContent = settingsExpanded ? '×' : '☰'
    toggleEl.style.transform = settingsExpanded ? 'translateY(-2px)' : 'translateY(0px)'
    const gearEl = container.querySelector('#settings-trigger') as HTMLElement | null
    if (gearEl) gearEl.style.display = settingsExpanded ? '' : 'none'
  }

  toggleEl.addEventListener('click', toggleSettings)

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

  function switchToMode(mode: 'free' | 'pomodoro'): void {
    if (mode === 'free') {
      freeModeEl.style.display = ''
      pomodoroModeEl.style.display = 'none'
      syncButtonSelection()
      errorEl.textContent = ''
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
    errorEl.textContent = ''

    try {
      settingsService.updateTimerConfig({
        workMinutes: selectedWork,
        breakMinutes: selectedBreak,
        longBreakMinutes: selectedLongBreak,
        setsPerCycle: selectedSets
      })
    } catch (e: unknown) {
      errorEl.textContent = e instanceof Error ? e.message : 'Invalid input'
      return
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
