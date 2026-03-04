# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 時間帯遷移のlerp補間 — EnvironmentThemeParamsの全パラメータ（色7個・float5個・vec3 1個）をsmoothstep補間で滑らかに遷移。autoTimeOfDay時5秒、手動切替時1.5秒。補間中の割り込みは中間値から新目標へシームレスに再補間。ThemeLerp純粋関数群（ドメイン層）+ ThemeTransitionService（アプリケーション層）で構成

## [0.5.1] - 2026-03-04

### Changed
- Emotion TrendsグラフをCumulative Timeと同じ折れ線グラフスタイルに統一。スプライン曲線→直線折れ線、glowフィルター・イベントバー・Y軸ラベル/グリッド線・X軸日付ラベル・期間選択ボタンを削除。各曲線末尾にドット表示。レイアウト（パディング・高さ・幅）をCumulative Timeと統一
- Emotion Trendsにデータ未記録日の補間（fillDailyGaps）を追加。startDate〜endDateの全日付を生成し、データがない日は直前の感情値を引き継ぐ

### Fixed
- EmotionIndicatorが値読み込み前に非表示になる問題を修正。初期状態で最低opacity（0.15）のプレースホルダーアイコンを表示するように変更

## [0.5.0] - 2026-03-04

### Added
- 感情推移グラフUI — StatsDrawer内にsatisfaction/fatigue/affinityの3曲線折れ線グラフを追加。期間切替（7d/30d/All）、ポモドーロ完了数イベントバー、ダーク/ライトテーマ対応。extractDailyTrendEntries/buildEmotionTrendData/computeDateRange純粋関数で構成。pointsToPathをBiorhythmChartから再利用。canUse('emotionAccumulation')でライセンス制御
- 感情パラメータ全永続化 — satisfaction/fatigue/affinityを`{userData}/emotion-history.json`に保存し起動間で復元。日次スナップショット・イベントカウント（pomodoroCompleted/pomodoroAborted/fed/petted）・連続利用日数（streakDays）を記録。EmotionHistoryService/EmotionHistoryBridge/EmotionHistory純粋関数で構成
- クロスセッション時間経過変化 — 起動時に放置時間に応じた感情変化を適用。satisfaction減衰（-0.02/時、上限-0.30）、fatigue回復（-0.05/時）、affinity減衰（-0.03/日、猶予4h、上限-0.15）。連続利用3日以上でaffinityボーナス（+0.01/日、上限+0.10）
- 感情パラメータ永続化のE2Eテスト（3テスト）— emotionHistory IPC API存在確認・emotion-history.jsonファイル生成検証（lastSession/daily/streakDays構造）・アプリ再起動後の感情パラメータ復元（two-launchパターン）

### Fixed
- E2Eテスト: emotion-history.spec.tsの感情変化テストをBREAK待ちから全サイクル完走待ちに修正（PomodoroCompletedは全サイクル完走時のみ発火するため）
- E2Eテスト: emotion-history.jsonの残存データによる感情初期値の汚染を防ぐcleanEmotionHistoryヘルパーを追加（animation-state.spec.ts・emotion-history.spec.ts）

## [0.4.0] - 2026-03-03

### Added
- OSスリープ抑制機能 — ポモドーロ実行中にOSのスリープ/サスペンドを抑制。Electronの`powerSaveBlocker` APIを使用。設定UIでON/OFF切替可能（デフォルトON）、settings.jsonに永続化

## [0.3.2] - 2026-03-03

### Changed
- ウィンドウ最小化・閉じるボタンのアイコンをホバー時のみ表示（フェードイン演出付き）
- Galleryモードの上部マージンを下部と同等に縮小（top: 36→10px）

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
