import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { TimerConfig } from '../../domain/timer/value-objects/TimerConfig'
import type { PhaseType } from '../../domain/timer/value-objects/TimerPhase'
import { buildCyclePlan, cycleTotalMs } from '../../domain/timer/value-objects/CyclePlan'
import type { CyclePhase } from '../../domain/timer/value-objects/CyclePlan'
import type { ThemePreference } from '../../application/settings/SettingsEvents'
import { useAppDeps } from './AppContext'
import { useTheme } from './ThemeContext'
import { useLicenseMode } from './LicenseContext'
import type { FeatureName } from '../../application/license/LicenseState'
import type { AudioAdapter } from '../../infrastructure/audio/AudioAdapter'
import type { SfxPlayer } from '../../infrastructure/audio/SfxPlayer'
import { useSettingsEditor, type SettingsEditorResult, type TimerSettings } from './hooks/useSettingsEditor'
import { VolumeControl } from './VolumeControl'
import { SetButton } from './SetButton'
import { CloseButton } from './CloseButton'
import { OverlayTitle } from './OverlayTitle'
import { AboutContent } from './AboutContent'
import { LegalDocContent } from './LegalDocContent'
import { RegistrationContent } from './RegistrationContent'
import * as overlayStyles from './styles/overlay.css'
import * as styles from './styles/free-timer-panel.css'
import * as aboutStyles from './styles/about.css'

// --- 純粋関数 ---

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

// --- SVGアイコン ---

function SunIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function MonitorIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

function SoundIcon({ on }: { on: boolean }): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {on
        ? <><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></>
        : <><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>}
    </svg>
  )
}

function NotifyIcon({ on }: { on: boolean }): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {on
        ? <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>
        : <><path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M18.63 13A17.89 17.89 0 0 1 18 8" /><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" /><line x1="1" y1="1" x2="23" y2="23" /></>}
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

// --- テーマ設定 ---

const THEME_ICONS: Record<ThemePreference, () => JSX.Element> = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
}

function ThemeToggles({ value, onChange }: {
  value: ThemePreference
  onChange: (theme: ThemePreference) => void
}): JSX.Element {
  return (
    <div className={styles.bgRow}>
      <label className={styles.bgLabel}>Theme:</label>
      {THEME_OPTIONS.map(opt => {
        const Icon = THEME_ICONS[opt.value]
        return (
          <button
            key={opt.value}
            className={`${styles.bgToggle}${opt.value === value ? ' active' : ''}`}
            onClick={() => onChange(opt.value)}
            title={opt.label}
          >
            <Icon />
          </button>
        )
      })}
    </div>
  )
}

// --- バックグラウンド設定 ---

