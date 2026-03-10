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
import { createEmotionHistoryService } from './application/character/EmotionHistoryService'
import { bridgeEmotionHistory } from './application/character/EmotionHistoryBridge'
import { createBiorhythmService } from './application/character/BiorhythmService'
import { NEUTRAL_BIORHYTHM } from './domain/character/value-objects/BiorhythmState'
import { createInteractionTracker, type InteractionTracker } from './domain/character/services/InteractionTracker'
import type { PomodoroEvent } from './application/timer/PomodoroEvents'
import type { EmotionStateUpdatedEvent } from './application/character/EmotionEvents'
import { createInteractionAdapter } from './adapters/three/ThreeInteractionAdapter'
import { createDefaultSceneConfig } from './domain/environment/value-objects/SceneConfig'
import { resolvePreset } from './domain/environment/value-objects/ScenePreset'
import type { ScenePresetName } from './domain/environment/value-objects/ScenePreset'
import { createChunkDecorator } from './infrastructure/three/ChunkDecorator'
import { createScrollManager } from './application/environment/ScrollUseCase'
import { createInfiniteScrollRenderer } from './infrastructure/three/InfiniteScrollRenderer'
import { createAudioAdapter } from './infrastructure/audio/AudioAdapter'
import type { SoundPreset } from './infrastructure/audio/ProceduralSounds'
import { createSfxPlayer } from './infrastructure/audio/SfxPlayer'
import { bridgeTimerToSfx } from './application/timer/TimerSfxBridge'
import { bridgeTimerToNotification, type NotificationPort } from './application/notification/NotificationBridge'
import { bridgePomodoroToSleepPrevention, type SleepPreventionPort } from './application/sleep-prevention/SleepPreventionBridge'
import { createStatisticsService } from './application/statistics/StatisticsService'
import { bridgeTimerToStatistics } from './application/statistics/StatisticsBridge'
import { createPomodoroOrchestrator, type PomodoroOrchestrator } from './application/timer/PomodoroOrchestrator'
import { createFureaiCoordinator, type FureaiCoordinator } from './application/fureai/FureaiCoordinator'
import { createGalleryCoordinator, type GalleryCoordinator } from './application/gallery/GalleryCoordinator'
import { createCabbageObject } from './infrastructure/three/CabbageObject'
import { createAppleObject } from './infrastructure/three/AppleObject'
import { createFeedingInteractionAdapter, DEFAULT_CAMERA, FUREAI_CAMERA, type FeedingInteractionAdapter } from './adapters/three/FeedingInteractionAdapter'
import type { CharacterBehavior } from './domain/character/value-objects/BehaviorPreset'
import type { PhaseTriggerMap } from './domain/timer/value-objects/PhaseTrigger'
import type { WeatherConfig } from './domain/environment/value-objects/WeatherConfig'
import { resolveTimeOfDay } from './domain/environment/value-objects/WeatherConfig'
// resolveEnvironmentTheme は envSimService が天文計算ベースでテーマ生成するため不要
// EnvironmentTheme型はapplyThemeToSceneの引数型として間接的に使用される
import type { EnvironmentThemeParams } from './domain/environment/value-objects/EnvironmentTheme'
import { isFeatureEnabled } from './application/license/LicenseState'
import type { LicenseMode } from './application/license/LicenseState'
import { createRainEffect } from './infrastructure/three/RainEffect'
import { createSnowEffect } from './infrastructure/three/SnowEffect'
import { createCloudEffect } from './infrastructure/three/CloudEffect'
import { createThemeTransitionService } from './application/environment/ThemeTransitionService'
import { THEME_TRANSITION_DURATION_AUTO_MS, THEME_TRANSITION_DURATION_MANUAL_MS } from './domain/environment/value-objects/ThemeLerp'
import { createEnvironmentSimulationService, type EnvironmentSimulationService, type WeatherDecisionChangedEvent } from './application/environment/EnvironmentSimulationService'
import { createAstronomyAdapter } from './infrastructure/astronomy/AstronomyAdapter'
import { createClimateGridAdapter, type ClimateGridJson } from './infrastructure/climate/ClimateGridAdapter'
import { computeParticleCount, cloudDensityToLevel } from './domain/environment/value-objects/WeatherDecision'
import { DEFAULT_CLIMATE } from './domain/environment/value-objects/ClimateData'
import climateGridData from '../assets/data/climate-grid.json'

