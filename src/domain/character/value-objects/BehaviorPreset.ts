import type { CharacterStateName } from './CharacterState'

export type CharacterBehavior =
  | 'autonomous'
  | 'march-cycle'
  | 'rest-cycle'
  | 'joyful-rest'
  | 'celebrate'

export interface DurationOverride {
  readonly minMs: number
  readonly maxMs: number
}

export interface BehaviorPreset {
  readonly name: CharacterBehavior
  readonly transitions: Partial<Record<CharacterStateName, CharacterStateName>>
  readonly initialState: CharacterStateName
  readonly scrollingStates: ReadonlySet<CharacterStateName>
  readonly interactionLocked: boolean
  readonly lockedState: CharacterStateName | null
  readonly durationOverrides?: Partial<Record<CharacterStateName, DurationOverride>>
}

// autonomous: free時の自律行動（idle→wander→sit→idleサイクル）
const AUTONOMOUS: BehaviorPreset = {
  name: 'autonomous',
  transitions: {
    idle: 'wander',
    wander: 'sit',
    sit: 'idle',
    sleep: 'idle',
    happy: 'idle',
    reaction: 'idle',
    pet: 'idle',
    refuse: 'idle',
  },
  initialState: 'idle',
  scrollingStates: new Set<CharacterStateName>(),
  interactionLocked: false,
  lockedState: null,
}

// march-cycle: ポモドーロwork中（march→idle→marchサイクル）
// march 30〜60秒歩行、idle 3〜5秒休憩
const MARCH_CYCLE: BehaviorPreset = {
  name: 'march-cycle',
  transitions: {
    idle: 'march',
    march: 'idle',
    happy: 'idle',
    reaction: 'idle',
    pet: 'idle',
    refuse: 'idle',
    wander: 'idle',
    sit: 'idle',
    sleep: 'idle',
  },
  initialState: 'march',
  scrollingStates: new Set<CharacterStateName>(['march']),
  interactionLocked: true,
  lockedState: null,
  durationOverrides: {
    march: { minMs: 30000, maxMs: 60000 },
    idle: { minMs: 3000, maxMs: 5000 },
  },
}

// rest-cycle: ポモドーロbreak中（happy→sit→idle→sitサイクル、happyは初回のみ）
const REST_CYCLE: BehaviorPreset = {
  name: 'rest-cycle',
  transitions: {
    idle: 'sit',
    sit: 'idle',
    happy: 'sit',
    wander: 'sit',
    march: 'idle',
    sleep: 'idle',
    reaction: 'idle',
    pet: 'idle',
    refuse: 'idle',
  },
  initialState: 'happy',
  scrollingStates: new Set<CharacterStateName>(),
  interactionLocked: false,
  lockedState: null,
}

// joyful-rest: ポモドーロlong-break中（happy→sit→idle→happyサイクル、happy繰り返し）
const JOYFUL_REST: BehaviorPreset = {
  name: 'joyful-rest',
  transitions: {
    idle: 'happy',
    sit: 'idle',
    happy: 'sit',
    wander: 'sit',
    march: 'idle',
    sleep: 'idle',
    reaction: 'idle',
    pet: 'idle',
    refuse: 'idle',
  },
  initialState: 'happy',
  scrollingStates: new Set<CharacterStateName>(),
  interactionLocked: false,
  lockedState: null,
}

// celebrate: congrats時（happy固定）
const CELEBRATE: BehaviorPreset = {
  name: 'celebrate',
  transitions: {},
  initialState: 'happy',
  scrollingStates: new Set<CharacterStateName>(),
  interactionLocked: false,
  lockedState: 'happy',
}

export const BEHAVIOR_PRESETS: Record<CharacterBehavior, BehaviorPreset> = {
  'autonomous': AUTONOMOUS,
  'march-cycle': MARCH_CYCLE,
  'rest-cycle': REST_CYCLE,
  'joyful-rest': JOYFUL_REST,
  'celebrate': CELEBRATE,
}
