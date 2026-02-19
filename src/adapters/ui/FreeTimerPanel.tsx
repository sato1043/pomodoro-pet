import { useState, useEffect, useRef, useCallback } from 'react'
import type { TimerConfig } from '../../domain/timer/value-objects/TimerConfig'
import { createConfig } from '../../domain/timer/value-objects/TimerConfig'
import type { PhaseType } from '../../domain/timer/value-objects/TimerPhase'
import { buildCyclePlan, cycleTotalMs } from '../../domain/timer/value-objects/CyclePlan'
import type { CyclePhase } from '../../domain/timer/value-objects/CyclePlan'
import type { PomodoroOrchestrator } from '../../application/timer/PomodoroOrchestrator'
import type { AppSettingsService } from '../../application/settings/AppSettingsService'
import type { ThemePreference } from '../../application/settings/SettingsEvents'
import type { AudioAdapter } from '../../infrastructure/audio/AudioAdapter'
import type { SfxPlayer } from '../../infrastructure/audio/SfxPlayer'
import { VolumeControl } from './VolumeControl'
import * as styles from './styles/free-timer-panel.css'

// --- 純粋関数 ---

function msToMinutes(ms: number): number {
  return Math.round(ms / 60000)
}

function resolveSelected(options: number[], selected: number): number {
  return options.includes(selected) ? selected : options[0]
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

interface TimelineSetView {
  label: string
  phases: CyclePhase[]
  endTime: Date
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
        views.push({ label: `Set ${currentSetNum}`, phases: currentPhases, endTime: new Date(cursor) })
      }
      currentSetNum = phase.setNumber
      currentPhases = []
    }
    currentPhases.push(phase)
    cursor += phase.durationMs
  }
  if (currentPhases.length > 0) {
    views.push({ label: `Set ${currentSetNum}`, phases: currentPhases, endTime: new Date(cursor) })
  }
  return views
}

function fmtClock(date: Date): { h12: number; mi: string; ampm: string } {
  const h = date.getHours()
  return {
    h12: h % 12 || 12,
    mi: String(date.getMinutes()).padStart(2, '0'),
    ampm: h < 12 ? 'AM' : 'PM',
  }
}

const SEGMENT_STYLE: Record<string, string> = {
  work: styles.tlSegWork,
  break: styles.tlSegBreak,
  'long-break': styles.tlSegLongBreak,
}

// --- テーマ選択肢 ---
const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

// --- 選択肢 ---
const WORK_OPTIONS = [25, 50, 90]
const BREAK_OPTIONS = [5, 10, 15]
const LONG_BREAK_OPTIONS = [15, 30, 60]
const SETS_OPTIONS = [1, 2, 3, 4]

// --- コンポーネント ---

interface FreeTimerPanelProps {
  readonly config: TimerConfig
  readonly settingsService: AppSettingsService
  readonly orchestrator: PomodoroOrchestrator
  readonly audio: AudioAdapter
  readonly sfx: SfxPlayer | null
  readonly debugTimer: boolean
  readonly themePreference: ThemePreference
  readonly onThemeChange: (theme: ThemePreference) => void
}

interface TimerSettings {
  work: number
  break: number
  longBreak: number
  sets: number
}

function settingsFromConfig(config: TimerConfig): TimerSettings {
  return {
    work: resolveSelected(WORK_OPTIONS, msToMinutes(config.workDurationMs)),
    break: resolveSelected(BREAK_OPTIONS, msToMinutes(config.breakDurationMs)),
    longBreak: resolveSelected(LONG_BREAK_OPTIONS, msToMinutes(config.longBreakDurationMs)),
    sets: resolveSelected(SETS_OPTIONS, config.setsPerCycle),
  }
}

function settingsToTimerConfig(s: TimerSettings): TimerConfig {
  return createConfig(s.work * 60000, s.break * 60000, s.longBreak * 60000, s.sets)
}

// --- SVGアイコン ---

function MenuIcon(): JSX.Element {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ display: 'block' }}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  )
}

function CloseIcon(): JSX.Element {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ display: 'block' }}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

// --- ボタングループ ---

