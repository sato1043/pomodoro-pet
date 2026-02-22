# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Electron + Vite HMR 開発サーバー起動
npm run build        # electron-vite プロダクションビルド（out/ に出力）
npm test             # Vitest テスト全実行
npm run test:watch   # Vitest ウォッチモード
npx vitest run tests/domain/timer/PomodoroStateMachine.test.ts  # 単一テスト実行
npm run package      # ビルド + Windows NSISインストーラー生成（release/ に出力）
npm run package:dir  # ビルド + 展開済みディレクトリ出力
npm run test:e2e     # Playwright E2Eテスト（xvfb-run + デバッグタイマービルド）
npm run test:e2e:headed  # E2Eテスト（GUI表示あり、Windows/GUI環境用）
npm run deploy:local # win-unpackedをC:\temp\pomodoro-petにコピーしてexe起動
npm run icon         # build/icon.pngからマルチサイズICO生成（要ImageMagick）
npm run licenses     # THIRD_PARTY_LICENSES.txt生成（npmライセンス+ASSET_CREDITS.txt結合）
```

WSL2で必要なシステムパッケージ:
```bash
# Electron実行に必要（npm run dev）
sudo apt install -y libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 libgtk-3-0t64 libgbm1 libasound2t64 libxshmfence1 libxdamage1 libxrandr2 libxcomposite1 libxfixes3 libpango-1.0-0 libcairo2 libpulse0

# Windowsパッケージビルドに必要（npm run package / package:dir）
sudo dpkg --add-architecture i386 && sudo apt-get update && sudo apt-get install -y wine wine32:i386
rm -rf ~/.wine && wineboot --init

