import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { KouDefinition } from '../../domain/environment/value-objects/Kou'
import * as styles from './styles/kou-display.css'

const PHASE_LABELS: Record<string, string> = {
  initial: '初候',
  middle: '次候',
  final: '末候',
}

interface KouDisplayProps {
  readonly kou: KouDefinition | null
  readonly visible: boolean
}

export function KouDisplay({ kou, visible }: KouDisplayProps): JSX.Element | null {
  const [displayKou, setDisplayKou] = useState<KouDefinition | null>(null)
  const [opacity, setOpacity] = useState(0.4)

  useEffect(() => {
    if (!kou || (displayKou && kou.index === displayKou.index)) return

    let fadeDownTimer: ReturnType<typeof setTimeout> | undefined

    // Phase 1: フェードアウト
    setOpacity(0)
    const fadeOutTimer = setTimeout(() => {
      // Phase 2: テキスト切替
      setDisplayKou(kou)
      // Phase 3: フェードイン to 0.8
      setOpacity(0.8)
      // Phase 4: 3秒後に通常opacity 0.4に戻す
      fadeDownTimer = setTimeout(() => setOpacity(0.4), 3000)
    }, 500)

    return () => {
      clearTimeout(fadeOutTimer)
      if (fadeDownTimer) clearTimeout(fadeDownTimer)
    }
  }, [kou]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible || !displayKou) return null

  return createPortal(
    <div className={styles.container} style={{ opacity }}>
      <div className={styles.solarTerm}>
        {displayKou.solarTermName} {PHASE_LABELS[displayKou.phase]}
      </div>
      <div className={styles.kouName}>{displayKou.nameJa}</div>
      <div className={styles.reading}>{displayKou.readingJa}</div>
    </div>,
    document.body
  )
}
