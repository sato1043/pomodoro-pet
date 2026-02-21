import * as THREE from 'three'
import type { CabbageHandle } from './CabbageObject'

const APPLE_RED = 0xe53935
const APPLE_HIGHLIGHT = 0xef5350
const STEM_BROWN = 0x5d4037
const LEAF_GREEN = 0x43a047
const APPLE_SCALE = 0.15

export function createAppleObject(
  scene: THREE.Scene,
  initialPosition: { x: number; y: number; z: number } = { x: 0, y: 0.05, z: 4.65 }
): CabbageHandle {
  const group = new THREE.Group()

  // 本体（やや縦長の球）
  const bodyGeo = new THREE.SphereGeometry(0.5, 14, 12)
  const bodyMat = new THREE.MeshStandardMaterial({ color: APPLE_RED, roughness: 0.4, metalness: 0.1 })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.scale.y = 0.9
  body.castShadow = true
  group.add(body)

  // ハイライト（少しずらした明るい球）
  const highlightGeo = new THREE.SphereGeometry(0.35, 10, 8)
  const highlightMat = new THREE.MeshStandardMaterial({ color: APPLE_HIGHLIGHT, roughness: 0.3, metalness: 0.1 })
  const highlight = new THREE.Mesh(highlightGeo, highlightMat)
  highlight.position.set(0.1, 0.1, 0.15)
  group.add(highlight)

  // 茎
  const stemGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.25, 6)
  const stemMat = new THREE.MeshStandardMaterial({ color: STEM_BROWN, roughness: 0.8 })
  const stem = new THREE.Mesh(stemGeo, stemMat)
  stem.position.set(0, 0.5, 0)
  group.add(stem)

  // 葉
  const leafGeo = new THREE.SphereGeometry(0.15, 6, 4)
  const leafMat = new THREE.MeshStandardMaterial({ color: LEAF_GREEN, roughness: 0.6 })
  const leaf = new THREE.Mesh(leafGeo, leafMat)
  leaf.scale.set(1, 0.3, 0.6)
  leaf.position.set(0.1, 0.55, 0.05)
  leaf.rotation.z = -0.5
  group.add(leaf)

  group.scale.setScalar(APPLE_SCALE)
  group.position.set(initialPosition.x, initialPosition.y, initialPosition.z)
  group.visible = false
  scene.add(group)

  return {
    get object3D() { return group },

    setPosition(x: number, y: number, z: number): void {
      group.position.set(x, y, z)
    },

    setVisible(visible: boolean): void {
      group.visible = visible
    },

    resetPosition(): void {
      group.position.set(initialPosition.x, initialPosition.y, initialPosition.z)
    },
  }
}
