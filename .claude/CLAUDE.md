# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Electron + Vite HMR 開発サーバー起動
npm run build        # electron-vite プロダクションビルド（out/ に出力）
npm test             # Vitest テスト全実行
npm run test:watch   # Vitest ウォッチモード
npx vitest run tests/domain/timer/PomodoroSession.test.ts  # 単一テスト実行
npm run package      # ビルド + Windows NSISインストーラー生成（release/ に出力）
npm run package:dir  # ビルド + 展開済みディレクトリ出力
```

WSL2で `npm run dev` を実行するにはシステムライブラリが必要:
```bash
sudo apt install -y libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 libgtk-3-0t64 libgbm1 libasound2t64 libxshmfence1 libxdamage1 libxrandr2 libxcomposite1 libxfixes3 libpango-1.0-0 libcairo2
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

- **timer**: `PomodoroSession` エンティティ。`CyclePlan`（フェーズ順列）をインデックス走査する方式。デフォルト1セット/サイクル。tick(deltaMs)でイベント配列を返す純粋ロジック。`CyclePlan`値オブジェクト（`buildCyclePlan(config)`）がセット構造・休憩タイプを一元管理。Sets=1はBreak、Sets>1の最終セットはLong Break。`createDefaultConfig(debug)`でデバッグ/通常モードを切替
- **character**: `BehaviorStateMachine` が9状態（idle/wander/sit/sleep/happy/reaction/dragged/pet/refuse）を管理。遷移トリガーは timeout/prompt/interaction の3種。`fixedWanderDirection`オプションでwander方向を固定可能。`GestureRecognizer`でドラッグ/撫でるを判定。`isInteractionLocked()`でポモドーロ作業中のインタラクション拒否を判定
- **environment**: `SceneConfig`（進行方向・スクロール速度・状態別スクロール有無）と`ChunkSpec`（チャンク寸法・オブジェクト数）。`shouldScroll()`純粋関数
- **shared**: `EventBus`（Pub/Sub）でタイマーとキャラクター間を疎結合に連携

### アプリケーション層 (`src/application/`)

- `AppModeManager` — アプリケーションモード管理（free/pomodoro）。CycleCompleted購読で自動遷移。EventBus経由で`AppModeChanged`を発行
- `AppSettingsService` — タイマー設定＋サウンド設定管理。分→ms変換＋`createConfig()`バリデーション。`SettingsChanged`/`SoundSettingsLoaded`イベントをEventBus経由で発行。`loadFromStorage()`/`saveAllToStorage()`でElectron IPC経由の永続化（`{userData}/settings.json`）
- `TimerUseCases` — start/pause/reset/tick をEventBus経由で発行
- `InterpretPromptUseCase` — 英語/日本語キーワードマッチング → 行動名に変換
- `UpdateBehaviorUseCase` — 毎フレームtick。StateMachine遷移 + ScrollManager経由で背景スクロール制御
- `ScrollUseCase` — チャンク位置計算・リサイクル判定の純粋ロジック。Three.js非依存
- `TimerCharacterBridge` — EventBus購読でタイマーイベント+AppModeChanged → キャラクター行動連携

### アダプター層 (`src/adapters/`)

- `three/ThreeCharacterAdapter` — FBXモデル読み込み（失敗時PlaceholderCharacterにフォールバック）。`FBXCharacterConfig` でモデルパス・スケール・テクスチャ・アニメーションを一括設定
- `three/ThreeInteractionAdapter` — Raycasterベースのホバー/クリック/摘まみ上げ/撫でる。GestureRecognizerでドラッグ（Y軸持ち上げ）と撫でる（左右ストローク）を判定。`InteractionConfig`で状態別ホバーカーソルをキャラクターごとにカスタマイズ可能
- `ui/` — DOM要素で構築したオーバーレイUI（TimerOverlay, PromptInput, SettingsPanel）。TimerOverlayのfreeモードにタイマー設定ボタングループ（Work/Break/LongBreak/Sets）とサウンド設定（プリセット/ボリュームインジケーター/ミュート）を統合。折りたたみ機能（☰/×トグル）で設定行を畳み、タイムラインサマリー（色分き横棒グラフ＋時刻＋合計時間）に切替。デフォルト折りたたみ。展開時はSetボタンで確定、押さずに閉じるとスナップショット復元。折りたたみ時のボリューム/ミュート変更は即時保存。SettingsPanelはギアアイコン→モーダルでEnvironment設定を提供（現在スタブ）

### インフラ層 (`src/infrastructure/`)

