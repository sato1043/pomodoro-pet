import * as THREE from 'three'
import { createEventBus } from './domain/shared/EventBus'
import { createPomodoroStateMachine } from './domain/timer/entities/PomodoroStateMachine'
import { createDefaultConfig } from './domain/timer/value-objects/TimerConfig'
import { createTimerOverlay, type TimerOverlayElements } from './adapters/ui/TimerOverlay'
import { createAppSceneManager } from './application/app-scene/AppSceneManager'
import { createAppSettingsService } from './application/settings/AppSettingsService'
import type { SettingsEvent } from './application/settings/SettingsEvents'
import { createSettingsPanel } from './adapters/ui/SettingsPanel'
import { createCharacter } from './domain/character/entities/Character'
import { createThreeCharacter, type ThreeCharacterHandle, type FBXCharacterConfig } from './adapters/three/ThreeCharacterAdapter'
import { createBehaviorStateMachine } from './domain/character/services/BehaviorStateMachine'
import { updateBehavior } from './application/character/UpdateBehaviorUseCase'
import { createPromptInput } from './adapters/ui/PromptInput'
import { createInteractionAdapter } from './adapters/three/ThreeInteractionAdapter'
import { createDefaultSceneConfig, createDefaultChunkSpec } from './domain/environment/value-objects/SceneConfig'
import { createScrollManager } from './application/environment/ScrollUseCase'
import { createInfiniteScrollRenderer } from './infrastructure/three/InfiniteScrollRenderer'
import { createAudioAdapter } from './infrastructure/audio/AudioAdapter'
import type { SoundPreset } from './infrastructure/audio/ProceduralSounds'
import { createSfxPlayer } from './infrastructure/audio/SfxPlayer'
import { bridgeTimerToSfx } from './application/timer/TimerSfxBridge'
import { createPomodoroOrchestrator, type PomodoroOrchestrator } from './application/timer/PomodoroOrchestrator'
import type { CharacterBehavior } from './domain/character/value-objects/BehaviorPreset'

function createScene(): {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
} {
  const container = document.getElementById('canvas-container')
  if (!container) throw new Error('canvas-container not found')

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.set(0, 0.6, 5)
  camera.lookAt(0, 1.8, 0)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  container.appendChild(renderer.domElement)

  return { scene, camera, renderer }
}

function addLights(scene: THREE.Scene): void {
  const ambientLight = new THREE.AmbientLight(0xffeedd, 0.8)
  scene.add(ambientLight)

  const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x5d8a3c, 0.6)
  scene.add(hemisphereLight)

  const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.2)
  sunLight.position.set(8, 12, 5)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.width = 2048
  sunLight.shadow.mapSize.height = 2048
  sunLight.shadow.camera.near = 0.5
  sunLight.shadow.camera.far = 40
  sunLight.shadow.camera.left = -15
  sunLight.shadow.camera.right = 15
  sunLight.shadow.camera.top = 15
  sunLight.shadow.camera.bottom = -15
  scene.add(sunLight)
}

function setupResizeHandler(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): void {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })
}

