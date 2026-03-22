import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MOON_PHASE_DEFINITIONS, findNearestMoonPhase } from '../../domain/environment/value-objects/MoonPhaseName'
import type { MoonPhaseDefinition } from '../../domain/environment/value-objects/MoonPhaseName'
import * as styles from './styles/kou-selector.css'

interface MoonPhaseSelectorProps {
  readonly currentPhaseDeg: number | null
  readonly autoMoonPhase: boolean
  readonly manualPhaseIndex: number
  readonly onPhaseChange: (phaseIndex: number) => void
  readonly onAutoToggle: (auto: boolean) => void
}

export function MoonPhaseSelector({
  currentPhaseDeg,
  autoMoonPhase,
  manualPhaseIndex,
  onPhaseChange,
  onAutoToggle,
}: MoonPhaseSelectorProps): JSX.Element {
  const [showList, setShowList] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const currentRowRef = useRef<HTMLTableRowElement>(null)

  const selectedDef: MoonPhaseDefinition = autoMoonPhase
    ? (currentPhaseDeg !== null ? findNearestMoonPhase(currentPhaseDeg) : MOON_PHASE_DEFINITIONS[0])
    : MOON_PHASE_DEFINITIONS[manualPhaseIndex] ?? MOON_PHASE_DEFINITIONS[0]

  function handleRowClick(index: number): void {
    const isAlreadySelected = previewIndex === index
      || (previewIndex === null && index === selectedDef.index)
    if (isAlreadySelected) {
      onPhaseChange(index)
      setShowList(false)
      setPreviewIndex(null)
    } else {
      setPreviewIndex(index)
    }
  }

  function handleOpenList(): void {
    setPreviewIndex(null)
    setShowList(true)
  }

  useEffect(() => {
    if (showList && currentRowRef.current) {
      currentRowRef.current.scrollIntoView({ block: 'center' })
    }
  }, [showList])

  return createPortal(
    <div className={styles.container} data-testid="moon-phase-selector" style={{ top: 225 }}>
      <div className={styles.row}>
        <span className={styles.label}>moon</span>
        <span className={styles.label}>
          {selectedDef.phaseDeg}° | {Math.round(selectedDef.illumination * 100)}%
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.detail}>{selectedDef.nameEn}</span>
      </div>
      <div className={styles.row}>
        <button
          className={`${styles.autoBtn}${autoMoonPhase ? ' active' : ''}`}
          onClick={() => onAutoToggle(!autoMoonPhase)}
          title={autoMoonPhase ? 'Auto (on)' : 'Auto (off)'}
          data-testid="moon-phase-auto"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
        <button
          className={styles.listBtn}
          onClick={handleOpenList}
          title="月齢一覧"
          data-testid="moon-phase-list-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>
      </div>
      <div className={styles.detailLarge}>
        {selectedDef.nameJa}
      </div>
      <div className={styles.detail}>
        （{selectedDef.readingJa}）
      </div>
      <div className={styles.detail}>
        {selectedDef.description}
      </div>
      {showList && (() => {
        const detailIdx = hoveredIndex ?? previewIndex
        const detailDef = detailIdx !== null
          ? MOON_PHASE_DEFINITIONS[detailIdx]
          : selectedDef
        return createPortal(
          <div
            className={styles.listOverlay}
            onClick={() => setShowList(false)}
            data-testid="moon-phase-list-overlay"
          >
            <div
              className={styles.listBody}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.listHeader}>
                <table className={styles.listTable} style={{ width: '100%' }}>
                  <colgroup>
                    <col style={{ width: 36 }} />
                    <col style={{ width: 50 }} />
                    <col style={{ width: 50 }} />
                    <col style={{ width: 100 }} />
                    <col />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>月齢</th>
                      <th>離角</th>
                      <th>照度</th>
                      <th>名称</th>
                      <th>英語名</th>
                    </tr>
                  </thead>
                </table>
              </div>
              <div className={styles.listContainer}>
                <table className={styles.listTable} style={{ width: '100%' }}>
                  <colgroup>
                    <col style={{ width: 36 }} />
                    <col style={{ width: 50 }} />
                    <col style={{ width: 50 }} />
                    <col style={{ width: 100 }} />
                    <col />
                  </colgroup>
                  <tbody>
                    {MOON_PHASE_DEFINITIONS.map(def => {
                      const isCurrent = def.index === selectedDef.index
                      const isPreview = def.index === previewIndex
                      return (
                        <tr
                          key={def.index}
                          className={(previewIndex !== null ? isPreview : isCurrent) ? styles.listRowCurrent : undefined}
                          ref={isCurrent && previewIndex === null ? currentRowRef : isPreview ? currentRowRef : undefined}
                          onClick={() => handleRowClick(def.index)}
                          onMouseEnter={() => setHoveredIndex(def.index)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        >
                          <td>{def.lunarDay}</td>
                          <td>{def.phaseDeg}°</td>
                          <td>{Math.round(def.illumination * 100)}%</td>
                          <td>{def.nameJa}</td>
                          <td>{def.nameEn}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className={styles.listDetailPanel}>
                <div className={styles.listDetailSmall}>
                  月齢{detailDef.lunarDay}日 | {detailDef.phaseDeg}° | {Math.round(detailDef.illumination * 100)}%
                </div>
                <div className={styles.listDetailMedium}>
                  {detailDef.nameEn}
                </div>
                <div className={styles.listDetailLarge}>
                  {detailDef.nameJa}
                </div>
                <div className={styles.listDetailSmall}>
                  （{detailDef.readingJa}）
                </div>
                <div className={styles.listDetailSmall}>
                  {detailDef.description}
                </div>
              </div>
            </div>
            <button
              className={styles.listCloseBtn}
              onClick={() => setShowList(false)}
              data-testid="moon-phase-list-close"
            >
              ✕
            </button>
          </div>,
          document.body
        )
      })()}
    </div>,
    document.body
  )
}
