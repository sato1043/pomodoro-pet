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
import { updateBehavior, type UpdateBehaviorOptions } from './application/character/UpdateBehaviorUseCase'
import { createEnrichedAnimationResolver } from './domain/character/services/EnrichedAnimationResolver'
import { createEmotionService, type EmotionService } from './application/character/EmotionService'
import { createInteractionTracker, type InteractionTracker } from './domain/character/services/InteractionTracker'
import type { PomodoroEvent } from './application/timer/PomodoroEvents'
import { createInteractionAdapter } from './adapters/three/ThreeInteractionAdapter'
import { createDefaultSceneConfig, createDefaultChunkSpec } from './domain/environment/value-objects/SceneConfig'
import { createScrollManager } from './application/environment/ScrollUseCase'
import { createInfiniteScrollRenderer } from './infrastructure/three/InfiniteScrollRenderer'
import { createAudioAdapter } from './infrastructure/audio/AudioAdapter'
import type { SoundPreset } from './infrastructure/audio/ProceduralSounds'
import { createSfxPlayer } from './infrastructure/audio/SfxPlayer'
import { bridgeTimerToSfx } from './application/timer/TimerSfxBridge'
import { bridgeTimerToNotification, type NotificationPort } from './application/notification/NotificationBridge'
import { createStatisticsService } from './application/statistics/StatisticsService'
import { bridgeTimerToStatistics } from './application/statistics/StatisticsBridge'
import { createPomodoroOrchestrator, type PomodoroOrchestrator } from './application/timer/PomodoroOrchestrator'
import { createFureaiCoordinator, type FureaiCoordinator } from './application/fureai/FureaiCoordinator'
import { createCabbageObject } from './infrastructure/three/CabbageObject'
import { createAppleObject } from './infrastructure/three/AppleObject'
import { createFeedingInteractionAdapter, DEFAULT_CAMERA, FUREAI_CAMERA, type FeedingInteractionAdapter } from './adapters/three/FeedingInteractionAdapter'
import type { CharacterBehavior } from './domain/character/value-objects/BehaviorPreset'
import type { PhaseTriggerMap } from './domain/timer/value-objects/PhaseTrigger'
import type { WeatherConfig } from './domain/environment/value-objects/WeatherConfig'
import { resolveTimeOfDay } from './domain/environment/value-objects/WeatherConfig'
import { resolveEnvironmentTheme } from './domain/environment/value-objects/EnvironmentTheme'
import { isFeatureEnabled } from './application/license/LicenseState'
import type { LicenseMode } from './application/license/LicenseState'
import { createRainEffect } from './infrastructure/three/RainEffect'
import { createSnowEffect } from './infrastructure/three/SnowEffect'
import { createCloudEffect } from './infrastructure/three/CloudEffect'

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
  camera.position.set(0, DEFAULT_CAMERA.posY, DEFAULT_CAMERA.posZ)
  camera.lookAt(0, DEFAULT_CAMERA.lookAtY, 0)

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

interface SceneLights {
  ambient: THREE.AmbientLight
  hemisphere: THREE.HemisphereLight
  sun: THREE.DirectionalLight
}

