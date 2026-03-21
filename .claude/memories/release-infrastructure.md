# リリースインフラ設計

## 概要

タグ `v*.*.*` を push すると GitHub Actions が Windows 環境でビルドし、GitHub Releases と itch.io にインストーラーをアップロードする。リリースチャネル（stable/beta/alpha）に応じて有効化する機能セットを切り替える。自動アップデートはチャネル別に分離されている。

- `sato1043/pomodoro-pet` — public リポジトリ（ソースコード）
- `sato1043/pomodoro-pet-assets` — private リポジトリ（購入素材、submodule）
- ワークフローファイル: `.github/workflows/release.yml`

## リリースチャネル

### チャネル定義

| チャネル | 用途 | 包含レベル |
|---|---|---|
| stable | 正式リリース機能のみ | 0 |
| beta | 次期リリース候補機能を含む | 1（stable + beta機能） |
| alpha | 実験的機能を含む | 2（stable + beta + alpha機能） |

**包含関係**: alpha ⊃ beta ⊃ stable

### 2軸判定モデル

機能の利用可否は以下の2段階で判定される。

```
チャネル判定（機能が現在のチャネルで公開されているか）
  → ライセンス判定（ENABLED_FEATURESマップで利用可能か）
```

1. **チャネルフィルタ**: `CHANNEL_LEVEL[現在のチャネル] >= CHANNEL_LEVEL[機能の公開チャネル]` で判定
2. **ライセンス判定**: 既存の `ENABLED_FEATURES[mode].has(feature)` で判定

チャネルフィルタで除外された機能はライセンス判定に到達しない。

### ライセンス制御方針

- **alpha機能**: registered限定（`ENABLED_FEATURES.registered` にのみ追加）
- **beta機能**: 機能の性質に応じて個別判断（registered限定またはtrial含む）
- **stable機能**: 既存のライセンス制限に従う

alpha機能を registered 限定にする理由:
- 有料ユーザーへの先行体験価値
- 不安定な機能がtrial/expired/restrictedユーザーに公開されるリスクの回避

### 実装

#### 型とデータ構造

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

#### 判定関数

| 関数 | 用途 |
|---|---|
| `isFeatureEnabled(mode, feature, channel?)` | 2軸判定の統合関数。channel省略時はstable（後方互換） |
| `isFeatureInChannel(feature, channel)` | チャネルフィルタのみの判定 |
| `getFeatureChannel(feature)` | 機能の公開チャネルを取得（UIバッジ用） |
| `resolveReleaseChannel(raw)` | 環境変数文字列をReleaseChannel型に正規化 |
| `getReleaseVersion(channel)` | チャネル別の最新バージョンをFirestoreから取得 |

#### ビルド設定

**ファイル**: `electron.vite.config.ts`

```typescript
// mainプロセス
define: {
  __RELEASE_CHANNEL__: JSON.stringify(env.VITE_RELEASE_CHANNEL || 'stable'),
}
```

**rendererプロセス**: `import.meta.env.VITE_RELEASE_CHANNEL` で直接参照（Vite標準のenv展開）

#### 環境変数

| 変数 | デフォルト | 説明 |
|---|---|---|
| `VITE_RELEASE_CHANNEL` | `stable` | リリースチャネル。有効値: stable/beta/alpha |

#### UIコンポーネント

| コンポーネント | 役割 |
|---|---|
| `ChannelBadge` | beta/alphaチャネル時に左下に「Beta」「Alpha」を薄く表示。stableでは非表示 |
| `LicenseContext` | `releaseChannel` をContext経由で全UIに配布。`canUse()` にチャネル判定を統合 |

## CI/CDワークフロー

### release.yml

タグパターン `v*.*.*`、`v*.*.*-alpha.*`、`v*.*.*-beta.*` で起動。`windows-latest` ランナーで実行。

ステップ:
1. タグからリリースチャネルを判定（alpha/beta/stable）
2. submodule付きチェックアウト（SSH Deploy Key使用）
3. Node.js セットアップ + npm ci
4. `.env.production` 作成（Secrets から VITE_HEARTBEAT_URL, VITE_STORE_URL, VITE_RELEASE_CHANNEL を注入）
5. ビルド + パッケージ（`npm run package`）
6. GitHub Releases にアップロード（.exe, latest.yml, .blockmap）
7. butler CLI で itch.io にアップロード

