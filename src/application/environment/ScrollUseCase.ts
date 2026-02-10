import type { SceneConfig } from '../../domain/environment/value-objects/SceneConfig'
import type { ChunkSpec } from '../../domain/environment/value-objects/SceneConfig'

export interface ScrollState {
  readonly chunkOffsets: number[]
  readonly recycledChunkIndex: number | null
}

export interface ScrollManager {
  readonly state: ScrollState
  tick(deltaMs: number, isScrolling: boolean): ScrollState
  reset(): void
}

function createInitialOffsets(chunkCount: number, depth: number): number[] {
  const offsets: number[] = []
  const startOffset = -depth
  for (let i = 0; i < chunkCount; i++) {
    offsets.push(startOffset + i * depth)
  }
  return offsets
}

export function createScrollManager(
  config: SceneConfig,
  chunkSpec: ChunkSpec,
  chunkCount: number
): ScrollManager {
  const depth = chunkSpec.depth
  const recycleThreshold = (chunkCount - 1) * depth // 全チャンクが初期配置に収まる閾値

  let chunkOffsets = createInitialOffsets(chunkCount, depth)
  let recycledChunkIndex: number | null = null

  function reset(): void {
    chunkOffsets = createInitialOffsets(chunkCount, depth)
    recycledChunkIndex = null
  }

  function tick(deltaMs: number, isScrolling: boolean): ScrollState {
    recycledChunkIndex = null

    if (!isScrolling) {
      return { chunkOffsets: [...chunkOffsets], recycledChunkIndex }
    }

    const dt = deltaMs / 1000
    const scrollAmount = config.scrollSpeed * dt

    for (let i = 0; i < chunkOffsets.length; i++) {
      chunkOffsets[i] += scrollAmount
    }

    // リサイクル判定: recycleThresholdを超えたチャンクを最後尾に再配置
    for (let i = 0; i < chunkOffsets.length; i++) {
      if (chunkOffsets[i] > recycleThreshold) {
        const minOffset = Math.min(...chunkOffsets)
        chunkOffsets[i] = minOffset - depth
        recycledChunkIndex = i
        break // 1tick1リサイクルまで
      }
    }

    return { chunkOffsets: [...chunkOffsets], recycledChunkIndex }
  }

  return {
    get state(): ScrollState {
      return { chunkOffsets: [...chunkOffsets], recycledChunkIndex }
    },
    tick,
    reset
  }
}
