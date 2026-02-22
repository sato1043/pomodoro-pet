import * as THREE from 'three'
import type { CabbageHandle } from '../../infrastructure/three/CabbageObject'
import type { ThreeCharacterHandle } from './ThreeCharacterAdapter'
import type { Character } from '../../domain/character/entities/Character'
import type { BehaviorStateMachine } from '../../domain/character/services/BehaviorStateMachine'
import type { EventBus } from '../../domain/shared/EventBus'

export interface FeedingSuccessEvent {
  readonly type: 'FeedingSuccess'
}

export interface FeedingInteractionAdapter {
  readonly isActive: boolean
  setActive(active: boolean): void
  dispose(): void
}

const FEED_DISTANCE_THRESHOLD = 2.5
const CABBAGE_REAPPEAR_DELAY_MS = 3000
const SNAP_BACK_DURATION_MS = 300
const ARC_HEIGHT = 0.85
const MIN_Y = 0.1
const Z_RANGE = 8
const Z_POWER = 1.3

/** freeモードのデフォルトカメラ設定。main.tsと共有 */
export const DEFAULT_CAMERA = { posY: 0.6, posZ: 5, lookAtY: 1.5 } as const

/** ふれあいモードのカメラ設定 */
export const FUREAI_CAMERA = { posZ: 7, lookAtY: 1.4 } as const

export function createFeedingInteractionAdapter(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  cabbageHandles: readonly CabbageHandle[],
  charHandle: ThreeCharacterHandle,
  character: Character,
  behaviorSM: BehaviorStateMachine,
  bus: EventBus
): FeedingInteractionAdapter {
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  const canvas = renderer.domElement

  let active = false
  let dragging = false
  let dragTarget: CabbageHandle | null = null
  const reappearTimers = new Map<CabbageHandle, ReturnType<typeof setTimeout>>()
  let snapBackAnimId = 0

  // カメラ復元用
  let savedCameraPos = { x: 0, y: 0, z: 0 }
  let savedLookAtY = 0

  // ドラッグ状態
  let dragOriginZ = 0
  let grabNdcY = 0

  function updateMouse(event: MouseEvent): void {
    const rect = canvas.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  function hitTestCabbages(): CabbageHandle | null {
    raycaster.setFromCamera(mouse, camera)
    for (const handle of cabbageHandles) {
      if (!handle.object3D.visible) continue
      const hits = raycaster.intersectObject(handle.object3D, true)
      if (hits.length > 0) return handle
    }
    return null
  }

  /** マウスレイとZ=targetZの平面の交点を求める */
  function screenToWorldAtZ(ndcX: number, ndcY: number, targetZ: number): THREE.Vector3 {
    const ndc = new THREE.Vector3(ndcX, ndcY, 0.5)
    ndc.unproject(camera)
    const dir = ndc.sub(camera.position).normalize()
    const t = (targetZ - camera.position.z) / dir.z
    return camera.position.clone().add(dir.multiplyScalar(t))
  }

  function onMouseDown(event: MouseEvent): void {
    if (!active || event.button !== 0) return
    updateMouse(event)
    const hit = hitTestCabbages()
    if (!hit) return
    dragging = true
    dragTarget = hit
    const pos = hit.object3D.position
    dragOriginZ = pos.z
    grabNdcY = mouse.y
    canvas.style.cursor = 'grabbing'
  }

  function onMouseMove(event: MouseEvent): void {
    if (!active) return

    if (dragging && dragTarget) {
      updateMouse(event)
      const ndcDeltaY = mouse.y - grabNdcY
      const zDelta = Math.sign(ndcDeltaY) * Z_RANGE * Math.pow(Math.abs(ndcDeltaY), Z_POWER)
      const targetZ = dragOriginZ - zDelta

      const zHit = screenToWorldAtZ(mouse.x, mouse.y, targetZ)
      const targetX = zHit.x

      const forwardProgress = Math.max(0, dragOriginZ - targetZ)
      const lift = ARC_HEIGHT * Math.min(forwardProgress / 3.0, 1)
      const targetY = Math.max(MIN_Y, MIN_Y + lift)

      dragTarget.setPosition(targetX, targetY, targetZ)
      return
    }

    // ホバー判定
    updateMouse(event)
    if (hitTestCabbages()) {
      canvas.style.cursor = 'grab'
    }
  }

  function snapBack(handle: CabbageHandle): void {
    const startPos = handle.object3D.position.clone()
    const startTime = performance.now()
    const savedPos = handle.object3D.position.clone()
    handle.resetPosition()
    const endPos = handle.object3D.position.clone()
    handle.setPosition(savedPos.x, savedPos.y, savedPos.z)

    const animate = (): void => {
      const elapsed = performance.now() - startTime
      const t = Math.min(1, elapsed / SNAP_BACK_DURATION_MS)
      const eased = 1 - Math.pow(1 - t, 3)
      handle.setPosition(
        startPos.x + (endPos.x - startPos.x) * eased,
        startPos.y + (endPos.y - startPos.y) * eased,
        startPos.z + (endPos.z - startPos.z) * eased
      )
      if (t < 1) {
        snapBackAnimId = requestAnimationFrame(animate)
      }
    }
    snapBackAnimId = requestAnimationFrame(animate)
  }

  function onMouseUp(): void {
    if (!active || !dragging || !dragTarget) return
    const target = dragTarget
    dragging = false
    dragTarget = null
    canvas.style.cursor = 'default'

    const cabbagePos = target.object3D.position
    const charPos = charHandle.object3D.position
    const distance = cabbagePos.distanceTo(charPos)

    if (distance < FEED_DISTANCE_THRESHOLD) {
      target.setVisible(false)
      behaviorSM.transition({ type: 'interaction', kind: 'feed' })
      character.setState('feeding')
      charHandle.playState('feeding')
      behaviorSM.start()
      bus.publish<FeedingSuccessEvent>('FeedingSuccess', { type: 'FeedingSuccess' })

      const timer = setTimeout(() => {
        target.resetPosition()
        target.setVisible(true)
        reappearTimers.delete(target)
      }, CABBAGE_REAPPEAR_DELAY_MS)
      reappearTimers.set(target, timer)
    } else {
      snapBack(target)
    }
  }

  canvas.addEventListener('mousedown', onMouseDown)
  canvas.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)

  return {
    get isActive() { return active },

    setActive(value: boolean): void {
      active = value
      if (value) {
        savedCameraPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z }
        savedLookAtY = DEFAULT_CAMERA.lookAtY
        camera.position.set(savedCameraPos.x, savedCameraPos.y, FUREAI_CAMERA.posZ)
        camera.lookAt(0, FUREAI_CAMERA.lookAtY, 0)
        for (const handle of cabbageHandles) {
          handle.resetPosition()
          handle.setVisible(true)
        }
      } else {
        dragging = false
        dragTarget = null
        camera.position.set(savedCameraPos.x, savedCameraPos.y, savedCameraPos.z)
        camera.lookAt(0, savedLookAtY, 0)
        for (const handle of cabbageHandles) {
          handle.setVisible(false)
        }
        for (const timer of reappearTimers.values()) {
          clearTimeout(timer)
        }
        reappearTimers.clear()
      }
    },

    dispose(): void {
      cancelAnimationFrame(snapBackAnimId)
      for (const timer of reappearTimers.values()) {
        clearTimeout(timer)
      }
      reappearTimers.clear()
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    },
  }
}
