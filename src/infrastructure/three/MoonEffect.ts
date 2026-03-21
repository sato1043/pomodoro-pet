import * as THREE from 'three'
import { generateMoonPhasePixels } from '../../domain/environment/value-objects/MoonPhase'

const MOON_TEXTURE_SIZE = 128
const MOON_SPHERE_SEGMENTS = 32
const MOON_SCALE = 18.0
const GLOW_SCALE = 1.3
const GLOW_COLOR = 0xaabbdd
const GLOW_BASE_OPACITY = 0.15

export interface MoonEffect {
  update(params: {
    moonPosition: { x: number; y: number; z: number }
    moonPhaseDeg: number
    moonIllumination: number
    moonIsVisible: boolean
    moonOpacity: number
  }): void
  dispose(): void
}

export function createMoonEffect(scene: THREE.Scene): MoonEffect {
  // --- 月球体 ---
  const moonGeometry = new THREE.SphereGeometry(1.0, MOON_SPHERE_SEGMENTS, MOON_SPHERE_SEGMENTS)

  // Canvasテクスチャ
  const canvas = document.createElement('canvas')
  canvas.width = MOON_TEXTURE_SIZE
  canvas.height = MOON_TEXTURE_SIZE
  const ctx = canvas.getContext('2d')!
  const canvasTexture = new THREE.CanvasTexture(canvas)
  canvasTexture.colorSpace = THREE.SRGBColorSpace

  const moonMaterial = new THREE.MeshBasicMaterial({
    map: canvasTexture,
    transparent: true,
    depthWrite: false,
    fog: false,
  })

  const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial)
  moonMesh.scale.setScalar(MOON_SCALE)
  moonMesh.visible = false
  // fog無効化: moonMeshのlayerを設定するかfog:falseのマテリアルで対応（MeshBasicMaterialはfogプロパティあり）
  scene.add(moonMesh)

  // --- グロー球体（BackSide） ---
  const glowGeometry = new THREE.SphereGeometry(1.0, 16, 16)
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: GLOW_COLOR,
    transparent: true,
    opacity: 0,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  })
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial)
  glowMesh.scale.setScalar(MOON_SCALE * GLOW_SCALE)
  glowMesh.visible = false
  scene.add(glowMesh)

  // テクスチャ更新の追跡
  let lastPhaseDeg = -1
  let lastIllumination = -1

  function updateTexture(phaseDeg: number, illumination: number): void {
    // 変化が小さい場合はスキップ（パフォーマンス最適化）
    if (Math.abs(phaseDeg - lastPhaseDeg) < 1 && Math.abs(illumination - lastIllumination) < 0.01) {
      return
    }
    lastPhaseDeg = phaseDeg
    lastIllumination = illumination

    const pixels = generateMoonPhasePixels(phaseDeg, MOON_TEXTURE_SIZE, illumination)
    const imageData = new ImageData(pixels, MOON_TEXTURE_SIZE, MOON_TEXTURE_SIZE)
    ctx.putImageData(imageData, 0, 0)
    canvasTexture.needsUpdate = true
  }

  return {
    update(params) {
      const { moonPosition, moonPhaseDeg, moonIllumination, moonIsVisible, moonOpacity } = params

      if (!moonIsVisible || moonOpacity <= 0) {
        moonMesh.visible = false
        glowMesh.visible = false
        return
      }

      // 位置更新
      moonMesh.position.set(moonPosition.x, moonPosition.y, moonPosition.z)
      glowMesh.position.set(moonPosition.x, moonPosition.y, moonPosition.z)

      // テクスチャ更新
      updateTexture(moonPhaseDeg, moonIllumination)

      // 不透明度
      moonMaterial.opacity = moonOpacity
      glowMaterial.opacity = GLOW_BASE_OPACITY * moonOpacity * moonIllumination

      moonMesh.visible = true
      glowMesh.visible = true
    },

    dispose() {
      scene.remove(moonMesh)
      scene.remove(glowMesh)
      moonGeometry.dispose()
      glowGeometry.dispose()
      moonMaterial.dispose()
      glowMaterial.dispose()
      canvasTexture.dispose()
    },
  }
}
