import * as THREE from 'three'

export interface WeatherEffect {
  update(deltaMs: number): void
  setVisible(visible: boolean): void
  fadeIn(durationMs: number): void
  fadeOut(durationMs: number): void
  setParticleCount(count: number): void
  dispose(): void
}

const PARTICLE_COUNT_MAX = 1200
const DEFAULT_PARTICLE_COUNT = 650
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

const BASE_RAIN_OPACITY = 0.4
const BASE_SPLASH_OPACITY = 0.5

function randomZ(): number {
  return Z_MIN + Math.random() * (Z_MAX - Z_MIN)
}

export function createRainEffect(scene: THREE.Scene): WeatherEffect {
  // --- 雨粒（LineSegments）---
  let currentParticleCount = DEFAULT_PARTICLE_COUNT

  const rainGeo = new THREE.BufferGeometry()
  const rainPositions = new Float32Array(PARTICLE_COUNT_MAX * 2 * 3)

  for (let i = 0; i < PARTICLE_COUNT_MAX; i++) {
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
  rainGeo.setDrawRange(0, currentParticleCount * 2)

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
  let fadeState: 'none' | 'in' | 'out' = 'none'
  let fadeElapsed = 0
  let fadeDuration = 0

  function currentFadeRatio(): number {
    if (fadeState === 'none') return visible ? 1 : 0
    const t = Math.min(fadeElapsed / fadeDuration, 1)
    return fadeState === 'in' ? t : 1 - t
  }

  return {
    update(deltaMs: number): void {
      // フェード処理
      if (fadeState !== 'none') {
        fadeElapsed += deltaMs
        const t = Math.min(fadeElapsed / fadeDuration, 1)
        if (fadeState === 'in') {
          rainMat.opacity = BASE_RAIN_OPACITY * t
          splashMat.opacity = BASE_SPLASH_OPACITY * t
        } else {
          rainMat.opacity = BASE_RAIN_OPACITY * (1 - t)
          splashMat.opacity = BASE_SPLASH_OPACITY * (1 - t)
        }
        if (t >= 1) {
          if (fadeState === 'out') {
            visible = false
            lines.visible = false
            splashPoints.visible = false
          }
          fadeState = 'none'
        }
      }

      if (!visible) return
      const deltaSec = deltaMs / 1000
      const fall = FALL_SPEED * deltaSec

      // --- 雨粒更新 ---
      const rainArr = (rainGeo.attributes.position as THREE.BufferAttribute).array as Float32Array
      for (let i = 0; i < currentParticleCount; i++) {
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
      fadeState = 'none'
      rainMat.opacity = v ? BASE_RAIN_OPACITY : 0
      splashMat.opacity = v ? BASE_SPLASH_OPACITY : 0
    },

    fadeIn(durationMs: number): void {
      if (visible && fadeState === 'none') return
      const ratio = currentFadeRatio()
      visible = true
      lines.visible = true
      splashPoints.visible = true
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

    setParticleCount(count: number): void {
      currentParticleCount = Math.max(0, Math.min(PARTICLE_COUNT_MAX, count))
      rainGeo.setDrawRange(0, currentParticleCount * 2)
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
