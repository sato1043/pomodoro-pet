import * as THREE from 'three'

const FADE_DURATION = 0.3

export interface AnimationController {
  addClip(name: string, clip: THREE.AnimationClip): void
  play(name: string, loop: boolean): void
  stop(): void
  update(deltaTime: number): void
  readonly currentClipName: string | null
  readonly hasClips: boolean
}

export function createAnimationController(
  mixer: THREE.AnimationMixer
): AnimationController {
  const actions = new Map<string, THREE.AnimationAction>()
  let currentAction: THREE.AnimationAction | null = null
  let currentClipName: string | null = null

  return {
    get currentClipName() { return currentClipName },
    get hasClips() { return actions.size > 0 },

    addClip(name: string, clip: THREE.AnimationClip): void {
      const action = mixer.clipAction(clip)
      actions.set(name, action)
    },

    play(name: string, loop: boolean): void {
      const nextAction = actions.get(name)
      if (!nextAction) return

      nextAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1)
      nextAction.clampWhenFinished = !loop

      if (currentAction && currentAction !== nextAction) {
        nextAction.reset()
        nextAction.play()
        currentAction.crossFadeTo(nextAction, FADE_DURATION, true)
      } else if (!currentAction) {
        nextAction.reset()
        nextAction.play()
      }

      currentAction = nextAction
      currentClipName = name
    },

    stop(): void {
      if (currentAction) {
        currentAction.stop()
        currentAction = null
        currentClipName = null
      }
    },

    update(deltaTime: number): void {
      mixer.update(deltaTime)
    }
  }
}
