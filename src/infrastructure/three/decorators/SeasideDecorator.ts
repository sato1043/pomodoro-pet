import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { ChunkSpec } from '../../../domain/environment/value-objects/SceneConfig'
import type { ChunkDecorator } from '../ChunkDecorator'

const SHELL_COUNT = 8
const FOAM_LINE_SEGMENTS = 12
const SHORE_X = 2

/** 砂浜エリア内のランダムX（波打ち際より左） */
function beachX(width: number): number {
  const left = -width / 2
  const right = SHORE_X - 0.5
  return left + Math.random() * (right - left)
}

function randomZ(depth: number): number {
  return (Math.random() - 0.5) * depth
}

/** ジオメトリに位置・回転・スケールを焼き込む */
function bakeTransform(
  geo: THREE.BufferGeometry,
  pos: THREE.Vector3,
  rot: THREE.Euler,
  scale: THREE.Vector3,
): THREE.BufferGeometry {
  const m = new THREE.Matrix4()
  m.compose(pos, new THREE.Quaternion().setFromEuler(rot), scale)
  const cloned = geo.clone()
  cloned.applyMatrix4(m)
  return cloned
}

export function createSeasideDecorator(): ChunkDecorator {
  const disposables: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []

  function placeWater(group: THREE.Group, spec: ChunkSpec): void {
    const waterWidth = spec.width / 2 - SHORE_X
    const waterGeo = new THREE.PlaneGeometry(waterWidth, spec.depth)
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1a7a8a,
      transparent: true,
      opacity: 0.55,
      roughness: 0.15,
      metalness: 0.1,
    })
    disposables.push(waterGeo)
    materials.push(waterMat)

    const water = new THREE.Mesh(waterGeo, waterMat)
    water.rotation.x = -Math.PI / 2
    water.position.set(SHORE_X + waterWidth / 2, 0.015, 0)
    water.receiveShadow = true
    group.add(water)
  }

  function placeShoreFoam(group: THREE.Group, spec: ChunkSpec): void {
    const foamMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      roughness: 0.2,
    })
    materials.push(foamMat)

    const foamParts: THREE.BufferGeometry[] = []
    const segmentDepth = spec.depth / FOAM_LINE_SEGMENTS
    for (let i = 0; i < FOAM_LINE_SEGMENTS; i++) {
      const z = -spec.depth / 2 + segmentDepth * (i + 0.5)
      const jitterX = (Math.random() - 0.5) * 0.4
      const jitterZ = (Math.random() - 0.5) * segmentDepth * 0.3

      const bubbleCount = 3 + Math.floor(Math.random() * 5)
      for (let j = 0; j < bubbleCount; j++) {
        const r = 0.02 + Math.random() * 0.03
        const foamGeo = new THREE.SphereGeometry(r, 5, 4)
        const bx = SHORE_X + jitterX + (Math.random() - 0.5) * 0.6
        const bz = z + jitterZ + (Math.random() - 0.5) * 0.3
        foamGeo.translate(bx, 0.008, bz)
        foamParts.push(foamGeo)
      }
    }

    if (foamParts.length > 0) {
      const merged = mergeGeometries(foamParts)
      if (merged) {
        disposables.push(merged)
        const mesh = new THREE.Mesh(merged, foamMat)
        group.add(mesh)
      }
      for (const g of foamParts) g.dispose()
    }
  }

  function placePalmTree(group: THREE.Group, spec: ChunkSpec): void {
    const tree = new THREE.Group()

    // --- 幹 — 放物線カーブで海側に曲がる（マージ） ---
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.95 })
    materials.push(trunkMat)

    const segments = 7
    const segH = 0.6
    const totalH = segments * segH
    let prevX = 0
    let prevY = 0

    const trunkParts: THREE.BufferGeometry[] = []
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments
      const t1 = (i + 1) / segments
      const bend = 0.7
      const x0 = bend * t0 * t0
      const y0 = totalH * t0
      const x1 = bend * t1 * t1
      const y1 = totalH * t1
      const cx = (x0 + x1) / 2
      const cy = (y0 + y1) / 2
      const dx = x1 - x0
      const dy = y1 - y0
      const angle = Math.atan2(dx, dy)

      const rBot = 0.09 - t0 * 0.05
      const rTop = 0.09 - t1 * 0.05
      const len = Math.sqrt(dx * dx + dy * dy)
      const segGeo = new THREE.CylinderGeometry(Math.max(rTop, 0.035), Math.max(rBot, 0.04), len, 6)
      const baked = bakeTransform(
        segGeo,
        new THREE.Vector3(cx, cy, 0),
        new THREE.Euler(0, 0, -angle),
        new THREE.Vector3(1, 1, 1),
      )
      trunkParts.push(baked)
      segGeo.dispose()
      prevX = x1
      prevY = y1
    }

    const trunkMerged = mergeGeometries(trunkParts)
    if (trunkMerged) {
      disposables.push(trunkMerged)
      const trunkMesh = new THREE.Mesh(trunkMerged, trunkMat)
      trunkMesh.castShadow = true
      tree.add(trunkMesh)
    }
    for (const g of trunkParts) g.dispose()

    // --- 葉 — 放射状に広がるフロンド（フロンド毎にマージ） ---
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x3aad4a,
      roughness: 0.7,
      side: THREE.DoubleSide,
    })
    materials.push(leafMat)
    const midribMat = new THREE.LineBasicMaterial({ color: 0x0d5518 })
    materials.push(midribMat)

    const frondCount = 4 + Math.floor(Math.random() * 2)
    const crownX = prevX
    const crownY = prevY + 0.05
    const pinnaCount = 15

    for (let i = 0; i < frondCount; i++) {
      const sector = (Math.PI * 2) / frondCount
      const angle = sector * i + (Math.random() - 0.5) * sector * 0.6
      const frondLen = 1.8 + Math.random() * 0.5
      const droop = 0.25 + Math.random() * 0.15

      const frondGroup = new THREE.Group()
      frondGroup.position.set(crownX, crownY, 0)
      frondGroup.rotation.set(-Math.PI / 2 - droop, 0, angle)

      // 中心線（葉脈）
      const midribPts = 12
      const midribVerts: number[] = []
      for (let m = 0; m <= midribPts; m++) {
        const my = (frondLen / midribPts) * m
        const tipRatio = my / frondLen
        const mz = -(tipRatio * tipRatio) * frondLen * 0.35
        midribVerts.push(0, my, mz)
      }
      const midribGeo = new THREE.BufferGeometry()
      midribGeo.setAttribute('position', new THREE.Float32BufferAttribute(midribVerts, 3))
      disposables.push(midribGeo)
      frondGroup.add(new THREE.Line(midribGeo, midribMat))

      // 葉片（ピンナ）— 全てマージして1 Meshにする
      const pinnaParts: THREE.BufferGeometry[] = []
      for (let p = 0; p < pinnaCount; p++) {
        const py = (frondLen / (pinnaCount + 1)) * (p + 1)
        const t = Math.abs(py - frondLen / 2) / (frondLen / 2)
        const pinnaLen = 0.25 * (1 - t * t) + 0.05
        const pinnaW = 0.11

        for (const side of [-1, 1]) {
          const pinnaGeo = new THREE.PlaneGeometry(pinnaLen, pinnaW, 4, 1)
          const pp = pinnaGeo.attributes.position
          for (let vi = 0; vi < pp.count; vi++) {
            const px = pp.getX(vi)
            const tx = Math.abs(px) / (pinnaLen / 2)
            pp.setY(vi, pp.getY(vi) * (1 - tx * tx))
          }
          pp.needsUpdate = true

          const tipRatio = py / frondLen
          const midribZ = -(tipRatio * tipRatio) * frondLen * 0.35
          const pinnaDroop = tipRatio * tipRatio * 0.6
          const baked = bakeTransform(
            pinnaGeo,
            new THREE.Vector3(side * pinnaLen * 0.5, py, midribZ),
            new THREE.Euler(pinnaDroop, 0, side * 0.3),
            new THREE.Vector3(1, 1, 1),
          )
          pinnaParts.push(baked)
          pinnaGeo.dispose()
        }
      }

      if (pinnaParts.length > 0) {
        const pinnaMerged = mergeGeometries(pinnaParts)
        if (pinnaMerged) {
          disposables.push(pinnaMerged)
          const pinnaMesh = new THREE.Mesh(pinnaMerged, leafMat)
          pinnaMesh.castShadow = true
          frondGroup.add(pinnaMesh)
        }
        for (const g of pinnaParts) g.dispose()
      }

      tree.add(frondGroup)
    }

    const x = -3.5 + Math.random() * 1.5
    tree.position.set(x, 0, randomZ(spec.depth) * 0.6)
    group.add(tree)
  }

  function placeShells(group: THREE.Group, spec: ChunkSpec): void {
    const colors = [0xfff8e1, 0xffe0b2, 0xf5e6cc, 0xe8d5b7]

    for (let i = 0; i < SHELL_COUNT; i++) {
      const shellGeo = new THREE.SphereGeometry(0.04, 6, 4)
      const shellMat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.6,
      })
      disposables.push(shellGeo)
      materials.push(shellMat)

      const shell = new THREE.Mesh(shellGeo, shellMat)
      const s = 0.5 + Math.random() * 1.0
      shell.scale.set(s, s * 0.4, s)
      shell.position.set(beachX(spec.width), 0.01, randomZ(spec.depth))
      shell.rotation.y = Math.random() * Math.PI * 2
      group.add(shell)
    }
  }

  return {
    populate(group: THREE.Group, spec: ChunkSpec, ground: THREE.Mesh): void {
      const children = [...group.children]
      for (const child of children) {
        if (child === ground) continue
        group.remove(child)
      }
      placeWater(group, spec)
      placeShoreFoam(group, spec)
      placePalmTree(group, spec)
      placeShells(group, spec)
    },
    dispose(): void {
      for (const g of disposables) g.dispose()
      for (const m of materials) m.dispose()
    },
  }
}
