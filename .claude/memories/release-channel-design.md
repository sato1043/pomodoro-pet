# リリースチャネル設計

## 概要

リリースチャネル（stable/beta/alpha）に応じて有効化する機能セットを切り替える仕組み。ライセンスモード（registered/trial/expired/restricted）による機能制限とは独立した別軸の制御として動作する。

## チャネル定義

| チャネル | 用途                       | 包含レベル |
|----------|----------------------------|------------|
| stable   | 正式リリース機能のみ       | 0                              |
| beta     | 次期リリース候補機能を含む | 1（stable + beta機能）         |
| alpha    | 実験的機能を含む           | 2（stable + beta + alpha機能） |

**包含関係**: alpha ⊃ beta ⊃ stable

## 2軸判定モデル

機能の利用可否は以下の2段階で判定される。

```
チャネル判定（機能が現在のチャネルで公開されているか）
  → ライセンス判定（ENABLED_FEATURESマップで利用可能か）
```

1. **チャネルフィルタ**: `CHANNEL_LEVEL[現在のチャネル] >= CHANNEL_LEVEL[機能の公開チャネル]` で判定
2. **ライセンス判定**: 既存の `ENABLED_FEATURES[mode].has(feature)` で判定

チャネルフィルタで除外された機能はライセンス判定に到達しない。

## ライセンス制御方針

- **alpha機能**: registered限定（`ENABLED_FEATURES.registered` にのみ追加）
- **beta機能**: 機能の性質に応じて個別判断（registered限定またはtrial含む）
- **stable機能**: 既存のライセンス制限に従う

alpha機能を registered 限定にする理由:
- 有料ユーザーへの先行体験価値
- 不安定な機能がtrial/expired/restrictedユーザーに公開されるリスクの回避

## 実装

### 型とデータ構造

**ファイル**: `src/application/license/LicenseState.ts`

```typescript
type ReleaseChannel = 'stable' | 'beta' | 'alpha'

// チャネル包含レベル
const CHANNEL_LEVEL = { stable: 0, beta: 1, alpha: 2 }

// 各機能の公開チャネル
const FEATURE_CHANNEL: Record<FeatureName, ReleaseChannel> = {
  pomodoroTimer: 'stable',
  // ...既存13機能はすべて stable
}
```

**Firestoreスキーマ変更**: `latestVersion` は `config/current` ドキュメントから削除し、`releases/{channel}` コレクションに移行した。チャネル別にバージョンを管理する。

### 判定関数

| 関数 | 用途 |
|---|---|
| `isFeatureEnabled(mode, feature, channel?)` | 2軸判定の統合関数。channel省略時はstable（後方互換） |
| `isFeatureInChannel(feature, channel)` | チャネルフィルタのみの判定 |
| `getFeatureChannel(feature)` | 機能の公開チャネルを取得（UIバッジ用） |
| `resolveReleaseChannel(raw)` | 環境変数文字列をReleaseChannel型に正規化 |
| `getReleaseVersion(channel)` | チャネル別の最新バージョンをFirestoreから取得 |

### ビルド設定

**ファイル**: `electron.vite.config.ts`

```typescript
// mainプロセス
define: {
  __RELEASE_CHANNEL__: JSON.stringify(env.VITE_RELEASE_CHANNEL || 'stable'),
}
```

**rendererプロセス**: `import.meta.env.VITE_RELEASE_CHANNEL` で直接参照（Vite標準のenv展開）

### 環境変数

| 変数 | デフォルト | 説明 |
|---|---|---|
| `VITE_RELEASE_CHANNEL` | `stable` | リリースチャネル。有効値: stable/beta/alpha |

### UIコンポーネント

| コンポーネント | 役割 |
|---|---|
| `ChannelBadge` | beta/alphaチャネル時に左下に「Beta」「Alpha」を薄く表示。stableでは非表示 |
| `LicenseContext` | `releaseChannel` をContext経由で全UIに配布。`canUse()` にチャネル判定を統合 |

