# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロダクト要求定義

3Dキャラクターが自律的に行動するバーチャルペット型ポモドーロタイマー。Windows向けElectronデスクトップアプリ（将来Steam公開対応）。

主要機能: ポモドーロタイマー / キャラクター行動AI+インタラクション / ふれあいモード（餌やり） / 感情パラメータ / 天気エフェクト / 統計 / サウンド / ライセンス管理+自動アップデート

以下の3文書が要求の全体を定義する。機能追加・変更時は3文書すべてとの整合性を確認すること。

| 文書 | 役割 |
|---|---|
| [requirements.md](./memories/requirements.md) | 実装済み仕様（現在の姿） |
| [feature-license-map.md](./memories/feature-license-map.md) | 全機能の横断台帳+ライセンス制限ルール（制御の姿） |
| [TODO.md](./memories/TODO.md) | 未実装要件+将来構想（これからの姿） |

## Project Documents

`.claude/memories/` に詳細ドキュメントがある。

### アーキテクチャ・設計

- [architecture.md](./memories/architecture.md) — レイヤー構成・モジュール間通信パターン・全ソースファイルマップ・テストファイル一覧。ファイルの場所や依存関係を調べるときに参照
- [pomodoro-state-transitions.md](./memories/pomodoro-state-transitions.md) — 4層階層的状態マシン（AppScene→PomodoroState→CharacterBehavior→CharacterState）の全遷移フロー図。タイマーやキャラクター行動の状態遷移を変更する際に参照
- [hierarchical-state-design.md](./memories/hierarchical-state-design.md) — 階層的状態マシン導入の設計文書。旧アーキテクチャの課題分析と新設計の目標・状態階層定義。状態管理リファクタリング時に参照
- [app-mode-design.md](./memories/app-mode-design.md) — AppScene型（free/pomodoro/settings/fureai/gallery/environment）とAppSceneManager・各Coordinatorの設計。関連ソースファイル・型定義・遷移ルール・各シーンの責務を記載。シーン管理を変更する際に参照
- [scene-transition-design.md](./memories/scene-transition-design.md) — DisplayScene（5種）と宣言的シーン遷移グラフ（DISPLAY_SCENE_GRAPH）の設計。暗転トランジション演出のレイヤー分離。画面遷移演出を変更する際に参照
- [interaction-design.md](./memories/interaction-design.md) — 4種のインタラクション（クリック/摘まみ上げ/撫でる/餌やり）のジェスチャー判定フローと関連ソースファイル。新インタラクション追加時に参照
- [character-animation-mapping.md](./memories/character-animation-mapping.md) — CharacterStateとFBXアニメーションクリップの対応表（11状態+追加5クリップ）+EnrichedAnimationResolverの16ルール。アニメーション追加・変更時に参照
- [environment-scene-design.md](./memories/environment-scene-design.md) — 環境シーンシステム全体設計。Phase 1-3実装済み仕様（型定義・プリセット・テーマ・エフェクト・補間・UI・永続化）+ Phase 5.5未実装設計（astronomy-engine天文計算・七十二候・気候プロファイル・天気自動決定・雨量連動）。環境シーン変更時に参照
- [release-infrastructure.md](./memories/release-infrastructure.md) — リリースインフラ統合設計。リリースチャネル（stable/beta/alpha）2軸判定モデル、CI/CDワークフロー（GitHub Actions release.yml）、GitHub Secrets（SSH Deploy Key・環境変数）、自動アップデートチャネル分離（GitHub Releases・GCPバックエンド・Firestore）、リリース手順・トラブルシューティング。機能追加・チャネル管理・CI/CD設定変更時に参照

### インフラ・技術

- [fbx-integration.md](./memories/fbx-integration.md) — FBXモデル導入のノウハウ集。publicDir設定、.psdテクスチャ問題の診断・解決策、テクスチャ手動適用コード。3Dモデル関連のトラブルシュート時に参照
- [react-migration.md](./memories/react-migration.md) — DOM命令型→React宣言型UIへの移行経緯。移行で発見した4つのバグと対策。CSS方式としてvanilla-extract採用の比較検討。UI設計判断の背景理解に参照
- [development.md](./memories/development.md) — 開発コマンド一覧（dev/build/test/package/deploy等）・WSL2セットアップ手順・デバッグ設定・テスト方針。開発環境構築やコマンド確認時に参照
- [known-issues.md](./memories/known-issues.md) — WSL2/Electron/Wine/Web Audio等の既知問題と回避策（15項目以上）。開発中のトラブルシュート時に参照
- [e2e-coverage-gaps.md](./memories/e2e-coverage-gaps.md) — E2Eテスト（Playwright+Electron）のカバレッジ分析。技術的制約・カバー済み92テスト・未カバー項目の分類。E2Eテスト追加時に参照
- [gcp-update-server.md](./memories/gcp-update-server.md) — GCPバックエンド仕様（Cloud Functions + Firestore + Secret Manager）。heartbeat/register API仕様・Firestoreスキーマ・デプロイ手順・キー登録管理。バックエンド変更時に参照

### 法務・配布

- [asset-licensing-distribution.md](./memories/asset-licensing-distribution.md) — 購入素材（FBX/BGM/効果音）のライセンス類型別配布可否と、public/privateリポジトリ分離方式の法的根拠。素材追加・配布方式変更時に参照
- [source-code-licensing.md](./memories/source-code-licensing.md) — PolyForm Noncommercial 1.0.0の選定理由と比較検討（MIT/GPL/BSL/SSPL等）。ソースコード公開+有料配布を両立する構成。ライセンス方針の確認時に参照
- [distribution-plan.md](./memories/distribution-plan.md) — itch.io「Direct to you」モードでの有料配布設計。価格$4.99・手数料・税務（W-8BEN）・返金ポリシー・インストーラー方針。配布・販売に関する判断時に参照
- [itchio-page-content.md](./memories/2026-03-15_PomodoroPet/itchio-page-content.md) — itch.io販売ページのコンテンツ（説明文英語/日本語・EULA同意文言・SmartScreen注記・特定商取引法表示）。スクリーンショット8枚は同ディレクトリに保存

