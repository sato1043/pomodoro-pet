import { describe, it, expect, beforeEach } from 'vitest'
import {
  createBehaviorStateMachine,
  type BehaviorStateMachine
} from '../../../src/domain/character/services/BehaviorStateMachine'

describe('BehaviorStateMachine', () => {
  let sm: BehaviorStateMachine

  beforeEach(() => {
    sm = createBehaviorStateMachine()
  })

  describe('初期状態', () => {
    it('idleで始まる', () => {
      expect(sm.currentState).toBe('idle')
    })
  })

  describe('タイムアウト遷移', () => {
    it('IDLEからタイムアウトでWANDERに遷移する', () => {
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('wander')
      expect(sm.currentState).toBe('wander')
    })

    it('WANDERからタイムアウトでSITに遷移する', () => {
      sm.transition({ type: 'timeout' }) // idle -> wander
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('sit')
    })

    it('SITからタイムアウトでIDLEに遷移する', () => {
      sm.transition({ type: 'timeout' }) // idle -> wander
      sm.transition({ type: 'timeout' }) // wander -> sit
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('idle')
    })

    it('HAPPYからタイムアウトでIDLEに遷移する', () => {
      sm.transition({ type: 'prompt', action: 'happy' })
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('idle')
    })

    it('REACTIONからタイムアウトでIDLEに遷移する', () => {
      sm.transition({ type: 'interaction', kind: 'click' })
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('idle')
    })

    it('SLEEPからタイムアウトでIDLEに遷移する', () => {
      sm.transition({ type: 'prompt', action: 'sleep' })
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('idle')
    })
  })

  describe('プロンプト遷移', () => {
    it('IDLEからプロンプトで任意の状態に遷移できる', () => {
      expect(sm.transition({ type: 'prompt', action: 'happy' })).toBe('happy')
    })

    it('WANDERからプロンプトで遷移できる', () => {
      sm.transition({ type: 'timeout' }) // idle -> wander
      expect(sm.transition({ type: 'prompt', action: 'sit' })).toBe('sit')
    })

    it('SITからプロンプトで遷移できる', () => {
      sm.transition({ type: 'prompt', action: 'sit' })
      expect(sm.transition({ type: 'prompt', action: 'sleep' })).toBe('sleep')
    })

    it('DRAGGEDへはプロンプトで遷移できない', () => {
      const result = sm.transition({ type: 'prompt', action: 'dragged' })
      expect(result).toBe('idle') // 変化なし
    })
  })

  describe('インタラクション遷移', () => {
    it('clickでREACTIONに遷移する', () => {
      const result = sm.transition({ type: 'interaction', kind: 'click' })
      expect(result).toBe('reaction')
    })

    it('drag_startでDRAGGEDに遷移する', () => {
      const result = sm.transition({ type: 'interaction', kind: 'drag_start' })
      expect(result).toBe('dragged')
    })

    it('drag_endでIDLEに遷移する', () => {
      sm.transition({ type: 'interaction', kind: 'drag_start' })
      const result = sm.transition({ type: 'interaction', kind: 'drag_end' })
      expect(result).toBe('idle')
    })

    it('hoverでは状態が変化しない', () => {
      const result = sm.transition({ type: 'interaction', kind: 'hover' })
      expect(result).toBe('idle')
    })
  })

  describe('tick', () => {
    it('経過時間が蓄積される', () => {
      sm.start()
      const result = sm.tick(1000)
      expect(result.stateChanged).toBe(false)
    })

    it('最大持続時間を超えると自動遷移が発生する', () => {
      sm.start()
      // idleの最大持続時間は15000ms
      const result = sm.tick(16000)
      expect(result.stateChanged).toBe(true)
      expect(result.newState).toBe('wander')
    })

    it('WANDERのtickでmovementDeltaが返される', () => {
      sm.transition({ type: 'timeout' }) // idle -> wander
      sm.start()
      const result = sm.tick(100)
      expect(result.movementDelta).toBeDefined()
    })
  })
})