## 開発ワークフロー

### 日常開発

```bash
# stable（デフォルト）
npm run dev

# alpha機能を含めて開発
VITE_RELEASE_CHANNEL=alpha npm run dev
```

### alpha機能の追加手順

1. `FeatureName` 型にユニオンメンバーを追加（例: `'llmChat'`）
2. `FEATURE_CHANNEL` に `llmChat: 'alpha'` を追加
3. `ALL_FEATURES` に `'llmChat'` を追加
4. `ENABLED_FEATURES.registered` に含める（alpha機能はregistered限定）
5. UIコンポーネントで `canUse('llmChat')` を使用して制御
6. テストを追加（ユニットテスト + E2Eテスト）
7. `feature-license-map.md` にFeatureName追記

### alpha → beta → stable への昇格

1. `FEATURE_CHANNEL` の値を `'alpha'` → `'beta'` → `'stable'` に変更
2. 必要に応じて `ENABLED_FEATURES` のtrial/expired/restrictedへの追加を検討
3. ドキュメントを更新

## 自動アップデートのチャネル分離

自動アップデートのチャネル分離は実装済み。以下の構成で動作する。

### GitHub Releases ベース

```
stable → GitHub Releases（latest tag）
beta   → GitHub Releases（prerelease tag、例: v1.1.0-beta.1）
alpha  → GitHub Releases（prerelease tag、例: v1.1.0-alpha.1）
```

### electron-builder publish 設定の変更

```json
// stable
"publish": { "provider": "github", "owner": "sato1043", "repo": "pomodoro-pet" }

// beta（prereleaseを含む）
"publish": { "provider": "github", "owner": "sato1043", "repo": "pomodoro-pet", "channel": "beta" }
```

### GCPバックエンド変更

ハートビートAPIの `latestVersion` / `updateAvailable` をチャネル別に返す。

```
POST /heartbeat
Body: { deviceId, version, channel: "alpha" }
Response: { latestVersion: "1.1.0-alpha.2", updateAvailable: true }
```

- リクエストボディに `channel` フィールドを追加（デフォルト: `'stable'`）
- `releases/{channel}` からバージョンを取得
- `releases/{channel}` が未存在なら `updateAvailable: false` を返す

**Firestore スキーマ変更**:

`config/current` から `latestVersion` フィールドを削除。チャネル別バージョンは `releases/{channel}` で管理する。

```
config/current → { latestVersion は削除済み。その他のフィールドは維持 }

releases/
  stable/   → { version: string, updatedAt: Timestamp }
  beta/     → { version: string, updatedAt: Timestamp }
  alpha/    → { version: string, updatedAt: Timestamp }
```

**Cloud Function変更**:
- `heartbeat` 関数がリクエストの `channel` フィールドを参照
- チャネルに対応する `releases/{channel}` から最新バージョンを取得
- チャネル未指定時は `stable` にフォールバック
- `releases/{channel}` ドキュメントが存在しない場合は `updateAvailable: false`

### 管理ツール変更

**ファイル**: `gcp-update-server/functions/src/admin.ts`

以下のコマンドを追加。

| コマンド | 用途 |
|---|---|
| `release:list` | 全チャネルのリリースバージョンを一覧表示 |
| `release:get <channel>` | 指定チャネルの現在のバージョンを取得 |
| `release:set <channel> <version>` | 指定チャネルのバージョンを設定 |

`config:set latestVersion` はブロックされる（`releases/{channel}` への移行済みのため）。`release:set` を使用すること。

### GCPインフラ構築手順

1. **Firestoreコレクション追加**
   ```bash
   # Firebase Console または gcloud CLI で releases コレクションを作成
   # ドキュメント: releases/stable, releases/beta, releases/alpha
   ```

2. **Cloud Function更新**
   - `gcp-update-server/functions/src/heartbeat.ts` にチャネル分岐を追加
   - リクエストボディから `channel` を取得（デフォルト: `'stable'`）
   - `releases/{channel}` ドキュメントから `version` を取得
   - semver比較で `updateAvailable` を判定

