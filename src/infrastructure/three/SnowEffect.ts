import * as THREE from 'three'
import type { WeatherEffect } from './RainEffect'

const PARTICLE_COUNT = 750
const AREA_X = 30
const AREA_Y = 15
const Z_MIN = -15 // 奥端
const Z_MAX = 4   // 手前端（カメラz=5より手前に来ない）
const FALL_SPEED = 1.5 // m/s
const SWAY_AMPLITUDE = 0.8 // 揺れ幅（m）
const SWAY_FREQ_MIN = 0.5 // 揺れ周波数の下限（Hz）
const SWAY_FREQ_MAX = 1.5 // 揺れ周波数の上限（Hz）

const BASE_OPACITY = 0.7

function randomZ(): number {
  return Z_MIN + Math.random() * (Z_MAX - Z_MIN)
}

export function createSnowEffect(scene: THREE.Scene): WeatherEffect {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(PARTICLE_COUNT * 3)

  const phaseX = new Float32Array(PARTICLE_COUNT)
  const phaseZ = new Float32Array(PARTICLE_COUNT)
  const freqX = new Float32Array(PARTICLE_COUNT)
  const freqZ = new Float32Array(PARTICLE_COUNT)

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * AREA_X
    positions[i * 3 + 1] = Math.random() * AREA_Y
    positions[i * 3 + 2] = randomZ()
    phaseX[i] = Math.random() * Math.PI * 2
    phaseZ[i] = Math.random() * Math.PI * 2
    freqX[i] = SWAY_FREQ_MIN + Math.random() * (SWAY_FREQ_MAX - SWAY_FREQ_MIN)
    freqZ[i] = SWAY_FREQ_MIN + Math.random() * (SWAY_FREQ_MAX - SWAY_FREQ_MIN)
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({
    color: 0xddddee,
    size: 0.1,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  })

  const points = new THREE.Points(geometry, material)
  points.visible = false
  scene.add(points)

  let visible = false
  let elapsed = 0
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
          material.opacity = BASE_OPACITY * t
        } else {
          material.opacity = BASE_OPACITY * (1 - t)
        }
        if (t >= 1) {
          if (fadeState === 'out') {
            visible = false
            points.visible = false
          }
          fadeState = 'none'
        }
      }

      if (!visible) return
      const deltaSec = deltaMs / 1000
      elapsed += deltaSec
      const fall = FALL_SPEED * deltaSec
      const posAttr = geometry.attributes.position as THREE.BufferAttribute
      const arr = posAttr.array as Float32Array

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        arr[i * 3 + 1] -= fall
        const swayX = Math.sin(elapsed * freqX[i] * Math.PI * 2 + phaseX[i]) * SWAY_AMPLITUDE * deltaSec
        const swayZ = Math.cos(elapsed * freqZ[i] * Math.PI * 2 + phaseZ[i]) * SWAY_AMPLITUDE * deltaSec
        arr[i * 3] += swayX
        arr[i * 3 + 2] += swayZ

        if (arr[i * 3 + 1] < 0 || arr[i * 3 + 2] > Z_MAX) {
          arr[i * 3 + 1] = AREA_Y
          arr[i * 3] = (Math.random() - 0.5) * AREA_X
          arr[i * 3 + 2] = randomZ()
        }
      }
      posAttr.needsUpdate = true
    },

    setVisible(v: boolean): void {
      visible = v
      points.visible = v
      fadeState = 'none'
      material.opacity = v ? BASE_OPACITY : 0
    },

    fadeIn(durationMs: number): void {
      if (visible && fadeState === 'none') return
      const ratio = currentFadeRatio()
      visible = true
      points.visible = true
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
      scene.remove(points)
      geometry.dispose()
      material.dispose()
    },
  }
}
