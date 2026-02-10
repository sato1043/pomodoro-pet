import * as THREE from 'three'
import type { Character } from '../../domain/character/entities/Character'
import type { BehaviorStateMachine } from '../../domain/character/services/BehaviorStateMachine'
import type { ThreeCharacterHandle } from './ThreeCharacterAdapter'

export interface InteractionAdapter {
  dispose: () => void
}

const MAX_LIFT_HEIGHT = 3
const LIFT_SENSITIVITY = 0.01
const SWAY_SENSITIVITY = 0.003
const MAX_SWAY = 0.5
const SWAY_ROTATION = 0.4 // swayXに対する最大回転量（ラジアン）

export function createInteractionAdapter(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  character: Character,
  stateMachine: BehaviorStateMachine,
  charHandle: ThreeCharacterHandle
): InteractionAdapter {
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  const canvas = renderer.domElement

  let isDragging = false
  let isHovering = false
  let isFalling = false
  let dragStartY = 0
  let dragStartX = 0
  let liftHeight = 0
  let swayX = 0
  let swayZ = 0
  let fallAnimId = 0

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

    if (isDragging) {
      // マウスY差分から持ち上げ高さを算出（上方向がマイナス）
      const deltaY = dragStartY - event.clientY
      liftHeight = Math.max(0, Math.min(MAX_LIFT_HEIGHT, deltaY * LIFT_SENSITIVITY))
      // マウスX差分で横揺れ
      const deltaX = (event.clientX - dragStartX) * SWAY_SENSITIVITY
      swayX = Math.max(-MAX_SWAY, Math.min(MAX_SWAY, deltaX))
      swayZ = Math.max(-MAX_SWAY, Math.min(MAX_SWAY, deltaX * 0.3))
      charHandle.setPosition(swayX, liftHeight, swayZ)
      charHandle.object3D.rotation.y = (swayX / MAX_SWAY) * SWAY_ROTATION
      return
    }

    const hovering = hitTestCharacter()
    if (hovering !== isHovering) {
      isHovering = hovering
      canvas.style.cursor = hovering ? 'pointer' : 'default'
    }
  }

  function onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return
    updateMouse(event)

    if (!hitTestCharacter()) return

    isDragging = true
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
    stateMachine.transition({ type: 'interaction', kind: 'drag_start' })
    character.setState('dragged')
    charHandle.playState('dragged')
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
    if (!isDragging) return

    isDragging = false
    canvas.style.cursor = isHovering ? 'pointer' : 'default'
    const nextState = stateMachine.transition({ type: 'interaction', kind: 'drag_end' })
    character.setState(nextState)
    charHandle.playState(nextState)
    stateMachine.start()
    startFallAnimation()
  }

  function onClick(event: MouseEvent): void {
    if (isDragging) return
    updateMouse(event)

    if (!hitTestCharacter()) return

    stateMachine.transition({ type: 'interaction', kind: 'click' })
    character.setState('reaction')
    charHandle.playState('reaction')
    stateMachine.start()
  }

  canvas.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('click', onClick)

  return {
    dispose(): void {
      cancelAnimationFrame(fallAnimId)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('click', onClick)
      canvas.style.cursor = 'default'
    }
  }
}
