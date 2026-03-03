# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-03-03

### Changed
- バイオリズムグラフ・EmotionIndicator・CharacterNameEditorを統計パネル/独立配置からCompactHeader（タイトルオーバーレイ）内に統合。BiorhythmChartを独立コンポーネントとして抽出

### Added
- buildBiorhythmCurves/pointsToPathの純粋関数ユニットテスト（12テスト）
- ふれあいモードでのバイオリズムグラフ・キャラクター名表示のE2Eテスト（2テスト）

### Fixed
- E2Eテスト: emotion-indicator.spec.tsを統計パネル→ふれあいモードの配置変更に追従
- E2Eテスト: biorhythm.spec.tsのtrialモードNEUTRAL判定でタイミング依存の失敗を修正

## [0.3.0] - 2026-03-02

### Added
- バイオリズム機能 — キャラクターの行動に日単位の周期的な状態変動（activity=5日/sociability=7日/focus=11日の正弦波周期）を導入。registeredライセンスのみ有効
- バイオリズムに基づく4つの新アニメーションルール: high-activity-energetic-idle, low-activity-sleepy-idle, high-sociability-reaction, high-focus-march
- 餌やり/撫でによるバイオリズムブースト（5分間で線形減衰）
- pet_end時のEmotionService感情イベント発行（petted）を追加
- 統計パネルにバイオリズムグラフ追加（ネオンカラーのサインカーブ+カーブ上移動アニメーション）

### Changed
- register APIのデバイス台数制限（3台）をキー単位の日次レート制限（1日3回）+ 累計登録数制限（50デバイス）に変更
- staleデバイス自動除外の閾値を90日→30日に短縮
- 新規キー作成時のmaxDevicesフィールド設定を廃止（既存データは互換性のため残存）
- register APIのユニットテスト追加（vitest、12テストケース）

### Fixed
- DevTools自動起動が.env.developmentから効かない問題を修正（mainプロセスのdefineに追加）
- main.tsのcurrentLicenseMode TDZエラーを修正（宣言順序の修正）

## [0.2.1] - 2026-03-01

### Fixed
- ギャラリーモードでCompactHeaderとGalleryTopBarのオーバーレイが重なる問題を修正
- register APIでheartbeat未到達時に「Device not found」エラーになる問題を修正（デバイス自動作成で対応）

## [0.2.0] - 2026-03-01

### Added
- キャラクター名設定 — ふれあいモード内でキャラクターに名前を付けられる機能。settings.jsonに永続化
- 感情インジケーターUI — 統計パネルに♥⚡★アイコンで感情パラメータを可視化
- カスタムタイトルバー — OSタイトルバー除去、最小化・閉じるボタン+ドラッグ移動
- アニメーションギャラリー — Clips/States/Rulesの3モードでアニメーションを一覧プレビュー
- ライセンス制限UI — TrialBadge表示、プレミアム機能ロックオーバーレイ

### Changed
- メインプロセスを6モジュールに分割
- trialモードでfureai/galleryを無効化（registered限定に変更）
- ふれあいモード遷移ボタンを右下に移動

## [0.1.1] - 2026-02-27

### Added
- GitHub Actionsリリースワークフロー（タグ push → Windows ビルド → GitHub Releases）
- SfxPlayerに音声ファイル欠損時のサイレントフォールバック（submodule未初期化でも動作可能）
- リリースセットアップ手順書（ci-release-setup.md）

### Changed
- assets/をprivate submodule（pomodoro-pet-assets）に移行 — ソースコードpublic化に対応
- git履歴から購入素材を完全除去（git filter-repo）
- electron-builderに--publish neverを追加（アップロードはsoftprops/action-gh-releaseに委譲）

### Fixed
- NSIS oneClick設定の矛盾を修正（allowToChangeInstallationDirectoryを削除）

## [0.1.0] - 2026-02-27

### Added
- ポモドーロタイマー（work/break/long-break/congratsフェーズ遷移、一時停止/再開/中止）
- キャラクター行動システム（自律行動、march/rest/celebrateプリセット、インタラクション）
- ふれあいモード（餌やりドラッグ＆ドロップ、プロンプト入力、ハートエフェクト）
- 感情パラメータ（satisfaction/fatigue/affinity、イベント反応、affinity永続化）
- 統計機能（日別記録、13週間ヒートマップ、期間別集計）
- 天気設定（sunny/cloudy/rainy/snowy、雲量6段階、時間帯4種+auto、天気エフェクト描画）
- サウンドシステム（環境音プリセット、タイマーSFX、Break BGM、ボリューム/ミュート制御）
- バックグラウンド対応（タイマー継続、オーディオ抑制、システム通知）
- テーマ切替（System/Light/Dark）
- 設定永続化（settings.json/statistics.json、Electron IPC経由）
- ライセンス管理（ハートビートAPI、JWT RS256検証、registered/trial/expired/restricted 4モード）
- ライセンスモード別機能制限（ENABLED_FEATURESマップ、LicenseContext、UI制限適用）
- 自動アップデート（electron-updater、チェック/ダウンロード/インストール、通知バナー）
- ライセンス登録UI（Registration Panel、Download Key入力）
- デバッグ支援（VITE_DEBUG_TIMER、VITE_DEBUG_LICENSE、DevTools自動起動、E2Eインジケーター）
- 無限スクロール背景（6チャンク配置、リサイクル、EnvironmentThemeルックアップ）
- シーン遷移（free/pomodoro/fureai、ブラックアウトトランジション）
- About/EULA/Privacy Policy/Third-party Licenses表示
- 法的文書（PolyForm Noncommercial 1.0.0、CLA、CONTRIBUTING、PRIVACY_POLICY）
