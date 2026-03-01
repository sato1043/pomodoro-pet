# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- メインプロセス（desktop/main/index.ts）を6モジュールに分割 — types/settings/license/updater/ipc-handlers
- tsconfig.node.jsonにresolveJsonModule追加 — package.json importの型チェックエラーを解消

### Added
- メインプロセスのライセンスモジュールのユニットテスト（21テスト）— decodeJwtPayload/verifyJwt/getLicenseState/setLicenseState

## [0.2.0] - 2026-03-01

### Added
- アニメーションギャラリー機能 — 13種のクリップ、11種のキャラクター状態、14種のEnrichedAnimationResolverルールを一覧プレビュー
  - Clipsモード: 13クリップのFBXアニメーション個別再生（クリップ名+FBXファイル名表示）
  - Statesモード: 全11状態アニメーションの個別再生（loop個別オーバーライド対応）
  - Rulesモード: 14ルールのAnimationSelection直接再生
  - 2行構成の情報バー（1行目: 説明テキスト、2行目: モード別詳細情報）
  - サイドバークリックで現在の再生を停止して最初から再生し直す
- CompactHeaderコンポーネント — ふれあい/ギャラリー共通のコンパクトヘッダー（タイトル+時計）
- GalleryTopBarコンポーネント — Clips/States/Rulesモード切替タブバー
- GallerySideBarコンポーネント — アニメーション選択サイドバー
- AppScene型に'gallery'追加、GalleryCoordinator（シーン遷移+アニメーション再生の協調）
- FeatureName型に'gallery'追加 — registered/trialで有効、expired/restrictedで無効
- GalleryCoordinatorのユニットテスト（13件）、AppSceneManagerのgallery遷移テスト（10件）
- E2Eテスト（gallery-mode.spec.ts、7件）

### Changed
- ふれあいモード遷移ボタンを右下（`right: 10`, `bottom: 112`）に移動 — ギャラリーボタンと左右分離
- キャラクター位置オフセットをSceneGalleryのuseEffectで制御 — 暗転中に移動完了

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
