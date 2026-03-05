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

/** 密度変更時の古い雲フェードアウト duration（ms） */
const DENSITY_CROSSFADE_MS = 2000

interface CloudInstance {
  group: THREE.Group
  speed: number
}

/** 退場中の雲群。フェードアウト完了後にdispose */
interface RetiringBatch {
  clouds: CloudInstance[]
  materials: THREE.MeshStandardMaterial[]
  startOpacity: number
  elapsed: number
  duration: number
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
  fadeIn(durationMs: number): void
  fadeOut(durationMs: number): void
}

export function createCloudEffect(scene: THREE.Scene): CloudEffect {
  const clouds: CloudInstance[] = []
  const materials: THREE.MeshStandardMaterial[] = []
  const geometry = new THREE.SphereGeometry(1, 8, 6)
  let currentLevel = -1
  let visible = false
  let fadeState: 'none' | 'in' | 'out' = 'none'
  let fadeElapsed = 0
  let fadeDuration = 0
  let targetOpacity = 0

  // 退場中の雲バッチ群
  const retiringBatches: RetiringBatch[] = []

  function retireCurrentClouds(duration: number): void {
    if (clouds.length === 0) return

    // 現在のマテリアルopacityを退場開始値とする
    const startOpacity = materials.length > 0 ? materials[0].opacity : 0

    retiringBatches.push({
      clouds: [...clouds],
      materials: [...materials],
      startOpacity,
      elapsed: 0,
      duration,
    })

    // アクティブリストからは除去（sceneには残す）
    clouds.length = 0
    materials.length = 0
  }

  function disposeRetiringBatch(batch: RetiringBatch): void {
    for (const cloud of batch.clouds) {
      scene.remove(cloud.group)
    }
    for (const mat of batch.materials) {
      mat.dispose()
    }
  }

  function clearClouds(): void {
    for (const cloud of clouds) {
      scene.remove(cloud.group)
    }
    clouds.length = 0
    for (const mat of materials) {
      mat.dispose()
    }
    materials.length = 0
  }

  function clearRetiringBatches(): void {
    for (const batch of retiringBatches) {
      disposeRetiringBatch(batch)
    }
    retiringBatches.length = 0
  }

  function spawnClouds(level: number, initialOpacity: number): void {
    const config = CLOUD_CONFIGS[level] ?? CLOUD_CONFIGS[0]
    if (config.count === 0) return

    for (let i = 0; i < config.count; i++) {
      const { group, material } = createCloudGroup(initialOpacity)
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

  function currentFadeRatio(): number {
    if (fadeState === 'none') return visible ? 1 : 0
    const t = Math.min(fadeElapsed / fadeDuration, 1)
    return fadeState === 'in' ? t : 1 - t
  }

  function setAllMaterialsOpacity(opacity: number): void {
    for (const mat of materials) {
      mat.opacity = opacity
    }
  }

  function updateDriftForClouds(cloudList: CloudInstance[], deltaSec: number): void {
    const halfZ = CLOUD_AREA_Z / 2
    for (const cloud of cloudList) {
      cloud.group.position.z -= cloud.speed * deltaSec
      if (cloud.group.position.z < -halfZ) {
        cloud.group.position.z = halfZ
        cloud.group.position.x = (Math.random() - 0.5) * CLOUD_AREA_X
        cloud.group.position.y = CLOUD_Y_MIN + Math.random() * (CLOUD_Y_MAX - CLOUD_Y_MIN)
      }
    }
  }

  return {
    update(deltaMs: number): void {
      // アクティブ雲のフェード処理
      if (fadeState !== 'none') {
        fadeElapsed += deltaMs
        const t = Math.min(fadeElapsed / fadeDuration, 1)
        if (fadeState === 'in') {
          setAllMaterialsOpacity(targetOpacity * t)
        } else {
          setAllMaterialsOpacity(targetOpacity * (1 - t))
        }
        if (t >= 1) {
          if (fadeState === 'out') {
            visible = false
            for (const cloud of clouds) {
              cloud.group.visible = false
            }
          }
          fadeState = 'none'
        }
      }

      // 退場中バッチのフェードアウト処理
      for (let i = retiringBatches.length - 1; i >= 0; i--) {
        const batch = retiringBatches[i]
        batch.elapsed += deltaMs
        const t = Math.min(batch.elapsed / batch.duration, 1)
        const opacity = batch.startOpacity * (1 - t)
        for (const mat of batch.materials) {
          mat.opacity = opacity
        }
        if (t >= 1) {
          disposeRetiringBatch(batch)
          retiringBatches.splice(i, 1)
        } else {
          // 退場中もドリフトさせる
          updateDriftForClouds(batch.clouds, deltaMs / 1000)
        }
      }

      if (!visible || clouds.length === 0) return
      updateDriftForClouds(clouds, deltaMs / 1000)
    },

    setVisible(v: boolean): void {
      visible = v
      fadeState = 'none'
      for (const cloud of clouds) {
        cloud.group.visible = v
      }
      if (v) {
        setAllMaterialsOpacity(targetOpacity)
      }
      // 即座切替時は退場中バッチもクリア
      clearRetiringBatches()
    },

    setDensity(level: number): void {
      if (level === currentLevel) return
      currentLevel = level
      const config = CLOUD_CONFIGS[level] ?? CLOUD_CONFIGS[0]
      targetOpacity = config.opacity

      // フェード中なら現在の進行度を記憶
      const ratio = currentFadeRatio()

      // 古い雲を退場バッチに移す（フェードアウトで消える）
      retireCurrentClouds(DENSITY_CROSSFADE_MS)

      // 新しい雲を生成（フェード中なら進行度に合わせたopacityで開始）
      const initialOpacity = fadeState !== 'none' ? targetOpacity * ratio : targetOpacity
      spawnClouds(level, initialOpacity)
    },

    fadeIn(durationMs: number): void {
      if (visible && fadeState === 'none') return
      const ratio = currentFadeRatio()
      visible = true
      for (const cloud of clouds) {
        cloud.group.visible = true
      }
      fadeDuration = durationMs
      fadeElapsed = ratio * durationMs
      fadeState = 'in'
    },

    fadeOut(durationMs: number): void {
      if (!visible && fadeState === 'none') return
      const ratio = currentFadeRatio()
      fadeDuration = durationMs
      fadeElapsed = (1 - ratio) * durationMs
      fadeState = 'out'
    },

    dispose(): void {
      clearClouds()
      clearRetiringBatches()
      geometry.dispose()
    },
  }
}
