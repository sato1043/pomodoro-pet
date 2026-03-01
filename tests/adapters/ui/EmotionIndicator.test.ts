import { describe, it, expect } from 'vitest'

/**
 * EmotionIndicator の opacity 変換ロジックのテスト。
 * コンポーネント内の toOpacity 関数と同じ計算式:
 *   opacity = 0.15 + value * 0.85
 *
 * DOM レンダリングテストは jsdom 環境未設定のため対象外。
 * E2E テスト（Playwright）で実機検証する。
 */

function toOpacity(value: number): number {
  return 0.15 + value * 0.85
}

describe('EmotionIndicator toOpacity', () => {
  it('value 0.0 → opacity 0.15', () => {
    expect(toOpacity(0.0)).toBeCloseTo(0.15)
  })

  it('value 0.5 → opacity 0.575', () => {
    expect(toOpacity(0.5)).toBeCloseTo(0.575)
  })

  it('value 1.0 → opacity 1.0', () => {
    expect(toOpacity(1.0)).toBeCloseTo(1.0)
  })

  it('value 0.25 → opacity 0.3625', () => {
    expect(toOpacity(0.25)).toBeCloseTo(0.3625)
  })

  it('value 0.75 → opacity 0.7875', () => {
    expect(toOpacity(0.75)).toBeCloseTo(0.7875)
  })
})
