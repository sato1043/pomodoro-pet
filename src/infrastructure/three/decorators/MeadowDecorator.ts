import * as THREE from 'three'
import type { ChunkSpec } from '../../../domain/environment/value-objects/SceneConfig'
import type { ChunkDecorator } from '../ChunkDecorator'

const CENTER_EXCLUSION = 3

function randomX(width: number): number {
  const halfW = width / 2
  if (Math.random() < 0.5) {
    return -(CENTER_EXCLUSION + Math.random() * (halfW - CENTER_EXCLUSION))
  }
  return CENTER_EXCLUSION + Math.random() * (halfW - CENTER_EXCLUSION)
}

function randomZ(depth: number): number {
  return (Math.random() - 0.5) * depth
}

export function createMeadowDecorator(): ChunkDecorator {
  const disposables: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []

  function placeTrees(group: THREE.Group, spec: ChunkSpec): void {
    for (let i = 0; i < spec.treeCount; i++) {
      const tree = new THREE.Group()

      const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.6, 6)
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.9 })
      disposables.push(trunkGeo)
      materials.push(trunkMat)
      const trunk = new THREE.Mesh(trunkGeo, trunkMat)
      trunk.position.y = 0.3
      trunk.castShadow = true
      tree.add(trunk)

      const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8 })
      materials.push(leafMat)

      const sizes = [
        { r: 0.5, h: 0.6, y: 0.8 },
        { r: 0.4, h: 0.5, y: 1.2 },
        { r: 0.28, h: 0.4, y: 1.5 },
      ]

      for (const { r, h, y } of sizes) {
        const leafGeo = new THREE.ConeGeometry(r, h, 7)
        disposables.push(leafGeo)
        const leaf = new THREE.Mesh(leafGeo, leafMat)
        leaf.position.y = y
        leaf.castShadow = true
        tree.add(leaf)
      }

      const scale = 0.8 + Math.random() * 0.6
      tree.scale.setScalar(scale)
      tree.position.set(randomX(spec.width), 0, randomZ(spec.depth))
      tree.rotation.y = Math.random() * Math.PI * 2
      group.add(tree)
    }
  }

  function placeGrass(group: THREE.Group, spec: ChunkSpec): void {
    const grassGeo = new THREE.ConeGeometry(0.03, 0.15, 4)
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x4caf50,
      roughness: 0.9,
    })
    disposables.push(grassGeo)
    materials.push(grassMat)

    const mesh = new THREE.InstancedMesh(grassGeo, grassMat, spec.grassCount)
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const rotation = new THREE.Euler()
    const scaleVec = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()

    for (let i = 0; i < spec.grassCount; i++) {
      position.set(
        (Math.random() - 0.5) * spec.width,
        0.07,
        randomZ(spec.depth),
      )
      rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.3)
      quaternion.setFromEuler(rotation)
      const s = 0.5 + Math.random() * 1.0
      scaleVec.set(s, s, s)
      matrix.compose(position, quaternion, scaleVec)
      mesh.setMatrixAt(i, matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
    group.add(mesh)
  }

  function placeRocks(group: THREE.Group, spec: ChunkSpec): void {
    const rockGeo = new THREE.DodecahedronGeometry(0.2, 0)
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x9e9e9e,
      roughness: 0.95,
    })
    disposables.push(rockGeo)
    materials.push(rockMat)

    for (let i = 0; i < spec.rockCount; i++) {
      const rock = new THREE.Mesh(rockGeo, rockMat)
      const s = 0.5 + Math.random() * 1.5
      rock.scale.set(s, s * 0.6, s)
      rock.position.set(randomX(spec.width), 0.05 * s, randomZ(spec.depth))
      rock.rotation.y = Math.random() * Math.PI * 2
      rock.castShadow = true
      rock.receiveShadow = true
      group.add(rock)
    }
  }

  function placeFlowers(group: THREE.Group, spec: ChunkSpec): void {
    const colors = [0xff4081, 0xffeb3b, 0xba68c8, 0xff7043]

    for (let i = 0; i < spec.flowerCount; i++) {
      const flower = new THREE.Group()

      const stemGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4)
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x388e3c })
      disposables.push(stemGeo)
      materials.push(stemMat)
      const stem = new THREE.Mesh(stemGeo, stemMat)
      stem.position.y = 0.1
      flower.add(stem)

      const petalGeo = new THREE.SphereGeometry(0.05, 6, 6)
      const petalMat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
      })
      disposables.push(petalGeo)
      materials.push(petalMat)
      const petal = new THREE.Mesh(petalGeo, petalMat)
      petal.position.y = 0.22
      flower.add(petal)

      flower.position.set(randomX(spec.width), 0, randomZ(spec.depth))
      flower.scale.setScalar(0.5 + Math.random() * 0.8)
      group.add(flower)
    }
  }

  return {
    populate(group: THREE.Group, spec: ChunkSpec, ground: THREE.Mesh): void {
      // ground以外の子を全て削除してから再配置
      const children = [...group.children]
      for (const child of children) {
        if (child === ground) continue
        group.remove(child)
      }
      placeTrees(group, spec)
      placeGrass(group, spec)
      placeRocks(group, spec)
      placeFlowers(group, spec)
    },
    dispose(): void {
      for (const g of disposables) g.dispose()
      for (const m of materials) m.dispose()
    },
  }
}
