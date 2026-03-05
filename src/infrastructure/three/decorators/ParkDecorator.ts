import * as THREE from 'three'
import type { ChunkSpec } from '../../../domain/environment/value-objects/SceneConfig'
import type { ChunkDecorator } from '../ChunkDecorator'

const CENTER_EXCLUSION = 3
const BENCH_COUNT = 1
const LAMP_COUNT = 1
const BUSH_COUNT = 4
const FLOWER_BED_COUNT = 2

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

export function createParkDecorator(): ChunkDecorator {
  const disposables: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []

  function placeBenches(group: THREE.Group, spec: ChunkSpec): void {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6d4c2e, roughness: 0.85 })
    const legMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7 })
    materials.push(woodMat, legMat)

    for (let i = 0; i < BENCH_COUNT; i++) {
      const bench = new THREE.Group()

      // 座面
      const seatGeo = new THREE.BoxGeometry(0.8, 0.04, 0.3)
      disposables.push(seatGeo)
      const seat = new THREE.Mesh(seatGeo, woodMat)
      seat.position.y = 0.25
      seat.castShadow = true
      bench.add(seat)

      // 背もたれ
      const backGeo = new THREE.BoxGeometry(0.8, 0.3, 0.04)
      disposables.push(backGeo)
      const back = new THREE.Mesh(backGeo, woodMat)
      back.position.set(0, 0.4, -0.13)
      back.castShadow = true
      bench.add(back)

      // 脚（4本）
      const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 4)
      disposables.push(legGeo)
      const legPositions = [
        { x: -0.3, z: 0.1 },
        { x: 0.3, z: 0.1 },
        { x: -0.3, z: -0.1 },
        { x: 0.3, z: -0.1 },
      ]
      for (const pos of legPositions) {
        const leg = new THREE.Mesh(legGeo, legMat)
        leg.position.set(pos.x, 0.125, pos.z)
        bench.add(leg)
      }

      bench.position.set(randomX(spec.width), 0, randomZ(spec.depth))
      bench.rotation.y = Math.random() * Math.PI * 2
      group.add(bench)
    }
  }

  function placeLamps(group: THREE.Group, spec: ChunkSpec): void {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 })
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xfff9c4,
      emissive: 0xfff176,
      emissiveIntensity: 0.3,
      roughness: 0.3,
    })
    materials.push(poleMat, lightMat)

    for (let i = 0; i < LAMP_COUNT; i++) {
      const lamp = new THREE.Group()

      // ポール
      const poleGeo = new THREE.CylinderGeometry(0.02, 0.03, 1.2, 6)
      disposables.push(poleGeo)
      const pole = new THREE.Mesh(poleGeo, poleMat)
      pole.position.y = 0.6
      pole.castShadow = true
      lamp.add(pole)

      // ランプヘッド
      const headGeo = new THREE.SphereGeometry(0.08, 8, 6)
      disposables.push(headGeo)
      const head = new THREE.Mesh(headGeo, lightMat)
      head.position.y = 1.25
      lamp.add(head)

      lamp.position.set(randomX(spec.width), 0, randomZ(spec.depth))
      group.add(lamp)
    }
  }

  function placeBushes(group: THREE.Group, spec: ChunkSpec): void {
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x3a7d28, roughness: 0.85 })
    materials.push(bushMat)

    for (let i = 0; i < BUSH_COUNT; i++) {
      const bush = new THREE.Group()
      const clusterCount = 2 + Math.floor(Math.random() * 3)

      for (let j = 0; j < clusterCount; j++) {
        const r = 0.12 + Math.random() * 0.1
        const bushGeo = new THREE.SphereGeometry(r, 7, 6)
        disposables.push(bushGeo)
        const sphere = new THREE.Mesh(bushGeo, bushMat)
        sphere.position.set(
          (Math.random() - 0.5) * 0.2,
          r * 0.8,
          (Math.random() - 0.5) * 0.2,
        )
        sphere.castShadow = true
        bush.add(sphere)
      }

      bush.position.set(randomX(spec.width), 0, randomZ(spec.depth))
      group.add(bush)
    }
  }

  function placeFlowerBeds(group: THREE.Group, spec: ChunkSpec): void {
    const colors = [0xff4081, 0xffeb3b, 0xba68c8, 0xff7043, 0x42a5f5]
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x388e3c })
    materials.push(stemMat)

    for (let i = 0; i < FLOWER_BED_COUNT; i++) {
      const bed = new THREE.Group()
      const flowerCount = 6 + Math.floor(Math.random() * 5)

      for (let j = 0; j < flowerCount; j++) {
        const flower = new THREE.Group()

        const stemGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.15, 4)
        disposables.push(stemGeo)
        const stem = new THREE.Mesh(stemGeo, stemMat)
        stem.position.y = 0.075
        flower.add(stem)

        const petalGeo = new THREE.SphereGeometry(0.04, 6, 6)
        const petalMat = new THREE.MeshStandardMaterial({
          color: colors[j % colors.length],
        })
        disposables.push(petalGeo)
        materials.push(petalMat)
        const petal = new THREE.Mesh(petalGeo, petalMat)
        petal.position.y = 0.17
        flower.add(petal)

        flower.position.set(
          (Math.random() - 0.5) * 0.8,
          0,
          (Math.random() - 0.5) * 0.5,
        )
        flower.scale.setScalar(0.6 + Math.random() * 0.6)
        bed.add(flower)
      }

      bed.position.set(randomX(spec.width), 0, randomZ(spec.depth))
      group.add(bed)
    }
  }

  function placeTrees(group: THREE.Group, spec: ChunkSpec): void {
    // 丸い樹冠の広葉樹（草原の針葉樹とは異なる形状）
    for (let i = 0; i < spec.treeCount; i++) {
      const tree = new THREE.Group()

      const trunkGeo = new THREE.CylinderGeometry(0.06, 0.1, 0.8, 6)
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.9 })
      disposables.push(trunkGeo)
      materials.push(trunkMat)
      const trunk = new THREE.Mesh(trunkGeo, trunkMat)
      trunk.position.y = 0.4
      trunk.castShadow = true
      tree.add(trunk)

      const crownGeo = new THREE.SphereGeometry(0.5, 8, 7)
      const crownMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.8 })
      disposables.push(crownGeo)
      materials.push(crownMat)
      const crown = new THREE.Mesh(crownGeo, crownMat)
      crown.position.y = 1.1
      crown.castShadow = true
      tree.add(crown)

      const scale = 0.8 + Math.random() * 0.5
      tree.scale.setScalar(scale)
      tree.position.set(randomX(spec.width), 0, randomZ(spec.depth))
      tree.rotation.y = Math.random() * Math.PI * 2
      group.add(tree)
    }
  }

  function placeGrass(group: THREE.Group, spec: ChunkSpec): void {
    if (spec.grassCount <= 0) return

    const grassGeo = new THREE.ConeGeometry(0.03, 0.12, 4)
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x66bb6a,
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
        0.06,
        randomZ(spec.depth),
      )
      rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.2)
      quaternion.setFromEuler(rotation)
      const s = 0.4 + Math.random() * 0.8
      scaleVec.set(s, s, s)
      matrix.compose(position, quaternion, scaleVec)
      mesh.setMatrixAt(i, matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
    group.add(mesh)
  }

  return {
    populate(group: THREE.Group, spec: ChunkSpec, ground: THREE.Mesh): void {
      const children = [...group.children]
      for (const child of children) {
        if (child === ground) continue
        group.remove(child)
      }
      placeTrees(group, spec)
      placeGrass(group, spec)
      placeBushes(group, spec)
      placeFlowerBeds(group, spec)
      placeBenches(group, spec)
      placeLamps(group, spec)
    },
    dispose(): void {
      for (const g of disposables) g.dispose()
      for (const m of materials) m.dispose()
    },
  }
}
