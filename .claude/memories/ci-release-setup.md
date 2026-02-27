# GitHub Actions リリースワークフロー セットアップ手順

## 概要

タグ `v*.*.*` を push すると、GitHub Actions が Windows 環境でビルドし、GitHub Releases にインストーラーをアップロードする。

private submodule（`pomodoro-pet-assets`）へのアクセスには SSH Deploy Key を使用する。

## 前提

- `sato1043/pomodoro-pet` — public リポジトリ（ソースコード）
- `sato1043/pomodoro-pet-assets` — private リポジトリ（購入素材、submodule）
- ワークフローファイル: `.github/workflows/release.yml`

## 1. SSH Deploy Key の生成

ローカルマシンで SSH 鍵ペアを生成する。

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy-key" -f ~/.ssh/pomodoro-pet-assets-deploy
```

- パスフレーズは**空**にする（GitHub Actions で自動実行するため）
- 2つのファイルが生成される:
  - `~/.ssh/pomodoro-pet-assets-deploy` — 秘密鍵
  - `~/.ssh/pomodoro-pet-assets-deploy.pub` — 公開鍵

## 2. 公開鍵を pomodoro-pet-assets に登録

1. GitHub で `sato1043/pomodoro-pet-assets` リポジトリを開く
2. **Settings** → **Deploy keys** → **Add deploy key** をクリック
3. 以下を入力:
   - **Title**: `pomodoro-pet CI read access`
   - **Key**: `~/.ssh/pomodoro-pet-assets-deploy.pub` の内容を貼り付け
     ```bash
     cat ~/.ssh/pomodoro-pet-assets-deploy.pub
     ```
   - **Allow write access**: チェック**しない**（読み取り専用で十分）
4. **Add key** をクリック

## 3. 秘密鍵を pomodoro-pet の Secret に登録

1. GitHub で `sato1043/pomodoro-pet` リポジトリを開く
2. **Settings** → **Secrets and variables** → **Actions** → **New repository secret** をクリック
3. 以下を入力:
   - **Name**: `ASSETS_DEPLOY_KEY`
   - **Secret**: `~/.ssh/pomodoro-pet-assets-deploy` の内容を貼り付け
     ```bash
     cat ~/.ssh/pomodoro-pet-assets-deploy
     ```
     `-----BEGIN OPENSSH PRIVATE KEY-----` から `-----END OPENSSH PRIVATE KEY-----` まで全体をコピーする
4. **Add secret** をクリック

## 4. 環境変数 Secret の登録

同じ画面（**Settings** → **Secrets and variables** → **Actions**）で以下の Secret を追加する。

### VITE_HEARTBEAT_URL

- **Name**: `VITE_HEARTBEAT_URL`
- **Secret**: ハートビート API の URL（例: `https://api-XXXXX-an.a.run.app`）
- 用途: プロダクションビルドで `.env.production` に書き出され、メインプロセスの `__HEARTBEAT_URL__` に埋め込まれる

### VITE_STORE_URL

- **Name**: `VITE_STORE_URL`
- **Secret**: ストア URL（例: `https://sato1043.itch.io/pomodoro-pet`）
- 用途: プロダクションビルドで `.env.production` に書き出され、メインプロセスの `__STORE_URL__` に埋め込まれる
- 未設定の場合のデフォルト: `https://www.updater.cc`

## 5. リリースの実行

### ブランチ運用

```
develop（開発）→ main（リリース）→ タグ push → GitHub Actions → GitHub Releases
```

- 日常の開発は `develop` ブランチで行う
- リリース時に `develop` を `main` にマージし、`main` 上でタグを打つ
- ワークフローはタグ push で起動する。ブランチではなくタグのコミットからビルドされる

### 手順

```bash
# 1. develop でバージョンを更新
npm version patch   # 0.1.1 → 0.1.2（patch: バグ修正）
# または
npm version minor   # 0.1.1 → 0.2.0（minor: 機能追加）

# 2. develop を push
git push origin develop

# 3. main にマージ
git checkout main
git merge develop

# 4. main とタグを push（npm version が自動でタグを作成済み）
git push origin main --follow-tags

# 5. develop に戻る
git checkout develop
```

`npm version` は以下を自動実行する:
1. `package.json` の `version` を更新
2. `git commit -m "X.X.X"`
3. `git tag vX.X.X`

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

### タグの打ち直し（リリース失敗時）

ワークフローが失敗した場合、修正後に同じバージョンのタグを打ち直して再リリースできる。

```bash
# 1. develop で修正をコミット
git add -A && git commit -m "fix: ..."

# 2. ローカルとリモートのタグを削除
git tag -d v0.1.1
git push origin :v0.1.1

# 3. 新しいコミットにタグを打ち直す
git tag v0.1.1

# 4. develop を push → main にマージ → タグを push
git push origin develop
git checkout main
git merge develop
git push origin main
git push origin v0.1.1

# 5. develop に戻る
git checkout develop
```

GitHub Releases に前回の失敗したドラフトが残っている場合は手動で削除する。

## 6. セキュリティに関する注意

- SSH 秘密鍵はローカルマシンに残さない。Secret 登録後に削除する:
  ```bash
  rm ~/.ssh/pomodoro-pet-assets-deploy
  ```
  公開鍵は参照用に残してもよい
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