function ButtonGroup({ name, options, selected, onChange }: {
  name: string
  options: number[]
  selected: number
  onChange: (value: number) => void
}): JSX.Element {
  const resolved = resolveSelected(options, selected)
  return (
    <div className={styles.cfgGroup}>
      {options.map(v => (
        <button
          key={v}
          className={`${styles.cfgBtn}${v === resolved ? ' active' : ''}`}
          data-cfg={name}
          onClick={() => onChange(v)}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

// --- タイムラインバー ---

function TimelineBar({ timerConfig }: { timerConfig: TimerConfig }): JSX.Element {
  const plan = buildCyclePlan(timerConfig)
  const setViews = buildSetViews(plan, new Date())

  const displayFlex = (phase: CyclePhase): number => {
    if (phase.type === 'work') return phase.durationMs
    if (phase.type === 'long-break') return timerConfig.breakDurationMs * 2
    return timerConfig.breakDurationMs * 1.5
  }

  return (
    <div className={styles.tlBar}>
      {setViews.map((sv, si) => (
        <span key={si} style={{ display: 'contents' }}>
          {si > 0 && <span className={styles.tlSetSep} />}
          {sv.phases.map((phase, pi) => (
            <span
              key={pi}
              className={`${styles.tlSeg} ${SEGMENT_STYLE[phase.type] ?? ''}`}
              style={{ flex: displayFlex(phase) }}
            >
              {segLabel(phase.type)}
            </span>
          ))}
        </span>
      ))}
    </div>
  )
}

// --- タイムラインサマリー ---

function TimelineSummary({ timerConfig }: { timerConfig: TimerConfig }): JSX.Element {
  const plan = buildCyclePlan(timerConfig)
  const now = new Date()
  const setViews = buildSetViews(plan, now)
  const displayPlan = plan.filter(p => p.type !== 'congrats')
  const totalMs = cycleTotalMs(displayPlan)

  const wLabel = fmtDurationMs(timerConfig.workDurationMs)
  const bLabel = fmtDurationMs(timerConfig.breakDurationMs)
  const nowClock = fmtClock(now)

  return (
    <div className={styles.tlContainer}>
      <div className={styles.tlClock}>
        {String(nowClock.h12).padStart(2, '0')}
        <span className={styles.tlBlink}>:</span>
        {nowClock.mi}
        <span className={styles.tlDateSub}>{nowClock.ampm}</span>
      </div>
      <div className={styles.tlConfig}>
        (<span className={styles.tlConfigWork}>{wLabel}</span> +{' '}
        <span className={styles.tlConfigBreak}>{bLabel}</span>){' '}
        &times; {timerConfig.setsPerCycle} Sets ={' '}
        <span className={styles.tlConfigTotal}>{fmtDurationMs(totalMs)}</span>
      </div>
      <div className={styles.tlRow}>
        <div className={styles.tlLabels}>
          {setViews.map((sv, i) => (
            <span key={i} className={styles.tlSetLabel}>{sv.label}</span>
          ))}
        </div>
        <TimelineBar timerConfig={timerConfig} />
        <div className={styles.tlTimes}>
          <span>
            {nowClock.h12}:{nowClock.mi}<span className={styles.tlAmpm}>{nowClock.ampm}</span>
          </span>
          {setViews.map((sv, i) => {
            const c = fmtClock(sv.endTime)
            return (
              <span key={i}>
                {c.h12}:{c.mi}<span className={styles.tlAmpm}>{c.ampm}</span>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// --- メインコンポーネント ---

export function FreeTimerPanel({
  config, settingsService, orchestrator, audio, sfx, debugTimer,
  themePreference, onThemeChange
}: FreeTimerPanelProps): JSX.Element {
  const [settings, setSettings] = useState<TimerSettings>(() => settingsFromConfig(config))
  const [expanded, setExpanded] = useState(false)
  const [volumeKey, setVolumeKey] = useState(0)
  const snapshotRef = useRef<{ settings: TimerSettings; preset: string; volume: number; muted: boolean; theme: ThemePreference } | null>(null)
  const confirmedRef = useRef(false)

  // config変更時にsettingsを同期
  useEffect(() => {
    setSettings(settingsFromConfig(config))
  }, [config])

  // 折りたたみ時に1秒ごとに再レンダリング（時計更新）
  const [, setClockTick] = useState(0)
  useEffect(() => {
    if (expanded) return
    const id = setInterval(() => setClockTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [expanded])

  const currentTimerConfig = settingsToTimerConfig(settings)

  const handleToggle = useCallback(() => {
    setExpanded(prev => {
      if (!prev) {
        // 展開時: スナップショット保存
        snapshotRef.current = {
          settings: { ...settings },
          preset: audio.currentPreset,
          volume: audio.volume,
          muted: audio.isMuted,
          theme: themePreference,
        }
        confirmedRef.current = false
      } else if (!confirmedRef.current && snapshotRef.current) {
        // Setを押さずに閉じた: スナップショット復元
        const snap = snapshotRef.current
        setSettings(snap.settings)
        if (audio.currentPreset !== snap.preset) audio.switchPreset(snap.preset)
        if (audio.isMuted !== snap.muted) audio.toggleMute()
        audio.setVolume(snap.volume)
        sfx?.setVolume(snap.volume)
        sfx?.setMuted(snap.muted)
        onThemeChange(snap.theme)
        setVolumeKey(k => k + 1)
      }
      return !prev
    })
  }, [settings, audio, sfx, themePreference, onThemeChange])

  const handleConfirm = useCallback(() => {
    settingsService.updateTimerConfig({
      workMinutes: settings.work,
      breakMinutes: settings.break,
      longBreakMinutes: settings.longBreak,
      setsPerCycle: settings.sets,
    })
    settingsService.updateSoundConfig({
      preset: audio.currentPreset,
      volume: audio.volume,
      isMuted: audio.isMuted,
    })
    settingsService.updateThemeConfig(themePreference)
    confirmedRef.current = true
    setExpanded(false)
  }, [settings, settingsService, audio, themePreference])

  const handleStartPomodoro = useCallback(() => {
    orchestrator.startPomodoro()
  }, [orchestrator])

  const handleSoundChange = useCallback(() => {
    if (!expanded) {
      settingsService.updateSoundConfig({
        preset: audio.currentPreset,
        volume: audio.volume,
        isMuted: audio.isMuted,
      })
    }
    setVolumeKey(k => k + 1)
  }, [expanded, settingsService, audio])

  const updateSetting = useCallback((key: keyof TimerSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  return (
    <div className={styles.freeMode}>
      <button
        className={styles.settingsToggle}
        onClick={handleToggle}
        style={{ transform: expanded ? 'translateY(-2px)' : 'translateY(0px)' }}
      >
        {expanded ? <CloseIcon /> : <MenuIcon />}
      </button>

      {!expanded && (
        <div className={styles.settingsSummary}>
          <TimelineSummary timerConfig={currentTimerConfig} />
        </div>
      )}

      {expanded && (
        <div className={styles.settings}>
          <div className={styles.settingsField}>
            <label className={`${styles.label} ${styles.labelWork}`}>Work</label>
            <ButtonGroup name="work" options={WORK_OPTIONS} selected={settings.work} onChange={v => updateSetting('work', v)} />
          </div>
          <div className={styles.settingsField}>
            <label className={`${styles.label} ${styles.labelBreak}`}>Break</label>
            <ButtonGroup name="break" options={BREAK_OPTIONS} selected={settings.break} onChange={v => updateSetting('break', v)} />
          </div>
          <div className={styles.settingsField}>
            <label className={`${styles.label} ${styles.labelLongBreak}`}>Long Break</label>
            <ButtonGroup name="long-break" options={LONG_BREAK_OPTIONS} selected={settings.longBreak} onChange={v => updateSetting('longBreak', v)} />
          </div>
          <div className={styles.settingsField}>
            <label className={styles.label}>Sets</label>
            <ButtonGroup name="sets" options={SETS_OPTIONS} selected={settings.sets} onChange={v => updateSetting('sets', v)} />
          </div>
        </div>
      )}

      {expanded && (
        <div className={styles.themeSection}>
          <div className={styles.themePresets}>
            {THEME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`${styles.themePreset}${opt.value === themePreference ? ' active' : ''}`}
                onClick={() => onThemeChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <VolumeControl
        audio={audio}
        sfx={sfx}
        showPresets={expanded}
        onSoundChange={handleSoundChange}
        forceUpdateKey={volumeKey}
      />

      {expanded && (
        <button className={`${styles.btn} ${styles.btnConfirm}`} onClick={handleConfirm}>Set</button>
      )}
      {!expanded && (
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleStartPomodoro}>Start Pomodoro</button>
      )}
    </div>
  )
}
