import type { CharacterStateName } from '../../domain/character/value-objects/CharacterState'
import type { AnimationSelection } from '../../domain/character/services/AnimationResolver'

export interface GalleryClipItem {
  readonly clipName: string
  readonly label: string
  readonly description: string
  readonly loop: boolean
}

export interface GalleryStateItem {
  readonly state: CharacterStateName
  readonly label: string
  readonly description: string
  readonly loop?: boolean
}

export interface GalleryRuleItem {
  readonly name: string
  readonly label: string
  readonly description: string
  readonly selection: AnimationSelection
}

export const GALLERY_CLIPS: readonly GalleryClipItem[] = [
  { clipName: 'idle',    label: 'Idle',     description: 'ms07_Idle.FBX',       loop: true },
  { clipName: 'walk',    label: 'Walk',     description: 'ms07_Walk.FBX',       loop: true },
  { clipName: 'sit',     label: 'Sit',      description: 'ms07_Stunned.FBX',    loop: true },
  { clipName: 'sleep',   label: 'Sleep',    description: 'ms07_Die.FBX',        loop: false },
  { clipName: 'happy',   label: 'Happy',    description: 'ms07_Jump.FBX',       loop: false },
  { clipName: 'wave',    label: 'Wave',     description: 'ms07_Attack_01.FBX',  loop: false },
  { clipName: 'pet',     label: 'Pet',      description: 'ms07_Jump.FBX',       loop: false },
  { clipName: 'refuse',  label: 'Refuse',   description: 'ms07_Attack_01.FBX',  loop: false },
  { clipName: 'run',     label: 'Run',      description: 'ms07_Run.FBX',        loop: true },
  { clipName: 'attack2', label: 'Attack 2', description: 'ms07_Attack_02.FBX',  loop: false },
  { clipName: 'damage1', label: 'Damage 1', description: 'ms07_Damage_01.FBX',  loop: false },
  { clipName: 'damage2', label: 'Damage 2', description: 'ms07_Damage_02.FBX',  loop: false },
  { clipName: 'getUp',   label: 'Get Up',   description: 'ms07_GetUp.FBX',      loop: false },
]

export const GALLERY_STATES: readonly GalleryStateItem[] = [
  { state: 'idle',     label: 'Idle',     description: 'Standing still' },
  { state: 'wander',   label: 'Wander',   description: 'Walking around' },
  { state: 'march',    label: 'March',    description: 'Marching forward (work phase)' },
  { state: 'sit',      label: 'Sit',      description: 'Sitting down', loop: false },
  { state: 'sleep',    label: 'Sleep',    description: 'Sleeping', loop: false },
  { state: 'happy',    label: 'Happy',    description: 'Jumping with joy' },
  { state: 'reaction', label: 'Reaction', description: 'Click reaction' },
  { state: 'dragged',  label: 'Dragged',  description: 'Being picked up' },
  { state: 'pet',      label: 'Pet',      description: 'Being petted' },
  { state: 'refuse',   label: 'Refuse',   description: 'Refusing interaction' },
  { state: 'feeding',  label: 'Feeding',  description: 'Eating food' },
]

export const GALLERY_RULES: readonly GalleryRuleItem[] = [
  {
    name: 'fatigue-march',
    label: 'Fatigue March',
    description: 'Slow walk when fatigued (fatigue > 0.8)',
    selection: { clipName: 'walk', loop: true, speed: 0.8 },
  },
  {
    name: 'full-feeding-refuse',
    label: 'Full Refuse',
    description: 'Refuse feeding when satisfied (satisfaction > 0.9)',
    selection: { clipName: 'attack2', loop: false },
  },
  {
    name: 'overfed-refuse',
    label: 'Overfed Refuse',
    description: 'Refuse when fed too many times (>= 5 today)',
    selection: { clipName: 'attack2', loop: false },
  },
  {
    name: 'click-spam-reaction',
    label: 'Click Spam',
    description: 'Angry reaction to click spam (>= 5 clicks)',
    selection: { clipName: 'damage2', loop: false },
  },
  {
    name: 'click-irritation',
    label: 'Click Irritation',
    description: 'Irritated by repeated clicks (>= 3 clicks)',
    selection: { clipName: 'damage1', loop: false },
  },
  {
    name: 'night-sleepy-reaction',
    label: 'Night Sleepy',
    description: 'Sleepy reaction at night (affinity > 0.5)',
    selection: { clipName: 'sleep', loop: false },
  },
  {
    name: 'productive-happy-reaction',
    label: 'Productive Happy',
    description: 'Happy reaction after productive day (>= 3 cycles)',
    selection: { clipName: 'happy', loop: false },
  },
  {
    name: 'march-late-run',
    label: 'Late Run',
    description: 'Running in late work phase (progress > 0.7)',
    selection: { clipName: 'run', loop: true },
  },
  {
    name: 'march-mid-speed',
    label: 'Mid Speed',
    description: 'Faster walk in mid work phase (0.3 < progress <= 0.7)',
    selection: { clipName: 'walk', loop: true, speed: 1.2 },
  },
  {
    name: 'reaction-variation',
    label: 'Reaction Var.',
    description: 'Alternative reaction animation (random)',
    selection: { clipName: 'attack2', loop: false },
  },
  {
    name: 'refuse-variation',
    label: 'Refuse Var.',
    description: 'Alternative refuse animation (random)',
    selection: { clipName: 'damage2', loop: false },
  },
  {
    name: 'getup-from-sleep',
    label: 'Get Up',
    description: 'Getting up from sleep',
    selection: { clipName: 'getUp', loop: false },
  },
  {
    name: 'celebrate-run',
    label: 'Celebrate Run',
    description: 'Running celebration after pomodoro completion',
    selection: { clipName: 'run', loop: true, speed: 1.2 },
  },
  {
    name: 'affinity-happy',
    label: 'Affinity Happy',
    description: 'Spontaneous happiness from high affinity (> 0.7)',
    selection: { clipName: 'happy', loop: true },
  },
]
