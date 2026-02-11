import { describe, it, expect, beforeEach } from 'vitest'
import {
  createGestureRecognizer,
  type GestureRecognizer,
  DEFAULT_GESTURE_CONFIG
} from '../../../src/domain/character/services/GestureRecognizer'

describe('GestureRecognizer', () => {
  let gr: GestureRecognizer

  beforeEach(() => {
    gr = createGestureRecognizer()
  })

  describe('初期状態', () => {
    it('pendingで始まる', () => {
      expect(gr.kind).toBe('pending')
    })
  })

  describe('ドラッグ判定', () => {
    it('Y方向に閾値以上移動するとdragを返す', () => {
      const result = gr.update(0, DEFAULT_GESTURE_CONFIG.dragThresholdY + 1)
      expect(result).toBe('drag')
      expect(gr.kind).toBe('drag')
    })

    it('Y方向が閾値未満ではpendingのまま', () => {
      const result = gr.update(0, DEFAULT_GESTURE_CONFIG.dragThresholdY - 1)
      expect(result).toBe('pending')
    })

    it('drag確定後はupdate()がdragを返し続ける', () => {
      gr.update(0, DEFAULT_GESTURE_CONFIG.dragThresholdY + 1)
      expect(gr.update(5, 0)).toBe('drag')
    })
  })

  describe('撫でる判定', () => {
    it('X方向に移動後、逆方向に閾値以上戻るとpetを返す', () => {
      const t = DEFAULT_GESTURE_CONFIG.petThresholdX
      // 右に閾値以上移動
      gr.update(t + 1, 0)
      // 左に閾値以上戻る（ピークからの逆行）
      const result = gr.update(-1, 0)
      expect(result).toBe('pet')
      expect(gr.kind).toBe('pet')
    })

    it('一方向のみの移動ではpendingのまま', () => {
      gr.update(10, 0)
      const result = gr.update(15, 0)
      expect(result).toBe('pending')
    })

    it('微小な移動（閾値未満）は方向確定しない', () => {
      const t = DEFAULT_GESTURE_CONFIG.petThresholdX
      gr.update(t - 1, 0)
      const result = gr.update(-(t - 1), 0)
      expect(result).toBe('pending')
    })

    it('pet確定後はupdate()がpetを返し続ける', () => {
      const t = DEFAULT_GESTURE_CONFIG.petThresholdX
      gr.update(t + 1, 0)
      gr.update(-1, 0) // pet確定
      expect(gr.update(10, 0)).toBe('pet')
    })
  })

  describe('drag vs pet判定', () => {
    it('Y方向が優勢のときdragになる', () => {
      const result = gr.update(3, DEFAULT_GESTURE_CONFIG.dragThresholdY + 1)
      expect(result).toBe('drag')
    })

    it('X方向が優勢のときY閾値を超えてもdragにならない', () => {
      // X=15, Y=10 → X方向が優勢なのでdragにならない
      const result = gr.update(15, DEFAULT_GESTURE_CONFIG.dragThresholdY + 2)
      expect(result).toBe('pending')
    })
  })

  describe('finalize', () => {
    it('pending状態でfinalize()するとnoneを返す', () => {
      const result = gr.finalize()
      expect(result).toBe('none')
      expect(gr.kind).toBe('none')
    })

    it('drag確定済みでfinalize()するとdragを返す', () => {
      gr.update(0, DEFAULT_GESTURE_CONFIG.dragThresholdY + 1)
      expect(gr.finalize()).toBe('drag')
    })

    it('pet確定済みでfinalize()するとpetを返す', () => {
      const t = DEFAULT_GESTURE_CONFIG.petThresholdX
      gr.update(t + 1, 0)
      gr.update(-1, 0)
      expect(gr.finalize()).toBe('pet')
    })
  })

  describe('reset', () => {
    it('reset()で全状態がクリアされpendingに戻る', () => {
      gr.update(0, DEFAULT_GESTURE_CONFIG.dragThresholdY + 1)
      expect(gr.kind).toBe('drag')
      gr.reset()
      expect(gr.kind).toBe('pending')
    })
  })

  describe('設定カスタマイズ', () => {
    it('dragThresholdYを変更するとドラッグ判定閾値が変わる', () => {
      const custom = createGestureRecognizer({ dragThresholdY: 20 })
      expect(custom.update(0, 15)).toBe('pending')
      expect(custom.update(0, 21)).toBe('drag')
    })

    it('petThresholdXを変更すると撫でる判定閾値が変わる', () => {
      const custom = createGestureRecognizer({ petThresholdX: 15 })
      // 閾値(15)以上移動して方向確定
      custom.update(16, 0)
      // ピークから閾値(15)以上逆行
      const result = custom.update(-1, 0)
      expect(result).toBe('pet')
    })

    it('petDirectionChangesを変更すると必要方向転換回数が変わる', () => {
      const custom = createGestureRecognizer({ petDirectionChanges: 2 })
      const t = DEFAULT_GESTURE_CONFIG.petThresholdX
      // 1回目の方向転換
      custom.update(t + 1, 0)
      custom.update(-1, 0)
      expect(custom.kind).toBe('pending') // まだ1回なのでpending
      // 2回目の方向転換
      custom.update(-(t + 1), 0)
      const result = custom.update(1, 0)
      expect(result).toBe('pet')
    })
  })
})
