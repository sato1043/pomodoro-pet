import { describe, it, expect } from 'vitest'
import { interpretPrompt } from '../../../src/application/character/InterpretPromptUseCase'

describe('InterpretPrompt', () => {
  describe('英語キーワード', () => {
    it('"pet me" → pet', () => {
      expect(interpretPrompt('pet me')).toBe('pet')
    })
    it('"stroke" → pet', () => {
      expect(interpretPrompt('stroke')).toBe('pet')
    })
    it('"walk around" → wander', () => {
      expect(interpretPrompt('walk around')).toBe('wander')
    })
    it('"sit down" → sit', () => {
      expect(interpretPrompt('sit down')).toBe('sit')
    })
    it('"sleep" → sleep', () => {
      expect(interpretPrompt('sleep')).toBe('sleep')
    })
    it('"dance!" → happy', () => {
      expect(interpretPrompt('dance!')).toBe('happy')
    })
    it('"wave hello" → reaction', () => {
      expect(interpretPrompt('wave hello')).toBe('reaction')
    })
    it('"stop" → idle', () => {
      expect(interpretPrompt('stop')).toBe('idle')
    })
  })

  describe('日本語キーワード', () => {
    it('"撫でて" → pet', () => {
      expect(interpretPrompt('撫でて')).toBe('pet')
    })
    it('"歩け" → wander', () => {
      expect(interpretPrompt('歩け')).toBe('wander')
    })
    it('"座れ" → sit', () => {
      expect(interpretPrompt('座れ')).toBe('sit')
    })
    it('"寝ろ" → sleep', () => {
      expect(interpretPrompt('寝ろ')).toBe('sleep')
    })
    it('"踊れ" → happy', () => {
      expect(interpretPrompt('踊れ')).toBe('happy')
    })
    it('"手を振れ" → reaction', () => {
      expect(interpretPrompt('手を振れ')).toBe('reaction')
    })
  })

  describe('フォールバック', () => {
    it('未知のテキスト → idle', () => {
      expect(interpretPrompt('asdfghjkl')).toBe('idle')
    })
    it('空文字 → idle', () => {
      expect(interpretPrompt('')).toBe('idle')
    })
    it('大文字小文字を区別しない', () => {
      expect(interpretPrompt('WALK')).toBe('wander')
      expect(interpretPrompt('Dance')).toBe('happy')
    })
  })
})