3. **デプロイ**
   ```bash
   cd gcp-update-server/functions
   npm run deploy
   ```

4. **リリースドキュメント更新**
   - リリース時に対応チャネルの `releases/{channel}` ドキュメントを更新
   - CI/CDワークフローにFirestore更新ステップを追加（将来検討）

### 保守手順

1. **バージョン確認**: Firebase Console → Firestore → `releases` コレクション
2. **手動バージョン更新**: ドキュメントの `version` フィールドを直接編集
3. **ロールバック**: `version` を前バージョンに戻す
4. **チャネル無効化**: ドキュメントを削除するとチャネルの自動アップデートが停止

## テスト

### ユニットテスト

**ファイル**: `tests/application/license/LicenseState.test.ts`

| テストグループ | テスト数 | 内容 |
|---|---|---|
| resolveReleaseChannel | 9 | 有効値変換 + 不正値フォールバック |
| getFeatureChannel | 1 | 既存全機能がstable |
| isFeatureInChannel | 3 | stable/beta/alphaチャネルでのstable機能の可視性 |
| isFeatureEnabled（チャネル統合） | 4 | 後方互換 + チャネル×ライセンスの交差判定 |

### GCPバックエンドテスト

**ファイル**: `gcp-update-server/functions/src/__tests__/`

| テストグループ | テスト数 | 内容 |
|---|---|---|
| compareVersions | 8 | semverバージョン比較（等価・大小・プレリリース含む） |
| heartbeat チャネル対応 | 6 | チャネル別バージョン取得・未存在チャネルのフォールバック・デフォルトstable |

**ファイル**: `gcp-update-server/functions/smoke-test.sh`

| テスト | 内容 |
|---|---|
| Test 11 | チャネル指定なしのheartbeat（stableフォールバック） |
| Test 12 | channel=beta 指定のheartbeat |
| Test 13 | channel=alpha 指定のheartbeat |

### E2Eテスト

**ファイル**: `tests/e2e/release-channel.spec.ts`

| テスト | 内容 |
|---|---|
| stableチャネルではchannel-badgeが非表示 | デフォルトビルドでChannelBadgeが表示されないこと |
| stable機能がライセンスモードに応じて動作 | Start Pomodoroボタンの存在確認 |

**E2Eテストの制約**: E2Eビルドは `VITE_RELEASE_CHANNEL` 未指定（=stable）で実行される。beta/alphaチャネルのE2Eテストは、将来alpha機能が実装された時点でチャネル指定ビルドのテストを追加する。

## 関連ファイル

| ファイル | 変更内容 |
|---|---|
| `src/application/license/LicenseState.ts` | ReleaseChannel型、FEATURE_CHANNEL、チャネル判定関数群 |
| `src/adapters/ui/LicenseContext.tsx` | releaseChannel をContextに追加、canUseにチャネル統合 |
| `src/adapters/ui/ChannelBadge.tsx` | Beta/Alphaバッジコンポーネント |
| `src/adapters/ui/styles/channel-badge.css.ts` | バッジスタイル |
| `src/adapters/ui/SceneRouter.tsx` | ChannelBadge描画追加 |
| `src/main.ts` | isFeatureEnabled全呼び出しにチャネル引数追加 |
| `electron.vite.config.ts` | __RELEASE_CHANNEL__ define追加 |
| `gcp-update-server/functions/src/heartbeat.ts` | チャネル別バージョン取得、releases/{channel}参照 |
| `gcp-update-server/functions/src/admin.ts` | release:list/get/set コマンド追加、config:set latestVersionブロック |
| `gcp-update-server/functions/src/__tests__/` | compareVersionsテスト8件、heartbeatチャネル対応テスト6件 |
| `gcp-update-server/functions/smoke-test.sh` | チャネル対応スモークテスト3件（Test 11-13）追加 |
