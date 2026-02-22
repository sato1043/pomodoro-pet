import * as THREE from 'three'

export interface WeatherEffect {
  update(deltaMs: number): void
  setVisible(visible: boolean): void
  dispose(): void
}

const PARTICLE_COUNT = 650
const AREA_X = 30
const AREA_Y = 15
const Z_MIN = -15 // 奥端
const Z_MAX = 4   // 手前端（カメラz=5より手前に来ない）
const FALL_SPEED = 8 // m/s
const STREAK_LENGTH = 0.2 // 残像の長さ（m）

// スプラッシュ設定
const SPLASH_MAX = 200
const SPLASH_PARTICLES_PER_DROP = 3
const SPLASH_SPEED = 1.5
const SPLASH_UP_SPEED = 1.0
const SPLASH_GRAVITY = 4.0
const SPLASH_LIFETIME = 0.3

function randomZ(): number {
  return Z_MIN + Math.random() * (Z_MAX - Z_MIN)
}

export function createRainEffect(scene: THREE.Scene): WeatherEffect {
  // --- 雨粒（LineSegments）---
  const rainGeo = new THREE.BufferGeometry()
  const rainPositions = new Float32Array(PARTICLE_COUNT * 2 * 3)

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const x = (Math.random() - 0.5) * AREA_X
    const y = Math.random() * AREA_Y
    const z = randomZ()
    rainPositions[i * 6] = x
    rainPositions[i * 6 + 1] = y
    rainPositions[i * 6 + 2] = z
    rainPositions[i * 6 + 3] = x
    rainPositions[i * 6 + 4] = y + STREAK_LENGTH
    rainPositions[i * 6 + 5] = z
  }

  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3))

  const rainMat = new THREE.LineBasicMaterial({
    color: 0xaaaacc,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    linewidth: 1,
  })

  const lines = new THREE.LineSegments(rainGeo, rainMat)
  lines.visible = false
  scene.add(lines)

  // --- スプラッシュ（Points）---
  const splashGeo = new THREE.BufferGeometry()
  const splashPositions = new Float32Array(SPLASH_MAX * 3)
  splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPositions, 3))
  splashGeo.setDrawRange(0, 0)

  const splashMat = new THREE.PointsMaterial({
    color: 0xccccee,
    size: 0.006,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  })

  const splashPoints = new THREE.Points(splashGeo, splashMat)
  splashPoints.visible = false
  scene.add(splashPoints)

  const splashVx = new Float32Array(SPLASH_MAX)
  const splashVy = new Float32Array(SPLASH_MAX)
  const splashVz = new Float32Array(SPLASH_MAX)
  const splashLife = new Float32Array(SPLASH_MAX)
  let splashHead = 0
  let splashCount = 0

  function spawnSplash(x: number, z: number): void {
    for (let j = 0; j < SPLASH_PARTICLES_PER_DROP; j++) {
      const angle = Math.random() * Math.PI * 2
      const speed = SPLASH_SPEED * (0.5 + Math.random() * 0.5)
      const idx = splashHead
      splashPositions[idx * 3] = x
      splashPositions[idx * 3 + 1] = 0.02
      splashPositions[idx * 3 + 2] = z
      splashVx[idx] = Math.cos(angle) * speed
      splashVy[idx] = SPLASH_UP_SPEED * (0.6 + Math.random() * 0.4)
      splashVz[idx] = Math.sin(angle) * speed
      splashLife[idx] = SPLASH_LIFETIME
      splashHead = (splashHead + 1) % SPLASH_MAX
      if (splashCount < SPLASH_MAX) splashCount++
    }
  }

  let visible = false

  return {
    update(deltaMs: number): void {
      if (!visible) return
      const deltaSec = deltaMs / 1000
      const fall = FALL_SPEED * deltaSec

      // --- 雨粒更新 ---
      const rainArr = (rainGeo.attributes.position as THREE.BufferAttribute).array as Float32Array
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        rainArr[i * 6 + 1] -= fall
        rainArr[i * 6 + 4] -= fall

        if (rainArr[i * 6 + 1] < 0) {
          const hitX = rainArr[i * 6]
          const hitZ = rainArr[i * 6 + 2]
          if (hitZ > -5 && hitZ < Z_MAX) {
            spawnSplash(hitX, hitZ)
          }
          const x = (Math.random() - 0.5) * AREA_X
          const z = randomZ()
          rainArr[i * 6] = x
          rainArr[i * 6 + 1] = AREA_Y
          rainArr[i * 6 + 2] = z
          rainArr[i * 6 + 3] = x
          rainArr[i * 6 + 4] = AREA_Y + STREAK_LENGTH
          rainArr[i * 6 + 5] = z
        }
      }
      (rainGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true

      // --- スプラッシュ更新 ---
      for (let i = 0; i < splashCount; i++) {
        const idx = (splashHead - splashCount + i + SPLASH_MAX) % SPLASH_MAX
        if (splashLife[idx] <= 0) continue

        splashLife[idx] -= deltaSec
        if (splashLife[idx] <= 0) {
          splashPositions[idx * 3 + 1] = -100
          continue
        }

        splashVy[idx] -= SPLASH_GRAVITY * deltaSec
        splashPositions[idx * 3] += splashVx[idx] * deltaSec
        splashPositions[idx * 3 + 1] += splashVy[idx] * deltaSec
        splashPositions[idx * 3 + 2] += splashVz[idx] * deltaSec

        if (splashPositions[idx * 3 + 1] < 0) {
          splashPositions[idx * 3 + 1] = 0
          splashLife[idx] = 0
        }
      }
      splashGeo.setDrawRange(0, splashCount)
      ;(splashGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true
    },

    setVisible(v: boolean): void {
      visible = v
      lines.visible = v
      splashPoints.visible = v
    },

    dispose(): void {
      scene.remove(lines)
      scene.remove(splashPoints)
      rainGeo.dispose()
      rainMat.dispose()
      splashGeo.dispose()
      splashMat.dispose()
    },
  }
}
