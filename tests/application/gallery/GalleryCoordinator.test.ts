import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createGalleryCoordinator, type GalleryCoordinator, type GalleryCharacterHandle } from '../../../src/application/gallery/GalleryCoordinator'
import { createAppSceneManager, type AppSceneManager } from '../../../src/application/app-scene/AppSceneManager'
import { createEventBus, type EventBus } from '../../../src/domain/shared/EventBus'
import type { CharacterBehavior } from '../../../src/domain/character/value-objects/BehaviorPreset'
import type { AppSceneEvent } from '../../../src/application/app-scene/AppScene'

describe('GalleryCoordinator', () => {
  let bus: EventBus
  let sceneManager: AppSceneManager
  let coordinator: GalleryCoordinator
  let behaviorChanges: CharacterBehavior[]
  let mockCharHandle: GalleryCharacterHandle

  beforeEach(() => {
    bus = createEventBus()
    sceneManager = createAppSceneManager()
    behaviorChanges = []
    mockCharHandle = {
      playState: vi.fn(),
      playAnimation: vi.fn(),
      stopAnimation: vi.fn(),
      setPosition: vi.fn(),
    }
    coordinator = createGalleryCoordinator({
      bus,
      sceneManager,
      onBehaviorChange: (preset) => { behaviorChanges.push(preset) },
      charHandle: mockCharHandle,
    })
  })

  describe('enterGallery', () => {
    it('シーンをgalleryに遷移する', () => {
      coordinator.enterGallery()
      expect(sceneManager.currentScene).toBe('gallery')
    })

    it('AppSceneChangedイベントをEventBusに発行する', () => {
      const events: AppSceneEvent[] = []
      bus.subscribe<AppSceneEvent>('AppSceneChanged', (e) => { events.push(e) })
      coordinator.enterGallery()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppSceneChanged', scene: 'gallery' })
      )
    })

    it('setPositionを呼び出さない（offset制御はSceneGalleryに委譲）', () => {
      coordinator.enterGallery()
      expect(mockCharHandle.setPosition).not.toHaveBeenCalled()
    })

    it('freeでない場合は何もしない', () => {
      sceneManager.enterPomodoro()
      coordinator.enterGallery()
      expect(sceneManager.currentScene).toBe('pomodoro')
    })
  })

  describe('exitGallery', () => {
    it('シーンをfreeに遷移する', () => {
      coordinator.enterGallery()
      coordinator.exitGallery()
      expect(sceneManager.currentScene).toBe('free')
    })

    it('autonomousプリセットに切り替える', () => {
      coordinator.enterGallery()
      coordinator.exitGallery()
      expect(behaviorChanges).toEqual(['autonomous'])
    })

    it('AppSceneChangedイベントをEventBusに発行する', () => {
      coordinator.enterGallery()
      const events: AppSceneEvent[] = []
      bus.subscribe<AppSceneEvent>('AppSceneChanged', (e) => { events.push(e) })
      coordinator.exitGallery()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppSceneChanged', scene: 'free' })
      )
    })

    it('setPositionを呼び出さない（offset制御はSceneGalleryに委譲）', () => {
      coordinator.enterGallery()
      vi.mocked(mockCharHandle.setPosition).mockClear()
      coordinator.exitGallery()
      expect(mockCharHandle.setPosition).not.toHaveBeenCalled()
    })

    it('galleryでない場合は何もしない', () => {
      const events: AppSceneEvent[] = []
      bus.subscribe<AppSceneEvent>('AppSceneChanged', (e) => { events.push(e) })
      coordinator.exitGallery()
      expect(sceneManager.currentScene).toBe('free')
      expect(events).toHaveLength(0)
    })
  })

  describe('applyCharacterOffset / resetCharacterOffset', () => {
    it('applyCharacterOffsetでキャラクターを左にオフセットする', () => {
      coordinator.applyCharacterOffset()
      expect(mockCharHandle.setPosition).toHaveBeenCalledWith(-0.28, 0, 0)
    })

    it('resetCharacterOffsetでキャラクター位置を原点に戻す', () => {
      coordinator.applyCharacterOffset()
      vi.mocked(mockCharHandle.setPosition).mockClear()
      coordinator.resetCharacterOffset()
      expect(mockCharHandle.setPosition).toHaveBeenCalledWith(0, 0, 0)
    })
  })

  describe('playState', () => {
    it('再生前にstopAnimationを呼び出す', () => {
      coordinator.playState('idle')
      expect(mockCharHandle.stopAnimation).toHaveBeenCalled()
      const stopOrder = vi.mocked(mockCharHandle.stopAnimation).mock.invocationCallOrder[0]
      const playOrder = vi.mocked(mockCharHandle.playState).mock.invocationCallOrder[0]
      expect(stopOrder).toBeLessThan(playOrder)
    })

    it('charHandle.playStateを呼び出す', () => {
      coordinator.playState('idle')
      expect(mockCharHandle.playState).toHaveBeenCalledWith('idle')
    })

    it('各状態を再生できる', () => {
      coordinator.playState('happy')
      expect(mockCharHandle.playState).toHaveBeenCalledWith('happy')
    })
  })

  describe('playAnimationSelection', () => {
    it('再生前にstopAnimationを呼び出す', () => {
      const selection = { clipName: 'run', loop: true, speed: 1.2 }
      coordinator.playAnimationSelection(selection)
      expect(mockCharHandle.stopAnimation).toHaveBeenCalled()
      const stopOrder = vi.mocked(mockCharHandle.stopAnimation).mock.invocationCallOrder[0]
      const playOrder = vi.mocked(mockCharHandle.playAnimation).mock.invocationCallOrder[0]
      expect(stopOrder).toBeLessThan(playOrder)
    })

    it('charHandle.playAnimationを呼び出す', () => {
      const selection = { clipName: 'run', loop: true, speed: 1.2 }
      coordinator.playAnimationSelection(selection)
      expect(mockCharHandle.playAnimation).toHaveBeenCalledWith(selection)
    })
  })

  describe('遷移サイクル', () => {
    it('free → gallery → free の全遷移が正常に動作する', () => {
      expect(sceneManager.currentScene).toBe('free')

      coordinator.enterGallery()
      expect(sceneManager.currentScene).toBe('gallery')

      coordinator.exitGallery()
      expect(sceneManager.currentScene).toBe('free')
      expect(behaviorChanges).toEqual(['autonomous'])
    })
  })
})
