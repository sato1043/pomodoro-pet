import * as THREE from 'three'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { App } from './adapters/ui/App'
import type { AppDeps } from './adapters/ui/AppContext'
import { createEventBus } from './domain/shared/EventBus'
import { createPomodoroStateMachine } from './domain/timer/entities/PomodoroStateMachine'
import { createDefaultConfig, parseDebugTimer } from './domain/timer/value-objects/TimerConfig'
import { createAppSceneManager } from './application/app-scene/AppSceneManager'
import { createAppSettingsService } from './application/settings/AppSettingsService'
import type { SettingsEvent } from './application/settings/SettingsEvents'
import { createCharacter } from './domain/character/entities/Character'
import { createThreeCharacter, type ThreeCharacterHandle, type FBXCharacterConfig } from './adapters/three/ThreeCharacterAdapter'
import { createBehaviorStateMachine } from './domain/character/services/BehaviorStateMachine'
import { updateBehavior } from './application/character/UpdateBehaviorUseCase'
import { createInteractionAdapter } from './adapters/three/ThreeInteractionAdapter'
import { createDefaultSceneConfig, createDefaultChunkSpec } from './domain/environment/value-objects/SceneConfig'
import { createScrollManager } from './application/environment/ScrollUseCase'
import { createInfiniteScrollRenderer } from './infrastructure/three/InfiniteScrollRenderer'
import { createAudioAdapter } from './infrastructure/audio/AudioAdapter'
import type { SoundPreset } from './infrastructure/audio/ProceduralSounds'
import { createSfxPlayer } from './infrastructure/audio/SfxPlayer'
import { bridgeTimerToSfx } from './application/timer/TimerSfxBridge'
import { bridgeTimerToNotification, type NotificationPort } from './application/notification/NotificationBridge'
import { createPomodoroOrchestrator, type PomodoroOrchestrator } from './application/timer/PomodoroOrchestrator'
import type { CharacterBehavior } from './domain/character/value-objects/BehaviorPreset'
import type { PhaseTriggerMap } from './domain/timer/value-objects/PhaseTrigger'

const BREAK_BGM_TRIGGERS: PhaseTriggerMap = {
  break: [{ id: 'break-getset', timing: { type: 'remaining', beforeEndMs: 30000 } }],
  'long-break': [{ id: 'long-break-getset', timing: { type: 'remaining', beforeEndMs: 30000 } }],
}

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
  const debugConfig = parseDebugTimer(import.meta.env.VITE_DEBUG_TIMER ?? '')
  const isDebugTimer = debugConfig !== null
  const initialConfig = debugConfig ?? createDefaultConfig()

  let session = createPomodoroStateMachine(initialConfig, { phaseTriggers: BREAK_BGM_TRIGGERS })

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

  // React UIマウント
  const appRoot: Root = createRoot(document.getElementById('app-root')!)
  function renderReactUI(): void {
    const deps: AppDeps = {
      bus, session, config: settingsService.currentConfig, orchestrator,
      settingsService, audio, sfx: sfxPlayer, debugTimer: isDebugTimer,
      character, behaviorSM, charHandle
    }
    appRoot.render(createElement(App, { deps }))
  }

  // SettingsChanged → session + orchestrator再作成 + React再レンダリング
  bus.subscribe<SettingsEvent>('SettingsChanged', (event) => {
    orchestrator.dispose()
    session = createPomodoroStateMachine(event.config, { phaseTriggers: BREAK_BGM_TRIGGERS })
    orchestrator = createPomodoroOrchestrator({
      bus, sceneManager, session, onBehaviorChange: switchPreset
    })
    renderReactUI()
  })

  // SoundSettingsLoaded → AudioAdapter + SfxPlayerに適用
  bus.subscribe<SettingsEvent>('SoundSettingsLoaded', (event) => {
    if (event.type !== 'SoundSettingsLoaded') return
    audio.switchPreset(event.sound.preset as SoundPreset)
    audio.setVolume(event.sound.volume)
    if (event.sound.isMuted !== audio.isMuted) audio.toggleMute()
    sfxPlayer.setVolume(event.sound.volume)
    sfxPlayer.setMuted(event.sound.isMuted)
    renderReactUI()
  })

  // 保存済み設定の復元（購読登録後に実行）
  await settingsService.loadFromStorage()

  // 初回React UIレンダリング
  renderReactUI()

  // インタラクション（ホバー、クリック、摘まみ上げ）
  createInteractionAdapter(renderer, camera, character, behaviorSM, charHandle)

  // フォーカス状態フラグ（document.hasFocus()はElectronで信頼できないためblur/focusで管理）
  let windowFocused = document.hasFocus()

  // バックグラウンド時のオーディオ再生判定
  const shouldPlayAudio = (): boolean => {
    if (!settingsService.backgroundConfig.backgroundAudio && !windowFocused) {
      return false
    }
    return true
  }

  // タイマーSFX（作業完了ファンファーレ + 休憩BGM — EventBusで通知を受ける）
  bridgeTimerToSfx(bus, sfxPlayer, {
    breakChillGain: 0.25,
    breakGetsetGain: 0.25
  }, audio, shouldPlayAudio)

  // システム通知（バックグラウンド時のフェーズ完了通知）
  const notificationPort: NotificationPort = {
    show: (title, body) => { window.electronAPI?.showNotification(title, body) }
  }
  bridgeTimerToNotification(
    bus,
    notificationPort,
    () => settingsService.backgroundConfig.backgroundNotify,
    () => windowFocused
  )

  // バックグラウンド時のタイマー継続とオーディオ制御
  // rAFはバックグラウンドで停止するため、setIntervalでタイマーを進める
  let bgInterval: ReturnType<typeof setInterval> | null = null
  let bgLastTick = 0

  window.addEventListener('blur', () => {
    windowFocused = false
    if (!settingsService.backgroundConfig.backgroundAudio) {
      audio.setBackgroundMuted(true)
      sfxPlayer.setBackgroundMuted(true)
    }
    // バックグラウンドでもタイマーを1秒ごとに進める
    bgLastTick = Date.now()
    bgInterval = setInterval(() => {
      if (!orchestrator.isRunning) return
      const now = Date.now()
      const deltaMs = now - bgLastTick
      bgLastTick = now
      orchestrator.tick(deltaMs)
    }, 1000)
  })
  window.addEventListener('focus', () => {
    // バックグラウンドタイマーを停止
    if (bgInterval !== null) {
      // 最後のinterval〜focus間の端数を処理（windowFocused=falseのまま）
      if (orchestrator.isRunning) {
        const remainMs = Date.now() - bgLastTick
        if (remainMs > 0) {
          orchestrator.tick(remainMs)
        }
      }
      clearInterval(bgInterval)
      bgInterval = null
      clock.getDelta() // rAFの溜まったdeltaを消費（二重tick防止）
    }

    windowFocused = true
    audio.setBackgroundMuted(false)
    sfxPlayer.setBackgroundMuted(false)
  })

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
