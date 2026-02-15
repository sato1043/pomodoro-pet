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
    it('IDLEからタイムアウトでMARCHに遷移する（scrollingAllowed=true）', () => {
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('march')
      expect(sm.currentState).toBe('march')
    })

    it('IDLEからタイムアウトでWANDERに遷移する（scrollingAllowed=false）', () => {
      sm.setScrollingAllowed(false)
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('wander')
      expect(sm.currentState).toBe('wander')
    })

    it('WANDERからタイムアウトでSITに遷移する', () => {
      sm.setScrollingAllowed(false)
      sm.transition({ type: 'timeout' }) // idle -> wander
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('sit')
    })

    it('SITからタイムアウトでIDLEに遷移する', () => {
      sm.setScrollingAllowed(false)
      sm.transition({ type: 'timeout' }) // idle -> wander
      sm.transition({ type: 'timeout' }) // wander -> sit
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('idle')
    })

    it('MARCHからタイムアウトでIDLEに遷移する（一息つく）', () => {
      sm.transition({ type: 'prompt', action: 'march' })
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('idle')
    })

    it('scrollingAllowed=true時、IDLEからタイムアウトでMARCHに遷移する（wanderが昇格）', () => {
      sm.setScrollingAllowed(true)
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('march')
    })

    it('march→idle→marchサイクルがscrollingAllowed=trueで動作する', () => {
      sm.setScrollingAllowed(true)
      sm.transition({ type: 'prompt', action: 'march' })
      // march → idle
      const r1 = sm.transition({ type: 'timeout' })
      expect(r1).toBe('idle')
      // idle → march（wander昇格）
      const r2 = sm.transition({ type: 'timeout' })
      expect(r2).toBe('march')
      // march → idle（繰り返し）
      const r3 = sm.transition({ type: 'timeout' })
      expect(r3).toBe('idle')
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

    it('REFUSEからタイムアウトでIDLEに遷移する', () => {
      sm.transition({ type: 'prompt', action: 'march' })
      sm.transition({ type: 'interaction', kind: 'click' }) // march -> refuse
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('idle')
    })
  })

  describe('プロンプト遷移', () => {
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

    it('drag_endでscrollingAllowed=trueならMARCHに遷移する', () => {
      sm.setScrollingAllowed(true)
      sm.transition({ type: 'interaction', kind: 'drag_start' })
      const result = sm.transition({ type: 'interaction', kind: 'drag_end' })
      expect(result).toBe('march')
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
      // idleの最大持続時間は15000ms。scrollingAllowed=trueなのでwanderがmarchに昇格
      const result = sm.tick(16000)
      expect(result.stateChanged).toBe(true)
      expect(result.newState).toBe('march')
    })

    it('WANDERのtickでmovementDeltaが返される', () => {
      sm.transition({ type: 'prompt', action: 'wander' })
      sm.start()
      const result = sm.tick(100)
      expect(result.movementDelta).toBeDefined()
    })

    it('MARCHのtickでfixedDir方向のmovementDeltaが返される', () => {
      const fixed = createBehaviorStateMachine({ fixedWanderDirection: { x: 0, z: 1 } })
      fixed.transition({ type: 'prompt', action: 'march' })
      fixed.start()
      const result = fixed.tick(1000)
      expect(result.movementDelta).toBeDefined()
      expect(result.movementDelta!.x).toBeCloseTo(0, 5)
      expect(result.movementDelta!.z).toBeCloseTo(1.5, 5)
    })

    it('MARCHでfixedDir未指定時はmovementDeltaが返されない', () => {
      const noOption = createBehaviorStateMachine()
      noOption.transition({ type: 'prompt', action: 'march' })
      noOption.start()
      const result = noOption.tick(1000)
      expect(result.movementDelta).toBeUndefined()
    })
  })

  describe('scrollingAllowed', () => {
    it('デフォルトはfalseである', () => {
      const fresh = createBehaviorStateMachine()
      expect(fresh.scrollingAllowed).toBe(false)
    })

    it('wanderはscrolling=falseのため、scrollingAllowed=falseでもスキップされない', () => {
      sm.setScrollingAllowed(false)
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('wander')
    })

    it('tickでもwanderはスキップされない', () => {
      sm.setScrollingAllowed(false)
      sm.start()
      const result = sm.tick(16000) // idle最大持続時間超過
      expect(result.stateChanged).toBe(true)
      expect(result.newState).toBe('wander')
    })

    it('trueのとき、IDLEからタイムアウトでMARCHに遷移する（wander昇格）', () => {
      sm.setScrollingAllowed(true)
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('march')
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
      // petの最小持続時間は3000ms。2.5秒経過（まだタイムアウトしない）
      sm.tick(2500)
      // keepAliveでリセット（elapsed=0に戻る）
      sm.keepAlive()
      // さらに2.5秒経過。keepAliveなしなら合計5秒で最小超過の可能性あるが、
      // リセット後なので2.5秒 < 最小3秒でタイムアウトしない
      const result = sm.tick(2500)
      expect(result.stateChanged).toBe(false)
    })
  })

  describe('fixedWanderDirection（march用）', () => {
    it('指定時、marchのmovementDeltaが固定方向になる', () => {
      const fixed = createBehaviorStateMachine({ fixedWanderDirection: { x: 0, z: 1 } })
      fixed.transition({ type: 'prompt', action: 'march' })
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
      fixed.transition({ type: 'prompt', action: 'march' })
      fixed.start()
      const result = fixed.tick(1000)
      expect(result.movementDelta!.x).toBeCloseTo(1.5, 5)
      expect(result.movementDelta!.z).toBeCloseTo(0, 5)
    })

    it('wanderはfixedWanderDirectionを無視してランダム方向のmovementDeltaを返す', () => {
      const fixed = createBehaviorStateMachine({ fixedWanderDirection: { x: 0, z: 1 } })
      fixed.transition({ type: 'prompt', action: 'wander' })
      fixed.start()
      const result = fixed.tick(1000)
      expect(result.movementDelta).toBeDefined()
      // ランダムなので具体値は検証しないが、移動量がゼロでないことを確認
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

  describe('refuse（ポモドーロ作業中のインタラクション拒否）', () => {
    it('march+scrollingAllowed中のclickでREFUSEに遷移する', () => {
      sm.transition({ type: 'prompt', action: 'march' })
      expect(sm.currentState).toBe('march')
      const result = sm.transition({ type: 'interaction', kind: 'click' })
      expect(result).toBe('refuse')
    })

    it('march+scrollingAllowed中のdrag_startでREFUSEに遷移する', () => {
      sm.transition({ type: 'prompt', action: 'march' })
      const result = sm.transition({ type: 'interaction', kind: 'drag_start' })
      expect(result).toBe('refuse')
    })

    it('march+scrollingAllowed中のpet_startでREFUSEに遷移する', () => {
      sm.transition({ type: 'prompt', action: 'march' })
      const result = sm.transition({ type: 'interaction', kind: 'pet_start' })
      expect(result).toBe('refuse')
    })

    it('REFUSEのタイムアウトでIDLEに遷移する', () => {
      sm.transition({ type: 'prompt', action: 'march' })
      sm.transition({ type: 'interaction', kind: 'click' }) // march -> refuse
      expect(sm.currentState).toBe('refuse')
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('idle')
    })

    it('REFUSEはtickでタイムアウトしてIDLEに遷移する', () => {
      sm.transition({ type: 'prompt', action: 'march' })
      sm.transition({ type: 'interaction', kind: 'click' }) // march -> refuse
      sm.start()
      // refuseの最大持続時間は2500ms
      const result = sm.tick(3000)
      expect(result.stateChanged).toBe(true)
      expect(result.newState).toBe('idle')
    })

    it('lockState中はREFUSEのタイムアウトでロック対象に遷移する', () => {
      sm.lockState('march')
      sm.transition({ type: 'prompt', action: 'march' })
      sm.transition({ type: 'interaction', kind: 'click' }) // march -> refuse
      expect(sm.currentState).toBe('refuse')
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('march')
    })

    it('scrollingAllowed=false時はmarchでもREFUSEにならない', () => {
      sm.transition({ type: 'prompt', action: 'march' })
      sm.setScrollingAllowed(false)
      const result = sm.transition({ type: 'interaction', kind: 'click' })
      expect(result).toBe('reaction')
    })

    it('wander状態ではscrollingAllowed=trueでもREFUSEにならない', () => {
      sm.transition({ type: 'prompt', action: 'wander' })
      expect(sm.currentState).toBe('wander')
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
    it('march+scrollingAllowed=trueでtrueを返す', () => {
      sm.transition({ type: 'prompt', action: 'march' })
      expect(sm.isInteractionLocked()).toBe(true)
    })

    it('wander+scrollingAllowed=trueでfalseを返す', () => {
      sm.transition({ type: 'prompt', action: 'wander' })
      expect(sm.isInteractionLocked()).toBe(false)
    })

    it('idle状態ではfalseを返す', () => {
      expect(sm.isInteractionLocked()).toBe(false)
    })

    it('march+scrollingAllowed=falseではfalseを返す', () => {
      sm.transition({ type: 'prompt', action: 'march' })
      sm.setScrollingAllowed(false)
      expect(sm.isInteractionLocked()).toBe(false)
    })

    it('refuse+scrollingAllowed=trueでtrueを返す', () => {
      sm.transition({ type: 'prompt', action: 'march' })
      sm.transition({ type: 'interaction', kind: 'click' }) // march -> refuse
      expect(sm.isInteractionLocked()).toBe(true)
    })
  })

  describe('refuse中の再インタラクション', () => {
    it('refuse中のclickで状態が変わらない', () => {
      sm.transition({ type: 'prompt', action: 'march' })
      sm.transition({ type: 'interaction', kind: 'click' }) // march -> refuse
      expect(sm.currentState).toBe('refuse')
      const result = sm.transition({ type: 'interaction', kind: 'click' })
      expect(result).toBe('refuse')
    })

    it('refuse中のdrag_startで状態が変わらない', () => {
      sm.transition({ type: 'prompt', action: 'march' })
      sm.transition({ type: 'interaction', kind: 'click' }) // march -> refuse
      const result = sm.transition({ type: 'interaction', kind: 'drag_start' })
      expect(result).toBe('refuse')
    })

    it('refuse中のpet_startで状態が変わらない', () => {
      sm.transition({ type: 'prompt', action: 'march' })
      sm.transition({ type: 'interaction', kind: 'click' }) // march -> refuse
      const result = sm.transition({ type: 'interaction', kind: 'pet_start' })
      expect(result).toBe('refuse')
    })
  })

  describe('lockState / unlockState', () => {
    it('初期状態ではlockedStateがnullである', () => {
      expect(sm.lockedState).toBeNull()
    })

    it('lockStateでロック対象の状態を設定できる', () => {
      sm.lockState('happy')
      expect(sm.lockedState).toBe('happy')
    })

    it('unlockStateでロックを解除できる', () => {
      sm.lockState('happy')
      sm.unlockState()
      expect(sm.lockedState).toBeNull()
    })

    it('ロック中はタイムアウト遷移先がロック対象の状態になる', () => {
      sm.transition({ type: 'prompt', action: 'happy' })
      sm.lockState('happy')
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('happy')
      expect(sm.currentState).toBe('happy')
    })

    it('ロック中はどの状態からもロック対象に遷移する', () => {
      sm.lockState('happy')
      // idle → timeout → happy (ロック先)
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('happy')
    })

    it('ロック中にtickでタイムアウトするとロック対象に自己遷移する', () => {
      sm.transition({ type: 'prompt', action: 'happy' })
      sm.lockState('happy')
      sm.start()
      // happyのmaxDurationMsは5000ms。超過させる
      const result = sm.tick(6000)
      expect(result.stateChanged).toBe(true)
      expect(result.newState).toBe('happy')
      expect(sm.currentState).toBe('happy')
    })

    it('ロック解除後は通常のタイムアウト遷移に戻る', () => {
      sm.transition({ type: 'prompt', action: 'happy' })
      sm.lockState('happy')
      sm.unlockState()
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('idle') // happy → idle（通常遷移）
    })

    it('プロンプト遷移はロック中でも動作する', () => {
      sm.lockState('happy')
      sm.transition({ type: 'prompt', action: 'idle' })
      expect(sm.currentState).toBe('idle')
      // ただしタイムアウト時はロック先に戻る
      const result = sm.transition({ type: 'timeout' })
      expect(result).toBe('happy')
    })
  })
})