# アイコンICO生成に必要（npm run icon）
sudo apt install -y imagemagick
```

## Architecture

クリーンアーキテクチャ。依存方向は外→内のみ。

```
domain（最内層）← application ← adapters ← infrastructure（最外層）
```

### Electron プロセス構成

- `desktop/main/index.ts` — メインプロセス（BrowserWindow生成、SwiftShaderフォールバック、DevTools環境変数制御、設定永続化IPC、`notification:show` IPCハンドラ、`about:load` IPCハンドラ）。`__APP_ID__`（electron-vite define埋め込み）で`app.setAppUserModelId()`を設定（Windows通知に必須）
- `desktop/preload/index.ts` — contextBridge（`contextIsolation: true`, `nodeIntegration: false`、設定ロード/セーブ/showNotification/loadAbout API公開）
- `src/main.ts` — レンダラープロセスのエントリポイント。全モジュールの組立とレンダリングループ。blur/focusイベントでバックグラウンド検出、setInterval(1秒)でバックグラウンドタイマー継続
- `src/electron.d.ts` — `window.electronAPI`の型定義（platform, loadSettings, saveSettings, showNotification）

### ドメイン層 (`src/domain/`)

4つのコンテキスト。外部依存なし。

- **timer**: `PomodoroStateMachine` エンティティ。`CyclePlan`（フェーズ順列）をインデックス走査する方式。デフォルト1セット/サイクル。tick(deltaMs)でイベント配列を返す純粋ロジック。`PomodoroState`判別共用体型（work/break/long-break + running, congrats）で状態を表現。`exitManually()`でcongrats中以外の手動終了。`phaseProgress`ゲッター（0.0〜1.0）でフェーズ内進行度を公開。`PomodoroStateMachineOptions`で`PhaseTimeTrigger`を注入可能（elapsed/remainingタイミングでTriggerFiredイベント発行）。break/long-breakの残り30秒でgetsetトリガーを発行し、TimerSfxBridgeがBGM切替に使用。`CyclePlan`値オブジェクト（`buildCyclePlan(config)`）がセット構造・休憩タイプを一元管理。Sets=1はBreak、Sets>1の最終セットはLong Break。`parseDebugTimer(spec)`でVITE_DEBUG_TIMERの秒数指定をパース
- **character**: `BehaviorStateMachine` が11状態（idle/wander/march/sit/sleep/happy/reaction/dragged/pet/refuse/feeding）を管理。`previousState`で直前の状態を追跡。`march`はwork中の目的ある前進（scrolling=true、phaseProgress連動で速度1.5→2.5加速）、`wander`はbreak/free中のふらつき歩き（scrolling=false）。`feeding`はふれあいモードで餌を食べる状態（sitアニメ代用、3-5秒、loop=false）。遷移トリガーは timeout/prompt/interaction の3種。`InteractionKind`に`feed`を含む。`fixedWanderDirection`オプションでmarch方向を固定可能。`GestureRecognizer`でドラッグ/撫でるを判定。`isInteractionLocked()`でポモドーロ作業中のインタラクション拒否を判定。`lockState`/`unlockState`で状態ロック（congrats時happy、work時march）。`BehaviorPreset.durationOverrides`でプリセット別に状態の持続時間を上書き可能（march-cycle: march 30〜60秒、idle 3〜5秒）。fureai-idleプリセットではfeeding→happy遷移を定義。`AnimationResolver`インターフェースでコンテキスト依存のアニメーション選択を抽象化（state/previousState/presetName/phaseProgress/emotion/interaction/timeOfDay/todayCompletedCycles→clipName/loop/speed）。`EnrichedAnimationResolver`が16ルールで具体的な選択を実装（march終盤run、疲労歩き、連打怒り、起き上がりなど）。`EmotionState`値オブジェクト（satisfaction/fatigue/affinity）で感情パラメータを管理、affinityのみ永続化。`InteractionTracker`でクリック回数（3秒ウィンドウ）・餌やり回数を追跡
- **environment**: `SceneConfig`（進行方向・スクロール速度・状態別スクロール有無）と`ChunkSpec`（チャンク寸法・オブジェクト数）。`shouldScroll()`純粋関数。`WeatherConfig`値オブジェクト（`WeatherType`晴/曇/雨/雪、`TimeOfDay`朝/昼/夕/夜、`CloudDensityLevel`0-5の6段階雲量、`autoTimeOfDay`フラグ）。`resolveTimeOfDay(hour)`で時刻→時間帯変換。`cloudPresetLevel(weather)`で天気→雲量プリセット変換。`EnvironmentThemeParams`（空色・霧・ライト・地面色・露出の描画パラメータ）。`resolveEnvironmentTheme(weather, timeOfDay)`で20パターン（4天気×4時間帯+フォールバック）のルックアップテーブル
- **shared**: `EventBus`（Pub/Sub）。UI/インフラ層への通知専用。階層間の状態連動はPomodoroOrchestratorが直接コールバックで管理

### アプリケーション層 (`src/application/`)

- `PomodoroOrchestrator` — AppScene遷移+タイマー操作+キャラクター行動を一元管理。階層間連動は直接コールバック（onBehaviorChange）、EventBusはUI/インフラ通知のみ。CycleCompleted時に自動でexitPomodoro。`phaseToPreset()`でフェーズ→BehaviorPresetマッピング。手動中断時に`PomodoroAborted`、サイクル完了時に`PomodoroCompleted`をEventBus経由で発行（`PomodoroEvents.ts`で型定義）
- `AppSceneManager` — アプリケーションシーン管理（free/pomodoro/settings/fureai）。純粋な状態ホルダー（EventBus不要）。enterPomodoro/exitPomodoro/enterFureai/exitFureaiがAppSceneEvent[]を返す
- `FureaiCoordinator` — ふれあいモードのシーン遷移+プリセット切替+餌やり制御を協調。enterFureai()でfureai-idleプリセット+FeedingAdapter活性化、exitFureai()でautonomousプリセット+FeedingAdapter非活性化。feedCharacter()でfeeding状態遷移。`FeedingAdapter`インターフェースでアダプター層の活性化制御を抽象化。PomodoroOrchestratorとは独立
- `DisplayTransition` — 宣言的シーン遷移グラフ。`DisplayScene`型（AppScene+PhaseTypeの結合キー）、`DISPLAY_SCENE_GRAPH`定数（遷移ルールのテーブル）、`DisplayTransitionState`（テーブルルックアップによる状態管理）。`toDisplayScene()`変換ヘルパー
- `AppSettingsService` — タイマー設定＋サウンド設定＋バックグラウンド設定＋天気設定＋感情設定管理。分→ms変換＋`createConfig()`バリデーション。`SettingsChanged`/`SoundSettingsLoaded`/`BackgroundSettingsLoaded`/`WeatherConfigChanged`イベントをEventBus経由で発行。`loadFromStorage()`/`saveAllToStorage()`でElectron IPC経由の永続化（`{userData}/settings.json`）。`BackgroundConfigInput`（backgroundAudio/backgroundNotify）でバックグラウンド時の挙動を制御。`weatherConfig`ゲッター＋`updateWeatherConfig(partial)`で天気設定の部分更新と永続化。`emotionConfig`ゲッター＋`updateEmotionConfig()`でaffinity永続化
- `InterpretPromptUseCase` — 英語/日本語キーワードマッチング → 行動名に変換
- `UpdateBehaviorUseCase` — 毎フレームtick。StateMachine遷移 + AnimationResolver経由のコンテキスト依存アニメーション選択 + ScrollManager経由で背景スクロール制御。`UpdateBehaviorOptions`でリゾルバ・phaseProgress・emotion・interaction・timeOfDay・todayCompletedCyclesを注入
- `EmotionService` — 感情パラメータ管理。tick(deltaMs, isWorking)で自然変化、applyEvent()でイベント適用。PomodoroCompleted/Aborted/FeedingSuccessをEventBus経由で購読。affinityのみAppSettingsService経由で永続化
- `ScrollUseCase` — チャンク位置計算・リサイクル判定の純粋ロジック。Three.js非依存
- `TimerSfxBridge` — EventBus購読でタイマーSFXを一元管理。`PhaseStarted(work)`でwork開始音、`PhaseStarted(congrats)`でファンファーレ、`PhaseStarted(break)`でwork完了音を再生（long-break前はcongrats→ファンファーレのためwork完了音をスキップする遅延判定）。break/long-break中は`break-chill.mp3`をループ再生し、残り30秒で`break-getset.mp3`にクロスフェード切替。`PomodoroAborted`で`pomodoro-exit.mp3`を再生。`AudioControl`インターフェースで環境音の停止/復帰を制御。`TimerSfxConfig`でURL・per-fileゲインを個別指定可能。`shouldPlayAudio`コールバックでバックグラウンド時のオーディオ抑制に対応
- `NotificationBridge` — EventBus購読でバックグラウンド時にシステム通知を発行。PhaseCompleted(work/break)、PomodoroCompletedで通知。`NotificationPort`でElectron Notification APIを抽象化

### アダプター層 (`src/adapters/`)

全UIコンポーネントはReact JSX（`.tsx`）で実装。`createPortal`でdocument.bodyにポータル化。アイコンはインラインSVGコンポーネント。CSSは`ui/styles/overlay.css.ts`に分離。

- `three/ThreeCharacterAdapter` — FBXモデル読み込み（失敗時PlaceholderCharacterにフォールバック）。`FBXCharacterConfig` でモデルパス・スケール・テクスチャ・アニメーションを一括設定。`playState()`（STATE_CONFIGS準拠）と`playAnimation()`（AnimationSelection受取）の2メソッドでアニメーション再生
- `three/ThreeInteractionAdapter` — Raycasterベースのホバー/クリック/摘まみ上げ/撫でる。GestureRecognizerでドラッグ（Y軸持ち上げ）と撫でる（左右ストローク）を判定。`InteractionConfig`で状態別ホバーカーソルをカスタマイズ可能。`onClickInteraction`コールバックでクリック時のInteractionTracker連携
- `three/FeedingInteractionAdapter` — 餌オブジェクト（キャベツ/リンゴ）のドラッグ＆ドロップによる餌やり操作。複数`CabbageHandle[]`対応。Z平面投影+NDCベースZ制御（べき乗カーブで奥ほど加速）でパースペクティブ補正。ふれあいモード時にカメラをz=7に後退。距離< 2.5でfeed成功→`FeedingSuccess`イベント発行→3秒後再出現。`isActive`フラグでふれあいモード中のみ動作。`DEFAULT_CAMERA`/`FUREAI_CAMERA`定数をexportしmain.tsと共有
- `ui/App.tsx` — Reactルートコンポーネント。`AppProvider`で依存注入し、SceneRouterを配置
- `ui/AppContext.tsx` — `AppDeps`インターフェース定義とReact Context。`useAppDeps()`フックで全依存を取得
- `ui/SceneRouter.tsx` — AppScene切替コーディネーター。`AppSceneChanged`購読でSceneFree/ScenePomodoro/SceneFureaiを切替。シーン間遷移は常にblackout。`settings`AppSceneは`free`として扱う
- `ui/SceneFree.tsx` — freeシーンコンテナ。OverlayFree+StartPomodoroButton+SettingsButton+StatsButton+FureaiEntryButton+WeatherButton+StatsDrawer+WeatherPanel+各CloseButtonを束ねる。showStats/settingsExpanded/showWeatherで表示切替を管理。hideButtonsで排他表示制御
- `ui/ScenePomodoro.tsx` — pomodoroシーンコンテナ。OverlayPomodoroを束ねる
- `ui/SceneFureai.tsx` — fureaiシーンコンテナ。OverlayFureai+FureaiExitButton+PromptInput+HeartEffectを束ねる。`FeedingSuccess`イベント購読でハートエフェクトを発火
- `ui/OverlayFureai.tsx` — fureaiモードオーバーレイ（`data-testid="overlay-fureai"`）。createPortalでdocument.bodyに描画。コンパクト表示（タイトル+時計）
- `ui/FureaiEntryButton.tsx` — ふれあいモード遷移ボタン。画面左下のリンゴSVGアイコン（`bottom: 280`）。createPortalでdocument.bodyに描画
- `ui/FureaiExitButton.tsx` — ふれあいモードからfreeモードへの戻るボタン。←矢印アイコン。FureaiEntryButtonと同位置（`bottom: 280`）
- `ui/WeatherButton.tsx` — 天気パネル表示ボタン。画面左下の雲SVGアイコン（`bottom: 168`）。createPortalでdocument.bodyに描画
- `ui/WeatherCloseButton.tsx` — 天気パネルからの戻るボタン。←矢印アイコン。WeatherButtonと同位置（`bottom: 168`、`z-index: 1010`でパネルより上）
- `ui/WeatherPanel.tsx` — 天気設定パネル。コンパクトフローティングUI（`bottom: 110, left: 66`）。天気タイプ（sunny/cloudy/rainy/snowy）+雲量（0-5の6段階セグメント+リセットボタン）+時間帯（morning/day/evening/night/auto）をアイコンボタンで切替。ドラフトstate方式でプレビュー（EventBus発行のみ、永続化なし）、Setボタンで確定、閉じるとスナップショット復元。パネル表示中はカメラをふれあいモード位置に後退+キャラクターmarch-cycleプリセット
- `ui/AboutContent.tsx` — About画面（`data-testid="about-content"`）。バージョン情報（IPC経由で`app.getVersion()`）、プロジェクトライセンス（PolyForm Noncommercial 1.0.0）、サードパーティライセンス（THIRD_PARTY_LICENSES.txtをスクロール可能なpre表示）。`onBack`コールバックで設定パネルに戻る
- `ui/OverlayFree.tsx` — freeモードオーバーレイ（`data-testid="overlay-free"`）。createPortalでdocument.bodyに描画。タイトル "Pomodoro Pet" + 日付表示。FreeTimerPanelを統合（editor.expandedでFreeSummaryView/FreeSettingsEditor/AboutContentを切替）。useSettingsEditorフックでスナップショット/復元を管理。showAboutステートで設定パネル内のAbout表示を制御
- `ui/StartPomodoroButton.tsx` — Start Pomodoroボタン。画面下部固定（`bottom: 20`）。createPortalでdocument.bodyに描画
- `ui/SetButton.tsx` — 設定確定ボタン。StartPomodoroButtonと同位置・同スタイル。設定パネル展開時に表示
- `ui/BackButton.tsx` — 統計パネルからの戻るボタン。StartPomodoroButtonと同位置、キャンセル色（overlayBg）
- `ui/SettingsButton.tsx` — 設定パネル展開ボタン。画面左下のギアSVGアイコン（`bottom: 112`）。createPortalでdocument.bodyに描画
- `ui/StatsButton.tsx` — 統計パネル表示ボタン。画面左下のチャートSVGアイコン（`bottom: 224`）。createPortalでdocument.bodyに描画
- `ui/OverlayPomodoro.tsx` — pomodoroモードオーバーレイ（`data-testid="overlay-pomodoro"`）。createPortalでdocument.bodyに描画。`PhaseStarted`購読でwork/break/congrats切替。DisplayTransitionStateでイントラ・ポモドーロ遷移エフェクト解決。背景ティント計算。PomodoroTimerPanel/CongratsPanel描画
- `ui/SceneTransition.tsx` — 暗転レンダリング。全画面暗転オーバーレイ（`z-index: 10000`）。`playBlackout(cb)`: opacity 0→1 (350ms) → cb() → opacity 1→0 (350ms)。forwardRef+useImperativeHandleで親からの呼び出しに対応。SceneRouter（シーン間）とOverlayPomodoro（イントラ・ポモドーロ）がそれぞれインスタンスを所有
- `ui/PomodoroTimerPanel.tsx` — pomodoroモード。SVG円形プログレスリング（200px, r=90, stroke-width=12）でタイマー進捗をアナログ表現し、リング内にフェーズラベル＋フェーズカラー数字（work=緑、break=青、long-break=紫）を配置。背景にフェーズカラーの下→上グラデーションティント（時間経過でalpha 0.04→0.24に濃化）。左肩にサイクル進捗ドット。右肩にpause/stopのSVGアイコンボタン。`phaseColor`/`overlayTintBg`純粋関数をexport
- `ui/CongratsPanel.tsx` — congratsモード。祝福メッセージ＋CSS紙吹雪エフェクト
- `ui/HeartEffect.tsx` — ふれあいモード餌やり成功時のハートパーティクルエフェクト。createPortalでdocument.bodyに描画。10個のSVGハートが画面中央付近から浮き上がるCSSアニメーション（floatUp 1.2-2.0秒）。triggerKey=0で非表示
- `ui/VolumeControl.tsx` — サウンドプリセット選択・ボリュームインジケーター・ミュートの共通コンポーネント。ボリューム変更/ミュート解除時にSfxPlayerでテストサウンドを再生。ミュート/ボリューム操作時にAudioAdapter（環境音）とSfxPlayer（SFX）の両方を同期。OverlayFreeから利用
- `ui/PromptInput.tsx` — プロンプト入力UI
- `ui/hooks/useEventBus.ts` — EventBus購読のReactフック。`useEventBus`（状態取得）、`useEventBusCallback`（コールバック実行）、`useEventBusTrigger`（再レンダリングトリガー）

### インフラ層 (`src/infrastructure/`)

- `three/FBXModelLoader` — FBXLoader ラッパー。`resourcePath` でテクスチャパス解決
- `three/AnimationController` — AnimationMixer + crossFadeTo（0.3秒ブレンド）。`play(name, loop, speed?)`でtimeScale対応
- `three/PlaceholderCharacter` — プリミティブ形状の人型キャラクター + NumberKeyframeTrack による13種プロシージャルアニメーション（既存8種+run/attack2/damage1/damage2/getUp）
- `three/CabbageObject` — プリミティブSphereGeometryを重ねたキャベツ風3Dオブジェクト。外葉7個+反り返り葉2個+芯1個。スケール0.3。`CabbageHandle`インターフェースでposition/visible/reset操作。ふれあいモード時のみ表示
- `three/AppleObject` — プリミティブ形状のリンゴ3Dオブジェクト。赤い球体+ハイライト+茎+葉。スケール0.15（キャベツの半分）。`CabbageHandle`インターフェースを共用
- `three/EnvironmentBuilder` — 旧・単一シーン環境生成（現在は未使用、InfiniteScrollRendererに置換）
- `three/EnvironmentChunk` — 1チャンク分の環境オブジェクト生成。ChunkSpecに基づくランダム配置。regenerate()でリサイクル時に再生成
- `three/InfiniteScrollRenderer` — 3チャンクの3D配置管理。ScrollStateに基づく位置更新とリサイクル時のregenerate()呼び出し。霧・背景色設定。`applyTheme(params)`でEnvironmentThemeParamsに基づく空色・霧・地面色の動的更新
- `three/RainEffect` — 雨エフェクト。LineSegments（650本の短い線分）で残像付き雨粒を表現。地面到達時にスプラッシュパーティクル（リングバッファ方式、最大200個）を発生。`WeatherEffect`インターフェース（update/setVisible/dispose）を定義・exportし、SnowEffectが共用
- `three/SnowEffect` — 雪エフェクト。Points（750個）で雪粒を表現。パーティクルごとにランダムな位相・周波数を持ち、sin/cosでX/Z方向にゆらゆら揺れながら落下
- `three/CloudEffect` — 雲エフェクト。半透明の扁平SphereGeometry群（3-6個/雲）をクラスター化し、z方向にゆっくりドリフト。6段階密度（0=none〜5=overcast、最大100個）。`setDensity(level)`で雲数を動的に再生成
- `audio/ProceduralSounds` — Web Audio APIでRain/Forest/Windをノイズ+フィルタ+LFOから生成（外部mp3不要）
- `audio/AudioAdapter` — 環境音の再生/停止/音量/ミュート管理。`MAX_GAIN=0.25`でUI音量値をスケーリング。初期値はvolume=0/isMuted=true（起動時のデフォルト音量フラッシュ防止、loadFromStorage後にrefreshVolumeで復元）。ミュート時は`AudioContext.suspend()`でシステムリソースを解放、解除時に`resume()`で復帰。`setBackgroundMuted()`でバックグラウンド時のオーディオ抑制に対応（ユーザーミュートと独立管理）
- `audio/SfxPlayer` — MP3等の音声ファイルをワンショット再生（`play`）およびループ再生（`playLoop`/`stop`）。`crossfadeMs`指定時はループ境界・曲間切替でクロスフェード。per-source GainNodeで個別フェード制御+ファイル別音量補正（`gain`パラメータ）。fetch+decodeAudioDataでデコードし、バッファキャッシュで2回目以降は即時再生。volume/mute制御。`MAX_GAIN=0.25`でUI音量値をスケーリング。ミュート時はループ停止+`ctx.suspend()`、`play()`/`playLoop()`はミュート中早期リターン。`setBackgroundMuted()`でバックグラウンド時のSFX抑制に対応。VolumeControl（ミュート操作UI）はOverlayFreeのみに配置されるため、ポモドーロ実行中のミュート切替は発生しない

## Static Assets

`assets/` ディレクトリが Vite の `publicDir` として設定されている（`electron.vite.config.ts`）。FBXモデルやテクスチャは `/models/ファイル名`、音声ファイルは `/audio/ファイル名` でアクセスできる。

FBXファイル内のテクスチャ参照が `.psd` の場合、FBXLoaderは読めない。`ThreeCharacterAdapter` でPNGテクスチャを手動適用し、`mat.color.set(0xffffff)` でFBXLoaderが設定する暗いベースカラーをリセットする必要がある。

## Debug

`.env.development` で開発用の設定を行う。`.env.development.example` を参照。

```bash
# タイマー短縮モード（秒数指定）
# 書式: VITE_DEBUG_TIMER=work/break/long-break/sets
# 省略部分は前の値を引き継ぐ。setsデフォルト=2
# .env.development に以下を記述して npm run dev で起動
VITE_DEBUG_TIMER=10         # 全フェーズ10秒、Sets=2
VITE_DEBUG_TIMER=10/5       # work=10秒、break=5秒、long-break=5秒、Sets=2
VITE_DEBUG_TIMER=10/5/15    # work=10秒、break=5秒、long-break=15秒、Sets=2
VITE_DEBUG_TIMER=10/5/15/3  # work=10秒、break=5秒、long-break=15秒、Sets=3
# 注意: break/long-breakが30秒未満の場合、break-getsetトリガー（残り30秒）が開始直後に発火する

