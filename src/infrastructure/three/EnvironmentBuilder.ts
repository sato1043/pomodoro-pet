import * as THREE from 'three'

export interface EnvironmentHandle {
  readonly ground: THREE.Mesh
  dispose: () => void
}

export function buildEnvironment(scene: THREE.Scene): EnvironmentHandle {
  const disposables: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []

  // 空のグラデーション
  scene.background = new THREE.Color(0x87ceeb)
  scene.fog = new THREE.Fog(0xc8e6f0, 15, 35)

  // 地面
  const ground = createGround(scene, disposables, materials)

  // 木を配置
  placeTrees(scene, disposables, materials)

  // 草を配置
  placeGrass(scene, disposables, materials)

  // 岩を配置
  placeRocks(scene, disposables, materials)

  // 花を配置
  placeFlowers(scene, disposables, materials)

  return {
    ground,
    dispose() {
      for (const g of disposables) g.dispose()
      for (const m of materials) m.dispose()
    }
  }
}

function createGround(
  scene: THREE.Scene,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(40, 40)
  const mat = new THREE.MeshStandardMaterial({
    color: 0x5d8a3c,
    roughness: 0.9
  })
  geometries.push(geo)
  materials.push(mat)

  const ground = new THREE.Mesh(geo, mat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  return ground
}

function createTree(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): THREE.Group {
  const tree = new THREE.Group()

  // 幹
  const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.6, 6)
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.9 })
  geometries.push(trunkGeo)
  materials.push(trunkMat)
  const trunk = new THREE.Mesh(trunkGeo, trunkMat)
  trunk.position.y = 0.3
  trunk.castShadow = true
  tree.add(trunk)

  // 葉（3段のコーン）
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8 })
  materials.push(leafMat)

  const sizes = [
    { r: 0.5, h: 0.6, y: 0.8 },
    { r: 0.4, h: 0.5, y: 1.2 },
    { r: 0.28, h: 0.4, y: 1.5 }
  ]

  for (const { r, h, y } of sizes) {
    const leafGeo = new THREE.ConeGeometry(r, h, 7)
    geometries.push(leafGeo)
    const leaf = new THREE.Mesh(leafGeo, leafMat)
    leaf.position.y = y
    leaf.castShadow = true
    tree.add(leaf)
  }

  return tree
}

function placeTrees(
  scene: THREE.Scene,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  // キャラクター活動エリア（中央付近）を避けて配置
  const positions = [
    { x: -6, z: -4 }, { x: -5, z: 3 }, { x: -7, z: -1 },
    { x: 5, z: -5 }, { x: 7, z: 2 }, { x: 6, z: -2 },
    { x: -3, z: -7 }, { x: 3, z: -6 }, { x: 0, z: -8 },
    { x: -8, z: 5 }, { x: 8, z: -7 }, { x: 4, z: 7 }
  ]

  for (const pos of positions) {
    const tree = createTree(geometries, materials)
    const scale = 0.8 + Math.random() * 0.6
    tree.scale.setScalar(scale)
    tree.position.set(pos.x, 0, pos.z)
    tree.rotation.y = Math.random() * Math.PI * 2
    scene.add(tree)
  }
}

function placeGrass(
  scene: THREE.Scene,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const count = 300
  const grassGeo = new THREE.ConeGeometry(0.03, 0.15, 4)
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x4caf50,
    roughness: 0.9
  })
  geometries.push(grassGeo)
  materials.push(grassMat)

  const mesh = new THREE.InstancedMesh(grassGeo, grassMat, count)
  const matrix = new THREE.Matrix4()
  const position = new THREE.Vector3()
  const rotation = new THREE.Euler()
  const scale = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()

  for (let i = 0; i < count; i++) {
    position.set(
      (Math.random() - 0.5) * 18,
      0.07,
      (Math.random() - 0.5) * 18
    )
    rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.3)
    quaternion.setFromEuler(rotation)
    const s = 0.5 + Math.random() * 1.0
    scale.set(s, s, s)
    matrix.compose(position, quaternion, scale)
    mesh.setMatrixAt(i, matrix)
  }

  mesh.instanceMatrix.needsUpdate = true
  scene.add(mesh)
}

function placeRocks(
  scene: THREE.Scene,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const rockGeo = new THREE.DodecahedronGeometry(0.2, 0)
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x9e9e9e,
    roughness: 0.95
  })
  geometries.push(rockGeo)
  materials.push(rockMat)

  const positions = [
    { x: -2, z: -3 }, { x: 3, z: 4 }, { x: -4, z: 5 },
    { x: 7, z: -3 }, { x: -6, z: -6 }
  ]

  for (const pos of positions) {
    const rock = new THREE.Mesh(rockGeo, rockMat)
    const s = 0.5 + Math.random() * 1.5
    rock.scale.set(s, s * 0.6, s)
    rock.position.set(pos.x, 0.05 * s, pos.z)
    rock.rotation.y = Math.random() * Math.PI * 2
    rock.castShadow = true
    rock.receiveShadow = true
    scene.add(rock)
  }
}

function placeFlowers(
  scene: THREE.Scene,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const colors = [0xff4081, 0xffeb3b, 0xba68c8, 0xff7043]

  for (let i = 0; i < 20; i++) {
    const flower = new THREE.Group()

    // 茎
    const stemGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4)
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x388e3c })
    geometries.push(stemGeo)
    materials.push(stemMat)
    const stem = new THREE.Mesh(stemGeo, stemMat)
    stem.position.y = 0.1
    flower.add(stem)

    // 花弁
    const petalGeo = new THREE.SphereGeometry(0.05, 6, 6)
    const petalMat = new THREE.MeshStandardMaterial({
      color: colors[i % colors.length]
    })
    geometries.push(petalGeo)
    materials.push(petalMat)
    const petal = new THREE.Mesh(petalGeo, petalMat)
    petal.position.y = 0.22
    flower.add(petal)

    flower.position.set(
      (Math.random() - 0.5) * 16,
      0,
      (Math.random() - 0.5) * 16
    )
    flower.scale.setScalar(0.5 + Math.random() * 0.8)
    scene.add(flower)
  }
}
