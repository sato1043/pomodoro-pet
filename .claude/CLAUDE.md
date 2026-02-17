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
npm run deploy:local # win-unpackedをC:\temp\pomodoro-petにコピーしてexe起動
npm run icon         # build/icon.pngからマルチサイズICO生成（要ImageMagick）
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

- `desktop/main/index.ts` — メインプロセス（BrowserWindow生成、SwiftShaderフォールバック、DevTools環境変数制御、設定永続化IPC）
- `desktop/preload/index.ts` — contextBridge（`contextIsolation: true`, `nodeIntegration: false`、設定ロード/セーブAPI公開）
- `src/main.ts` — レンダラープロセスのエントリポイント。全モジュールの組立とレンダリングループ
- `src/electron.d.ts` — `window.electronAPI`の型定義（platform, loadSettings, saveSettings）

### ドメイン層 (`src/domain/`)

4つのコンテキスト。外部依存なし。

- **timer**: `PomodoroStateMachine` エンティティ。`CyclePlan`（フェーズ順列）をインデックス走査する方式。デフォルト1セット/サイクル。tick(deltaMs)でイベント配列を返す純粋ロジック。`PomodoroState`判別共用体型（work/break/long-break + running, congrats）で状態を表現。`exitManually()`でcongrats中以外の手動終了。`PomodoroStateMachineOptions`で`PhaseTimeTrigger`を注入可能（elapsed/remainingタイミングでTriggerFiredイベント発行）。break/long-breakの残り30秒でgetsetトリガーを発行し、TimerSfxBridgeがBGM切替に使用。`CyclePlan`値オブジェクト（`buildCyclePlan(config)`）がセット構造・休憩タイプを一元管理。Sets=1はBreak、Sets>1の最終セットはLong Break。`parseDebugTimer(spec)`でVITE_DEBUG_TIMERの秒数指定をパース
- **character**: `BehaviorStateMachine` が10状態（idle/wander/march/sit/sleep/happy/reaction/dragged/pet/refuse）を管理。`march`はwork中の目的ある前進（scrolling=true）、`wander`はbreak/free中のふらつき歩き（scrolling=false）。遷移トリガーは timeout/prompt/interaction の3種。`fixedWanderDirection`オプションでmarch方向を固定可能。`GestureRecognizer`でドラッグ/撫でるを判定。`isInteractionLocked()`でポモドーロ作業中のインタラクション拒否を判定。`lockState`/`unlockState`で状態ロック（congrats時happy、work時march）。`BehaviorPreset.durationOverrides`でプリセット別に状態の持続時間を上書き可能（march-cycle: march 30〜60秒、idle 3〜5秒）
- **environment**: `SceneConfig`（進行方向・スクロール速度・状態別スクロール有無）と`ChunkSpec`（チャンク寸法・オブジェクト数）。`shouldScroll()`純粋関数
- **shared**: `EventBus`（Pub/Sub）。UI/インフラ層への通知専用。階層間の状態連動はPomodoroOrchestratorが直接コールバックで管理

### アプリケーション層 (`src/application/`)

- `PomodoroOrchestrator` — AppScene遷移+タイマー操作+キャラクター行動を一元管理。階層間連動は直接コールバック（onBehaviorChange）、EventBusはUI/インフラ通知のみ。CycleCompleted時に自動でexitPomodoro。`phaseToPreset()`でフェーズ→BehaviorPresetマッピング。手動中断時に`PomodoroAborted`、サイクル完了時に`PomodoroCompleted`をEventBus経由で発行（`PomodoroEvents.ts`で型定義）
- `AppSceneManager` — アプリケーションシーン管理（free/pomodoro/settings）。純粋な状態ホルダー（EventBus不要）。enterPomodoro/exitPomodoroがAppSceneEvent[]を返す
- `DisplayTransition` — 宣言的シーン遷移グラフ。`DisplayScene`型（AppScene+PhaseTypeの結合キー）、`DISPLAY_SCENE_GRAPH`定数（遷移ルールのテーブル）、`DisplayTransitionState`（テーブルルックアップによる状態管理）。`toDisplayScene()`/`displaySceneToMode()`変換ヘルパー
- `AppSettingsService` — タイマー設定＋サウンド設定管理。分→ms変換＋`createConfig()`バリデーション。`SettingsChanged`/`SoundSettingsLoaded`イベントをEventBus経由で発行。`loadFromStorage()`/`saveAllToStorage()`でElectron IPC経由の永続化（`{userData}/settings.json`）
- `InterpretPromptUseCase` — 英語/日本語キーワードマッチング → 行動名に変換
- `UpdateBehaviorUseCase` — 毎フレームtick。StateMachine遷移 + ScrollManager経由で背景スクロール制御
- `ScrollUseCase` — チャンク位置計算・リサイクル判定の純粋ロジック。Three.js非依存
- `TimerSfxBridge` — EventBus購読でタイマーSFXを一元管理。`PhaseStarted(work)`でwork開始音、`PhaseStarted(congrats)`でファンファーレ、`PhaseStarted(break)`でwork完了音を再生（long-break前はcongrats→ファンファーレのためwork完了音をスキップする遅延判定）。break/long-break中は`break-chill.mp3`をループ再生し、残り30秒で`break-getset.mp3`にクロスフェード切替。`PomodoroAborted`で`pomodoro-exit.mp3`を再生。`AudioControl`インターフェースで環境音の停止/復帰を制御。`TimerSfxConfig`でURL・per-fileゲインを個別指定可能

### アダプター層 (`src/adapters/`)