// シーンプリセットに連動するデフォルト環境音
const SCENE_SOUND_MAP: Record<ScenePresetName, SoundPreset> = {
  meadow: 'forest',
  seaside: 'wind',
  park: 'forest',
}

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
  const initialPreset = resolvePreset('meadow')
  const chunkCount = 6
  let currentPresetName: ScenePresetName = initialPreset.name
  const scrollManager = createScrollManager(sceneConfig, initialPreset.chunkSpec, chunkCount)
  const scrollRenderer = createInfiniteScrollRenderer(
    scene, sceneConfig, initialPreset.chunkSpec, chunkCount, createChunkDecorator(initialPreset.name),
  )

  // シーンプリセット切替
  function switchScenePreset(name: ScenePresetName): void {
    if (name === currentPresetName) return
    currentPresetName = name
    const preset = resolvePreset(name)
    const decorator = createChunkDecorator(name)
    scrollRenderer.rebuildChunks(preset.chunkSpec, decorator)

    // 環境音をプリセットに連動
    const soundPreset = SCENE_SOUND_MAP[name]
    audio.switchPreset(soundPreset)
  }

  // 雨エフェクト
  const rainEffect = createRainEffect(scene)
  const snowEffect = createSnowEffect(scene)
  const cloudEffect = createCloudEffect(scene)

  // テーマパラメータをシーンに反映する関数
  function applyThemeToScene(params: EnvironmentThemeParams): void {
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
  }

  // テーマ遷移サービス
  const themeTransition = createThemeTransitionService()

  // 天気適用関数
  /**
   * 天気エフェクト（雨/雪/雲パーティクル）の適用。
   * テーマ（ライティング）はenvSimServiceが天文計算ベースで生成するため、ここではエフェクトのみ制御する。
   */
  function applyWeatherEffects(config: WeatherConfig, immediate = false): void {
    const weather = config.weather

    if (immediate) {
      rainEffect.setVisible(weather === 'rainy')
      snowEffect.setVisible(weather === 'snowy')
      cloudEffect.setWeatherColor(weather)
      cloudEffect.setDensity(config.cloudDensityLevel)
      cloudEffect.setVisible(config.cloudDensityLevel > 0)
    } else {
      const duration = THEME_TRANSITION_DURATION_MANUAL_MS

      if (weather === 'rainy') rainEffect.fadeIn(duration)
      else rainEffect.fadeOut(duration)

      if (weather === 'snowy') snowEffect.fadeIn(duration)
      else snowEffect.fadeOut(duration)

      cloudEffect.setWeatherColor(weather)
      cloudEffect.setDensity(config.cloudDensityLevel)
      if (config.cloudDensityLevel > 0) cloudEffect.fadeIn(duration)
      else cloudEffect.fadeOut(duration)
    }
  }

  // ポモドーロタイマー初期化
  const bus = createEventBus()

  // 環境シミュレーションサービス（天文計算・候・気候・天気自動決定）
  const astronomyAdapter = createAstronomyAdapter()
  const climateGridAdapter = createClimateGridAdapter(climateGridData as ClimateGridJson)
  const envSimService: EnvironmentSimulationService = createEnvironmentSimulationService(
    astronomyAdapter, climateGridAdapter, themeTransition, bus
  )
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

  // BiorhythmService（バイオリズム管理 — registeredのみ有効）
  // settingsService.loadFromStorage()後にoriginDayを再設定する
  const biorhythmService = createBiorhythmService(Date.now())

  const behaviorSM = createBehaviorStateMachine({
    fixedWanderDirection: sceneConfig.direction,
    getDurationModifier: () => isFeatureEnabled(currentLicenseMode, 'biorhythm')
      ? biorhythmService.state.activity : 0,
  })
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

  // EmotionHistoryService（感情履歴の永続化）
  const emotionHistoryService = createEmotionHistoryService()

  // EmotionService（感情パラメータ管理）
  const emotionService: EmotionService = createEmotionService(settingsService.emotionConfig.affinity)

  // 感情状態UIへのpublishヘルパー（1秒間隔スロットリング）
  let lastEmotionEmitTime = 0
  const EMOTION_EMIT_INTERVAL_MS = 1000

  function emitEmotionState(force: boolean = false): void {
    const now = Date.now()
    if (!force) {
      const elapsed = now - lastEmotionEmitTime
      if (elapsed < EMOTION_EMIT_INTERVAL_MS) return
    }
    lastEmotionEmitTime = now
    bus.publish<EmotionStateUpdatedEvent>('EmotionStateUpdated', {
      type: 'EmotionStateUpdated',
      state: emotionService.state,
    })
  }

  // InteractionTracker（クリック回数・餌やり回数追跡）
  const interactionTracker: InteractionTracker = createInteractionTracker()

  // 感情イベント購読（ポモドーロ完了/中断、餌やり成功）
  // emotionAccumulation が無効なら感情パラメータの変化と永続化をスキップ
  bus.subscribe<PomodoroEvent>('PomodoroCompleted', () => {
    if (!isFeatureEnabled(currentLicenseMode, 'emotionAccumulation')) return
    emotionService.applyEvent({ type: 'pomodoro_completed' })
    settingsService.updateEmotionConfig({ affinity: emotionService.state.affinity })
    emotionHistoryService.saveCurrentState(emotionService.state)
    emitEmotionState(true)
  })
  bus.subscribe<PomodoroEvent>('PomodoroAborted', () => {
    if (!isFeatureEnabled(currentLicenseMode, 'emotionAccumulation')) return
    emotionService.applyEvent({ type: 'pomodoro_aborted' })
    settingsService.updateEmotionConfig({ affinity: emotionService.state.affinity })
    emotionHistoryService.saveCurrentState(emotionService.state)
    emitEmotionState(true)
  })
  bus.subscribe<{ type: 'FeedingSuccess' }>('FeedingSuccess', () => {
    if (!isFeatureEnabled(currentLicenseMode, 'emotionAccumulation')) {
      interactionTracker.recordFeeding()
    } else {
      emotionService.applyEvent({ type: 'fed' })
      interactionTracker.recordFeeding()
      settingsService.updateEmotionConfig({ affinity: emotionService.state.affinity })
      emotionHistoryService.saveCurrentState(emotionService.state)
      emitEmotionState(true)
    }
    if (isFeatureEnabled(currentLicenseMode, 'biorhythm')) {
      biorhythmService.applyFeedingBoost()
    }
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
    getBiorhythm: () => isFeatureEnabled(currentLicenseMode, 'biorhythm')
      ? biorhythmService.state : NEUTRAL_BIORHYTHM,
  }

  // FureaiCoordinator（ふれあいモードのシーン遷移+プリセット切替+餌やり制御）
  let fureaiCoordinator: FureaiCoordinator = createFureaiCoordinator({
    bus, sceneManager, onBehaviorChange: switchPreset, behaviorSM, feedingAdapter
  })

  // GalleryCoordinator（アニメーションギャラリーのシーン遷移+アニメーション再生）
  const galleryCharHandle = {
    playState: charHandle.playState,
    playAnimation: charHandle.playAnimation,
    stopAnimation: () => charHandle.animationController.stop(),
    setPosition: charHandle.setPosition,
  }
  let galleryCoordinator: GalleryCoordinator = createGalleryCoordinator({
    bus, sceneManager, onBehaviorChange: switchPreset, charHandle: galleryCharHandle
  })

  // React UIマウント
  const appRoot: Root = createRoot(document.getElementById('app-root')!)
  function renderReactUI(): void {
    const deps: AppDeps = {
      bus, session, config: settingsService.currentConfig, orchestrator,
      settingsService, audio, sfx: sfxPlayer, debugTimer: isDebugTimer,
      character, behaviorSM, charHandle, statisticsService, fureaiCoordinator,
      galleryCoordinator, emotionHistoryService, envSimService,
      climateGridPort: climateGridAdapter
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
    galleryCoordinator = createGalleryCoordinator({
      bus, sceneManager, onBehaviorChange: switchPreset, charHandle: galleryCharHandle
    })
    renderReactUI()
  })

  // autoTimeOfDay: 1分間隔で時間帯を監視し天気を再適用
  let autoTimeInterval: ReturnType<typeof setInterval> | null = null
  function startAutoTimeInterval(): void {
    if (autoTimeInterval !== null) return
    autoTimeInterval = setInterval(() => {
      applyWeatherEffects(settingsService.weatherConfig)
    }, 60000)
  }
  function stopAutoTimeInterval(): void {
    if (autoTimeInterval !== null) {
      clearInterval(autoTimeInterval)
      autoTimeInterval = null
    }
  }

  // WeatherConfigChanged → 天気適用 + プリセット切替 + envSim連動
  bus.subscribe<SettingsEvent>('WeatherConfigChanged', (event) => {
    if (event.type !== 'WeatherConfigChanged') return
    switchScenePreset(event.weather.scenePreset)

    const climate = event.weather.climate ?? DEFAULT_CLIMATE

    // オーバーライド設定をstart()より前に適用（start内のrunFullComputationが正しい値を使うため）
    envSimService.setAutoWeather(event.weather.autoWeather)

    // 手動候設定
    if (!event.weather.autoKou) {
      envSimService.setManualKou(event.weather.manualKouIndex)
    } else {
      envSimService.setManualKou(null)
    }

    if (!event.weather.autoTimeOfDay) {
      envSimService.setManualTimeOfDay(event.weather.timeOfDay)
    } else {
      envSimService.setManualTimeOfDay(null)
    }

    if (!event.weather.autoWeather) {
      envSimService.setManualWeather({
        weather: event.weather.weather,
        precipIntensity: 0,
        cloudDensity: event.weather.cloudDensityLevel / 5,
      })
    }

    // envSimServiceは climate が設定されていれば常時起動（天文計算+テーマ生成）
    if (!envSimService.isRunning) {
      envSimService.start(climate, event.weather.scenePreset)
    } else {
      envSimService.onClimateChanged(climate)
      envSimService.onScenePresetChanged(event.weather.scenePreset)
    }

    if (event.weather.autoWeather) {
      stopAutoTimeInterval()
    } else {
      // 手動天気のエフェクト適用
      applyWeatherEffects(event.weather)
    }
  })

  // WeatherDecisionChanged → envSimServiceが発行する天気決定をエフェクトに反映
  bus.subscribe<WeatherDecisionChangedEvent>('WeatherDecisionChanged', (event) => {
    const { weather, precipIntensity, cloudDensity } = event.decision
    const duration = THEME_TRANSITION_DURATION_AUTO_MS

    // 雨/雪エフェクト切替
    if (weather === 'rainy') {
      rainEffect.fadeIn(duration)
      rainEffect.setParticleCount(computeParticleCount('rainy', precipIntensity))
    } else {
      rainEffect.fadeOut(duration)
    }
    if (weather === 'snowy') {
      snowEffect.fadeIn(duration)
      snowEffect.setParticleCount(computeParticleCount('snowy', precipIntensity))
    } else {
      snowEffect.fadeOut(duration)
    }

    // 雲エフェクト
    const cloudLevel = cloudDensityToLevel(cloudDensity)
    cloudEffect.setWeatherColor(weather)
    cloudEffect.setDensity(cloudLevel)
    if (cloudLevel > 0) cloudEffect.fadeIn(duration)
    else cloudEffect.fadeOut(duration)
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

  // 感情履歴ブリッジ（EventBus購読→履歴記録）
  bridgeEmotionHistory(bus, emotionHistoryService)

  // 保存済み設定の復元（購読登録後に実行）
  await settingsService.loadFromStorage()

  // EmotionHistoryServiceの復元（loadFromStorage後に実行）
  await emotionHistoryService.loadFromStorage()

  // EmotionServiceの全感情パラメータ復元（クロスセッション効果適用込み）
  const startupResult = emotionHistoryService.calculateStartupEffect()
  if (startupResult) {
    emotionService.loadFullState(startupResult.state)
  } else {
    emotionService.loadAffinity(settingsService.emotionConfig.affinity)
  }

  // BiorhythmServiceのoriginDay復元（loadFromStorage後に実行）
  biorhythmService.setOriginDay(settingsService.biorhythmConfig.originDay)

  // 保存済み統計データの復元
  await statisticsService.loadFromStorage()

  // 初期天気・プリセット適用（loadFromStorageでWeatherConfigChangedが発行されない場合のフォールバック）
  switchScenePreset(settingsService.weatherConfig.scenePreset)
  {
    const wc = settingsService.weatherConfig
    const climate = wc.climate ?? DEFAULT_CLIMATE
    // envSimServiceは常に起動（天文計算ベースのライティング）
    envSimService.setAutoWeather(wc.autoWeather)
    if (!wc.autoKou) {
      envSimService.setManualKou(wc.manualKouIndex)
    }
    if (!wc.autoWeather) {
      envSimService.setManualWeather({
        weather: wc.weather,
        precipIntensity: 0,
        cloudDensity: wc.cloudDensityLevel / 5,
      })
    }
    // 手動timeOfDay: autoWeather=false かつ autoTimeOfDay=false の場合のみ
    if (!wc.autoWeather && !wc.autoTimeOfDay) {
      envSimService.setManualTimeOfDay(wc.timeOfDay)
    }
    envSimService.start(climate, wc.scenePreset)
    // 起動時テーマを即座にシーンに反映（applyImmediateは内部状態のみ更新しtick()はnullを返すため）
    if (themeTransition.currentParams) {
      applyThemeToScene(themeTransition.currentParams)
    }
    if (!wc.autoWeather) {
      // 手動天気のエフェクト適用（即座切替）
      applyWeatherEffects(wc, true)
    }
  }

  // 初回React UIレンダリング
  renderReactUI()

  // 感情状態の初期値をUIに通知
  // setTimeout(0)でReactのuseEffect購読開始後に発火させる
  if (isFeatureEnabled(currentLicenseMode, 'emotionAccumulation')) {
    setTimeout(() => emitEmotionState(true), 0)
  }

  // インタラクション（ホバー、クリック、摘まみ上げ、撫でる）
  createInteractionAdapter(renderer, camera, character, behaviorSM, charHandle, {
    onClickInteraction: () => interactionTracker.recordClick(),
    onPetCompleted: () => {
      if (isFeatureEnabled(currentLicenseMode, 'emotionAccumulation')) {
        emotionService.applyEvent({ type: 'petted' })
        settingsService.updateEmotionConfig({ affinity: emotionService.state.affinity })
        emotionHistoryService.recordEvent('petted')
        emotionHistoryService.saveCurrentState(emotionService.state)
        emitEmotionState(true)
      }
      if (isFeatureEnabled(currentLicenseMode, 'biorhythm')) {
        biorhythmService.applyPettingBoost()
      }
    },
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

  // スリープ抑制（ポモドーロ中のOSスリープを防止）
  const sleepPreventionPort: SleepPreventionPort = {
    start: () => { window.electronAPI?.startSleepBlocker() },
    stop: () => { window.electronAPI?.stopSleepBlocker() },
  }
  bridgePomodoroToSleepPrevention(
    bus,
    sleepPreventionPort,
    () => settingsService.powerConfig.preventSleep
  )

  // WeatherConfigChanged購読でinterval管理（プレビュー中やautoWeather時はinterval開始しない）
  bus.subscribe<SettingsEvent>('WeatherConfigChanged', (event) => {
    if (event.type !== 'WeatherConfigChanged') return
    if (weatherPreviewOpen) return
    if (event.weather.autoWeather) {
      stopAutoTimeInterval()
    } else if (event.weather.autoTimeOfDay) {
      startAutoTimeInterval()
    } else {
      stopAutoTimeInterval()
    }
  })
  // 初期状態でautoTimeOfDay有効（かつautoWeather無効）ならinterval開始
  if (settingsService.weatherConfig.autoTimeOfDay && !settingsService.weatherConfig.autoWeather) {
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
      applyWeatherEffects(settingsService.weatherConfig)
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
      emitEmotionState()
    }

    // バイオリズムの更新（registeredのみ）
    if (isFeatureEnabled(currentLicenseMode, 'biorhythm')) {
      biorhythmService.tick(deltaMs)
    }

    // インタラクション追跡の時間更新
    interactionTracker.tick(deltaMs)

    // galleryシーン中はBehaviorStateMachineの自律行動をスキップ
    if (sceneManager.currentScene !== 'gallery') {
      updateBehavior(
        character, behaviorSM, charHandle, deltaMs,
        scrollManager, (state) => scrollRenderer.update(state),
        behaviorOptions
      )
    }
    // 環境シミュレーション更新（autoWeather有効時のみ実行。内部でthemeTransition.transitionTo()を呼ぶ）
    envSimService.tick(deltaMs)

    // テーマ遷移の補間更新
    const interpolatedParams = themeTransition.tick(deltaMs)
    if (interpolatedParams) {
      applyThemeToScene(interpolatedParams)
    }

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
      debugIndicator.dataset.biorhythm = JSON.stringify(
        isFeatureEnabled(currentLicenseMode, 'biorhythm') ? biorhythmService.state : NEUTRAL_BIORHYTHM
      )
      debugIndicator.dataset.biorhythmBoost = JSON.stringify(biorhythmService.boost)
    }
  }
  animate()
}

main()
