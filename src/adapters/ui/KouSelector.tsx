import { createPortal } from 'react-dom'
import { KOU_DEFINITIONS } from '../../domain/environment/value-objects/Kou'
import type { KouDefinition } from '../../domain/environment/value-objects/Kou'
import type { KouDateRange } from '../../application/environment/EnvironmentSimulationService'
import * as styles from './styles/kou-selector.css'

function pad2(n: number): string {
  return String(n).padStart(2, ' ')
}

function formatDateRange(range: KouDateRange): string {
  const s = range.startDate
  const e = range.endDate
  return `${pad2(s.getMonth() + 1)}/${pad2(s.getDate())} - ${pad2(e.getMonth() + 1)}/${pad2(e.getDate())}`
}

interface KouSelectorProps {
  readonly currentKou: KouDefinition | null
  readonly autoKou: boolean
  readonly manualKouIndex: number
  readonly kouDateRanges: readonly KouDateRange[]
  readonly onKouChange: (kouIndex: number) => void
  readonly onAutoToggle: (auto: boolean) => void
}

export function KouSelector({
  currentKou,
  autoKou,
  manualKouIndex,
  kouDateRanges,
  onKouChange,
  onAutoToggle,
}: KouSelectorProps): JSX.Element {
  const selectedIndex = autoKou
    ? (currentKou?.index ?? 0)
    : manualKouIndex

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const index = Number(e.target.value)
    onKouChange(index)
    if (autoKou) {
      onAutoToggle(false)
    }
  }

  const selected = KOU_DEFINITIONS[selectedIndex]
  const rangeMap = new Map(kouDateRanges.map(r => [r.index, r]))

  return createPortal(
    <div className={styles.container} data-testid="kou-selector">
      <div className={styles.row}>
        <span className={styles.label}>season</span>
        <select
          className={styles.select}
          value={selectedIndex}
          onChange={handleChange}
          data-testid="kou-select"
        >
          {KOU_DEFINITIONS.map(k => {
            const range = rangeMap.get(k.index)
            const dateLabel = range ? formatDateRange(range) : ''
            return (
              <option key={k.index} value={k.index}>
                #{pad2(k.index + 1)} | {dateLabel}
              </option>
            )
          })}
        </select>
      </div>
      <div className={styles.detail} style={{ marginBottom: 15 }}>
        {selected.nameEn}
      </div>
      <div className={styles.detailLarge}>
        {selected.solarTermName} {selected.phaseNameJa}
      </div>
      <div className={styles.detailLarge}>
        {selected.nameJa}
      </div>
      <div className={styles.detail}>
        （{selected.readingJa}）
      </div>
      <div className={styles.detail}>
        {selected.description}
      </div>
      <div className={styles.row}>
        <span className={styles.detail}>λ={selected.eclipticLonStart}°</span>
        <button
          className={`${styles.autoBtn}${autoKou ? ' active' : ''}`}
          onClick={() => onAutoToggle(!autoKou)}
          title={autoKou ? 'Auto (on)' : 'Auto (off)'}
          data-testid="kou-auto"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  )
}
