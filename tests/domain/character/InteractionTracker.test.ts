import { describe, it, expect, beforeEach } from 'vitest'
import { createInteractionTracker, type InteractionTracker } from '../../../src/domain/character/services/InteractionTracker'

describe('InteractionTracker', () => {
  let tracker: InteractionTracker

  beforeEach(() => {
    tracker = createInteractionTracker()
  })

  describe('初期状態', () => {
    it('recentClicksが0である', () => {
      expect(tracker.history.recentClicks).toBe(0)
    })

    it('totalFeedingsTodayが0である', () => {
      expect(tracker.history.totalFeedingsToday).toBe(0)
    })
  })

  describe('recordClick', () => {
    it('クリックを記録するとrecentClicksが増加する', () => {
      tracker.recordClick()
      expect(tracker.history.recentClicks).toBe(1)
    })

    it('複数クリックが蓄積される', () => {
      tracker.recordClick()
      tracker.recordClick()
      tracker.recordClick()
      expect(tracker.history.recentClicks).toBe(3)
    })

    it('3秒以上経過したクリックは除去される', () => {
      tracker.recordClick()
      tracker.recordClick()
      tracker.tick(3001) // 3秒超経過
      expect(tracker.history.recentClicks).toBe(0)
    })

    it('3秒以内のクリックは保持される', () => {
      tracker.recordClick()
      tracker.tick(2000) // 2秒経過
      tracker.recordClick()
      tracker.tick(1500) // さらに1.5秒（合計3.5秒）
      // 最初のクリックは3秒超で除去、2番目は1.5秒なので保持
      expect(tracker.history.recentClicks).toBe(1)
    })

    it('時間経過で古いクリックのみ除去される', () => {
      tracker.recordClick() // t=0
      tracker.tick(1000)
      tracker.recordClick() // t=1000
      tracker.tick(1000)
      tracker.recordClick() // t=2000
      tracker.tick(1500) // t=3500
      // t=0のクリックは3.5秒前 → 除去
      // t=1000のクリックは2.5秒前 → 保持
      // t=2000のクリックは1.5秒前 → 保持
      expect(tracker.history.recentClicks).toBe(2)
    })
  })

  describe('recordFeeding', () => {
    it('餌やりを記録するとtotalFeedingsTodayが増加する', () => {
      tracker.recordFeeding()
      expect(tracker.history.totalFeedingsToday).toBe(1)
    })

    it('複数回の餌やりが蓄積される', () => {
      tracker.recordFeeding()
      tracker.recordFeeding()
      tracker.recordFeeding()
      expect(tracker.history.totalFeedingsToday).toBe(3)
    })

    it('時間経過では減少しない', () => {
      tracker.recordFeeding()
      tracker.recordFeeding()
      tracker.tick(100000)
      expect(tracker.history.totalFeedingsToday).toBe(2)
    })
  })

  describe('resetDaily', () => {
    it('totalFeedingsTodayを0にリセットする', () => {
      tracker.recordFeeding()
      tracker.recordFeeding()
      tracker.resetDaily()
      expect(tracker.history.totalFeedingsToday).toBe(0)
    })

    it('recentClicksには影響しない', () => {
      tracker.recordClick()
      tracker.resetDaily()
      expect(tracker.history.recentClicks).toBe(1)
    })
  })
})
