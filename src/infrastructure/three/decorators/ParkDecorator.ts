import * as THREE from 'three'
import type { ChunkSpec } from '../../../domain/environment/value-objects/SceneConfig'
import type { ChunkDecorator } from '../ChunkDecorator'

const CENTER_EXCLUSION = 3
const BENCH_COUNT = 1
const LAMP_INTERVAL = 4

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

      // 歩道脇に配置（±1.5〜±2.5）、歩道に向けて回転
      const side = i % 2 === 0 ? -1 : 1
      const bx = side * (1.5 + Math.random() * 1.0)
      bench.position.set(bx, 0, randomZ(spec.depth))
      bench.rotation.y = side > 0 ? Math.PI : 0
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

    const poleH = 2.4
    const poleGeo = new THREE.CylinderGeometry(0.02, 0.03, poleH, 6)
    const headGeo = new THREE.SphereGeometry(0.08, 8, 6)
    disposables.push(poleGeo, headGeo)

    // 歩道脇に等間隔配置（左右交互）
    const walkwayEdge = 1.1
    const lampCount = Math.floor(spec.depth / LAMP_INTERVAL)
    for (let i = 0; i < lampCount; i++) {
      const lamp = new THREE.Group()

      const pole = new THREE.Mesh(poleGeo, poleMat)
      pole.position.y = poleH / 2
      pole.castShadow = true
      lamp.add(pole)

      const head = new THREE.Mesh(headGeo, lightMat)
      head.position.y = poleH + 0.05
      lamp.add(head)

      const side = i % 2 === 0 ? -1 : 1
      const z = -spec.depth / 2 + LAMP_INTERVAL * (i + 0.5)
      lamp.position.set(side * walkwayEdge, 0, z)
      group.add(lamp)
    }
  }

  function placeBordersAlongWalkway(group: THREE.Group, spec: ChunkSpec): void {
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x3a7d28, roughness: 0.85 })
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x388e3c })
    const flowerColors = [0xff4081, 0xffeb3b, 0xba68c8, 0xff7043, 0x42a5f5]
    materials.push(bushMat, stemMat)

    const walkwayHalf = 0.75
    const borderOffset = walkwayHalf + 0.4
    const interval = 2.0
    const slotCount = Math.floor(spec.depth / interval)

    for (let i = 0; i < slotCount; i++) {
      const z = -spec.depth / 2 + interval * (i + 0.5) + (Math.random() - 0.5) * 0.3
      const side = i % 2 === 0 ? -1 : 1
      const x = side * borderOffset + (Math.random() - 0.5) * 0.2

      if (i % 3 === 0) {
        // 花壇
        const bed = new THREE.Group()
        const flowerCount = 4 + Math.floor(Math.random() * 4)
        for (let j = 0; j < flowerCount; j++) {
          const flower = new THREE.Group()

          const stemGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.15, 4)
          disposables.push(stemGeo)
          const stem = new THREE.Mesh(stemGeo, stemMat)
          stem.position.y = 0.075
          flower.add(stem)

          const petalGeo = new THREE.SphereGeometry(0.04, 6, 6)
          const petalMat = new THREE.MeshStandardMaterial({
            color: flowerColors[j % flowerColors.length],
          })
          disposables.push(petalGeo)
          materials.push(petalMat)
          const petal = new THREE.Mesh(petalGeo, petalMat)
          petal.position.y = 0.17
          flower.add(petal)

          flower.position.set(
            (Math.random() - 0.5) * 0.6,
            0,
            (Math.random() - 0.5) * 0.4,
          )
          flower.scale.setScalar(0.6 + Math.random() * 0.6)
          bed.add(flower)
        }
        bed.position.set(x, 0, z)
        group.add(bed)
      } else {
        // 植え込み
        const bush = new THREE.Group()
        const clusterCount = 2 + Math.floor(Math.random() * 2)
        for (let j = 0; j < clusterCount; j++) {
          const r = 0.1 + Math.random() * 0.08
          const bushGeo = new THREE.SphereGeometry(r, 7, 6)
          disposables.push(bushGeo)
          const sphere = new THREE.Mesh(bushGeo, bushMat)
          sphere.position.set(
            (Math.random() - 0.5) * 0.15,
            r * 0.8,
            (Math.random() - 0.5) * 0.15,
          )
          sphere.castShadow = true
          bush.add(sphere)
        }
        bush.position.set(x, 0, z)
        group.add(bush)
      }
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
      // 歩道脇に配置（±1.5〜±3.0）
      const side = i % 2 === 0 ? -1 : 1
      const x = side * (1.5 + Math.random() * 1.5)
      tree.position.set(x, 0, randomZ(spec.depth))
      tree.rotation.y = Math.random() * Math.PI * 2
      group.add(tree)
    }
  }

  function placeWalkway(group: THREE.Group, spec: ChunkSpec): void {
    const walkwayWidth = 1.5
    const walkwayGeo = new THREE.PlaneGeometry(walkwayWidth, spec.depth)
    const walkwayMat = new THREE.MeshStandardMaterial({
      color: 0xbbaa99,
      roughness: 0.85,
    })
    disposables.push(walkwayGeo)
    materials.push(walkwayMat)

    const walkway = new THREE.Mesh(walkwayGeo, walkwayMat)
    walkway.rotation.x = -Math.PI / 2
    walkway.position.set(0, 0.01, 0)
    walkway.receiveShadow = true
    group.add(walkway)
  }

  return {
    populate(group: THREE.Group, spec: ChunkSpec, ground: THREE.Mesh): void {
      const children = [...group.children]
      for (const child of children) {
        if (child === ground) continue
        group.remove(child)
      }
      placeWalkway(group, spec)
      placeTrees(group, spec)
      placeBordersAlongWalkway(group, spec)
      placeBenches(group, spec)
      placeLamps(group, spec)
    },
    dispose(): void {
      for (const g of disposables) g.dispose()
      for (const m of materials) m.dispose()
    },
  }
}