- `three/FBXModelLoader` — FBXLoader ラッパー。`resourcePath` でテクスチャパス解決
- `three/AnimationController` — AnimationMixer + crossFadeTo（0.3秒ブレンド）
- `three/PlaceholderCharacter` — プリミティブ形状の人型キャラクター + NumberKeyframeTrack による8種プロシージャルアニメーション
- `three/EnvironmentBuilder` — 旧・単一シーン環境生成（現在は未使用、InfiniteScrollRendererに置換）
- `three/EnvironmentChunk` — 1チャンク分の環境オブジェクト生成。ChunkSpecに基づくランダム配置。regenerate()でリサイクル時に再生成
- `three/InfiniteScrollRenderer` — 3チャンクの3D配置管理。ScrollStateに基づく位置更新とリサイクル時のregenerate()呼び出し。霧・背景色設定
- `audio/ProceduralSounds` — Web Audio APIでRain/Forest/Windをノイズ+フィルタ+LFOから生成（外部mp3不要）

## Static Assets

`assets/` ディレクトリが Vite の `publicDir` として設定されている（`electron.vite.config.ts`）。FBXモデルやテクスチャは `/models/ファイル名` でアクセスできる。

FBXファイル内のテクスチャ参照が `.psd` の場合、FBXLoaderは読めない。`ThreeCharacterAdapter` でPNGテクスチャを手動適用し、`mat.color.set(0xffffff)` でFBXLoaderが設定する暗いベースカラーをリセットする必要がある。

## Debug

`.env.development` で開発用の設定を行う。`.env.development.example` を参照。

```bash
# タイマー短縮モード（work=1min / break=1min / long-break=1min）
# .env.development に以下を記述して npm run dev で起動
VITE_DEBUG_TIMER=1

# DevTools自動オープン
VITE_DEV_TOOLS=1

# 開発サーバーのポート変更（デフォルト: 5173）
VITE_DEV_PORT=3000
```

`.env.development` は `.gitignore` に含まれるためコミットされない。

## Testing

テストはドメイン層とアプリケーション層に集中（166件）。Three.js依存のアダプター/インフラ層はテスト対象外。

```
tests/domain/timer/PomodoroSession.test.ts           — 29件
tests/domain/timer/CyclePlan.test.ts                  — 7件
tests/domain/character/BehaviorStateMachine.test.ts   — 46件
tests/domain/character/GestureRecognizer.test.ts      — 17件
tests/domain/environment/SceneConfig.test.ts          — 10件
tests/domain/shared/EventBus.test.ts                  — 4件
tests/application/character/InterpretPrompt.test.ts   — 17件
tests/application/environment/ScrollUseCase.test.ts   — 11件
tests/application/app-mode/AppModeManager.test.ts     — 11件
tests/application/settings/AppSettingsService.test.ts — 13件
tests/setup.test.ts                                   — 1件
```

## Project Documents

`.claude/memories/` に詳細ドキュメントがある。

- [requirements.md](.claude/memories/requirements.md) — 要件定義と実装状況
- [architecture.md](.claude/memories/architecture.md) — アーキテクチャとファイルマップ
- [TODO.md](.claude/memories/TODO.md) — 今後の実装課題（優先度付き）
- [pomodoro-state-transitions.md](.claude/memories/pomodoro-state-transitions.md) — ポモドーロタイマー状態遷移設計
- [app-mode-design.md](.claude/memories/app-mode-design.md) — AppMode（free/pomodoro）設計文書
- [fbx-integration.md](.claude/memories/fbx-integration.md) — FBXモデル導入ノウハウ
- [interaction-design.md](.claude/memories/interaction-design.md) — インタラクション設計（ジェスチャー判定・拡張ガイド）

## Key Conventions

- TypeScript strict mode。すべてのインターフェースを明示的に定義
- ドメイン層は純粋関数/オブジェクトで構成。Three.js やDOM への依存を持たない
- `electron/` ディレクトリ名は使用禁止（`electron` npmパッケージ名と衝突する）。代わりに `desktop/` を使用
- rendererの root は `src/`（`electron.vite.config.ts` の `renderer.root: 'src'`）

## Known Issues & Tips

- electron-vite@5がvite@6対応。electron-vite@2はvite@5まで
- WSL2ではelectron-builderのWindows署名にwineが必要。exeまでは生成される
- Ubuntu 24.04では `libasound2` → `libasound2t64` に名称変更されている
- プロシージャル環境音はWeb Audio APIのノイズ+フィルタ+LFOで実現可能（外部mp3不要）
- WSL2でGPU初期化失敗時は`app.commandLine.appendSwitch('enable-unsafe-swiftshader')`でソフトウェアWebGLにフォールバック（desktop/main/index.tsに設定済み）
- WSL2では絵文字フォントが利用不可な場合がある。インラインSVGで代替する
- `electron-store` v9+はESM専用で`externalizeDepsPlugin()`のCJS出力と衝突する。設定永続化にはNode.js標準API（`fs` + `app.getPath('userData')`）で直接JSON読み書きする方式を採用
- 設定ファイル保存先: `{userData}/settings.json`（Windowsなら`%APPDATA%/pomodoro-pet/settings.json`）