### ブランチ運用

```
develop（開発）→ main（リリース）→ タグ push → GitHub Actions → GitHub Releases + itch.io
```

- 日常の開発は `develop` ブランチで行う
- リリース時に `develop` を `main` にマージし、`main` 上でタグを打つ
- ワークフローはタグ push で起動する。ブランチではなくタグのコミットからビルドされる

### リリース手順

```bash
# 1. develop でバージョンを更新・コミット
# 2. develop を push
git push origin develop

# 3. main にマージ
git checkout main
git merge develop

# 4. main を push + タグを打って push
git push origin main
git tag vX.X.X
git push origin vX.X.X

# 5. develop に戻る
git checkout develop

# 6. Firestore のリリースバージョンを更新（gcp-update-server ディレクトリで実行）
cd gcp-update-server
npm run admin release:set stable X.X.X
```

### 確認

1. GitHub の **Actions** タブでワークフローの実行状況を確認
   ```bash
   gh run list --limit 3          # 実行一覧
   gh run view <run-id>           # 詳細表示
   gh run watch <run-id>          # 完了まで待機
   ```
2. 成功すると **Releases** ページにインストーラーが公開される:
   - `Pomodoro Pet Setup X.X.X.exe` — NSIS インストーラー
   - `latest.yml` — electron-updater 用メタデータ
   - `Pomodoro Pet Setup X.X.X.exe.blockmap` — 差分アップデート用
3. Releases ページ: `https://github.com/sato1043/pomodoro-pet/releases`
4. itch.io にも同時にアップロードされる（butler CLI経由）:
   - itch.io ページ: `https://updaterllc.itch.io/pomodoropet`
   - チャネル: `windows`（butler push の `:windows` タグ）

### タグの打ち直し（リリース失敗時）

```bash
# 1. develop で修正をコミット
git add -A && git commit -m "fix: ..."

# 2. ローカルとリモートのタグを削除
git tag -d v0.1.1
git push origin :v0.1.1

# 3. develop を push → main にマージ → タグを push
git push origin develop
git checkout main
git merge develop
git push origin main
git tag v0.1.1
git push origin v0.1.1

# 4. develop に戻る
git checkout develop
```

GitHub Releases に前回の失敗したドラフトが残っている場合は手動で削除する。

## GitHub Secrets

### SSH Deploy Key

private submodule（`pomodoro-pet-assets`）へのアクセスに使用する。

1. SSH 鍵ペアを生成（パスフレーズ空）
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy-key" -f ~/.ssh/pomodoro-pet-assets-deploy
   ```
2. 公開鍵を `sato1043/pomodoro-pet-assets` の **Settings → Deploy keys** に登録（Read-only）
3. 秘密鍵を `sato1043/pomodoro-pet` の **Settings → Secrets → Actions** に `ASSETS_DEPLOY_KEY` として登録
4. 秘密鍵はローカルから削除する

### 環境変数 Secret

| Secret名 | 用途 |
|---|---|
| `ASSETS_DEPLOY_KEY` | private submoduleアクセス用SSH秘密鍵 |
| `VITE_HEARTBEAT_URL` | ハートビートAPI URL。`.env.production`に書き出され`__HEARTBEAT_URL__`に埋め込み |
| `VITE_STORE_URL` | ストアURL（例: `https://updaterllc.itch.io/pomodoropet`）。デフォルト: `https://www.updater.cc` |
| `BUTLER_CREDENTIALS` | itch.io APIキー（`https://itch.io/user/settings/api-keys`で取得）。butler CLIの認証に使用 |

## 自動アップデート

### GitHub Releases ベース

```
stable → GitHub Releases（latest tag）
beta   → GitHub Releases（prerelease tag、例: v1.1.0-beta.1）
alpha  → GitHub Releases（prerelease tag、例: v1.1.0-alpha.1）
```

### electron-builder publish 設定

```json
// stable
"publish": { "provider": "github", "owner": "sato1043", "repo": "pomodoro-pet" }

// beta（prereleaseを含む）
"publish": { "provider": "github", "owner": "sato1043", "repo": "pomodoro-pet", "channel": "beta" }
```

### GCPバックエンド

ハートビートAPIの `latestVersion` / `updateAvailable` をチャネル別に返す。

