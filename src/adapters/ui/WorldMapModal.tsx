import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ClimateConfig } from '../../domain/environment/value-objects/ClimateData'
import { CITY_PRESETS } from '../../domain/environment/value-objects/ClimateData'
import { resolveTimezone } from '../../domain/environment/value-objects/Timezone'
import { computeTerminatorPolygon } from '../../domain/environment/value-objects/Terminator'
import { getSolarDeclinationAndGHA } from '../../infrastructure/astronomy/AstronomyAdapter'
import * as styles from './styles/world-map-modal.css'
import * as panelStyles from './styles/free-timer-panel.css'

// --- コンポーネント ---

interface WorldMapModalProps {
  readonly isOpen: boolean
  readonly currentClimate: ClimateConfig
  readonly onClose: () => void
  readonly onApply: (climate: ClimateConfig) => void
  readonly coastlinePath?: string
  readonly idlPath?: string
}

/** 経度を[-180, 180)に正規化する */
export function normalizeLon(lon: number): number {
  return ((lon + 180 + 360) % 360) - 180
}

/** 地図コンテンツを3枚並べるためのオフセット */
const MAP_OFFSETS = [-360, 0, 360] as const

/** viewBoxに表示する経度幅（全体360°の1/3） */
const VB_WIDTH = 120

/** スクロールボタン1回あたりの移動量（度） */
const SCROLL_STEP = 60

