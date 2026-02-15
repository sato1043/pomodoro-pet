import { describe, it, expect } from 'vitest'
import {
  createDefaultSceneConfig,
  createDefaultChunkSpec,
  shouldScroll
} from '../../../src/domain/environment/value-objects/SceneConfig'

describe('SceneConfig', () => {
  const config = createDefaultSceneConfig()

  describe('createDefaultSceneConfig', () => {
    it('進行方向が+Z（奥→手前）である', () => {
      expect(config.direction).toEqual({ x: 0, z: 1 })
    })

    it('スクロール速度が1.5である', () => {
      expect(config.scrollSpeed).toBe(1.5)
    })
  })

  describe('shouldScroll', () => {
    it('march状態ではtrueを返す', () => {
      expect(shouldScroll('march')).toBe(true)
    })

    it('wander状態ではfalseを返す', () => {
      expect(shouldScroll('wander')).toBe(false)
    })

    it.each([
      'idle', 'sit', 'sleep', 'happy', 'reaction', 'dragged'
    ] as const)('%s状態ではfalseを返す', (state) => {
      expect(shouldScroll(state)).toBe(false)
    })
  })

  describe('createDefaultChunkSpec', () => {
    it('デフォルト値が正しい', () => {
      const spec = createDefaultChunkSpec()
      expect(spec.width).toBe(20)
      expect(spec.depth).toBe(10)
      expect(spec.treeCount).toBe(2)
      expect(spec.grassCount).toBe(50)
      expect(spec.rockCount).toBe(1)
      expect(spec.flowerCount).toBe(3)
    })
  })
})