```
POST /heartbeat
Body: { deviceId, version, channel: "alpha" }
Response: { latestVersion: "1.1.0-alpha.2", updateAvailable: true }
```

- リクエストボディに `channel` フィールドを追加（デフォルト: `'stable'`）
- `releases/{channel}` からバージョンを取得
- `releases/{channel}` が未存在なら `updateAvailable: false` を返す

**Firestoreスキーマ**:

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

### 管理ツール

**ファイル**: `gcp-update-server/functions/src/admin.ts`

| コマンド | 用途 |
|---|---|
| `release:list` | 全チャネルのリリースバージョンを一覧表示 |
| `release:get <channel>` | 指定チャネルの現在のバージョンを取得 |
| `release:set <channel> <version>` | 指定チャネルのバージョンを設定 |

`config:set latestVersion` はブロックされる（`releases/{channel}` への移行済みのため）。`release:set` を使用すること。

### GCPインフラ構築手順

1. **Firestoreコレクション追加**: `releases/stable`, `releases/beta`, `releases/alpha` ドキュメント作成
2. **Cloud Function更新**: heartbeat関数にチャネル分岐を追加しデプロイ
3. **リリースドキュメント更新**: リリース時に対応チャネルの `releases/{channel}` を更新

### 保守手順

1. **バージョン確認**: Firebase Console → Firestore → `releases` コレクション
2. **手動バージョン更新**: ドキュメントの `version` フィールドを直接編集
3. **ロールバック**: `version` を前バージョンに戻す
4. **チャネル無効化**: ドキュメントを削除するとチャネルの自動アップデートが停止

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

## セキュリティ

- SSH 秘密鍵はローカルマシンに残さない。Secret 登録後に削除する
- Deploy Key は Read-only で登録する。Write access は不要
- `VITE_HEARTBEAT_URL` 等の Secret は GitHub の暗号化ストレージに保存される。ログには `***` でマスクされる

## トラブルシューティング

### submodule のチェックアウトに失敗する

- Deploy Key が `pomodoro-pet-assets` に正しく登録されているか確認する
- `ASSETS_DEPLOY_KEY` Secret の内容が秘密鍵の全文（BEGIN〜END行を含む）であることを確認する
- Deploy Key の生成時にパスフレーズを設定していないことを確認する

### npm scripts が Windows で失敗する

- ワークフローで `npm config set script-shell` を設定して Git Bash を使用している
- `C:\Program Files\Git\bin\bash.exe` は `windows-latest` ランナーに標準搭載

### ビルドは成功するが Release に成果物がない

- `permissions: contents: write` がワークフローに設定されているか確認する
- `release/` ディレクトリにファイルが生成されているかログで確認する

### GitHub Actions Node.js 24 対応

- actions/checkout v6、actions/setup-node v6 は対応済み
- jdno/setup-butler v1、softprops/action-gh-release v2 は未対応（上流待ち、期限: 2026-06-02）

## 関連ファイル

| ファイル | 内容 |
|---|---|
| `.github/workflows/release.yml` | リリースワークフロー定義 |
| `src/application/license/LicenseState.ts` | ReleaseChannel型、FEATURE_CHANNEL、チャネル判定関数群 |
| `src/adapters/ui/LicenseContext.tsx` | releaseChannel をContextに追加、canUseにチャネル統合 |
| `src/adapters/ui/ChannelBadge.tsx` | Beta/Alphaバッジコンポーネント |
| `src/adapters/ui/styles/channel-badge.css.ts` | バッジスタイル |
| `src/adapters/ui/SceneRouter.tsx` | ChannelBadge描画追加 |
| `src/main.ts` | isFeatureEnabled全呼び出しにチャネル引数追加 |
| `electron.vite.config.ts` | __RELEASE_CHANNEL__ / __DEBUG_AUTO_UPDATE__ define |
| `desktop/main/updater.ts` | autoUpdater初期化・イベントハンドリング |
| `desktop/main/ipc-handlers.ts` | update:check / update:download / update:install IPCハンドラ |
| `desktop/main/index.ts` | 起動時アップデートチェック・デバッグライセンス判定 |
| `gcp-update-server/functions/src/heartbeat.ts` | チャネル別バージョン取得、releases/{channel}参照 |
| `gcp-update-server/functions/src/admin.ts` | release:list/get/set コマンド |
| `gcp-update-server/functions/smoke-test.sh` | チャネル対応スモークテスト |
