export type GestureKind = 'pending' | 'drag' | 'pet' | 'none'

export interface GestureRecognizerConfig {
  readonly dragThresholdY: number
  readonly petThresholdX: number
  readonly petDirectionChanges: number
}

export const DEFAULT_GESTURE_CONFIG: GestureRecognizerConfig = {
  dragThresholdY: 8,
  petThresholdX: 6,
  petDirectionChanges: 1
}

export interface GestureRecognizer {
  readonly kind: GestureKind
  update(deltaX: number, deltaY: number): GestureKind
  reset(): void
  finalize(): GestureKind
}

export function createGestureRecognizer(
  config?: Partial<GestureRecognizerConfig>
): GestureRecognizer {
  const cfg: GestureRecognizerConfig = { ...DEFAULT_GESTURE_CONFIG, ...config }

  let kind: GestureKind = 'pending'
  let direction = 0 // -1 or +1, 0 = 未確定
  let peakX = 0
  let directionChanges = 0

  return {
    get kind() { return kind },

    update(deltaX: number, deltaY: number): GestureKind {
      if (kind !== 'pending') return kind

      // ドラッグ判定: Y方向が閾値超過 かつ Y方向がX方向より優勢
      if (deltaY > cfg.dragThresholdY && deltaY > Math.abs(deltaX)) {
        kind = 'drag'
        return kind
      }

      // 撫でる判定: ピーク追跡方式の方向転換検出
      if (direction === 0) {
        // 方向未確定: 閾値以上移動したら方向確定
        if (Math.abs(deltaX) >= cfg.petThresholdX) {
          direction = deltaX > 0 ? 1 : -1
          peakX = deltaX
        }
      } else {
        // 同方向の移動が続く場合ピーク更新
        if (direction > 0 && deltaX > peakX) {
          peakX = deltaX
        } else if (direction < 0 && deltaX < peakX) {
          peakX = deltaX
        }

        // ピークからの逆行を検出
        const reversal = direction > 0
          ? peakX - deltaX
          : deltaX - peakX

        if (reversal >= cfg.petThresholdX) {
          directionChanges++
          direction = -direction
          peakX = deltaX

          if (directionChanges >= cfg.petDirectionChanges) {
            kind = 'pet'
            return kind
          }
        }
      }

      return 'pending'
    },

    reset(): void {
      kind = 'pending'
      direction = 0
      peakX = 0
      directionChanges = 0
    },

    finalize(): GestureKind {
      if (kind === 'pending') {
        kind = 'none'
      }
      return kind
    }
  }
}