全UIコンポーネントはReact JSX（`.tsx`）で実装。`createPortal`でdocument.bodyにポータル化。アイコンはインラインSVGコンポーネント。CSSは`ui/styles/timer-overlay.css`に分離。

- `three/ThreeCharacterAdapter` — FBXモデル読み込み（失敗時PlaceholderCharacterにフォールバック）。`FBXCharacterConfig` でモデルパス・スケール・テクスチャ・アニメーションを一括設定
- `three/ThreeInteractionAdapter` — Raycasterベースのホバー/クリック/摘まみ上げ/撫でる。GestureRecognizerでドラッグ（Y軸持ち上げ）と撫でる（左右ストローク）を判定。`InteractionConfig`で状態別ホバーカーソルをキャラクターごとにカスタマイズ可能
- `ui/App.tsx` — Reactルートコンポーネント。`AppProvider`で依存注入し、TimerOverlay/PromptInputを配置
- `ui/AppContext.tsx` — `AppDeps`インターフェース定義とReact Context。`useAppDeps()`フックで全依存を取得
- `ui/TimerOverlay.tsx` — モード遷移コーディネーター。FreeTimerPanel/PomodoroTimerPanel/CongratsPanelをモードに応じて切替。DisplayTransitionState+SceneTransitionによるシーントランジション（暗転フェード）管理。EventBus購読をmicrotaskコアレシングでrequestTransitionに集約
- `ui/SceneTransition.tsx` — 暗転レンダリング。全画面暗転オーバーレイ（`z-index: 10000`）。`playBlackout(cb)`: opacity 0→1 (350ms) → cb() → opacity 1→0 (350ms)。forwardRef+useImperativeHandleで親からの呼び出しに対応
- `ui/FreeTimerPanel.tsx` — freeモード。タイマー設定ボタングループ（Work/Break/LongBreak/Sets）＋VolumeControl統合。SVGアイコンのトグルで折りたたみ、タイムラインサマリー（色付き横棒グラフ＋時刻＋合計時間）に切替。デフォルト折りたたみ。展開時はSetボタンで確定、押さずに閉じるとスナップショット復元（タイマー設定・サウンド設定・sfxPlayer同期）
- `ui/PomodoroTimerPanel.tsx` — pomodoroモード。SVG円形プログレスリング（200px, r=90, stroke-width=12）でタイマー進捗をアナログ表現し、リング内にフェーズラベル＋フェーズカラー数字（work=緑、break=青、long-break=紫）を配置。背景にフェーズカラーの下→上グラデーションティント（時間経過でalpha 0.04→0.24に濃化）。左肩にサイクル進捗ドット。右肩にpause/stopのSVGアイコンボタン。`phaseColor`/`overlayTintBg`純粋関数をexport
- `ui/CongratsPanel.tsx` — congratsモード。祝福メッセージ＋CSS紙吹雪エフェクト
- `ui/VolumeControl.tsx` — サウンドプリセット選択・ボリュームインジケーター・ミュートの共通コンポーネント。ボリューム変更/ミュート解除時にSfxPlayerでテストサウンドを再生。ミュート/ボリューム操作時にAudioAdapter（環境音）とSfxPlayer（SFX）の両方を同期。FreeTimerPanelから利用
- `ui/PromptInput.tsx` — プロンプト入力UI
- `ui/hooks/useEventBus.ts` — EventBus購読のReactフック。`useEventBus`（状態取得）、`useEventBusCallback`（コールバック実行）、`useEventBusTrigger`（再レンダリングトリガー）

### インフラ層 (`src/infrastructure/`)

- `three/FBXModelLoader` — FBXLoader ラッパー。`resourcePath` でテクスチャパス解決
- `three/AnimationController` — AnimationMixer + crossFadeTo（0.3秒ブレンド）
- `three/PlaceholderCharacter` — プリミティブ形状の人型キャラクター + NumberKeyframeTrack による8種プロシージャルアニメーション
- `three/EnvironmentBuilder` — 旧・単一シーン環境生成（現在は未使用、InfiniteScrollRendererに置換）
- `three/EnvironmentChunk` — 1チャンク分の環境オブジェクト生成。ChunkSpecに基づくランダム配置。regenerate()でリサイクル時に再生成
- `three/InfiniteScrollRenderer` — 3チャンクの3D配置管理。ScrollStateに基づく位置更新とリサイクル時のregenerate()呼び出し。霧・背景色設定
- `audio/ProceduralSounds` — Web Audio APIでRain/Forest/Windをノイズ+フィルタ+LFOから生成（外部mp3不要）
- `audio/AudioAdapter` — 環境音の再生/停止/音量/ミュート管理。`MAX_GAIN=0.25`でUI音量値をスケーリング。初期値はvolume=0/isMuted=true（起動時のデフォルト音量フラッシュ防止、loadFromStorage後にrefreshVolumeで復元）
- `audio/SfxPlayer` — MP3等の音声ファイルをワンショット再生（`play`）およびループ再生（`playLoop`/`stop`）。`crossfadeMs`指定時はループ境界・曲間切替でクロスフェード。per-source GainNodeで個別フェード制御+ファイル別音量補正（`gain`パラメータ）。fetch+decodeAudioDataでデコードし、バッファキャッシュで2回目以降は即時再生。volume/mute制御。`MAX_GAIN=0.25`でUI音量値をスケーリング

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

`.env.development` は `.gitignore` に含まれるためコミットされない。

## Testing

テストはドメイン層とアプリケーション層に集中。Three.js依存のアダプター/インフラ層はテスト対象外。テストファイル一覧と件数は [architecture.md](.claude/memories/architecture.md) を参照。

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
