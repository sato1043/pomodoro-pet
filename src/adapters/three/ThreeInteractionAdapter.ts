import * as THREE from 'three'
import type { Character } from '../../domain/character/entities/Character'
import type { BehaviorStateMachine } from '../../domain/character/services/BehaviorStateMachine'
import type { CharacterStateName } from '../../domain/character/value-objects/CharacterState'
import { createGestureRecognizer, type GestureRecognizer } from '../../domain/character/services/GestureRecognizer'
import type { ThreeCharacterHandle } from './ThreeCharacterAdapter'

export interface InteractionAdapter {
  dispose: () => void
}

export type HoverCursors = Partial<Record<CharacterStateName, string>>

const DEFAULT_HOVER_CURSORS: Record<CharacterStateName, string> = {
  idle: 'pointer',
  wander: 'pointer',
  sit: 'pointer',
  sleep: 'pointer',
  happy: 'pointer',
  reaction: 'pointer',
  dragged: 'grabbing',
  pet: 'pointer',
  refuse: 'not-allowed'
}

export interface InteractionConfig {
  readonly hoverCursors?: HoverCursors
}

const MAX_LIFT_HEIGHT = 3
const LIFT_SENSITIVITY = 0.01
const SWAY_SENSITIVITY = 0.003
const MAX_SWAY = 0.5
const SWAY_ROTATION = 0.4
const PET_SWAY_SCALE = 0.3
const PET_MAX_ROTATION = 0.15

type InteractionMode = 'none' | 'pending' | 'drag' | 'pet'

