import * as THREE from 'three'
import type { SceneConfig } from '../../domain/environment/value-objects/SceneConfig'
import type { ChunkSpec } from '../../domain/environment/value-objects/SceneConfig'
import type { ScrollState } from '../../application/environment/ScrollUseCase'
import type { EnvironmentThemeParams } from '../../domain/environment/value-objects/EnvironmentTheme'
import { createEnvironmentChunk, type EnvironmentChunk } from './EnvironmentChunk'

export interface InfiniteScrollRenderer {
  readonly ground: THREE.Mesh
  update(state: ScrollState): void
  applyTheme(params: EnvironmentThemeParams): void
  dispose(): void
}

export function createInfiniteScrollRenderer(
  scene: THREE.Scene,
  config: SceneConfig,
  chunkSpec: ChunkSpec,
  chunkCount: number
): InfiniteScrollRenderer {
  // 空と霧
  scene.background = new THREE.Color(0x87ceeb)
  scene.fog = new THREE.Fog(0xc8e6f0, 15, 35)

  // チャンク生成
  const chunks: EnvironmentChunk[] = []
  for (let i = 0; i < chunkCount; i++) {
    const chunk = createEnvironmentChunk(chunkSpec)
    chunks.push(chunk)
    scene.add(chunk.group)
  }

  const dir = config.direction

  function update(state: ScrollState): void {
    // 各チャンクの3D位置をオフセットから算出
    // キャラクターが進行方向に歩くので、背景は逆方向に流す
    for (let i = 0; i < chunks.length; i++) {
      const offset = state.chunkOffsets[i]
      chunks[i].group.position.x = -dir.x * offset
      chunks[i].group.position.z = -dir.z * offset
    }

    // リサイクルされたチャンクは再生成
    if (state.recycledChunkIndex !== null) {
      chunks[state.recycledChunkIndex].regenerate()
    }
  }

  // 初期配置を反映（背景は進行方向の逆に配置）
  const depth = chunkSpec.depth
  for (let i = 0; i < chunks.length; i++) {
    const offset = -depth + i * depth
    chunks[i].group.position.x = -dir.x * offset
    chunks[i].group.position.z = -dir.z * offset
  }

  // 中央チャンクのgroundを返す（インタラクション用）
  const centerIndex = Math.floor(chunkCount / 2)

  return {
    get ground(): THREE.Mesh {
      return chunks[centerIndex].ground
    },
    update,
    applyTheme(params: EnvironmentThemeParams): void {
      scene.background = new THREE.Color(params.skyColor)
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.setHex(params.fogColor)
        scene.fog.near = params.fogNear
        scene.fog.far = params.fogFar
      }
      for (const chunk of chunks) {
        const mat = chunk.ground.material as THREE.MeshStandardMaterial
        mat.color.setHex(params.groundColor)
      }
    },
    dispose(): void {
      for (const chunk of chunks) {
        scene.remove(chunk.group)
        chunk.dispose()
      }
    }
  }
}
