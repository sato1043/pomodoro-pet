import * as THREE from 'three'
import type { Character } from '../../domain/character/entities/Character'
import type { CharacterStateName } from '../../domain/character/value-objects/CharacterState'
import { STATE_CONFIGS } from '../../domain/character/value-objects/CharacterState'
import type { AnimationSelection } from '../../domain/character/services/AnimationResolver'
import { createAnimationController, type AnimationController } from '../../infrastructure/three/AnimationController'
import { loadFBXModel, loadFBXAnimation } from '../../infrastructure/three/FBXModelLoader'
import { createPlaceholderCharacter } from '../../infrastructure/three/PlaceholderCharacter'

export interface ThreeCharacterHandle {
  readonly object3D: THREE.Group
  readonly animationController: AnimationController
  playState(state: CharacterStateName): void
  playAnimation(selection: AnimationSelection): void
  update(deltaTime: number): void
  setPosition(x: number, y: number, z: number): void
}

/**
 * FBXモデルの読み込みを試み、失敗時はプレースホルダーを使用する。
 */
export interface FBXCharacterConfig {
  readonly modelPath: string
  readonly resourcePath: string
  readonly animationPaths: Record<string, string>
  readonly scale: number
  readonly diffuseTexturePath?: string
}

export async function createThreeCharacter(
  scene: THREE.Scene,
  character: Character,
  fbxConfig?: FBXCharacterConfig
): Promise<ThreeCharacterHandle> {
  let group: THREE.Group
  let mixer: THREE.AnimationMixer
  let animCtrl: AnimationController

  if (fbxConfig) {
    try {
      const model = await loadFBXModel(fbxConfig.modelPath, fbxConfig.resourcePath)
      group = model.group
      group.scale.setScalar(fbxConfig.scale)
      mixer = new THREE.AnimationMixer(group)
      animCtrl = createAnimationController(mixer)

      // モデル付属アニメーション
      for (const clip of model.animations) {
        animCtrl.addClip(clip.name, clip)
      }

      // 追加アニメーションファイルの読み込み
      for (const [name, path] of Object.entries(fbxConfig.animationPaths)) {
        try {
          const clips = await loadFBXAnimation(path)
          if (clips.length > 0) {
            animCtrl.addClip(name, clips[0])
          }
        } catch {
          console.warn(`Animation "${name}" の読み込みに失敗: ${path}`)
        }
      }
      // テクスチャ上書き（FBXがPSD参照の場合にPNGで差し替え）
      if (fbxConfig.diffuseTexturePath) {
        const texture = new THREE.TextureLoader().load(fbxConfig.diffuseTexturePath)
        texture.colorSpace = THREE.SRGBColorSpace
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            for (const mat of materials) {
              if (mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshStandardMaterial) {
                mat.map = texture
                mat.color.set(0xffffff)
                mat.emissive?.set(0x000000)
                mat.needsUpdate = true
              }
            }
          }
        })
      }
    } catch (e) {
      console.warn('FBXモデルの読み込みに失敗。プレースホルダーを使用する', e)
      return buildPlaceholder(scene, character)
    }
  } else {
    return buildPlaceholder(scene, character)
  }

  scene.add(group)
  const pos = character.position
  group.position.set(pos.x, pos.y, pos.z)

  // idleをデフォルト再生
  animCtrl.play('idle', true)

  return {
    object3D: group,
    animationController: animCtrl,

    playState(state: CharacterStateName): void {
      const config = STATE_CONFIGS[state]
      animCtrl.play(config.animationClip, config.loop)
    },

    playAnimation(selection: AnimationSelection): void {
      animCtrl.play(selection.clipName, selection.loop, selection.speed)
    },

    update(deltaTime: number): void {
      animCtrl.update(deltaTime)
    },

    setPosition(x: number, y: number, z: number): void {
      group.position.set(x, y, z)
    }
  }
}

function buildPlaceholder(
  scene: THREE.Scene,
  character: Character
): ThreeCharacterHandle {
  const { group, animations } = createPlaceholderCharacter()
  const mixer = new THREE.AnimationMixer(group)
  const animCtrl = createAnimationController(mixer)

  for (const [name, clip] of animations) {
    animCtrl.addClip(name, clip)
  }

  scene.add(group)
  const pos = character.position
  group.position.set(pos.x, pos.y, pos.z)

  animCtrl.play('idle', true)

  return {
    object3D: group,
    animationController: animCtrl,

    playState(state: CharacterStateName): void {
      const config = STATE_CONFIGS[state]
      animCtrl.play(config.animationClip, config.loop)
    },

    playAnimation(selection: AnimationSelection): void {
      animCtrl.play(selection.clipName, selection.loop, selection.speed)
    },

    update(deltaTime: number): void {
      animCtrl.update(deltaTime)
    },

    setPosition(x: number, y: number, z: number): void {
      group.position.set(x, y, z)
    }
  }
}
