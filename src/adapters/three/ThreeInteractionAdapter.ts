import * as THREE from 'three'
import type { Character } from '../../domain/character/entities/Character'
import type { BehaviorStateMachine } from '../../domain/character/services/BehaviorStateMachine'
import type { ThreeCharacterHandle } from './ThreeCharacterAdapter'
import { createPosition } from '../../domain/character/value-objects/Position3D'

export interface InteractionAdapter {
  dispose: () => void
}

export function createInteractionAdapter(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  character: Character,
  stateMachine: BehaviorStateMachine,
  charHandle: ThreeCharacterHandle,
  groundPlane: THREE.Mesh
): InteractionAdapter {
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  const canvas = renderer.domElement

  let isDragging = false
  let isHovering = false

  // 地面との交差計算用の平面（y=0）
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const intersectPoint = new THREE.Vector3()

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

  function getGroundIntersection(): THREE.Vector3 | null {
    raycaster.setFromCamera(mouse, camera)
    const hit = raycaster.ray.intersectPlane(dragPlane, intersectPoint)
    return hit
  }

  function onMouseMove(event: MouseEvent): void {
    updateMouse(event)

    if (isDragging) {
      const point = getGroundIntersection()
      if (point) {
        const clampedX = Math.max(-9, Math.min(9, point.x))
        const clampedZ = Math.max(-9, Math.min(9, point.z))
        charHandle.setPosition(clampedX, 0, clampedZ)
        character.setPosition(createPosition(clampedX, 0, clampedZ))
      }
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
    canvas.style.cursor = 'grabbing'
    stateMachine.transition({ type: 'interaction', kind: 'drag_start' })
    character.setState('dragged')
    charHandle.playState('dragged')
  }

  function onMouseUp(): void {
    if (!isDragging) return

    isDragging = false
    canvas.style.cursor = isHovering ? 'pointer' : 'default'
    stateMachine.transition({ type: 'interaction', kind: 'drag_end' })
    character.setState('idle')
    charHandle.playState('idle')
    stateMachine.start()
  }

  function onClick(event: MouseEvent): void {
    // ドラッグ後のmouseupと区別：isDraggingがfalseの場合のみクリック処理
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
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('click', onClick)
      canvas.style.cursor = 'default'
    }
  }
}
