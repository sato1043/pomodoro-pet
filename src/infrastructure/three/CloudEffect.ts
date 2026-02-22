import * as THREE from 'three'
import type { WeatherEffect } from './RainEffect'

/** 雲の密度設定。インデックスがCloudDensityLevel(0〜5)に対応 */
const CLOUD_CONFIGS: Array<{ count: number; opacity: number }> = [
  { count: 0, opacity: 0 },     // 0: none
  { count: 4, opacity: 0.3 },   // 1: very sparse
  { count: 15, opacity: 0.35 }, // 2: sparse
  { count: 35, opacity: 0.45 }, // 3: moderate
  { count: 65, opacity: 0.55 }, // 4: dense
  { count: 100, opacity: 0.6 }, // 5: overcast
]

const CLOUD_Y_MIN = 5
const CLOUD_Y_MAX = 8
const CLOUD_AREA_X = 30
const CLOUD_AREA_Z = 40
const DRIFT_SPEED = 0.3 // m/s

const PUFFS_PER_CLOUD_MIN = 3
const PUFFS_PER_CLOUD_MAX = 6

interface CloudInstance {
  group: THREE.Group
  speed: number
}

function createCloudGroup(opacity: number): { group: THREE.Group; material: THREE.MeshStandardMaterial } {
  const group = new THREE.Group()
  const puffCount = PUFFS_PER_CLOUD_MIN + Math.floor(Math.random() * (PUFFS_PER_CLOUD_MAX - PUFFS_PER_CLOUD_MIN + 1))

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity,
    depthWrite: false,
    roughness: 1,
  })

  const geo = new THREE.SphereGeometry(1, 8, 6)

  for (let i = 0; i < puffCount; i++) {
    const puff = new THREE.Mesh(geo, material)
    const scaleX = 1.2 + Math.random() * 1.5
    const scaleY = 0.4 + Math.random() * 0.3
    const scaleZ = 0.8 + Math.random() * 1.0
    puff.scale.set(scaleX, scaleY, scaleZ)
    puff.position.set(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 3
    )
    group.add(puff)
  }

  return { group, material }
}

export interface CloudEffect extends WeatherEffect {
  setDensity(level: number): void
}

export function createCloudEffect(scene: THREE.Scene): CloudEffect {
  const clouds: CloudInstance[] = []
  const materials: THREE.MeshStandardMaterial[] = []
  const geometry = new THREE.SphereGeometry(1, 8, 6)
  let currentLevel = -1
  let visible = false

  function clearClouds(): void {
    for (const cloud of clouds) {
      scene.remove(cloud.group)
      // children meshes share material, disposed separately
    }
    clouds.length = 0
    for (const mat of materials) {
      mat.dispose()
    }
    materials.length = 0
  }

  function spawnClouds(level: number): void {
    clearClouds()
    const config = CLOUD_CONFIGS[level] ?? CLOUD_CONFIGS[0]
    if (config.count === 0) return

    for (let i = 0; i < config.count; i++) {
      const { group, material } = createCloudGroup(config.opacity)
      materials.push(material)

      group.position.set(
        (Math.random() - 0.5) * CLOUD_AREA_X,
        CLOUD_Y_MIN + Math.random() * (CLOUD_Y_MAX - CLOUD_Y_MIN),
        (Math.random() - 0.5) * CLOUD_AREA_Z
      )

      const scale = 0.5 + Math.random() * 1.0
      group.scale.setScalar(scale)

      group.visible = visible
      scene.add(group)

      clouds.push({
        group,
        speed: DRIFT_SPEED * (0.5 + Math.random() * 1.0),
      })
    }
  }

  return {
    update(deltaMs: number): void {
      if (!visible || clouds.length === 0) return
      const deltaSec = deltaMs / 1000
      const halfZ = CLOUD_AREA_Z / 2

      for (const cloud of clouds) {
        cloud.group.position.z -= cloud.speed * deltaSec
        // 手前端を超えたら奥にループ
        if (cloud.group.position.z < -halfZ) {
          cloud.group.position.z = halfZ
          cloud.group.position.x = (Math.random() - 0.5) * CLOUD_AREA_X
          cloud.group.position.y = CLOUD_Y_MIN + Math.random() * (CLOUD_Y_MAX - CLOUD_Y_MIN)
        }
      }
    },

    setVisible(v: boolean): void {
      visible = v
      for (const cloud of clouds) {
        cloud.group.visible = v
      }
    },

    setDensity(level: number): void {
      if (level === currentLevel) return
      currentLevel = level
      spawnClouds(level)
    },

    dispose(): void {
      clearClouds()
      geometry.dispose()
    },
  }
}
