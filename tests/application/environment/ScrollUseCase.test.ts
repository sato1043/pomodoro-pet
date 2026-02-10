import { describe, it, expect, beforeEach } from 'vitest'
import {
  createScrollManager,
  type ScrollManager,
  type ScrollState
} from '../../../src/application/environment/ScrollUseCase'
import { createDefaultSceneConfig, createDefaultChunkSpec } from '../../../src/domain/environment/value-objects/SceneConfig'

describe('ScrollUseCase', () => {
  let manager: ScrollManager
  const config = createDefaultSceneConfig()
  const chunkSpec = createDefaultChunkSpec()
  const depth = chunkSpec.depth // 10

  beforeEach(() => {
    manager = createScrollManager(config, chunkSpec, 3)
  })

  describe('初期状態', () => {
    it('3チャンクのオフセットが[-depth, 0, +depth]である', () => {
      const state = manager.state
      expect(state.chunkOffsets).toEqual([-depth, 0, depth])
    })

    it('リサイクル対象がない', () => {
      expect(manager.state.recycledChunkIndex).toBeNull()
    })
  })

  describe('スクロール無効時', () => {
    it('isScrolling=falseならオフセットが変化しない', () => {
      const before = [...manager.state.chunkOffsets]
      manager.tick(1000, false)
      expect(manager.state.chunkOffsets).toEqual(before)
    })

    it('isScrolling=falseならリサイクルが発生しない', () => {
      manager.tick(1000, false)
      expect(manager.state.recycledChunkIndex).toBeNull()
    })
  })

  describe('スクロール有効時', () => {
    it('1秒スクロールでオフセットがscrollSpeed分増加する', () => {
      manager.tick(1000, true)
      const offsets = manager.state.chunkOffsets
      // scrollSpeed=1.5, dt=1s → +1.5
      expect(offsets[0]).toBeCloseTo(-depth + 1.5, 5)
      expect(offsets[1]).toBeCloseTo(1.5, 5)
      expect(offsets[2]).toBeCloseTo(depth + 1.5, 5)
    })

    it('小さいdtでも正しく加算される', () => {
      manager.tick(100, true) // 0.1秒
      const offsets = manager.state.chunkOffsets
      // scrollSpeed=1.5, dt=0.1s → +0.15
      expect(offsets[1]).toBeCloseTo(0.15, 5)
    })
  })

  describe('チャンクリサイクル', () => {
    // recycleThreshold = (chunkCount - 1) * depth = 2 * 10 = 20
    it('オフセットがrecycleThresholdを超えたチャンクがリサイクルされる', () => {
      // chunk[2]=10 → 20を超えるには (20-10)/1.5 = 6.67秒以上
      manager.tick(7000, true) // 7秒 → +10.5
      // chunk[2] = 10 + 10.5 = 20.5 > 20 → リサイクル
      expect(manager.state.recycledChunkIndex).toBe(2)
    })

    it('リサイクルされたチャンクはmin(offsets) - depthに再配置される', () => {
      // 7秒スクロール: offsets = [0.5, 10.5, 20.5]
      // chunk[2]がリサイクル → min(0.5) - 10 = -9.5
      manager.tick(7000, true)
      const offsets = manager.state.chunkOffsets
      expect(offsets[2]).toBeCloseTo(-9.5, 5)
    })

    it('リサイクルが不要なtickではrecycledChunkIndexがnullになる', () => {
      manager.tick(1000, true) // 少しだけスクロール
      expect(manager.state.recycledChunkIndex).toBeNull()
    })

    it('連続スクロールで複数回リサイクルが発生する', () => {
      // 1回目のリサイクル
      manager.tick(7000, true)
      expect(manager.state.recycledChunkIndex).toBe(2)

      // さらにスクロールして2回目のリサイクル
      // 現在: chunk[0]=0.5, chunk[1]=10.5, chunk[2]=-9.5
      // 14秒後: chunk[0]=21.5, chunk[1]=31.5, chunk[2]=11.5
      manager.tick(14000, true)
      expect(manager.state.recycledChunkIndex).toBe(0)
    })
  })

  describe('reset', () => {
    it('リセットで初期状態に戻る', () => {
      manager.tick(5000, true)
      manager.reset()
      expect(manager.state.chunkOffsets).toEqual([-depth, 0, depth])
      expect(manager.state.recycledChunkIndex).toBeNull()
    })
  })
})
