import * as THREE from 'three'
import { createEventBus } from './domain/shared/EventBus'
import { createPomodoroSession } from './domain/timer/entities/PomodoroSession'
import { createDefaultConfig, createConfig } from './domain/timer/value-objects/TimerConfig'
import { startTimer, resetTimer, tickTimer } from './application/timer/TimerUseCases'
import { createTimerOverlay } from './adapters/ui/TimerOverlay'
import { createAppModeManager } from './application/app-mode/AppModeManager'
import type { AppModeEvent } from './application/app-mode/AppMode'
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
import { createAudioControls } from './adapters/ui/AudioControls'
import { bridgeTimerToCharacter } from './application/character/TimerCharacterBridge'

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
  camera.position.set(0, 0.8, 6)
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
  const config = isDebugTimer ? createConfig(20000, 3000, 4000, 4) : createDefaultConfig()
  const session = createPomodoroSession(config)

  // AppMode管理
  const appModeManager = createAppModeManager(bus)

  // AppModeChanged → PomodoroSession連動
  bus.subscribe<AppModeEvent>('AppModeChanged', (event) => {
    if (event.type === 'AppModeChanged') {
      if (event.mode === 'pomodoro') {
        resetTimer(session, bus)
        startTimer(session, bus)
      } else {
        resetTimer(session, bus)
      }
    }
  })

  const timerUI = createTimerOverlay(session, bus, config, appModeManager)
  document.body.appendChild(timerUI.container)

  // キャラクター初期化
  const character = createCharacter()
  const fbxConfig: FBXCharacterConfig = {
    modelPath: '/models/ms07_Wildboar.FBX',
    resourcePath: '/models/',
    scale: 0.027,
    diffuseTexturePath: '/models/ms07_Wildboar_1.png',
    animationPaths: {
      idle: '/models/ms07_Idle.FBX',
      walk: '/models/ms07_Walk.FBX',
      sit: '/models/ms07_Stunned.FBX',
      sleep: '/models/ms07_Die.FBX',
      happy: '/models/ms07_Jump.FBX',
      wave: '/models/ms07_Attack_01.FBX',
      pet: '/models/ms07_Jump.FBX',
    }
  }
  const charHandle: ThreeCharacterHandle = await createThreeCharacter(scene, character, fbxConfig)
  const stateMachine = createBehaviorStateMachine({ fixedWanderDirection: sceneConfig.direction })
  stateMachine.start()

  // プロンプト入力UI
  const promptUI = createPromptInput(character, stateMachine, charHandle)
  document.body.appendChild(promptUI.container)

  // インタラクション（ホバー、クリック、摘まみ上げ）
  createInteractionAdapter(renderer, camera, character, stateMachine, charHandle)

  // タイマー ↔ キャラクター連携
  bridgeTimerToCharacter(bus, character, stateMachine, charHandle)

  // 環境音（一時的に無効化）
  // const audio = createAudioAdapter()
  // const audioUI = createAudioControls(audio)
  // document.body.appendChild(audioUI.container)

  // レンダリングループ
  const clock = new THREE.Clock()
  const animate = (): void => {
    requestAnimationFrame(animate)
    const delta = clock.getDelta()
    const deltaMs = delta * 1000

    if (session.isRunning) {
      tickTimer(session, bus, deltaMs)
    }

    updateBehavior(
      character, stateMachine, charHandle, deltaMs,
      scrollManager, (state) => scrollRenderer.update(state)
    )
    charHandle.update(delta)
    renderer.render(scene, camera)
  }
  animate()
}

main()
