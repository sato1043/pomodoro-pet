import { useState } from 'react'
import { useEventBusCallback } from './hooks/useEventBus'
import type { EventBus } from '../../domain/shared/EventBus'
import type { EmotionStateUpdatedEvent } from '../../application/character/EmotionEvents'
import type { EmotionState } from '../../domain/character/value-objects/EmotionState'
import * as styles from './styles/emotion-indicator.css'

interface EmotionIndicatorProps {
  readonly bus: EventBus
}

/** 感情値(0.0〜1.0)をopacity(0.15〜1.0)に変換 */
function toOpacity(value: number): number {
  return 0.15 + value * 0.85
}

export function EmotionIndicator({ bus }: EmotionIndicatorProps): JSX.Element | null {
  const [emotion, setEmotion] = useState<EmotionState | null>(null)

  useEventBusCallback<EmotionStateUpdatedEvent>(bus, 'EmotionStateUpdated', (event) => {
    setEmotion(event.state)
  })

  if (!emotion) return null

  return (
    <span className={styles.container} data-testid="emotion-indicator">
      <span className={styles.icon} style={{ opacity: toOpacity(emotion.satisfaction) }} data-testid="emotion-satisfaction">♥</span>
      <span className={styles.icon} style={{ opacity: toOpacity(emotion.fatigue) }} data-testid="emotion-fatigue">⚡</span>
      <span className={styles.icon} style={{ opacity: toOpacity(emotion.affinity) }} data-testid="emotion-affinity">★</span>
    </span>
  )
}
