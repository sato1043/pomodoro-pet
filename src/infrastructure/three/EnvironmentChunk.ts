import * as THREE from 'three'
import type { ChunkSpec } from '../../domain/environment/value-objects/SceneConfig'
import type { ChunkDecorator } from './ChunkDecorator'

export interface EnvironmentChunk {
  readonly group: THREE.Group
  readonly ground: THREE.Mesh
  regenerate(): void
  dispose(): void
}

export function createEnvironmentChunk(spec: ChunkSpec, decorator: ChunkDecorator): EnvironmentChunk {
  const group = new THREE.Group()

  const groundGeo = new THREE.PlaneGeometry(spec.width, spec.depth)
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x5d8a3c,
    roughness: 0.9,
  })

  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  group.add(ground)

  decorator.populate(group, spec, ground)

  return {
    group,
    ground,
    regenerate(): void {
      decorator.populate(group, spec, ground)
    },
    dispose(): void {
      groundGeo.dispose()
      groundMat.dispose()
      decorator.dispose()
    },
  }
}
