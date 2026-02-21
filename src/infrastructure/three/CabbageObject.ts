import * as THREE from 'three'

export interface CabbageHandle {
  readonly object3D: THREE.Group
  setPosition(x: number, y: number, z: number): void
  setVisible(visible: boolean): void
  resetPosition(): void
}

const OUTER_LEAF_COLOR = 0x4caf50
const INNER_LEAF_COLOR = 0x8bc34a
const CABBAGE_SCALE = 0.3

interface LeafConfig {
  readonly radius: number
  readonly scaleY: number
  readonly offset: { x: number; y: number; z: number }
  readonly rotation?: { x: number; y: number; z: number }
  readonly color: number
}

const LEAVES: readonly LeafConfig[] = [
  // 本体（丸い芯）
  { radius: 0.5, scaleY: 0.85, offset: { x: 0, y: 0, z: 0 }, color: OUTER_LEAF_COLOR },
  // 外葉（周囲に配置）
  { radius: 0.42, scaleY: 0.9, offset: { x: 0.12, y: 0.02, z: 0.08 }, color: OUTER_LEAF_COLOR },
  { radius: 0.40, scaleY: 0.88, offset: { x: -0.1, y: 0.02, z: 0.1 }, color: OUTER_LEAF_COLOR },
  { radius: 0.38, scaleY: 0.88, offset: { x: -0.1, y: 0.01, z: -0.1 }, color: OUTER_LEAF_COLOR },
  { radius: 0.40, scaleY: 0.9, offset: { x: 0.1, y: 0.01, z: -0.08 }, color: OUTER_LEAF_COLOR },
  { radius: 0.36, scaleY: 0.85, offset: { x: 0.0, y: 0.03, z: 0.14 }, color: OUTER_LEAF_COLOR },
  { radius: 0.35, scaleY: 0.85, offset: { x: 0.0, y: 0.02, z: -0.13 }, color: OUTER_LEAF_COLOR },
  // 上部の反り返り葉
  { radius: 0.22, scaleY: 0.5, offset: { x: 0.1, y: 0.38, z: 0.05 }, rotation: { x: -0.4, y: 0, z: -0.3 }, color: 0x66bb6a },
  { radius: 0.20, scaleY: 0.5, offset: { x: -0.08, y: 0.35, z: -0.06 }, rotation: { x: 0.3, y: 0, z: 0.4 }, color: 0x66bb6a },
  // 芯（黄緑、中心上部）
  { radius: 0.25, scaleY: 0.95, offset: { x: 0, y: 0.06, z: 0 }, color: INNER_LEAF_COLOR },
]

export function createCabbageObject(
  scene: THREE.Scene,
  initialPosition: { x: number; y: number; z: number } = { x: 0.3, y: 0.05, z: 4.5 }
): CabbageHandle {
  const group = new THREE.Group()

  for (const leaf of LEAVES) {
    const geo = new THREE.SphereGeometry(leaf.radius, 12, 10)
    const mat = new THREE.MeshStandardMaterial({
      color: leaf.color,
      roughness: 0.7,
      metalness: 0.0,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.scale.y = leaf.scaleY
    mesh.position.set(leaf.offset.x, leaf.offset.y, leaf.offset.z)
    if (leaf.rotation) {
      mesh.rotation.set(leaf.rotation.x, leaf.rotation.y, leaf.rotation.z)
    }
    mesh.castShadow = true
    group.add(mesh)
  }

  group.scale.setScalar(CABBAGE_SCALE)
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
