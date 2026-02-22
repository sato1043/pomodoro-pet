import * as THREE from 'three'

/**
 * FBXモデルが利用できない場合のプレースホルダーキャラクター。
 * カプセル型の頭+胴体+手足をプリミティブで構成する。
 * 簡易アニメーション（idle: 浮遊、walk: 前後揺れ）をAnimationClipとして提供する。
 */
export function createPlaceholderCharacter(): {
  group: THREE.Group
  animations: Map<string, THREE.AnimationClip>
} {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: 0xff9800, roughness: 0.6 })
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0xe65100, roughness: 0.6 })

  // 胴体
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.6, 8), material)
  body.position.y = 0.7
  body.castShadow = true
  group.add(body)

  // 頭
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), material)
  head.position.y = 1.25
  head.castShadow = true
  group.add(head)

  // 目（左右）
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x212121 })
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat)
  leftEye.position.set(-0.08, 1.3, 0.18)
  group.add(leftEye)
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat)
  rightEye.position.set(0.08, 1.3, 0.18)
  group.add(rightEye)

  // 左腕
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6), darkMaterial)
  leftArm.position.set(-0.35, 0.75, 0)
  leftArm.rotation.z = 0.3
  leftArm.castShadow = true
  leftArm.name = 'leftArm'
  group.add(leftArm)

  // 右腕
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6), darkMaterial)
  rightArm.position.set(0.35, 0.75, 0)
  rightArm.rotation.z = -0.3
  rightArm.castShadow = true
  rightArm.name = 'rightArm'
  group.add(rightArm)

  // 左脚
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 6), darkMaterial)
  leftLeg.position.set(-0.12, 0.2, 0)
  leftLeg.castShadow = true
  leftLeg.name = 'leftLeg'
  group.add(leftLeg)

  // 右脚
  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 6), darkMaterial)
  rightLeg.position.set(0.12, 0.2, 0)
  rightLeg.castShadow = true
  rightLeg.name = 'rightLeg'
  group.add(rightLeg)

  const animations = createPlaceholderAnimations()

  return { group, animations }
}

function createPlaceholderAnimations(): Map<string, THREE.AnimationClip> {
  const clips = new Map<string, THREE.AnimationClip>()

  // idle: 上下にゆっくり浮遊
  clips.set('idle', new THREE.AnimationClip('idle', 2, [
    new THREE.NumberKeyframeTrack(
      '.position[y]',
      [0, 1, 2],
      [0, 0.05, 0]
    )
  ]))

  // walk: 脚を交互に動かす + 上下揺れ
  clips.set('walk', new THREE.AnimationClip('walk', 0.8, [
    new THREE.NumberKeyframeTrack(
      '.position[y]',
      [0, 0.2, 0.4, 0.6, 0.8],
      [0, 0.03, 0, 0.03, 0]
    )
  ]))

  // sit: 少し下がって静止
  clips.set('sit', new THREE.AnimationClip('sit', 2, [
    new THREE.NumberKeyframeTrack(
      '.position[y]',
      [0, 0.5, 2],
      [0, -0.2, -0.2]
    )
  ]))

  // sleep: 下がって微揺れ（呼吸）
  clips.set('sleep', new THREE.AnimationClip('sleep', 3, [
    new THREE.NumberKeyframeTrack(
      '.position[y]',
      [0, 0.3, 1.5, 3],
      [0, -0.25, -0.22, -0.25]
    )
  ]))

  // happy: 上下にジャンプ
  clips.set('happy', new THREE.AnimationClip('happy', 1, [
    new THREE.NumberKeyframeTrack(
      '.position[y]',
      [0, 0.2, 0.5, 0.7, 1],
      [0, 0.2, 0, 0.15, 0]
    )
  ]))

  // wave: 上下にゆっくり（リアクション用）
  clips.set('wave', new THREE.AnimationClip('wave', 1.5, [
    new THREE.NumberKeyframeTrack(
      '.position[y]',
      [0, 0.3, 0.6, 1, 1.5],
      [0, 0.1, 0, 0.08, 0]
    )
  ]))

  // refuse: 左右に激しく首振り（嫌がる表現）
  clips.set('refuse', new THREE.AnimationClip('refuse', 0.8, [
    new THREE.NumberKeyframeTrack(
      '.position[x]',
      [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
      [0, 0.12, -0.12, 0.1, -0.1, 0.06, -0.06, 0.02, 0]
    ),
    new THREE.NumberKeyframeTrack(
      '.position[y]',
      [0, 0.2, 0.4, 0.6, 0.8],
      [0, 0.04, 0, 0.02, 0]
    )
  ]))

  // pet: 左右に小さく揺れる（撫でられて嬉しい表現）
  clips.set('pet', new THREE.AnimationClip('pet', 1.2, [
    new THREE.NumberKeyframeTrack(
      '.position[x]',
      [0, 0.3, 0.6, 0.9, 1.2],
      [0, 0.05, 0, -0.05, 0]
    ),
    new THREE.NumberKeyframeTrack(
      '.position[y]',
      [0, 0.3, 0.6, 0.9, 1.2],
      [0, 0.02, 0, 0.02, 0]
    )
  ]))

  // run: walkより速い上下揺れ（0.6秒周期）
  clips.set('run', new THREE.AnimationClip('run', 0.6, [
    new THREE.NumberKeyframeTrack(
      '.position[y]',
      [0, 0.15, 0.3, 0.45, 0.6],
      [0, 0.05, 0, 0.05, 0]
    )
  ]))

  // attack2: 前方に突進+戻り（0.8秒）
  clips.set('attack2', new THREE.AnimationClip('attack2', 0.8, [
    new THREE.NumberKeyframeTrack(
      '.position[z]',
      [0, 0.25, 0.5, 0.8],
      [0, 0.3, 0.15, 0]
    ),
    new THREE.NumberKeyframeTrack(
      '.position[y]',
      [0, 0.25, 0.5, 0.8],
      [0, 0.05, 0, 0]
    )
  ]))

  // damage1: 横に小さくよろめく（1.0秒）
  clips.set('damage1', new THREE.AnimationClip('damage1', 1.0, [
    new THREE.NumberKeyframeTrack(
      '.position[x]',
      [0, 0.15, 0.35, 0.6, 0.8, 1.0],
      [0, 0.1, -0.08, 0.05, -0.03, 0]
    ),
    new THREE.NumberKeyframeTrack(
      '.position[y]',
      [0, 0.15, 0.35, 0.6, 0.8, 1.0],
      [0, 0.03, 0, 0.02, 0, 0]
    )
  ]))

  // damage2: 後ろに大きくのけぞる（1.5秒）
  clips.set('damage2', new THREE.AnimationClip('damage2', 1.5, [
    new THREE.NumberKeyframeTrack(
      '.position[z]',
      [0, 0.3, 0.6, 1.0, 1.5],
      [0, -0.25, -0.15, -0.05, 0]
    ),
    new THREE.NumberKeyframeTrack(
      '.position[y]',
      [0, 0.3, 0.6, 1.0, 1.5],
      [0, 0.08, 0.04, 0, 0]
    )
  ]))

  // getUp: 下から上に起き上がる（1.0秒）
  clips.set('getUp', new THREE.AnimationClip('getUp', 1.0, [
    new THREE.NumberKeyframeTrack(
      '.position[y]',
      [0, 0.3, 0.6, 0.8, 1.0],
      [-0.2, -0.15, -0.05, 0.03, 0]
    )
  ]))

  return clips
}
