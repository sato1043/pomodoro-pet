import { useState, useRef, useEffect } from 'react'
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
  const [showList, setShowList] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const currentRowRef = useRef<HTMLTableRowElement>(null)

  const selectedIndex = autoKou
    ? (currentKou?.index ?? 0)
    : manualKouIndex

  function handleRowClick(index: number): void {
    const isAlreadySelected = previewIndex === index
      || (previewIndex === null && index === selectedIndex)
    if (isAlreadySelected) {
      // 確定
      onKouChange(index)
      if (autoKou) {
        onAutoToggle(false)
      }
      setShowList(false)
      setPreviewIndex(null)
    } else {
      // 選択（プレビュー）
      setPreviewIndex(index)
    }
  }

  function handleOpenList(): void {
    setPreviewIndex(null)
    setShowList(true)
  }

  const selected = KOU_DEFINITIONS[selectedIndex]
  const rangeMap = new Map(kouDateRanges.map(r => [r.index, r]))

  useEffect(() => {
    if (showList && currentRowRef.current) {
      currentRowRef.current.scrollIntoView({ block: 'center' })
    }
  }, [showList])

  return createPortal(
    <div className={styles.container} data-testid="kou-selector">
      <div className={styles.row}>
        <span className={styles.label}>season</span>
        <span className={styles.label}>
          #{pad2(selectedIndex + 1)}{(() => { const r = rangeMap.get(selectedIndex); return r ? ` | ${formatDateRange(r)}` : '' })()}
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.detail}>{selected.nameEn}</span>
      </div>
      <div className={styles.row} style={{ marginBottom: 15 }}>
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
        <button
          className={styles.listBtn}
          onClick={handleOpenList}
          title="七十二候一覧"
          data-testid="kou-list-btn"
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
      <div className={styles.detail}>
        λ={selected.eclipticLonStart}°
      </div>
      {showList && (() => {
        const detailIdx = hoveredIndex ?? previewIndex
        const detailKou = detailIdx !== null
          ? KOU_DEFINITIONS[detailIdx]
          : selected
        const detailRange = rangeMap.get(detailKou.index)
        return createPortal(
          <div
            className={styles.listOverlay}
            onClick={() => setShowList(false)}
            data-testid="kou-list-overlay"
          >
            <div
              className={styles.listBody}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.listHeader}>
                <table className={styles.listTable} style={{ width: '100%' }}>
                  <colgroup>
                    <col style={{ width: 32 }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 50 }} />
                    <col />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>日付範囲</th>
                      <th>節気</th>
                      <th>候名</th>
                    </tr>
                  </thead>
                </table>
              </div>
              <div className={styles.listContainer}>
                <table className={styles.listTable} style={{ width: '100%' }}>
                  <colgroup>
                    <col style={{ width: 32 }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 50 }} />
                    <col />
                  </colgroup>
                  <tbody>
                    {KOU_DEFINITIONS.map(k => {
                      const range = rangeMap.get(k.index)
                      const isCurrent = k.index === selectedIndex
                      const isPreview = k.index === previewIndex
                      return (
                        <tr
                          key={k.index}
                          className={(previewIndex !== null ? isPreview : isCurrent) ? styles.listRowCurrent : undefined}
                          ref={isCurrent && previewIndex === null ? currentRowRef : isPreview ? currentRowRef : undefined}
                          onClick={() => handleRowClick(k.index)}
                          onMouseEnter={() => setHoveredIndex(k.index)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        >
                          <td>{k.index + 1}</td>
                          <td>{range ? formatDateRange(range) : ''}</td>
                          <td>{k.solarTermName}</td>
                          <td>{k.nameJa}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className={styles.listDetailPanel}>
                <div className={styles.listDetailSmall}>
                  #{detailKou.index + 1}{detailRange ? ` | ${formatDateRange(detailRange)}` : ''}
                </div>
                <div className={styles.listDetailMedium}>
                  {detailKou.solarTermNameEn} {detailKou.phaseNameEn}
                </div>
                <div className={styles.listDetailMedium}>
                  {detailKou.nameEn}
                </div>
                <div className={styles.listDetailLarge}>
                  {detailKou.solarTermName} {detailKou.phaseNameJa}
                </div>
                <div className={styles.listDetailLarge}>
                  {detailKou.nameJa}
                </div>
                <div className={styles.listDetailSmall}>
                  （{detailKou.readingJa}）
                </div>
                <div className={styles.listDetailSmall}>
                  {detailKou.description}
                </div>
                <div className={styles.listDetailSmall}>
                  λ={detailKou.eclipticLonStart}°
                </div>
              </div>
            </div>
            <button
              className={styles.listCloseBtn}
              onClick={() => setShowList(false)}
              data-testid="kou-list-close"
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