# DevTools自動オープン
VITE_DEV_TOOLS=1

# 開発サーバーのポート変更（デフォルト: 5173）
VITE_DEV_PORT=3000
```

Viteは`NODE_ENV`に応じてenvファイルを選択する:

| コマンド | NODE_ENV | 読み込まれるenvファイル |
|---|---|---|
| `npm run dev` | development | `.env` + `.env.development` |
| `npm run build` / `npm run package` | production | `.env` + `.env.production` |

`VITE_*`変数はビルド時に`import.meta.env.VITE_*`へ静的埋め込みされる。パッケージ済みアプリの実行時にenvファイルは参照されない。

`.env.production`に`VITE_DEBUG_TIMER`を記述すれば、パッケージビルドでもデバッグタイマーが有効になる。

`.env.development`、`.env.production`、`.env.local` はすべて `.gitignore` に含まれるためコミットされない。

## Testing

### ユニットテスト（Vitest）

テストはドメイン層とアプリケーション層に集中。Three.js依存のアダプター/インフラ層はテスト対象外。テストファイル一覧は [architecture.md](.claude/memories/architecture.md) を参照。

**コミット前に必ず `npm run test:coverage` を実行すること。** テスト全件通過とカバレッジレポート（`.claude/memories/coverage.txt`）の更新を確認してからコミットする。

### E2Eテスト（Playwright）

PlaywrightでElectronアプリの統合テストを実行。`VITE_DEBUG_TIMER=3/2/3/2`で短縮ビルドし、全ポモドーロサイクルを約1.5分で検証する。WSL2ではxvfb-runが必要（`sudo apt install -y xvfb`）。

テストファイル:
- `tests/e2e/smoke.spec.ts` — 起動・基本表示
- `tests/e2e/free-mode.spec.ts` — freeモードUI操作
- `tests/e2e/pomodoro-flow.spec.ts` — ポモドーロサイクル全体フロー
- `tests/e2e/settings-ipc.spec.ts` — 設定永続化（IPC経由、天気設定含む）
- `tests/e2e/weather-panel.spec.ts` — 天気パネルUI操作（表示/非表示、天気切替、時間帯切替、スナップショット復元、排他表示）
- `tests/e2e/button-visibility.spec.ts` — ボタン排他表示制御
- `tests/e2e/stats-panel.spec.ts` — 統計パネルUI操作
- `tests/e2e/fureai-mode.spec.ts` — ふれあいモードUI操作
- `tests/e2e/theme.spec.ts` — テーマ切替・スナップショット復元
- `tests/e2e/animation-state.spec.ts` — デバッグインジケーター経由のアニメーション状態・感情パラメータ検証

vanilla-extractのハッシュ化クラス名を回避するため、テスト対象のインタラクティブ要素には`data-testid`属性を使用する。

## Project Documents

`.claude/memories/` に詳細ドキュメントがある。

- [requirements.md](.claude/memories/requirements.md) — 要件定義と実装状況
- [architecture.md](.claude/memories/architecture.md) — アーキテクチャとファイルマップ
- [TODO.md](.claude/memories/TODO.md) — 今後の実装課題（優先度付き）
- [pomodoro-state-transitions.md](.claude/memories/pomodoro-state-transitions.md) — ポモドーロタイマー状態遷移設計
- [app-mode-design.md](.claude/memories/app-mode-design.md) — AppScene（free/pomodoro/settings）設計文書
- [fbx-integration.md](.claude/memories/fbx-integration.md) — FBXモデル導入ノウハウ
- [interaction-design.md](.claude/memories/interaction-design.md) — インタラクション設計（ジェスチャー判定・拡張ガイド）
- [scene-transition-design.md](.claude/memories/scene-transition-design.md) — シーンチェンジ演出（暗転トランジション）設計
- [react-migration.md](.claude/memories/react-migration.md) — React移行の経緯・効果・CSS方式選定（vanilla-extract採用理由）
- [asset-licensing-distribution.md](.claude/memories/asset-licensing-distribution.md) — 素材ライセンスと配布方式（購入素材の法的整理・リポジトリ構成）
- [source-code-licensing.md](.claude/memories/source-code-licensing.md) — ソースコードライセンス選定（PolyForm Noncommercial 1.0.0の調査・採用理由）
- [distribution-plan.md](.claude/memories/distribution-plan.md) — 有料配布方式（itch.io「Direct to you」モード・価格・税務・手数料試算）
- [character-animation-mapping.md](.claude/memories/character-animation-mapping.md) — キャラクター状態とFBXアニメーションの対応表
- [e2e-coverage-gaps.md](.claude/memories/e2e-coverage-gaps.md) — E2Eテストカバレッジ分析（カバー済み/未カバー/テスト不可能の分類）
- [CLA.md](CLA.md) — コントリビューターライセンス契約（著作権譲渡型、英語本文+日本語参考訳）
- [CONTRIBUTING.md](CONTRIBUTING.md) — コントリビューションガイドライン（CLA要件・手順・コーディング規約）

## Key Conventions

- TypeScript strict mode。すべてのインターフェースを明示的に定義
- ドメイン層は純粋関数/オブジェクトで構成。Three.js やDOM への依存を持たない
- `electron/` ディレクトリ名は使用禁止（`electron` npmパッケージ名と衝突する）。代わりに `desktop/` を使用
- rendererの root は `src/`（`electron.vite.config.ts` の `renderer.root: 'src'`）

## Known Issues & Tips

- electron-vite@5がvite@6対応。electron-vite@2はvite@5まで
- WSL2での`npm run package`/`npm run package:dir`はwineが必要。rcedit（exeのバージョン情報埋め込み）とsigntool（コード署名）がwine経由で実行されるため。
  wineの初期セットアップ:
  `sudo dpkg --add-architecture i386 && sudo apt-get update && sudo apt-get install -y wine wine32:i386`
  `rm -rf ~/.wine && wineboot --init`
  wineが正しくセットアップされていれば、証明書なしでも署名スキップされてビルド成功する。
  | 状態 | 結果 |
  |---|---|
  | wineなし | 失敗（rceditが実行できない） |
  | wineあり・証明書なし | 成功（署名スキップ） |
  コード署名証明書はDigiCert等の商用認証局から年間数万円で購入が必要。SSL/TLS証明書・商業登記電子証明書・AWS ACM等では代替不可。自分用・社内用なら署名不要。
  WSL2からWindows側のsigntool.exeを直接呼べるはずだが、electron-builderはWSL2をLinuxとして検出しwine経由のパスに入るため対応していない。`sign`オプションでカスタムスクリプトを書けば可能だが、証明書がなければ不要
- プロダクションビルドではアセットパスを相対パス（`./models/...`、`./audio/...`）にする必要がある。絶対パス（`/models/...`）だとファイルプロトコルでルートを指してしまい読み込み失敗する
- `npm run deploy:local`でwin-unpackedを`C:\temp\pomodoro-pet`にコピーしてexeを起動できる。ビルドからの一連の流れ: `npm run package:dir && npm run deploy:local`
- アプリアイコンは`build/icon.png`（512x512 RGBA）を元に`npm run icon`で`build/icon.ico`（6サイズ内包）を生成。ImageMagickが必要（`sudo apt install -y imagemagick`）。
  小サイズほど強いシャープニング（256px:0.5 → 16px:2.0）を適用しているが、タスクバー（32x32）では細部が潰れる限界がある。
  根本改善には小サイズ用の簡略化デザイン（太い輪郭線・シンプルなシルエット）を別途作成する必要がある
- Ubuntu 24.04では `libasound2` → `libasound2t64` に名称変更されている
- プロシージャル環境音はWeb Audio APIのノイズ+フィルタ+LFOで実現可能（外部mp3不要）
- WSL2でGPU初期化失敗時は`app.commandLine.appendSwitch('enable-unsafe-swiftshader')`でソフトウェアWebGLにフォールバック（desktop/main/index.tsに設定済み）
- WSL2では絵文字フォントが利用不可な場合がある。インラインSVGで代替する
- `electron-store` v9+はESM専用で`externalizeDepsPlugin()`のCJS出力と衝突する。設定永続化にはNode.js標準API（`fs` + `app.getPath('userData')`）で直接JSON読み書きする方式を採用
- 設定ファイル保存先: `{userData}/settings.json`（Windowsなら`%APPDATA%/pomodoro-pet/settings.json`）
- WSL2で音声を再生するには`libpulse0`が必要。WSLgのPulseServerソケット経由でWindows側に音声出力する
- WSL2のPulseAudio環境ではWeb Audio APIのAudioNode生成・破棄を繰り返すとストリームリソースがリークし、音声が途切れる。約10分のアイドルで自動復旧する。`pkill -f pulseaudio`で即座にリセット可能。Windowsネイティブ実行では発生しない
- `document.hasFocus()`はElectronで信頼できない（最小化してもtrueを返す場合がある）。バックグラウンド検出にはblur/focusイベントのフラグ管理を使用する
- `requestAnimationFrame`はブラウザ/Electronのバックグラウンドタブで停止する。バックグラウンドでもタイマーを進めるにはsetIntervalを併用する。ただしElectronではrAFがバックグラウンドでも低頻度（1fps程度）で継続する場合があり、setIntervalとrAFの両方が`orchestrator.tick`を呼ぶとタイマーが2倍速で進む。対策としてrAFループ内の`orchestrator.tick`は`windowFocused`が`true`のときのみ実行する
- Windowsのトースト通知には`app.setAppUserModelId()`が必須。未設定だと通知が表示されない
