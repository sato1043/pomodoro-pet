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

    it('autonomousプリセットで始まる', () => {
      expect(sm.currentPreset).toBe('autonomous')
    })
  })

  describe('applyPreset', () => {
    it('プリセットを切り替えるとinitialStateに遷移する', () => {
      sm.applyPreset('march-cycle')
      expect(sm.currentState).toBe('march')
      expect(sm.currentPreset).toBe('march-cycle')
    })

    it('rest-cycleを適用するとhappyで始まる', () => {
      sm.applyPreset('rest-cycle')
      expect(sm.currentState).toBe('happy')
    })

    it('joyful-restを適用するとhappyで始まる', () => {
      sm.applyPreset('joyful-rest')
      expect(sm.currentState).toBe('happy')
    })

    it('celebrateを適用するとhappyで始まる', () => {
      sm.applyPreset('celebrate')
      expect(sm.currentState).toBe('happy')
    })

    it('autonomousを適用するとidleで始まる', () => {
      sm.applyPreset('march-cycle')
      sm.applyPreset('autonomous')
      expect(sm.currentState).toBe('idle')
    })
  })

  describe('autonomous プリセット', () => {
    it('idle→wander→sit→idleサイクル', () => {
      const r1 = sm.transition({ type: 'timeout' })
      expect(r1).toBe('wander')
      const r2 = sm.transition({ type: 'timeout' })
      expect(r2).toBe('sit')
      const r3 = sm.transition({ type: 'timeout' })
      expect(r3).toBe('idle')
    })

    it('インタラクションが許可される', () => {
      expect(sm.isInteractionLocked()).toBe(false)
    })

    it('スクロール状態でない', () => {
      expect(sm.isScrollingState()).toBe(false)
      sm.transition({ type: 'prompt', action: 'wander' })
      expect(sm.isScrollingState()).toBe(false)
    })

    it('clickでREACTIONに遷移する', () => {
      const result = sm.transition({ type: 'interaction', kind: 'click' })
      expect(result).toBe('reaction')
    })

    it('drag_startでDRAGGEDに遷移する', () => {
      const result = sm.transition({ type: 'interaction', kind: 'drag_start' })
      expect(result).toBe('dragged')
    })

    it('drag_endでinitialState(idle)に遷移する', () => {
      sm.transition({ type: 'interaction', kind: 'drag_start' })
      const result = sm.transition({ type: 'interaction', kind: 'drag_end' })
      expect(result).toBe('idle')
    })

    it('pet_startでPETに遷移する', () => {
      const result = sm.transition({ type: 'interaction', kind: 'pet_start' })
      expect(result).toBe('pet')
    })

    it('pet_endでIDLEに遷移する', () => {
      sm.transition({ type: 'interaction', kind: 'pet_start' })
      const result = sm.transition({ type: 'interaction', kind: 'pet_end' })
      expect(result).toBe('idle')
    })

    it('hoverでは状態が変化しない', () => {
      const result = sm.transition({ type: 'interaction', kind: 'hover' })
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

    it('transitionsに未定義の状態はinitialState(idle)にフォールバックする', () => {
      sm.transition({ type: 'prompt', action: 'march' })
      const result = sm.transition({ type: 'timeout' })
      // autonomousにはmarchの遷移先がないのでinitialState=idleにフォールバック
      expect(result).toBe('idle')
    })
  })

  describe('march-cycle プリセット', () => {
    beforeEach(() => {
      sm.applyPreset('march-cycle')
    })

    it('march→idle→marchサイクル', () => {
      expect(sm.currentState).toBe('march')
      const r1 = sm.transition({ type: 'timeout' })
      expect(r1).toBe('idle')
      const r2 = sm.transition({ type: 'timeout' })
      expect(r2).toBe('march')
      const r3 = sm.transition({ type: 'timeout' })
      expect(r3).toBe('idle')
    })

    it('インタラクションが拒否される', () => {
      expect(sm.isInteractionLocked()).toBe(true)
    })

    it('marchはスクロール状態である', () => {
      expect(sm.isScrollingState()).toBe(true)
    })

    it('idleはスクロール状態でない', () => {
      sm.transition({ type: 'timeout' }) // march -> idle
      expect(sm.isScrollingState()).toBe(false)
    })

    it('clickでREFUSEに遷移する', () => {
      const result = sm.transition({ type: 'interaction', kind: 'click' })
      expect(result).toBe('refuse')
    })

    it('drag_startでREFUSEに遷移する', () => {
      const result = sm.transition({ type: 'interaction', kind: 'drag_start' })
      expect(result).toBe('refuse')
    })

    it('pet_startでREFUSEに遷移する', () => {
      const result = sm.transition({ type: 'interaction', kind: 'pet_start' })
      expect(result).toBe('refuse')
    })

    it('idle状態でもインタラクションが拒否される', () => {
      sm.transition({ type: 'timeout' }) // march -> idle
      const result = sm.transition({ type: 'interaction', kind: 'click' })
      expect(result).toBe('refuse')
    })

    it('refuse中の再インタラクションで状態が変わらない', () => {
      sm.transition({ type: 'interaction', kind: 'click' }) // march -> refuse
      expect(sm.currentState).toBe('refuse')
      const result = sm.transition({ type: 'interaction', kind: 'click' })
      expect(result).toBe('refuse')
    })

    it('refuse中のdrag_startで状態が変わらない', () => {
      sm.transition({ type: 'interaction', kind: 'click' }) // march -> refuse
      const result = sm.transition({ type: 'interaction', kind: 'drag_start' })
      expect(result).toBe('refuse')
    })

    it('refuse中のpet_startで状態が変わらない', () => {
      sm.transition({ type: 'interaction', kind: 'click' }) // march -> refuse
      const result = sm.transition({ type: 'interaction', kind: 'pet_start' })
      expect(result).toBe('refuse')
    })

    it('REFUSEのタイムアウトでIDLEに遷移する', () => {
      sm.transition({ type: 'interaction', kind: 'click' }) // march -> refuse
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('idle')
    })

    it('REFUSEはtickでタイムアウトしてIDLEに遷移する', () => {
      sm.transition({ type: 'interaction', kind: 'click' }) // march -> refuse
      sm.start()
      const result = sm.tick(3000) // refuseの最大持続時間は2500ms
      expect(result.stateChanged).toBe(true)
      expect(result.newState).toBe('idle')
    })

    it('drag_endはインタラクションロック中でもinitialState(march)に遷移する', () => {
      sm.transition({ type: 'interaction', kind: 'click' }) // march -> refuse
      // refuse中でもdrag_endは許可される
      const result = sm.transition({ type: 'interaction', kind: 'drag_end' })
      expect(result).toBe('march')
    })

    it('pet_endはインタラクションロック中でもidleに遷移する', () => {
      sm.transition({ type: 'interaction', kind: 'click' }) // march -> refuse
      const result = sm.transition({ type: 'interaction', kind: 'pet_end' })
      expect(result).toBe('idle')
    })

    it('fixedDir指定時、marchのmovementDeltaが固定方向になる', () => {
      const fixed = createBehaviorStateMachine({ fixedWanderDirection: { x: 0, z: 1 } })
      fixed.applyPreset('march-cycle')
      fixed.start()
      const result = fixed.tick(1000)
      expect(result.movementDelta).toBeDefined()
      expect(result.movementDelta!.x).toBeCloseTo(0, 5)
      expect(result.movementDelta!.z).toBeCloseTo(1.5, 5)
    })

    it('斜め方向のfixedDirも正しく反映される', () => {
      const fixed = createBehaviorStateMachine({ fixedWanderDirection: { x: 1, z: 0 } })
      fixed.applyPreset('march-cycle')
      fixed.start()
      const result = fixed.tick(1000)
      expect(result.movementDelta!.x).toBeCloseTo(1.5, 5)
      expect(result.movementDelta!.z).toBeCloseTo(0, 5)
    })

    it('fixedDir未指定時はmovementDeltaが返されない', () => {
      const noOption = createBehaviorStateMachine()
      noOption.applyPreset('march-cycle')
      noOption.start()
      const result = noOption.tick(1000)
      expect(result.movementDelta).toBeUndefined()
    })
  })

  describe('rest-cycle プリセット', () => {
    beforeEach(() => {
      sm.applyPreset('rest-cycle')
    })

    it('happyで始まる', () => {
      expect(sm.currentState).toBe('happy')
    })

    it('happy→sit→idle→sitサイクル（happyは初回のみ）', () => {
      const r1 = sm.transition({ type: 'timeout' }) // happy -> sit
      expect(r1).toBe('sit')
      const r2 = sm.transition({ type: 'timeout' }) // sit -> idle
      expect(r2).toBe('idle')
      const r3 = sm.transition({ type: 'timeout' }) // idle -> sit（happyに戻らない）
      expect(r3).toBe('sit')
    })

    it('インタラクションが許可される', () => {
      expect(sm.isInteractionLocked()).toBe(false)
    })

    it('スクロール状態でない', () => {
      expect(sm.isScrollingState()).toBe(false)
    })

    it('clickでREACTIONに遷移する', () => {
      const result = sm.transition({ type: 'interaction', kind: 'click' })
      expect(result).toBe('reaction')
    })
  })

  describe('joyful-rest プリセット', () => {
    beforeEach(() => {
      sm.applyPreset('joyful-rest')
    })

    it('happyで始まる', () => {
      expect(sm.currentState).toBe('happy')
    })

    it('happy→sit→idle→happyサイクル（happy繰り返し）', () => {
      const r1 = sm.transition({ type: 'timeout' }) // happy -> sit
      expect(r1).toBe('sit')
      const r2 = sm.transition({ type: 'timeout' }) // sit -> idle
      expect(r2).toBe('idle')
      const r3 = sm.transition({ type: 'timeout' }) // idle -> happy（繰り返し）
      expect(r3).toBe('happy')
    })

    it('インタラクションが許可される', () => {
      expect(sm.isInteractionLocked()).toBe(false)
    })
  })

  describe('celebrate プリセット', () => {
    beforeEach(() => {
      sm.applyPreset('celebrate')
    })

    it('happyで始まる', () => {
      expect(sm.currentState).toBe('happy')
    })

    it('タイムアウトでhappyに自己遷移する（lockedState）', () => {
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('happy')
    })

    it('tickでタイムアウトしてもhappyに自己遷移する', () => {
      sm.start()
      const result = sm.tick(6000) // happyのmaxDurationMs=5000ms超過
      expect(result.stateChanged).toBe(true)
      expect(result.newState).toBe('happy')
      expect(sm.currentState).toBe('happy')
    })

    it('プロンプト遷移は動作する', () => {
      sm.transition({ type: 'prompt', action: 'idle' })
      expect(sm.currentState).toBe('idle')
      // ただしタイムアウトではlockedState=happyに戻る
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('happy')
    })

    it('インタラクションロックされていない', () => {
      expect(sm.isInteractionLocked()).toBe(false)
    })
  })

  describe('プロンプト遷移（共通）', () => {
    it('IDLEからプロンプトで任意の状態に遷移できる', () => {
      expect(sm.transition({ type: 'prompt', action: 'happy' })).toBe('happy')
    })

    it('WANDERからプロンプトで遷移できる', () => {
      sm.transition({ type: 'prompt', action: 'wander' })
      expect(sm.transition({ type: 'prompt', action: 'sit' })).toBe('sit')
    })

    it('MARCHからプロンプトで遷移できる', () => {
      sm.transition({ type: 'prompt', action: 'march' })
      expect(sm.transition({ type: 'prompt', action: 'idle' })).toBe('idle')
    })

    it('SITからプロンプトで遷移できる', () => {
      sm.transition({ type: 'prompt', action: 'sit' })
      expect(sm.transition({ type: 'prompt', action: 'sleep' })).toBe('sleep')
    })

    it('DRAGGEDへはプロンプトで遷移できない', () => {
      const result = sm.transition({ type: 'prompt', action: 'dragged' })
      expect(result).toBe('idle')
    })

    it('PETへはプロンプトで遷移できる', () => {
      const result = sm.transition({ type: 'prompt', action: 'pet' })
      expect(result).toBe('pet')
    })
  })

  describe('tick（共通）', () => {
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
      sm.transition({ type: 'prompt', action: 'wander' })
      sm.start()
      const result = sm.tick(100)
      expect(result.movementDelta).toBeDefined()
    })

    it('dragged状態はタイムアウトしない', () => {
      sm.transition({ type: 'interaction', kind: 'drag_start' })
      sm.start()
      const result = sm.tick(100000)
      expect(result.stateChanged).toBe(false)
    })

    it('PETはtickでタイムアウトする（draggedと異なる）', () => {
      sm.transition({ type: 'interaction', kind: 'pet_start' })
      sm.start()
      // petの最大持続時間は8000ms
      const result = sm.tick(9000)
      expect(result.stateChanged).toBe(true)
      expect(result.newState).toBe('idle')
    })

    it('wanderはfixedWanderDirectionを無視してランダム方向のmovementDeltaを返す', () => {
      const fixed = createBehaviorStateMachine({ fixedWanderDirection: { x: 0, z: 1 } })
      fixed.transition({ type: 'prompt', action: 'wander' })
      fixed.start()
      const result = fixed.tick(1000)
      expect(result.movementDelta).toBeDefined()
      const dx = result.movementDelta!.x
      const dz = result.movementDelta!.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      expect(dist).toBeGreaterThan(0)
    })

    it('未指定時、wanderはランダム方向のmovementDeltaを返す', () => {
      const noOption = createBehaviorStateMachine()
      noOption.transition({ type: 'prompt', action: 'wander' })
      noOption.start()
      const result = noOption.tick(1000)
      expect(result.movementDelta).toBeDefined()
      const dx = result.movementDelta!.x
      const dz = result.movementDelta!.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      expect(dist).toBeGreaterThan(0)
    })
  })

  describe('keepAlive（共通）', () => {
    it('keepAlive()で経過時間がリセットされタイムアウトが延長される', () => {
      sm.transition({ type: 'interaction', kind: 'pet_start' })
      sm.start()
      // petの最小持続時間は3000ms。2.5秒経過
      sm.tick(2500)
      // keepAliveでリセット
      sm.keepAlive()
      // さらに2.5秒経過。リセット後なので2.5秒 < 最小3秒でタイムアウトしない
      const result = sm.tick(2500)
      expect(result.stateChanged).toBe(false)
    })
  })

  describe('isScrollingState（共通）', () => {
    it('autonomousではどの状態もスクロールしない', () => {
      expect(sm.isScrollingState()).toBe(false)
      sm.transition({ type: 'prompt', action: 'march' })
      expect(sm.isScrollingState()).toBe(false) // autonomousではmarchもスクロールしない
    })

    it('march-cycleではmarchのみスクロールする', () => {
      sm.applyPreset('march-cycle')
      expect(sm.isScrollingState()).toBe(true) // march
      sm.transition({ type: 'timeout' }) // march -> idle
      expect(sm.isScrollingState()).toBe(false) // idle
    })
  })
})