async function main(): Promise<void> {
  const { scene, camera, renderer } = createScene()
  addLights(scene)
  setupResizeHandler(camera, renderer)

  // シーン設定と無限スクロール
  const sceneConfig = createDefaultSceneConfig()
  const chunkSpec = createDefaultChunkSpec()
  const chunkCount = 6
  const scrollManager = createScrollManager(sceneConfig, chunkSpec, chunkCount)
  const scrollRenderer = createInfiniteScrollRenderer(scene, sceneConfig, chunkSpec, chunkCount)

  // ポモドーロタイマー初期化
  const bus = createEventBus()
  const isDebugTimer = import.meta.env.VITE_DEBUG_TIMER === '1'
  const initialConfig = createDefaultConfig(isDebugTimer)

  let session = createPomodoroStateMachine(initialConfig)

  // AppScene管理（EventBus不要 — Orchestratorが連動を担当）
  const sceneManager = createAppSceneManager()

  // アプリケーション設定
  const settingsService = createAppSettingsService(bus, initialConfig, isDebugTimer)

  // 環境音
  const audio = createAudioAdapter()

  // SFXプレイヤー（ファンファーレ・テストサウンド）
  const sfxPlayer = createSfxPlayer()

  // キャラクター初期化（Orchestratorより先に必要）
  const character = createCharacter()
  const fbxConfig: FBXCharacterConfig = {
    modelPath: './models/ms07_Wildboar.FBX',
    resourcePath: './models/',
    scale: 0.022,
    diffuseTexturePath: './models/ms07_Wildboar_1.png',
    animationPaths: {
      idle: './models/ms07_Idle.FBX',
      walk: './models/ms07_Walk.FBX',
      sit: './models/ms07_Stunned.FBX',
      sleep: './models/ms07_Die.FBX',
      happy: './models/ms07_Jump.FBX',
      wave: './models/ms07_Attack_01.FBX',
      pet: './models/ms07_Jump.FBX',
      refuse: './models/ms07_Attack_01.FBX',
    }
  }
  const charHandle: ThreeCharacterHandle = await createThreeCharacter(scene, character, fbxConfig)
  const behaviorSM = createBehaviorStateMachine({ fixedWanderDirection: sceneConfig.direction })
  behaviorSM.start()

  // キャラクター行動コールバック（Orchestratorが直接呼び出す）
  function switchPreset(presetName: CharacterBehavior): void {
    behaviorSM.applyPreset(presetName)
    character.setState(behaviorSM.currentState)
    charHandle.playState(behaviorSM.currentState)
  }

  // PomodoroOrchestrator（AppScene + タイマー + キャラクター行動の一元管理）
  let orchestrator: PomodoroOrchestrator = createPomodoroOrchestrator({
    bus, sceneManager, session, onBehaviorChange: switchPreset
  })

  let timerUI: TimerOverlayElements = createTimerOverlay(session, bus, initialConfig, orchestrator, settingsService, audio, sfxPlayer, isDebugTimer)
  document.body.appendChild(timerUI.container)

  // 設定パネル（Environment）
  const settingsPanel = createSettingsPanel(bus)
  timerUI.container.appendChild(settingsPanel.trigger)
  document.body.appendChild(settingsPanel.container)

  // SettingsChanged → session + orchestrator再作成
  bus.subscribe<SettingsEvent>('SettingsChanged', (event) => {
    // 1. 旧リソース破棄
    orchestrator.dispose()
    timerUI.dispose()

    // 2. 新session作成
    session = createPomodoroStateMachine(event.config)

    // 3. Orchestrator再作成
    orchestrator = createPomodoroOrchestrator({
      bus, sceneManager, session, onBehaviorChange: switchPreset
    })

    // 4. TimerOverlay再作成
    timerUI = createTimerOverlay(session, bus, event.config, orchestrator, settingsService, audio, sfxPlayer, isDebugTimer)
    document.body.appendChild(timerUI.container)
    timerUI.container.appendChild(settingsPanel.trigger)
  })

  // SoundSettingsLoaded → AudioAdapterに適用
  bus.subscribe<SettingsEvent>('SoundSettingsLoaded', (event) => {
    if (event.type !== 'SoundSettingsLoaded') return
    audio.switchPreset(event.sound.preset as SoundPreset)
    audio.setVolume(event.sound.volume)
    if (event.sound.isMuted !== audio.isMuted) audio.toggleMute()
  })

  // 保存済み設定の復元（購読登録後に実行）
  await settingsService.loadFromStorage()

  // プロンプト入力UI
  const promptUI = createPromptInput(character, behaviorSM, charHandle)
  document.body.appendChild(promptUI.container)

  // インタラクション（ホバー、クリック、摘まみ上げ）
  createInteractionAdapter(renderer, camera, character, behaviorSM, charHandle)

  // タイマーSFX（作業完了ファンファーレ — EventBusで通知を受ける）
  bridgeTimerToSfx(bus, sfxPlayer)

  // レンダリングループ
  const clock = new THREE.Clock()
  const animate = (): void => {
    requestAnimationFrame(animate)
    const delta = clock.getDelta()
    const deltaMs = delta * 1000

    if (orchestrator.isRunning) {
      orchestrator.tick(deltaMs)
    }

    updateBehavior(
      character, behaviorSM, charHandle, deltaMs,
      scrollManager, (state) => scrollRenderer.update(state)
    )
    charHandle.update(delta)
    renderer.render(scene, camera)
  }
  animate()
}

main()