export function createInteractionAdapter(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  character: Character,
  stateMachine: BehaviorStateMachine,
  charHandle: ThreeCharacterHandle,
  config?: InteractionConfig
): InteractionAdapter {
  const hoverCursors: Record<CharacterStateName, string> = {
    ...DEFAULT_HOVER_CURSORS,
    ...config?.hoverCursors
  }

  function resolveHoverCursor(): string {
    if (stateMachine.isInteractionLocked()) return hoverCursors.refuse
    return hoverCursors[character.currentState] ?? 'pointer'
  }

  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  const canvas = renderer.domElement

  let interactionMode: InteractionMode = 'none'
  let isHovering = false
  let isFalling = false
  let dragStartY = 0
  let dragStartX = 0
  let liftHeight = 0
  let swayX = 0
  let swayZ = 0
  let fallAnimId = 0
  const gestureRecognizer: GestureRecognizer = createGestureRecognizer()

  function updateMouse(event: MouseEvent): void {
    const rect = canvas.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  function hitTestCharacter(): boolean {
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObject(charHandle.object3D, true)
    return hits.length > 0
  }

  function onMouseMove(event: MouseEvent): void {
    updateMouse(event)

    if (interactionMode === 'pending') {
      const deltaX = event.clientX - dragStartX
      const deltaY = dragStartY - event.clientY // 上方向が正
      const result = gestureRecognizer.update(deltaX, deltaY)

      if (result === 'drag') {
        interactionMode = 'drag'
        stateMachine.transition({ type: 'interaction', kind: 'drag_start' })
        character.setState('dragged')
        charHandle.playState('dragged')
      } else if (result === 'pet') {
        interactionMode = 'pet'
        stateMachine.transition({ type: 'interaction', kind: 'pet_start' })
        character.setState('pet')
        charHandle.playState('pet')
        canvas.style.cursor = hoverCursors.pet
      }
      return
    }

    if (interactionMode === 'drag') {
      const deltaY = dragStartY - event.clientY
      liftHeight = Math.max(0, Math.min(MAX_LIFT_HEIGHT, deltaY * LIFT_SENSITIVITY))
      const deltaX = (event.clientX - dragStartX) * SWAY_SENSITIVITY
      swayX = Math.max(-MAX_SWAY, Math.min(MAX_SWAY, deltaX))
      swayZ = Math.max(-MAX_SWAY, Math.min(MAX_SWAY, deltaX * 0.3))
      charHandle.setPosition(swayX, liftHeight, swayZ)
      charHandle.object3D.rotation.y = (swayX / MAX_SWAY) * SWAY_ROTATION
      return
    }

    if (interactionMode === 'pet') {
      stateMachine.keepAlive()
      const deltaX = (event.clientX - dragStartX) * SWAY_SENSITIVITY * PET_SWAY_SCALE
      const gentleSway = Math.max(-PET_MAX_ROTATION, Math.min(PET_MAX_ROTATION, deltaX))
      charHandle.object3D.rotation.y = gentleSway
      return
    }

    // 通常のホバー判定
    const hovering = hitTestCharacter()
    if (hovering !== isHovering) {
      isHovering = hovering
      canvas.style.cursor = hovering ? resolveHoverCursor() : 'default'
    } else if (isHovering) {
      canvas.style.cursor = resolveHoverCursor()
    }
  }

  function onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return
    updateMouse(event)

    if (!hitTestCharacter()) return

    // ポモドーロ作業中はインタラクションを拒否
    if (stateMachine.isInteractionLocked()) {
      if (stateMachine.currentState === 'wander') {
        stateMachine.transition({ type: 'interaction', kind: 'click' })
        character.setState('refuse')
        charHandle.playState('refuse')
        stateMachine.start()
      }
      canvas.style.cursor = resolveHoverCursor()
      return
    }

    interactionMode = 'pending'
    gestureRecognizer.reset()
    if (isFalling) {
      cancelAnimationFrame(fallAnimId)
      isFalling = false
    }
    dragStartX = event.clientX
    dragStartY = event.clientY
    liftHeight = 0
    swayX = 0
    swayZ = 0
    charHandle.object3D.rotation.y = 0
    canvas.style.cursor = 'grabbing'
  }

  function startFallAnimation(): void {
    isFalling = true
    const fallStep = (): void => {
      liftHeight *= 0.9
      swayX *= 0.9
      swayZ *= 0.9
      if (liftHeight < 0.01) {
        liftHeight = 0
        swayX = 0
        swayZ = 0
        isFalling = false
        charHandle.setPosition(0, 0, 0)
        charHandle.object3D.rotation.y = 0
        return
      }
      charHandle.setPosition(swayX, liftHeight, swayZ)
      charHandle.object3D.rotation.y = (swayX / MAX_SWAY) * SWAY_ROTATION
      fallAnimId = requestAnimationFrame(fallStep)
    }
    fallAnimId = requestAnimationFrame(fallStep)
  }

  function onMouseUp(): void {
    if (interactionMode === 'none') return

    if (interactionMode === 'pending') {
      gestureRecognizer.finalize()
      interactionMode = 'none'
      canvas.style.cursor = isHovering ? resolveHoverCursor() : 'default'
      stateMachine.transition({ type: 'interaction', kind: 'click' })
      character.setState('reaction')
      charHandle.playState('reaction')
      stateMachine.start()
      return
    }

    if (interactionMode === 'drag') {
      interactionMode = 'none'
      canvas.style.cursor = isHovering ? resolveHoverCursor() : 'default'
      const nextState = stateMachine.transition({ type: 'interaction', kind: 'drag_end' })
      character.setState(nextState)
      charHandle.playState(nextState)
      stateMachine.start()
      startFallAnimation()
      return
    }

    if (interactionMode === 'pet') {
      interactionMode = 'none'
      canvas.style.cursor = isHovering ? resolveHoverCursor() : 'default'
      charHandle.object3D.rotation.y = 0
      const nextState = stateMachine.transition({ type: 'interaction', kind: 'pet_end' })
      character.setState(nextState)
      charHandle.playState(nextState)
      stateMachine.start()
      return
    }
  }

  canvas.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)

  return {
    dispose(): void {
      cancelAnimationFrame(fallAnimId)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.style.cursor = 'default'
    }
  }
}
