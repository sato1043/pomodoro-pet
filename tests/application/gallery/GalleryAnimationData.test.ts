import { describe, it, expect } from 'vitest'
import { GALLERY_CLIPS, GALLERY_STATES, GALLERY_RULES } from '../../../src/application/gallery/GalleryAnimationData'
import { STATE_CONFIGS, type CharacterStateName } from '../../../src/domain/character/value-objects/CharacterState'

describe('GalleryAnimationData', () => {
  describe('GALLERY_CLIPS', () => {
    it('13件のクリップが定義されている', () => {
      expect(GALLERY_CLIPS).toHaveLength(13)
    })

    it('各クリップにclipName/label/description/loopが存在する', () => {
      for (const clip of GALLERY_CLIPS) {
        expect(clip.clipName).toBeTruthy()
        expect(clip.label).toBeTruthy()
        expect(clip.description).toBeTruthy()
        expect(typeof clip.loop).toBe('boolean')
      }
    })

    it('clipNameが一意である', () => {
      const names = GALLERY_CLIPS.map((c) => c.clipName)
      expect(new Set(names).size).toBe(names.length)
    })

    it('walkとrunのみloop trueである', () => {
      const loopClips = GALLERY_CLIPS.filter((c) => c.loop).map((c) => c.clipName)
      expect(loopClips.sort()).toEqual(['idle', 'run', 'sit', 'walk'].sort())
    })
  })

  describe('GALLERY_STATES', () => {
    it('11件の状態が定義されている', () => {
      expect(GALLERY_STATES).toHaveLength(11)
    })

    it('各状態にstate/label/descriptionが存在する', () => {
      for (const state of GALLERY_STATES) {
        expect(state.state).toBeTruthy()
        expect(state.label).toBeTruthy()
        expect(state.description).toBeTruthy()
      }
    })

    it('全CharacterStateNameを網羅している', () => {
      const allStateNames = Object.keys(STATE_CONFIGS) as CharacterStateName[]
      const galleryStateNames = GALLERY_STATES.map((s) => s.state)
      expect(galleryStateNames.sort()).toEqual(allStateNames.sort())
    })

    it('stateが一意である', () => {
      const states = GALLERY_STATES.map((s) => s.state)
      expect(new Set(states).size).toBe(states.length)
    })

    it('loopオーバーライドが指定されたものはboolean値を持つ', () => {
      for (const state of GALLERY_STATES) {
        if (state.loop !== undefined) {
          expect(typeof state.loop).toBe('boolean')
        }
      }
    })

    it('sitとsleepにloop falseオーバーライドが設定されている', () => {
      const sit = GALLERY_STATES.find((s) => s.state === 'sit')
      const sleep = GALLERY_STATES.find((s) => s.state === 'sleep')
      expect(sit?.loop).toBe(false)
      expect(sleep?.loop).toBe(false)
    })

    it('各stateがSTATE_CONFIGSに存在する', () => {
      for (const state of GALLERY_STATES) {
        expect(STATE_CONFIGS[state.state]).toBeDefined()
      }
    })
  })

  describe('GALLERY_RULES', () => {
    it('14件のルールが定義されている', () => {
      expect(GALLERY_RULES).toHaveLength(14)
    })

    it('各ルールにname/label/description/selectionが存在する', () => {
      for (const rule of GALLERY_RULES) {
        expect(rule.name).toBeTruthy()
        expect(rule.label).toBeTruthy()
        expect(rule.description).toBeTruthy()
        expect(rule.selection).toBeDefined()
        expect(rule.selection.clipName).toBeTruthy()
        expect(typeof rule.selection.loop).toBe('boolean')
      }
    })

    it('nameが一意である', () => {
      const names = GALLERY_RULES.map((r) => r.name)
      expect(new Set(names).size).toBe(names.length)
    })

    it('selectionのclipNameがGALLERY_CLIPSに存在する', () => {
      const clipNames = new Set(GALLERY_CLIPS.map((c) => c.clipName))
      for (const rule of GALLERY_RULES) {
        expect(clipNames.has(rule.selection.clipName)).toBe(true)
      }
    })
  })
})
