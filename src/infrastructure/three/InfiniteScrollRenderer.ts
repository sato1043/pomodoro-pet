import * as THREE from 'three'
import type { SceneConfig } from '../../domain/environment/value-objects/SceneConfig'
import type { ChunkSpec } from '../../domain/environment/value-objects/SceneConfig'
import type { ScrollState } from '../../application/environment/ScrollUseCase'
import type { EnvironmentThemeParams } from '../../domain/environment/value-objects/EnvironmentTheme'
import type { ChunkDecorator } from './ChunkDecorator'
import { createEnvironmentChunk, type EnvironmentChunk } from './EnvironmentChunk'

export interface InfiniteScrollRenderer {
  readonly ground: THREE.Mesh
  update(state: ScrollState): void
  applyTheme(params: EnvironmentThemeParams): void
  rebuildChunks(chunkSpec: ChunkSpec, decorator: ChunkDecorator): void
  dispose(): void
}

export function createInfiniteScrollRenderer(
  scene: THREE.Scene,
  config: SceneConfig,
  chunkSpec: ChunkSpec,
  chunkCount: number,
  decorator: ChunkDecorator,
): InfiniteScrollRenderer {
  // 空と霧
  scene.background = new THREE.Color(0x87ceeb)
  scene.fog = new THREE.Fog(0xc8e6f0, 15, 35)

  const dir = config.direction
  let chunks: EnvironmentChunk[] = []

  function buildChunks(spec: ChunkSpec, dec: ChunkDecorator): void {
    // 既存チャンクを破棄
    for (const chunk of chunks) {
      scene.remove(chunk.group)
      chunk.dispose()
    }
    chunks = []

    // 新規チャンク生成
    for (let i = 0; i < chunkCount; i++) {
      const chunk = createEnvironmentChunk(spec, dec)
      chunks.push(chunk)
      scene.add(chunk.group)
    }

    // 初期配置を反映（背景は進行方向の逆に配置）
    const depth = spec.depth
    for (let i = 0; i < chunks.length; i++) {
      const offset = -depth + i * depth
      chunks[i].group.position.x = -dir.x * offset
      chunks[i].group.position.z = -dir.z * offset
    }
  }

  // 初期構築
  buildChunks(chunkSpec, decorator)

  // 中央チャンクのインデックス
  const centerIndex = Math.floor(chunkCount / 2)

  return {
    get ground(): THREE.Mesh {
      return chunks[centerIndex].ground
    },
    update(state: ScrollState): void {
      for (let i = 0; i < chunks.length; i++) {
        const offset = state.chunkOffsets[i]
        chunks[i].group.position.x = -dir.x * offset
        chunks[i].group.position.z = -dir.z * offset
      }
      if (state.recycledChunkIndex !== null) {
        chunks[state.recycledChunkIndex].regenerate()
      }
    },
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
    rebuildChunks(spec: ChunkSpec, dec: ChunkDecorator): void {
      buildChunks(spec, dec)
    },
    dispose(): void {
      for (const chunk of chunks) {
        scene.remove(chunk.group)
        chunk.dispose()
      }
    },
  }
}