function addLights(scene: THREE.Scene): SceneLights {
  const ambient = new THREE.AmbientLight(0xffeedd, 0.8)
  scene.add(ambient)

  const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x5d8a3c, 0.6)
  scene.add(hemisphere)

  const sun = new THREE.DirectionalLight(0xfff5e0, 1.2)
  sun.position.set(8, 12, 5)
  sun.castShadow = true
  sun.shadow.mapSize.width = 2048
  sun.shadow.mapSize.height = 2048
  sun.shadow.camera.near = 0.5
  sun.shadow.camera.far = 40
  sun.shadow.camera.left = -15
  sun.shadow.camera.right = 15
  sun.shadow.camera.top = 15
  sun.shadow.camera.bottom = -15
  scene.add(sun)

  return { ambient, hemisphere, sun }
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
  const lights = addLights(scene)
  setupResizeHandler(camera, renderer)

  // シーン設定と無限スクロール
  const sceneConfig = createDefaultSceneConfig()
  const chunkSpec = createDefaultChunkSpec()
  const chunkCount = 6
  const scrollManager = createScrollManager(sceneConfig, chunkSpec, chunkCount)
  const scrollRenderer = createInfiniteScrollRenderer(scene, sceneConfig, chunkSpec, chunkCount)

  // 雨エフェクト
  const rainEffect = createRainEffect(scene)
  const snowEffect = createSnowEffect(scene)
  const cloudEffect = createCloudEffect(scene)

  // 天気適用関数
  function applyWeather(config: WeatherConfig): void {
    const weather = config.weather
    const timeOfDay = config.autoTimeOfDay
      ? resolveTimeOfDay(new Date().getHours())
      : config.timeOfDay
    const params = resolveEnvironmentTheme(weather, timeOfDay)

    lights.ambient.color.setHex(params.ambientColor)
    lights.ambient.intensity = params.ambientIntensity
    lights.hemisphere.color.setHex(params.hemiSkyColor)
    lights.hemisphere.groundColor.setHex(params.hemiGroundColor)
    lights.hemisphere.intensity = params.hemiIntensity
    lights.sun.color.setHex(params.sunColor)
    lights.sun.intensity = params.sunIntensity
    lights.sun.position.set(params.sunPosition.x, params.sunPosition.y, params.sunPosition.z)

    renderer.toneMappingExposure = params.exposure
    scrollRenderer.applyTheme(params)
    rainEffect.setVisible(weather === 'rainy')
    snowEffect.setVisible(weather === 'snowy')

    // 雲の密度をconfigのcloudDensityLevelから決定
    cloudEffect.setDensity(config.cloudDensityLevel)
    cloudEffect.setVisible(config.cloudDensityLevel > 0)
  }

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

  // 統計サービス
  const statisticsService = createStatisticsService()

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
      run: './models/ms07_Run.FBX',
      attack2: './models/ms07_Attack_02.FBX',
      damage1: './models/ms07_Damage_01.FBX',
      damage2: './models/ms07_Damage_02.FBX',
      getUp: './models/ms07_GetUp.FBX',
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

  // キャベツ3Dオブジェクト + 餌やりインタラクション
  const cabbageHandles = [
    createAppleObject(scene, { x: 0.4, y: 0.05, z: 4.9 }),
    createAppleObject(scene, { x: 0.15, y: 0.05, z: 5.0 }),
    createCabbageObject(scene, { x: 0.3, y: 0.05, z: 4.5 }),
    createAppleObject(scene, { x: 0.05, y: 0.05, z: 4.65 }),
    createCabbageObject(scene, { x: -0.2, y: 0.05, z: 4.8 }),
    createAppleObject(scene, { x: -0.3, y: 0.05, z: 4.5 }),
    createAppleObject(scene, { x: -0.1, y: 0.05, z: 4.3 }),
    createAppleObject(scene, { x: -0.35, y: 0.05, z: 4.2 }),
  ]
  const feedingAdapter: FeedingInteractionAdapter = createFeedingInteractionAdapter(
    renderer, camera, cabbageHandles, charHandle, character, behaviorSM, bus
  )

  // ライセンスモード（レンダラー側の制限判定用）
  // VITE_DEBUG_LICENSE が有効値なら初期値を固定（メインプロセスからのpushでも上書きされる）
  const debugLicense = (import.meta.env.VITE_DEBUG_LICENSE ?? '') as string
  const validModes: LicenseMode[] = ['registered', 'trial', 'expired', 'restricted']
  const initialLicenseMode: LicenseMode = validModes.includes(debugLicense as LicenseMode)
    ? debugLicense as LicenseMode
    : 'trial'
  let currentLicenseMode: LicenseMode = initialLicenseMode
  if (window.electronAPI?.onLicenseChanged) {
    window.electronAPI.onLicenseChanged((state) => {
      currentLicenseMode = (state as { mode: LicenseMode }).mode
    })
    if (window.electronAPI.checkLicenseStatus) {
      window.electronAPI.checkLicenseStatus().then((s) => {
        currentLicenseMode = (s as { mode: LicenseMode }).mode
      })
    }
  }

  // EmotionService（感情パラメータ管理）
  const emotionService: EmotionService = createEmotionService(settingsService.emotionConfig.affinity)

  // InteractionTracker（クリック回数・餌やり回数追跡）
  const interactionTracker: InteractionTracker = createInteractionTracker()

  // 感情イベント購読（ポモドーロ完了/中断、餌やり成功）
  // emotionAccumulation が無効なら感情パラメータの変化と永続化をスキップ
  bus.subscribe<PomodoroEvent>('PomodoroCompleted', () => {
    if (!isFeatureEnabled(currentLicenseMode, 'emotionAccumulation')) return
    emotionService.applyEvent({ type: 'pomodoro_completed' })
    settingsService.updateEmotionConfig({ affinity: emotionService.state.affinity })
  })
  bus.subscribe<PomodoroEvent>('PomodoroAborted', () => {
    if (!isFeatureEnabled(currentLicenseMode, 'emotionAccumulation')) return
    emotionService.applyEvent({ type: 'pomodoro_aborted' })
    settingsService.updateEmotionConfig({ affinity: emotionService.state.affinity })
  })
  bus.subscribe<{ type: 'FeedingSuccess' }>('FeedingSuccess', () => {
    if (!isFeatureEnabled(currentLicenseMode, 'emotionAccumulation')) {
      interactionTracker.recordFeeding()
      return
    }
    emotionService.applyEvent({ type: 'fed' })
    interactionTracker.recordFeeding()
    settingsService.updateEmotionConfig({ affinity: emotionService.state.affinity })
  })

  // AnimationResolver（コンテキスト依存のアニメーション選択）
  const resolveAnimation = createEnrichedAnimationResolver()
  const behaviorOptions: UpdateBehaviorOptions = {
    resolveAnimation,
    getPhaseProgress: () => session.isRunning ? session.phaseProgress : 0,
    getEmotion: () => emotionService.state,
    getInteraction: () => interactionTracker.history,
    getTimeOfDay: () => resolveTimeOfDay(new Date().getHours()),
    getTodayCompletedCycles: () => {
      const today = new Date().toISOString().slice(0, 10)
      return statisticsService.getDailyStats(today).completedCycles
    },
  }

  // FureaiCoordinator（ふれあいモードのシーン遷移+プリセット切替+餌やり制御）
  let fureaiCoordinator: FureaiCoordinator = createFureaiCoordinator({
    bus, sceneManager, onBehaviorChange: switchPreset, behaviorSM, feedingAdapter
  })

  // React UIマウント
  const appRoot: Root = createRoot(document.getElementById('app-root')!)
  function renderReactUI(): void {
    const deps: AppDeps = {
      bus, session, config: settingsService.currentConfig, orchestrator,
      settingsService, audio, sfx: sfxPlayer, debugTimer: isDebugTimer,
      character, behaviorSM, charHandle, statisticsService, fureaiCoordinator
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
    fureaiCoordinator = createFureaiCoordinator({
      bus, sceneManager, onBehaviorChange: switchPreset, behaviorSM, feedingAdapter
    })
    renderReactUI()
  })

  // WeatherConfigChanged → 天気適用
  bus.subscribe<SettingsEvent>('WeatherConfigChanged', (event) => {
    if (event.type !== 'WeatherConfigChanged') return
    applyWeather(event.weather)
  })

  // WeatherPreviewOpen → カメラ位置切替 + キャラクター歩行
  // 天気プレビュー中フラグ（autoTimeIntervalとfocus復帰時の保存値上書きを抑止）
  let weatherPreviewOpen = false

  bus.subscribe<{ open: boolean }>('WeatherPreviewOpen', (event) => {
    weatherPreviewOpen = event.open
    if (event.open) {
      camera.position.setZ(FUREAI_CAMERA.posZ)
      camera.lookAt(0, FUREAI_CAMERA.lookAtY, 0)
      switchPreset('march-cycle')
      stopAutoTimeInterval()
    } else {
      camera.position.setZ(DEFAULT_CAMERA.posZ)
      camera.lookAt(0, DEFAULT_CAMERA.lookAtY, 0)
      switchPreset('autonomous')
      if (settingsService.weatherConfig.autoTimeOfDay) {
        startAutoTimeInterval()
      }
    }
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

  // 統計ブリッジ（EventBus購読→統計記録）
  bridgeTimerToStatistics(bus, statisticsService, () => settingsService.currentConfig)

  // 保存済み設定の復元（購読登録後に実行）
  await settingsService.loadFromStorage()

  // EmotionServiceのaffinity復元（loadFromStorage後に実行）
  emotionService.loadAffinity(settingsService.emotionConfig.affinity)

  // 保存済み統計データの復元
  await statisticsService.loadFromStorage()

  // 初期天気適用（loadFromStorageでWeatherConfigChangedが発行されない場合のフォールバック）
  applyWeather(settingsService.weatherConfig)

  // 初回React UIレンダリング
  renderReactUI()

  // インタラクション（ホバー、クリック、摘まみ上げ）
  createInteractionAdapter(renderer, camera, character, behaviorSM, charHandle, {
    onClickInteraction: () => interactionTracker.recordClick(),
  })

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
    () => isFeatureEnabled(currentLicenseMode, 'backgroundNotify') && settingsService.backgroundConfig.backgroundNotify,
    () => windowFocused
  )

  // autoTimeOfDay: 1分間隔で時間帯を監視し天気を再適用
  let autoTimeInterval: ReturnType<typeof setInterval> | null = null
  function startAutoTimeInterval(): void {
    if (autoTimeInterval !== null) return
    autoTimeInterval = setInterval(() => {
      applyWeather(settingsService.weatherConfig)
    }, 60000)
  }
  function stopAutoTimeInterval(): void {
    if (autoTimeInterval !== null) {
      clearInterval(autoTimeInterval)
      autoTimeInterval = null
    }
  }
  // WeatherConfigChanged購読でinterval管理（プレビュー中はinterval開始しない）
  bus.subscribe<SettingsEvent>('WeatherConfigChanged', (event) => {
    if (event.type !== 'WeatherConfigChanged') return
    if (weatherPreviewOpen) return
    if (event.weather.autoTimeOfDay) {
      startAutoTimeInterval()
    } else {
      stopAutoTimeInterval()
    }
  })
  // 初期状態でautoTimeOfDay有効ならinterval開始
  if (settingsService.weatherConfig.autoTimeOfDay) {
    startAutoTimeInterval()
  }

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

    // autoTimeOfDay有効時、バックグラウンド中の時間帯変化を反映（プレビュー中はスキップ）
    if (!weatherPreviewOpen && settingsService.weatherConfig.autoTimeOfDay) {
      applyWeather(settingsService.weatherConfig)
    }
  })

  // デバッグインジケーター（VITE_DEBUG_TIMER有効時のみ）
  // E2Eテストがアニメーション状態・感情パラメータを検証するためのDOM要素
  const debugIndicator = isDebugTimer ? (() => {
    const el = document.createElement('div')
    el.id = 'debug-animation-state'
    el.style.display = 'none'
    document.body.appendChild(el)
    return el
  })() : null

  // レンダリングループ
  const clock = new THREE.Clock()
  const animate = (): void => {
    requestAnimationFrame(animate)
    const delta = clock.getDelta()
    const deltaMs = delta * 1000

    if (orchestrator.isRunning && windowFocused) {
      orchestrator.tick(deltaMs)
    }

    // 感情パラメータの自然変化（emotionAccumulation無効時はスキップ）
    if (isFeatureEnabled(currentLicenseMode, 'emotionAccumulation')) {
      const isWorkPhase = orchestrator.isRunning && session.currentPhase.type === 'work'
      emotionService.tick(deltaMs, isWorkPhase)
    }

    // インタラクション追跡の時間更新
    interactionTracker.tick(deltaMs)

    updateBehavior(
      character, behaviorSM, charHandle, deltaMs,
      scrollManager, (state) => scrollRenderer.update(state),
      behaviorOptions
    )
    rainEffect.update(deltaMs)
    snowEffect.update(deltaMs)
    cloudEffect.update(deltaMs)
    charHandle.update(delta)
    renderer.render(scene, camera)

    // デバッグインジケーター更新
    if (debugIndicator) {
      debugIndicator.dataset.clipName = charHandle.animationController.currentClipName ?? ''
      debugIndicator.dataset.state = behaviorSM.currentState
      debugIndicator.dataset.previousState = behaviorSM.previousState ?? ''
      debugIndicator.dataset.presetName = behaviorSM.currentPreset
      debugIndicator.dataset.phaseProgress = String(session.isRunning ? session.phaseProgress : 0)
      debugIndicator.dataset.emotion = JSON.stringify(emotionService.state)
      debugIndicator.dataset.interactionLocked = String(behaviorSM.isInteractionLocked())
      debugIndicator.dataset.recentClicks = String(interactionTracker.history.recentClicks)
      debugIndicator.dataset.totalFeedingsToday = String(interactionTracker.history.totalFeedingsToday)
    }
  }
  animate()
}

main()
