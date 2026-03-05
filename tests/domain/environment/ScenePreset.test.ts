import { describe, it, expect } from 'vitest'
import {
  createMeadowPreset,
  createSeasidePreset,
  createParkPreset,
  resolvePreset,
  ALL_SCENE_PRESETS,
} from '../../../src/domain/environment/value-objects/ScenePreset'

describe('ScenePreset', () => {
  describe('createMeadowPreset', () => {
    const preset = createMeadowPreset()

    it('プリセット名がmeadowである', () => {
      expect(preset.name).toBe('meadow')
    })

    it('ChunkSpecが正しい', () => {
      expect(preset.chunkSpec).toEqual({
        width: 20,
        depth: 10,
        treeCount: 2,
        grassCount: 50,
        rockCount: 1,
        flowerCount: 3,
      })
    })
  })

  describe('createSeasidePreset', () => {
    const preset = createSeasidePreset()

    it('プリセット名がseasideである', () => {
      expect(preset.name).toBe('seaside')
    })

    it('width/depthが共通値である', () => {
      expect(preset.chunkSpec.width).toBe(20)
      expect(preset.chunkSpec.depth).toBe(10)
    })

    it('木がない', () => {
      expect(preset.chunkSpec.treeCount).toBe(0)
    })
  })

  describe('createParkPreset', () => {
    const preset = createParkPreset()

    it('プリセット名がparkである', () => {
      expect(preset.name).toBe('park')
    })

    it('width/depthが共通値である', () => {
      expect(preset.chunkSpec.width).toBe(20)
      expect(preset.chunkSpec.depth).toBe(10)
    })

    it('街路樹が5本ある', () => {
      expect(preset.chunkSpec.treeCount).toBe(5)
    })

    it('花がある', () => {
      expect(preset.chunkSpec.flowerCount).toBeGreaterThan(0)
    })

  })

  describe('resolvePreset', () => {
    it.each(['meadow', 'seaside', 'park'] as const)('%sを解決する', (name) => {
      const preset = resolvePreset(name)
      expect(preset.name).toBe(name)
    })
  })

  describe('ALL_SCENE_PRESETS', () => {
    it('3つのプリセット名を含む', () => {
      expect(ALL_SCENE_PRESETS).toEqual(['meadow', 'seaside', 'park'])
    })
  })
})