function BackgroundToggles({ audio, notify, onAudioChange, onNotifyChange }: {
  audio: boolean
  notify: boolean
  onAudioChange: (value: boolean) => void
  onNotifyChange: (value: boolean) => void
}): JSX.Element {
  return (
    <div className={styles.bgRow}>
      <label className={styles.bgLabel}>In Background:</label>
      <button
        className={`${styles.bgToggle}${audio ? ' active' : ''}`}
        data-testid="bg-audio-toggle"
        onClick={() => onAudioChange(!audio)}
        title="Background Sound"
      >
        <SoundIcon on={audio} />
      </button>
      <button
        className={`${styles.bgToggle}${notify ? ' active' : ''}`}
        data-testid="bg-notify-toggle"
        onClick={() => onNotifyChange(!notify)}
        title="Background Notify"
      >
        <NotifyIcon on={notify} />
      </button>
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

// --- タイムラインスケジュール ---

interface TimelineScheduleProps {
  readonly timerConfig: TimerConfig
  readonly setViews: TimelineSetView[]
  readonly nowClock: { h12: number; mi: string; ampm: string }
}

function TimelineSchedule({ timerConfig, setViews, nowClock }: TimelineScheduleProps): JSX.Element {
  return (
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
  )
}

// --- タイムライン設定サマリー ---

interface TimelineConfigProps {
  readonly timerConfig: TimerConfig
  readonly totalMs: number
}

function TimelineConfig({ timerConfig, totalMs }: TimelineConfigProps): JSX.Element {
  const wLabel = fmtDurationMs(timerConfig.workDurationMs)
  const bLabel = fmtDurationMs(timerConfig.breakDurationMs)

  return (
    <div className={styles.tlConfig}>
      (<span className={styles.tlConfigWork}>{wLabel}</span> +{' '}
      <span className={styles.tlConfigBreak}>{bLabel}</span>){' '}
      &times; {timerConfig.setsPerCycle} Sets ={' '}
      <span className={styles.tlConfigTotal}>{fmtDurationMs(totalMs)}</span>
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
  const nowClock = fmtClock(now)

  return (
    <div className={styles.tlContainer}>
      <div className={styles.tlClock}>
        {String(nowClock.h12).padStart(2, '0')}
        <span className={styles.tlBlink}>:</span>
        {nowClock.mi}
        <span className={styles.tlDateSub}>{nowClock.ampm}</span>
      </div>
      <TimelineSchedule timerConfig={timerConfig} setViews={setViews} nowClock={nowClock} />
      <TimelineConfig timerConfig={timerConfig} totalMs={totalMs} />
    </div>
  )
}

// --- 折りたたみ時サマリー ---

function FreeTimerSummary({ timerConfig }: { timerConfig: TimerConfig }): JSX.Element {
  const [, setClockTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setClockTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={styles.settingsSummary}>
      <TimelineSummary timerConfig={timerConfig} />
    </div>
  )
}

// --- 展開時設定パネル ---

interface FreeTimerSettingsProps {
  readonly settings: TimerSettings
  readonly onUpdate: (key: keyof TimerSettings, value: number) => void
}

function FreeTimerSettings({ settings, onUpdate }: FreeTimerSettingsProps): JSX.Element {
  return (
    <div className={styles.settings}>
      <div className={styles.settingsField}>
        <label className={`${styles.label} ${styles.labelWork}`}>Work</label>
        <ButtonGroup name="work" options={WORK_OPTIONS} selected={settings.work} onChange={v => onUpdate('work', v)} />
      </div>
      <div className={styles.settingsField}>
        <label className={`${styles.label} ${styles.labelBreak}`}>Break</label>
        <ButtonGroup name="break" options={BREAK_OPTIONS} selected={settings.break} onChange={v => onUpdate('break', v)} />
      </div>
      <div className={styles.settingsField}>
        <label className={`${styles.label} ${styles.labelLongBreak}`}>Long Break</label>
        <ButtonGroup name="long-break" options={LONG_BREAK_OPTIONS} selected={settings.longBreak} onChange={v => onUpdate('longBreak', v)} />
      </div>
      <div className={styles.settingsField}>
        <label className={styles.label}>Sets</label>
        <ButtonGroup name="sets" options={SETS_OPTIONS} selected={settings.sets} onChange={v => onUpdate('sets', v)} />
      </div>
    </div>
  )
}

// --- 折りたたみ時ビュー ---

interface FreeSummaryViewProps {
  readonly editor: SettingsEditorResult
  readonly audio: AudioAdapter
  readonly sfx: SfxPlayer | null
}

function FreeSummaryView({ editor, audio, sfx }: FreeSummaryViewProps): JSX.Element {
  return (
    <>
      <FreeTimerSummary timerConfig={editor.currentTimerConfig} />
      <VolumeControl
        audio={audio}
        sfx={sfx}
        showPresets={false}
        onSoundChange={editor.handleSoundChange}
        forceUpdateKey={editor.volumeKey}
      />
    </>
  )
}

// --- 展開時ビュー ---

interface FreeSettingsEditorProps {
  readonly editor: SettingsEditorResult
  readonly audio: AudioAdapter
  readonly sfx: SfxPlayer | null
  readonly themePreference: ThemePreference
  readonly onThemeChange: (theme: ThemePreference) => void
  readonly onAboutClick: () => void
  readonly onEulaClick: () => void
  readonly onPrivacyClick: () => void
  readonly onLicensesClick: () => void
  readonly onRegisterClick: () => void
  readonly licenseKeyHint?: string
  readonly canUse: (feature: FeatureName) => boolean
}

function FreeSettingsEditor({ editor, audio, sfx, themePreference, onThemeChange, onAboutClick, onEulaClick, onPrivacyClick, onLicensesClick, onRegisterClick, licenseKeyHint, canUse }: FreeSettingsEditorProps): JSX.Element {
  return (
    <>
      {canUse('timerSettings') && (
        <FreeTimerSettings
          settings={editor.settings}
          onUpdate={editor.updateSetting}
        />
      )}
      <VolumeControl
        audio={audio}
        sfx={sfx}
        showPresets={canUse('soundSettings')}
        onSoundChange={editor.handleSoundChange}
        forceUpdateKey={editor.volumeKey}
      />
      <ThemeToggles value={themePreference} onChange={onThemeChange} />
      <BackgroundToggles
        audio={editor.backgroundAudio}
        notify={canUse('backgroundNotify') ? editor.backgroundNotify : false}
        onAudioChange={editor.setBackgroundAudio}
        onNotifyChange={canUse('backgroundNotify') ? editor.setBackgroundNotify : () => {}}
      />
      <div className={aboutStyles.aboutLink}>
        <button className={aboutStyles.aboutLinkButton} onClick={onAboutClick} data-testid="about-link">About</button>
        <button className={aboutStyles.aboutLinkButton} onClick={onRegisterClick} data-testid="register-link">
          {licenseKeyHint ? `Registered (${licenseKeyHint})` : 'Register'}
        </button>
      </div>
      <div className={aboutStyles.aboutLink}>
        <button className={aboutStyles.aboutLinkButton} onClick={onEulaClick} data-testid="eula-link">EULA</button>
        <button className={aboutStyles.aboutLinkButton} onClick={onPrivacyClick} data-testid="privacy-link">Privacy</button>
        <button className={aboutStyles.aboutLinkButton} onClick={onLicensesClick} data-testid="licenses-link">Third-party</button>
      </div>
    </>
  )
}

// --- メインコンポーネント ---

interface OverlayFreeProps {
  readonly expanded?: boolean
  readonly onExpandedChange?: (expanded: boolean) => void
  readonly onToggleRef?: (toggle: () => void) => void
}

export function OverlayFree({ expanded, onExpandedChange, onToggleRef }: OverlayFreeProps): JSX.Element {
  const { audio, sfx } = useAppDeps()
  const { themePreference, setThemePreference } = useTheme()
  const { canUse } = useLicenseMode()
  const editor = useSettingsEditor()
  const [showAbout, setShowAbout] = useState(false)
  const [showEula, setShowEula] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showLicenses, setShowLicenses] = useState(false)
  const [showRegistration, setShowRegistration] = useState(false)
  const [licenseKeyHint, setLicenseKeyHint] = useState<string | undefined>(undefined)

  // ライセンス状態の購読
  useEffect(() => {
    if (!window.electronAPI?.onLicenseChanged) return
    const unsubscribe = window.electronAPI.onLicenseChanged((state) => {
      const s = state as LicenseState
      setLicenseKeyHint(s.keyHint)
    })
    // 初期ロード
    if (window.electronAPI.checkLicenseStatus) {
      window.electronAPI.checkLicenseStatus().then((s) => {
        const state = s as LicenseState
        setLicenseKeyHint(state.keyHint)
      })
    }
    return unsubscribe
  }, [])

  useEffect(() => {
    onExpandedChange?.(editor.expanded)
  }, [editor.expanded, onExpandedChange])

  useEffect(() => {
    if (!editor.expanded) {
      setShowAbout(false)
      setShowEula(false)
      setShowPrivacy(false)
      setShowLicenses(false)
      setShowRegistration(false)
    }
  }, [editor.expanded])

  useEffect(() => {
    onToggleRef?.(editor.toggle)
  }, [editor.toggle, onToggleRef])

  const className = expanded
    ? `${overlayStyles.overlay} ${overlayStyles.overlayExpanded}`
    : overlayStyles.overlay

  const renderContent = (): JSX.Element => {
    if (!editor.expanded) {
      return <FreeSummaryView editor={editor} audio={audio} sfx={sfx} />
    }
    if (showAbout) {
      return <AboutContent onBack={() => setShowAbout(false)} />
    }
    if (showEula) {
      return <LegalDocContent title="EULA" field="eulaText" onBack={() => setShowEula(false)} />
    }
    if (showPrivacy) {
      return <LegalDocContent title="Privacy Policy" field="privacyPolicyText" onBack={() => setShowPrivacy(false)} />
    }
    if (showLicenses) {
      return <LegalDocContent title="Third-party Licenses" field="licensesText" onBack={() => setShowLicenses(false)} />
    }
    if (showRegistration) {
      return (
        <RegistrationContent
          onBack={() => setShowRegistration(false)}
          onRegistered={() => {
            if (window.electronAPI?.checkLicenseStatus) {
              window.electronAPI.checkLicenseStatus().then((s) => {
                const state = s as LicenseState
                setLicenseKeyHint(state.keyHint)
              })
            }
          }}
          keyHint={licenseKeyHint}
        />
      )
    }
    return (
      <FreeSettingsEditor
        editor={editor}
        audio={audio}
        sfx={sfx}
        themePreference={themePreference}
        onThemeChange={setThemePreference}
        onAboutClick={() => setShowAbout(true)}
        onEulaClick={() => setShowEula(true)}
        onPrivacyClick={() => setShowPrivacy(true)}
        onLicensesClick={() => setShowLicenses(true)}
        onRegisterClick={() => setShowRegistration(true)}
        licenseKeyHint={licenseKeyHint}
        canUse={canUse}
      />
    )
  }

  const showDocPanel = showAbout || showEula || showPrivacy || showLicenses || showRegistration
  const docBackHandler = showAbout
    ? () => setShowAbout(false)
    : showEula
      ? () => setShowEula(false)
      : showPrivacy
        ? () => setShowPrivacy(false)
        : showLicenses
          ? () => setShowLicenses(false)
          : () => setShowRegistration(false)

  return createPortal(
    <div data-testid="overlay-free" className={className}>
      <OverlayTitle />
      <div className={styles.freeMode}>
        {renderContent()}
        {editor.expanded && !showDocPanel && <SetButton onClick={editor.confirm} />}
        {editor.expanded && showDocPanel && <CloseButton onClick={docBackHandler} />}
      </div>
    </div>,
    document.body
  )
}