export function WorldMapModal({
  isOpen, currentClimate, onClose, onApply, coastlinePath, idlPath,
}: WorldMapModalProps): JSX.Element | null {
  const [selectedLat, setSelectedLat] = useState(currentClimate.latitude)
  const [selectedLon, setSelectedLon] = useState(currentClimate.longitude)
  const [selectedLabel, setSelectedLabel] = useState(currentClimate.label)
  const [selectedPreset, setSelectedPreset] = useState(currentClimate.presetName ?? '')
  const [centerLon, setCenterLon] = useState(currentClimate.longitude)
  const [nightPolygon, setNightPolygon] = useState('')
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const currentLonRef = useRef(currentClimate.longitude)
  const animRef = useRef<number>(0)
  const dragStartX = useRef(0)
  const dragStartLon = useRef(0)
  const hasDragged = useRef(false)

  // アニメーションクリーンアップ
  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  // 最短方向にスクロールアニメーション
  const scrollToLon = useCallback((targetLon: number) => {
    const target = normalizeLon(targetLon)
    cancelAnimationFrame(animRef.current)

    // 最短方向の差分（-180〜+180）
    let delta = ((target - currentLonRef.current) % 360 + 540) % 360 - 180
    if (Math.abs(delta) < 0.5) {
      currentLonRef.current = target
      setCenterLon(target)
      return
    }

    const startLon = currentLonRef.current
    const startTime = performance.now()
    // 距離に比例した所要時間（300ms〜1000ms）
    const duration = Math.max(300, Math.min(1000, Math.abs(delta) * 3))

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / duration)
      const eased = t * (2 - t) // ease-out quad

      if (t >= 1) {
        currentLonRef.current = target
        setCenterLon(target)
      } else {
        // アニメーション中は非正規化値を使用（日付変更線でジャンプしない）
        const pos = startLon + delta * eased
        currentLonRef.current = pos
        setCenterLon(pos)
        animRef.current = requestAnimationFrame(animate)
      }
    }

    animRef.current = requestAnimationFrame(animate)
  }, [])

  // terminator更新（モーダル開いたときに1回）
  useEffect(() => {
    if (!isOpen) return
    const { declination, gha } = getSolarDeclinationAndGHA(new Date())
    setNightPolygon(computeTerminatorPolygon(declination, gha))
  }, [isOpen])

  // currentClimate変更時に選択を同期（アニメーションなし）
  useEffect(() => {
    setSelectedLat(currentClimate.latitude)
    setSelectedLon(currentClimate.longitude)
    setSelectedLabel(currentClimate.label)
    setSelectedPreset(currentClimate.presetName ?? '')
    cancelAnimationFrame(animRef.current)
    currentLonRef.current = currentClimate.longitude
    setCenterLon(currentClimate.longitude)
  }, [currentClimate])

  // --- ドラッグスクロール ---

  const selectLocationAt = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const vbLeft = currentLonRef.current - VB_WIDTH / 2
    const x = ((clientX - rect.left) / rect.width) * VB_WIDTH + vbLeft
    const y = ((clientY - rect.top) / rect.height) * 180 - 90

    const lat = -y
    const lon = normalizeLon(x)
    setSelectedLat(Math.round(lat * 10) / 10)
    setSelectedLon(Math.round(lon * 10) / 10)
    setSelectedLabel(`Custom (${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'})`)
    setSelectedPreset('')
    scrollToLon(lon)
  }, [scrollToLon])

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return // 左クリックのみ
    cancelAnimationFrame(animRef.current)
    dragStartX.current = e.clientX
    dragStartLon.current = currentLonRef.current
    hasDragged.current = false
    setDragging(true)
  }, [])

  useEffect(() => {
    if (!dragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartX.current
      if (Math.abs(dx) > 3) hasDragged.current = true
      if (!hasDragged.current) return

      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const lonPerPixel = VB_WIDTH / rect.width
      const newLon = dragStartLon.current - dx * lonPerPixel
      currentLonRef.current = newLon
      setCenterLon(newLon)
    }

    const handleMouseUp = (e: MouseEvent) => {
      setDragging(false)
      if (!hasDragged.current) {
        selectLocationAt(e.clientX, e.clientY)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, selectLocationAt])

  const handlePresetClick = useCallback((presetName: string) => {
    const city = CITY_PRESETS.find(c => c.name === presetName)
    if (!city) return
    setSelectedLat(city.latitude)
    setSelectedLon(city.longitude)
    setSelectedLabel(city.name)
    setSelectedPreset(city.name)
    scrollToLon(city.longitude)
  }, [scrollToLon])

  const handleApply = useCallback(() => {
    const climate: ClimateConfig = {
      mode: selectedPreset ? 'preset' : 'custom',
      presetName: selectedPreset || undefined,
      latitude: selectedLat,
      longitude: selectedLon,
      label: selectedLabel,
      timezone: resolveTimezone(selectedLat, selectedLon),
    }
    onApply(climate)
    onClose()
  }, [selectedPreset, selectedLat, selectedLon, selectedLabel, onApply, onClose])

  if (!isOpen) return null

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* 戻るボタン: LocationButtonと同じ位置 */}
        <button className={styles.backButton} onClick={onClose} title="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        <div className={styles.mapContainer}>
          <svg
            ref={svgRef}
            viewBox={`${centerLon - VB_WIDTH / 2} -90 ${VB_WIDTH} 180`}
            onMouseDown={handleMouseDown}
            style={{ display: 'block', width: '100%', height: '100%', cursor: dragging ? 'grabbing' : 'grab' }}
            preserveAspectRatio="xMidYMid slice"
          >
            {/* 3枚並べ描画: viewBoxスクロールで端が切れないようにする */}
            {MAP_OFFSETS.map(offset => (
              <g key={offset} transform={`translate(${offset}, 0)`}>
                {/* Layer 1: 海洋背景 */}
                <rect x="-180" y="-90" width="360" height="180" fill="#1a3a5c" />

                {/* Layer 2: 大陸 */}
                {coastlinePath && (
                  <path d={coastlinePath} fill="#2a4a2a" stroke="#3a5a3a" strokeWidth="0.5" />
                )}

                {/* Layer 2.5: 国際日付変更線 */}
                {idlPath && (
                  <path d={idlPath} fill="none" stroke="#ffffff" strokeWidth="0.3" strokeDasharray="2,2" opacity="0.35" />
                )}

                {/* Layer 3: 夜側オーバーレイ */}
                {nightPolygon && (
                  <polygon points={nightPolygon} fill="black" opacity="0.5" />
                )}

                {/* Layer 4: プリセット都市ピン */}
                {CITY_PRESETS.map(city => {
                  const isSelected = selectedPreset === city.name
                  return (
                    <g key={city.name} onMouseUp={() => { if (!hasDragged.current) { hasDragged.current = true; handlePresetClick(city.name) } }} style={{ cursor: 'pointer' }}>
                      <circle
                        cx={city.longitude}
                        cy={-city.latitude}
                        r={isSelected ? 3 : 2}
                        fill={isSelected ? '#ff6644' : '#ffffff'}
                      />
                      <text
                        x={city.longitude + 4}
                        y={-city.latitude + 1.5}
                        fontSize="5"
                        fill="#ffffff"
                        opacity="0.8"
                      >
                        {city.name}
                      </text>
                    </g>
                  )
                })}

                {/* Layer 5: カスタム選択ピン */}
                {!selectedPreset && (
                  <circle cx={selectedLon} cy={-selectedLat} r="3" fill="#44ff66" />
                )}
              </g>
            ))}
          </svg>
          {/* 左右スクロールボタン */}
          <div className={styles.scrollButtonGroup}>
            <button
              className={styles.scrollButton}
              onClick={() => scrollToLon(currentLonRef.current - SCROLL_STEP)}
              title="Scroll West"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              className={styles.scrollButton}
              onClick={() => scrollToLon(currentLonRef.current + SCROLL_STEP)}
              title="Scroll East"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* プリセットボタン */}
        <div className={styles.presetBar}>
          {CITY_PRESETS.map(city => (
            <button
              key={city.name}
              className={`${styles.presetButton} ${selectedPreset === city.name ? styles.presetButtonActive : ''}`}
              onClick={() => handlePresetClick(city.name)}
            >
              {city.name}
            </button>
          ))}
        </div>

        {/* 座標情報 */}
        <div className={styles.coordInfo}>
          {selectedLat.toFixed(2)}°, {selectedLon.toFixed(2)}°
        </div>

        {/* 適用ボタン（SetButtonと同じスタイル） */}
        <button className={`${panelStyles.btn} ${panelStyles.btnPrimary}`} onClick={handleApply} style={{ marginTop: 8 }}>
          Set Location
        </button>
      </div>
    </div>,
    document.body
  )
}