### リファレンス

- [example-implementation-plan.md](./memories/example-implementation-plan.md) — 実装計画の参考資料（通知機能の計画例）。計画書のフォーマットや粒度の参考。変更対象にしないこと

### プロジェクトルートの文書

- [CLA.md](../CLA.md) — コントリビューターライセンス契約（著作権譲渡型、英語本文+日本語参考訳）
- [CONTRIBUTING.md](../CONTRIBUTING.md) — コントリビューションガイドライン（CLA要件・手順・コーディング規約）
- [PRIVACY_POLICY.txt](../licenses/PRIVACY_POLICY.txt) — プライバシーポリシー（英語本文+日本語参考訳）
- [CHANGELOG.md](../CHANGELOG.md) — 変更履歴（Keep a Changelog形式）

## Development

主要コマンド: `npm run dev`（開発サーバー）、`npm test`（テスト）、`npm run test:coverage`（カバレッジ付きテスト、コミット前必須）、`npm run test:e2e`（E2Eテスト）。

詳細（全コマンド一覧、WSL2セットアップ、デバッグ設定、テスト方針）は [development.md](./memories/development.md) を参照。

## Architecture

クリーンアーキテクチャ。依存方向は外→内のみ。

```
domain（最内層）← application ← adapters ← infrastructure（最外層）
```

### レイヤー概要

- **ドメイン層** (`src/domain/`) — 4コンテキスト: timer / character / environment / shared。外部依存なし
- **アプリケーション層** (`src/application/`) — PomodoroOrchestrator、AppSceneManager、FureaiCoordinator、AppSettingsService、EmotionService、TimerSfxBridge、NotificationBridge、StatisticsService、LicenseState、EnvironmentSimulationService 等
- **アダプター層** (`src/adapters/`) — React UI（`.tsx`）+ Three.jsアダプター。createPortalでポータル化、vanilla-extract CSS
- **インフラ層** (`src/infrastructure/`) — FBXModelLoader、AnimationController、環境チャンク、天気エフェクト、ProceduralSounds、AudioAdapter、SfxPlayer、AstronomyAdapter、ClimateGridAdapter

各レイヤーの詳細（Electronプロセス構成、ファイルマップ、通信パターン、テストファイル一覧）は [architecture.md](./memories/architecture.md) を参照。

## Static Assets

`assets/` はprivate submodule。submoduleなしビルド・自前assets配置の手順を含む詳細は [development.md](./memories/development.md#static-assets) を参照。

FBXファイル内のテクスチャ参照が `.psd` の場合、FBXLoaderは読めない。`ThreeCharacterAdapter` でPNGテクスチャを手動適用し、`mat.color.set(0xffffff)` でFBXLoaderが設定する暗いベースカラーをリセットする必要がある。

## Key Conventions

- TypeScript strict mode。すべてのインターフェースを明示的に定義
- ドメイン層は純粋関数/オブジェクトで構成。Three.js やDOM への依存を持たない
- `electron/` ディレクトリ名は使用禁止（`electron` npmパッケージ名と衝突する）。代わりに `desktop/` を使用
- rendererの root は `src/`（`electron.vite.config.ts` の `renderer.root: 'src'`）
- 実装完了時にドキュメントを更新したかを確認する
- 実装完了時にテストコードとE2Eテストを更新したかを確認する
- **バージョン管理と変更記録**: すべての変更で[CHANGELOG.md](../CHANGELOG.md)への追記を義務付ける
  - 通常のドキュメント更新ではバージョン番号を更新しない。バージョン番号の更新はリリース時に行う。
  - **機能追加時**: package.json minor bump + feature-license-map.md更新（機能一覧+FeatureNameマッピング+冒頭バージョン+変更履歴） + `FeatureName`型/`ENABLED_FEATURES`更新（必要な場合） + CHANGELOG.md追記 + README.mdのFeaturesセクション更新 + README.md冒頭バージョン更新
  - **バグ修正時**: package.json patch bump + feature-license-map.md冒頭バージョン更新+変更履歴1行追加 + CHANGELOG.md追記 + README.md冒頭バージョン更新
  - feature-license-map.mdのバージョン = package.jsonのバージョン（常に同期）
  - **プレリリースバージョン**: semverプレリリース形式を使用する
    - フォーマット: `X.Y.Z-alpha.N` → `X.Y.Z-beta.N` → `X.Y.Z`
    - alpha内の変更: `-alpha.N` のNをインクリメント（例: `0.11.0-alpha.1` → `0.11.0-alpha.2`）
    - beta昇格: `-beta.1` に変更（例: `0.11.0-alpha.3` → `0.11.0-beta.1`）
    - stable昇格: サフィックスを除去（例: `0.11.0-beta.2` → `0.11.0`）
    - gitタグ: `v` プレフィックス付き（例: `v0.11.0-alpha.1`）
    - package.json, README.md, feature-license-map.md, CHANGELOG.md すべてにサフィックスを含めて記載する
    - CHANGELOG.md: alpha/betaも個別エントリを作成する（例: `## [0.11.0-alpha.1] - 2026-03-15`）

## Known Issues & Tips

開発環境（WSL2/Electron/Wine）の既知問題と回避策は [known-issues.md](./memories/known-issues.md) を参照。
