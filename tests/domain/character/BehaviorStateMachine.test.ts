import { describe, it, expect, beforeEach } from 'vitest'
import {
  createBehaviorStateMachine,
  type BehaviorStateMachine
} from '../../../src/domain/character/services/BehaviorStateMachine'

describe('BehaviorStateMachine', () => {
  let sm: BehaviorStateMachine

  beforeEach(() => {
    sm = createBehaviorStateMachine()
    sm.setScrollingAllowed(true) // 既存テストはscrolling許可状態で実行
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

    it('drag_endでscrollingAllowed=trueならWANDERに遷移する', () => {
      sm.setScrollingAllowed(true)
      sm.transition({ type: 'interaction', kind: 'drag_start' })
      const result = sm.transition({ type: 'interaction', kind: 'drag_end' })
      expect(result).toBe('wander')
    })

    it('drag_endでscrollingAllowed=falseならIDLEに遷移する', () => {
      sm.setScrollingAllowed(false)
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

  describe('scrollingAllowed', () => {
    it('デフォルトはfalseである', () => {
      const fresh = createBehaviorStateMachine()
      expect(fresh.scrollingAllowed).toBe(false)
    })

    it('falseのとき、IDLEからタイムアウトでWANDERをスキップしSITに遷移する', () => {
      sm.setScrollingAllowed(false)
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('sit')
    })

    it('falseのとき、tickでもWANDERをスキップする', () => {
      sm.setScrollingAllowed(false)
      sm.start()
      const result = sm.tick(16000) // idle最大持続時間超過
      expect(result.stateChanged).toBe(true)
      expect(result.newState).toBe('sit')
    })

    it('trueのとき、IDLEからタイムアウトでWANDERに遷移する', () => {
      sm.setScrollingAllowed(true)
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('wander')
    })
  })

  describe('pet遷移', () => {
    it('pet_startでPETに遷移する', () => {
      const result = sm.transition({ type: 'interaction', kind: 'pet_start' })
      expect(result).toBe('pet')
    })

    it('pet_endでIDLEに遷移する', () => {
      sm.transition({ type: 'interaction', kind: 'pet_start' })
      const result = sm.transition({ type: 'interaction', kind: 'pet_end' })
      expect(result).toBe('idle')
    })

    it('PETはタイムアウトでIDLEに遷移する', () => {
      sm.transition({ type: 'prompt', action: 'pet' })
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('idle')
    })

    it('PETへはプロンプトで遷移できる', () => {
      const result = sm.transition({ type: 'prompt', action: 'pet' })
      expect(result).toBe('pet')
    })

    it('PETはtickでタイムアウトする（draggedと異なる）', () => {
      sm.transition({ type: 'interaction', kind: 'pet_start' })
      sm.start()
      // petの最大持続時間は8000ms
      const result = sm.tick(9000)
      expect(result.stateChanged).toBe(true)
      expect(result.newState).toBe('idle')
    })
  })

  describe('keepAlive', () => {
    it('keepAlive()で経過時間がリセットされタイムアウトが延長される', () => {
      sm.transition({ type: 'interaction', kind: 'pet_start' })
      sm.start()
      // 7秒経過（最大8秒のため、あと少しでタイムアウト）
      sm.tick(7000)
      // keepAliveでリセット
      sm.keepAlive()
      // さらに7秒経過してもタイムアウトしない
      const result = sm.tick(7000)
      expect(result.stateChanged).toBe(false)
    })
  })

  describe('fixedWanderDirection', () => {
    it('指定時、wanderのmovementDeltaが固定方向になる', () => {
      const fixed = createBehaviorStateMachine({ fixedWanderDirection: { x: 0, z: 1 } })
      fixed.setScrollingAllowed(true)
      fixed.transition({ type: 'timeout' }) // idle -> wander
      fixed.start()
      const result = fixed.tick(1000) // 1秒
      expect(result.movementDelta).toBeDefined()
      // speed=1.5, dt=1s → moveDist=1.5
      // x=0*1.5=0, z=1*1.5=1.5
      expect(result.movementDelta!.x).toBeCloseTo(0, 5)
      expect(result.movementDelta!.z).toBeCloseTo(1.5, 5)
      expect(result.movementDelta!.y).toBe(0)
    })

    it('斜め方向も正しく反映される', () => {
      const fixed = createBehaviorStateMachine({ fixedWanderDirection: { x: 1, z: 0 } })
      fixed.setScrollingAllowed(true)
      fixed.transition({ type: 'timeout' }) // idle -> wander
      fixed.start()
      const result = fixed.tick(1000)
      expect(result.movementDelta!.x).toBeCloseTo(1.5, 5)
      expect(result.movementDelta!.z).toBeCloseTo(0, 5)
    })

    it('未指定時、ランダム方向のmovementDeltaが返される', () => {
      const noOption = createBehaviorStateMachine()
      noOption.setScrollingAllowed(true)
      noOption.transition({ type: 'timeout' }) // idle -> wander
      noOption.start()
      const result = noOption.tick(1000)
      expect(result.movementDelta).toBeDefined()
      // ランダムなので具体値は検証しないが、移動量がゼロでないことを確認
      const dx = result.movementDelta!.x
      const dz = result.movementDelta!.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      expect(dist).toBeGreaterThan(0)
    })
  })

  describe('refuse（ポモドーロ作業中のインタラクション拒否）', () => {
    it('wander+scrollingAllowed中のclickでREFUSEに遷移する', () => {
      sm.transition({ type: 'timeout' }) // idle -> wander
      expect(sm.currentState).toBe('wander')
      const result = sm.transition({ type: 'interaction', kind: 'click' })
      expect(result).toBe('refuse')
    })

    it('wander+scrollingAllowed中のdrag_startでREFUSEに遷移する', () => {
      sm.transition({ type: 'timeout' }) // idle -> wander
      const result = sm.transition({ type: 'interaction', kind: 'drag_start' })
      expect(result).toBe('refuse')
    })

    it('wander+scrollingAllowed中のpet_startでREFUSEに遷移する', () => {
      sm.transition({ type: 'timeout' }) // idle -> wander
      const result = sm.transition({ type: 'interaction', kind: 'pet_start' })
      expect(result).toBe('refuse')
    })

    it('REFUSEのタイムアウトでWANDERに復帰する', () => {
      sm.transition({ type: 'timeout' }) // idle -> wander
      sm.transition({ type: 'interaction', kind: 'click' }) // wander -> refuse
      expect(sm.currentState).toBe('refuse')
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('wander')
    })

    it('REFUSEはtickでタイムアウトしてWANDERに復帰する', () => {
      sm.transition({ type: 'timeout' }) // idle -> wander
      sm.transition({ type: 'interaction', kind: 'click' }) // wander -> refuse
      sm.start()
      // refuseの最大持続時間は2500ms
      const result = sm.tick(3000)
      expect(result.stateChanged).toBe(true)
      expect(result.newState).toBe('wander')
    })

    it('scrollingAllowed=false時はwanderでもREFUSEにならない', () => {
      sm.setScrollingAllowed(true)
      sm.transition({ type: 'timeout' }) // idle -> wander
      sm.setScrollingAllowed(false)
      const result = sm.transition({ type: 'interaction', kind: 'click' })
      expect(result).toBe('reaction')
    })

    it('idle状態ではscrollingAllowed=trueでもREFUSEにならない', () => {
      // smはidle + scrollingAllowed=true
      const result = sm.transition({ type: 'interaction', kind: 'click' })
      expect(result).toBe('reaction')
    })
  })

  describe('isInteractionLocked', () => {
    it('wander+scrollingAllowed=trueでtrueを返す', () => {
      sm.transition({ type: 'timeout' }) // idle -> wander
      expect(sm.isInteractionLocked()).toBe(true)
    })

    it('idle状態ではfalseを返す', () => {
      expect(sm.isInteractionLocked()).toBe(false)
    })

    it('wander+scrollingAllowed=falseではfalseを返す', () => {
      sm.setScrollingAllowed(true)
      sm.transition({ type: 'timeout' }) // idle -> wander
      sm.setScrollingAllowed(false)
      expect(sm.isInteractionLocked()).toBe(false)
    })

    it('refuse+scrollingAllowed=trueでtrueを返す', () => {
      sm.transition({ type: 'timeout' }) // idle -> wander
      sm.transition({ type: 'interaction', kind: 'click' }) // wander -> refuse
      expect(sm.isInteractionLocked()).toBe(true)
    })
  })

  describe('refuse中の再インタラクション', () => {
    it('refuse中のclickで状態が変わらない', () => {
      sm.transition({ type: 'timeout' }) // idle -> wander
      sm.transition({ type: 'interaction', kind: 'click' }) // wander -> refuse
      expect(sm.currentState).toBe('refuse')
      const result = sm.transition({ type: 'interaction', kind: 'click' })
      expect(result).toBe('refuse')
    })

    it('refuse中のdrag_startで状態が変わらない', () => {
      sm.transition({ type: 'timeout' }) // idle -> wander
      sm.transition({ type: 'interaction', kind: 'click' }) // wander -> refuse
      const result = sm.transition({ type: 'interaction', kind: 'drag_start' })
      expect(result).toBe('refuse')
    })

    it('refuse中のpet_startで状態が変わらない', () => {
      sm.transition({ type: 'timeout' }) // idle -> wander
      sm.transition({ type: 'interaction', kind: 'click' }) // wander -> refuse
      const result = sm.transition({ type: 'interaction', kind: 'pet_start' })
      expect(result).toBe('refuse')
    })
  })
})
