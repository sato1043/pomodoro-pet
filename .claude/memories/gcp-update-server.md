# GCPバックエンド仕様書 — 自動アップデート + ライセンス管理

## インフラ構成図

```
Internet
  │
  ▼
Cloud Functions (2nd gen, Node.js 22)
  ├─ POST /api/heartbeat
  ├─ POST /api/register
  │
  ├─ Firestore (Native mode)
  │   ├─ devices/{deviceId}
  │   ├─ keys/{downloadKeyHash}
  │   ├─ config/current
  │   └─ releases/{channel}  (stable / beta / alpha)
  │
  └─ Secret Manager
      ├─ jwt-private-key (RS256秘密鍵、--set-secretsで環境変数にマウント)
      ├─ itchio-api-key (itch.io APIキー、--set-secretsで環境変数にマウント)
      └─ rate-limit-config
```

## API仕様

### POST /api/heartbeat

入力:
```json
{ "deviceId": "string", "appVersion": "string", "downloadKey": "string (optional)", "channel": "string (optional, default: 'stable', valid: stable/beta/alpha)" }
```

レスポンス:
```json
{
  "registered": "boolean",
  "trialValid": "boolean",
  "trialDaysRemaining": "number",
  "jwt": "string (optional, registered only)",
  "latestVersion": "string",
  "updateAvailable": "boolean",
  "serverMessage": "string (optional)",
  "forceUpdate": "boolean (optional)"
}
```

処理フロー:
1. レート制限チェック（devices/{deviceId}のheartbeatCount、当日10回超→429）
2. デバイスレコード更新/作成（新規→trialStartDate=now()、既存→lastHeartbeat更新）
3. 登録状態判定（registeredKey設定済み→registered、trial期間内→trialValid、それ以外→trialExpired）
4. JWT発行（registeredの場合のみ、RS256署名、30日有効期限）
5. config/currentからサーバーメッセージ取得、releases/{channel}から最新バージョン取得（channelパラメータ未指定時は'stable'）。releases/{channel}ドキュメントが未存在の場合はupdateAvailable: falseを返す
6. レスポンス返却

### POST /api/register

入力:
```json
{ "deviceId": "string", "downloadKey": "string" }
```

レスポンス:
```json
{
  "success": "boolean",
  "jwt": "string",
  "keyHint": "string (先頭4桁+末尾4桁)",
  "error": "string (optional)"
}
```

処理フロー:
1. download keyのハッシュ化（SHA256）
2. デバイス存在確認（未作成ならheartbeat到達前でも自動作成して登録を継続。appVersion='unknown'、heartbeatCount=0）
3. 旧キーのクリーンアップ（デバイスが別キーに紐づいていた場合、旧キーのdevices[]からデバイスを除外）
4. keys/{hash}確認
   - 登録済み + 同デバイス → JWT再発行のみ（レート制限カウント消費しない、return）
   - 登録済み + 別デバイス → 日次レート制限チェック（keys/{hash}.registerCount/registerDate、1日3回超→429）→ 累計登録数チェック（totalRegistrations >= 50 → 403）→ staleデバイス自動除外（30日）→ デバイス追加 + カウント更新
   - 未登録 → itch.io APIで検証（無効なら403）→ 新規作成（registerCount=1, totalRegistrations=1）
5. devices/{deviceId}.registeredKey = hash, keyHint更新
6. JWT発行（RS256署名）
7. レスポンス返却

## Firestoreスキーマ

### devices/{deviceId}
| フィールド | 型 | 説明 |
|---|---|---|
| trialStartDate | Timestamp | トライアル開始日 |
| registeredKey | string \| null | 登録済みの場合のdownload keyハッシュ |
| appVersion | string | 最新のアプリバージョン |
| lastHeartbeat | Timestamp | 最終ハートビート日時 |
| createdAt | Timestamp | 作成日時 |
| heartbeatCount | number | 当日のハートビート回数（DoS制限用、上限10回/日） |
| heartbeatDate | string | heartbeatCountのリセット用日付（YYYY-MM-DD） |

### keys/{downloadKeyHash}
| フィールド | 型 | 説明 |
|---|---|---|
| devices | string[] | 紐づくdeviceId一覧 |
| maxDevices | number | （レガシー）旧台数上限。参照しないが既存データ互換性のため残存 |
| registerCount | number | 当日のregister回数（レート制限用、1キーにつき上限3回/日） |
| registerDate | string | registerCountのリセット用日付（YYYY-MM-DD） |
| totalRegistrations | number | 累計登録デバイス数（上限50、インクリメントのみ） |
| validatedAt | Timestamp | itch.io APIで最終検証した日時 |
| valid | boolean | itch.io APIの検証結果 |
| createdAt | Timestamp | 作成日時 |

### config/current
| フィールド | 型 | 説明 |
|---|---|---|
| serverMessage | string \| null | 全ユーザーに表示するメッセージ |
| forceUpdateBelowVersion | string \| null | この版未満は強制更新 |
| trialDays | number | トライアル日数（デフォルト: 30） |
| jwtExpiryDays | number | JWT有効期限日数（デフォルト: 30） |

### releases/{channel}

チャネル別の最新バージョンを管理する。ドキュメントIDは `stable` / `beta` / `alpha` の3種。

| フィールド | 型 | 説明 |
|---|---|---|
| version | string | 当該チャネルの最新バージョン番号 |
| updatedAt | Timestamp | 最終更新日時 |

例:
- `releases/stable`: `{ version: "0.10.0", updatedAt: ... }`
- `releases/beta`: `{ version: "0.11.0-beta.1", updatedAt: ... }`
- `releases/alpha`: `{ version: "0.11.0-alpha.3", updatedAt: ... }`

## RS256鍵ペア生成

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
# private.pem → GCP Secret Manager
# public.pem → アプリに埋め込み（desktop/main/index.ts）
```

## gcloud CLIインストール（WSL2/Ubuntu）

```bash
# ダウンロード+展開
curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz
tar -xf google-cloud-cli-linux-x86_64.tar.gz

# インストール（パス追加+補完設定。質問にはすべてYes）
./google-cloud-sdk/install.sh

# シェル再起動後に初期化+認証
# ブラウザが開くのでGoogleアカウントでログイン
gcloud init
```

## GCPセットアップ手順

```bash
# 1. プロジェクト作成 (environment タグの警告は任意なので無視して良い)
gcloud projects create pomodoro-pet-prod --name="Pomodoro Pet"
gcloud config set project pomodoro-pet-prod

# 2. 課金アカウント紐付け（無料枠利用にも必要）
# gcloud billing accounts list で課金アカウントIDを確認
# gcloud billing projects link pomodoro-pet-prod --billing-account=XXXXXX-XXXXXX-XXXXXX

# 3. 必要なAPIを有効化
gcloud services enable cloudfunctions.googleapis.com firestore.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com run.googleapis.com

# 4. Firestore データベース作成（Native mode、東京リージョン）
gcloud firestore databases create --location=asia-northeast1

# 5. Secret Manager に秘密鍵を登録
#    デプロイ時に --set-secrets で環境変数 JWT_PRIVATE_KEY にマウントされる
#    （Secret Manager API は使用しない）
gcloud secrets create jwt-private-key --replication-policy="automatic"
gcloud secrets versions add jwt-private-key --data-file=private.pem

# 6. itch.io APIキーを登録（https://itch.io/user/settings/api-keys で取得）
gcloud secrets create itchio-api-key --replication-policy="automatic"
echo -n "YOUR_ITCHIO_API_KEY" | gcloud secrets versions add itchio-api-key --data-file=-

# 7. Cloud Run サービスアカウントに Secret Manager アクセス権限を付与
#    Cloud Functions 2nd gen は Cloud Run 上で動作する。
#    デフォルトの Compute サービスアカウントが Secret Manager にアクセスするには
#    Secret Accessor ロールが必要。
PROJECT_NUMBER=$(gcloud projects describe pomodoro-pet-prod --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding jwt-private-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=pomodoro-pet-prod
```

## Cloud Function 実装とデプロイ

ソースコード: `gcp-update-server/` ディレクトリ（リポジトリルート直下）

### ディレクトリ構成

```
gcp-update-server/
  package.json          # main: "dist/index.js", gcp-build で tsc 自動実行
  tsconfig.json
  .gcloudignore
  deploy.sh             # デプロイスクリプト
  src/
    index.ts            # heartbeat + register エンドポイント
  scripts/
    init-firestore.ts   # config/current + releases/{channel} 初期データ投入
    smoke-test.sh       # curl ベースのスモークテスト（7テスト + Firestoreクリーンアップ）
    cleanup-firestore.ts  # スモークテストで作成したドキュメントの削除
    admin.ts            # Firestore管理スクリプト（キー・デバイスのCRUD）
    service-control.sh  # Cloud Runサービスの受付ON/OFF制御
```

### 初回セットアップ

```bash
cd gcp-update-server

# 1. 依存関係インストール
npm install

# 2. Application Default Credentials 設定（Firestore初期化に必要）
gcloud auth application-default login

# 3. Firestore 初期データ投入（config/current + releases/{channel} ドキュメント作成）
npm run init-firestore

# 4. ビルド確認
npm run build
```

### デプロイ

```bash
cd gcp-update-server
bash deploy.sh
```

デプロイ完了後にURLが表示される。そのURLを `electron.vite.config.ts` の `HEARTBEAT_URL` 環境変数（または `.env` ファイル）に設定する。

`Reauthentication required. Please enter your password:` と表示された場合は gcloud CLI の認証セッションが期限切れになっている。Ctrl+C でキャンセルし `gcloud auth login` を実行してブラウザで再認証してからデプロイを再実行する。

### 動作確認（スモークテスト）

```bash
cd gcp-update-server
bash scripts/smoke-test.sh
```

テスト後に Firestore のテストデータを自動削除する。

register 成功系テスト（3〜8）は有効な itch.io download key が必要。環境変数 `SMOKE_TEST_DOWNLOAD_KEY` で指定する。未指定時はスキップされる。

```bash
# register 成功系テストを含む完全実行
SMOKE_TEST_DOWNLOAD_KEY=<key> bash scripts/smoke-test.sh
```

| # | テスト内容 | 期待結果 | 備考 |
|---|-----------|---------|------|
| 1 | heartbeat 新規デバイス | trialValid=true, trialDaysRemaining=30 | |
| 2 | heartbeat 同デバイス再送 | trialValid=true（継続） | |
| 2b | register 無効キー（itch.io API検証） | HTTP 403, Invalid download key | |
| 3 | register download key（1台目） | success=true, jwt存在, keyHint存在 | 要 SMOKE_TEST_DOWNLOAD_KEY |
| 4 | register 同キー別デバイス（2台目） | success=true | 要 SMOKE_TEST_DOWNLOAD_KEY |
| 5 | register 同キー別デバイス（3台目） | success=true | 要 SMOKE_TEST_DOWNLOAD_KEY |
| 6 | register 同キー別デバイス（4台目、日次レート超過） | HTTP 429, Daily registration limit | 要 SMOKE_TEST_DOWNLOAD_KEY |
| 7 | heartbeat 登録済みデバイス | registered=true, jwt存在 | 要 SMOKE_TEST_DOWNLOAD_KEY |
| 8 | register 同キー再登録（カウント消費しない） | success=true | 要 SMOKE_TEST_DOWNLOAD_KEY |
| 9 | register deviceId未指定 | error存在 | |
| 10 | heartbeat appVersion未指定 | error存在 | |
| 11 | heartbeat channel=alpha | latestVersion存在 | |
| 12 | heartbeat channel=beta | latestVersion存在 | |
| 13 | heartbeat 不正なchannel（stableフォールバック） | latestVersion存在 | |

前提: `gcloud auth application-default login` 済み（クリーンアップに必要）

### download key の手動発行手順

スモークテストや手動テストで使用する download key は itch.io ダッシュボードから発行する。API による発行は不可。

1. https://itch.io/dashboard/game/4370345/download-keys を開く
2. 「Create download key」をクリック
3. Label に識別名（例: `smoke-test`）を入力
4. 「Download key can be claimed」にチェック（任意）
5. 生成された URL の末尾がキー値
   - 例: `https://updaterllc.itch.io/pomodoropet/download/Xi0hATiCeYvowEIjVZajFZgWdKxd5ew814VkT7ks`
   - キー値: `Xi0hATiCeYvowEIjVZajFZgWdKxd5ew814VkT7ks`
6. 不要になったキーはダッシュボードから revoke できる

個別の curl による手動テスト:

```bash
# API_URL は deploy.sh 完了時に表示される（例: https://api-XXXXX-an.a.run.app）

# heartbeat テスト（新規デバイス → トライアル開始）
curl -X POST $API_URL/api/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-001","appVersion":"0.1.0"}'

# heartbeat テスト（チャネル指定）
curl -X POST $API_URL/api/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-001","appVersion":"0.1.0","channel":"alpha"}'

# register テスト（無効キー → 403）
curl -X POST $API_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-001","downloadKey":"fake-invalid-key"}'

# register テスト（有効な download key で登録）
curl -X POST $API_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-001","downloadKey":"<有効なキー>"}'

# heartbeat テスト（登録済みデバイス → JWT返却）
curl -X POST $API_URL/api/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-001","appVersion":"0.1.0"}'
```

### 注意事項

- itch.io API による download key 検証は実装済み。新規キー登録時に `GET https://itch.io/api/1/{api_key}/game/{game_id}/download_keys?download_key={key}` を呼び出し、レスポンスに `download_key` オブジェクトが存在しなければ 403 を返す。環境変数 `ITCHIO_API_KEY` / `ITCHIO_GAME_ID` が未設定の場合は検証をスキップする（開発環境フォールバック）
- `--set-secrets="JWT_PRIVATE_KEY=jwt-private-key:latest,ITCHIO_API_KEY=itchio-api-key:latest"` でSecret Managerの秘密鍵とitch.io APIキーが環境変数に直接マウントされる。Secret Manager API呼び出しは不要（`@google-cloud/secret-manager` 依存なし）
- `--set-env-vars="ITCHIO_GAME_ID=4370345"` で itch.io ゲームIDが環境変数に設定される
- Cloud Functions 2nd gen は Cloud Run ベース。コールドスタートは5-15秒程度
- Cloud Run サービスアカウントに Secret Accessor ロール付与が必要（GCPセットアップ手順 ステップ7）
- Cloud Functions 2nd gen では `GCLOUD_PROJECT`/`GCP_PROJECT` 環境変数は未設定。`GOOGLE_CLOUD_PROJECT` を使用する

## アプリからの接続テスト（開発モード）

### ライセンス状態の初期値と遷移

アプリ起動時のライセンス状態は `trial`（初期値）。`__HEARTBEAT_URL__` が設定されている場合のみ、起動10秒後にハートビートを実行し、結果に基づき状態遷移する。`__HEARTBEAT_URL__` が空（未設定）の場合はハートビートを実行せず `trial` を維持する。

この設計により、コールドスタート（5-15秒）待ちの間も LicenseToast がUIを遮らない。`restricted` / `expired` はハートビートで明示的に判定された場合のみ適用される。

開発モード（`!app.isPackaged`）かパッケージ済みかに関わらず、`__HEARTBEAT_URL__` の有無だけで制御する。

### 環境変数の設定

サーバー接続テストを行うには `VITE_HEARTBEAT_URL` を設定する。

`.env.development` に追記:
```
VITE_HEARTBEAT_URL=https://heartbeat-XXXXX-an.a.run.app
```

### 環境変数の伝搬経路

```
.env.development
  → loadEnv() (electron.vite.config.ts)
    → env.VITE_HEARTBEAT_URL
      → define: { __HEARTBEAT_URL__: JSON.stringify(...) }
        → desktop/main/index.ts でビルド時に埋め込み
```

- `VITE_` プレフィックス付き: `.env.development` から `loadEnv()` 経由で読み込まれる
- `VITE_` プレフィックスなし（`HEARTBEAT_URL`）: シェル環境変数として `process.env` 経由で直接参照される
- どちらも `electron.vite.config.ts` の `define` で `__HEARTBEAT_URL__` に埋め込まれる
- `__HEARTBEAT_URL__` が空文字の場合、ハートビートをスキップし初期状態（trial）を維持する
- `__HEARTBEAT_URL__` が設定されている場合、起動10秒後に `resolveLicense` が実行される（dev/prod 共通）

### テスト手順

```bash
# 1. .env.development に VITE_HEARTBEAT_URL を設定

# 2. 開発サーバー起動
npm run dev

# 3. 起動後10秒でハートビートが実行される
#    - 新規デバイス → trialValid: true（settings.json に deviceId が保存される）
#    - 設定パネル → Register → download key 入力 → サーバーで登録+JWT発行

# 4. DevTools Console で確認
#    window.electronAPI.checkLicenseStatus() で現在のライセンス状態を取得できる
```

### 注意

- `npm run dev` は `.env.development` を読み込む（`NODE_ENV=development`）
- `npm run build` / `npm run package` は `.env.production` を読み込む
- `.env.development` と `.env.production` は `.gitignore` に含まれコミットされない
- 本番ビルドで `VITE_HEARTBEAT_URL` を設定するには `.env.production` に記述するか、シェル環境変数 `HEARTBEAT_URL` を設定してビルドする

## itch.io API連携

```
GET https://itch.io/api/1/{api_key}/game/{game_id}/download_keys?download_key={key}
```

レスポンス例（有効なキー）:
```json
{"download_key":{"id":152180777,"created_at":"2026-03-16 00:40:28","downloads":0,"game_id":4370345,"key":"Xi0h..."}}
```

`download_key` オブジェクトが存在すれば有効なキー。無効なキーの場合はレスポンスに `download_key` が含まれない。

download key は itch.io ダッシュボードから手動発行する（API による発行は不可）。発行手順は「download key の手動発行手順」セクションを参照。

## コスト見積もり（月100ユーザー想定）

| 項目 | 無料枠 | 予想使用量 | 月額 |
|---|---|---|---|
| Cloud Functions呼出 | 200万回/月 | ~3,000回 | $0 |
| Cloud Functions演算 | 40万GB秒/月 | ~100GB秒 | $0 |
| Firestore読取 | 5万回/日 | ~300回/日 | $0 |
| Firestore書込 | 2万回/日 | ~300回/日 | $0 |
| Secret Manager | 6アクティブ版無料 | 3版 | $0 |
| **合計** | | | **$0** |

## GitHub Actionsリリースワークフロー

```yaml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test
      - run: npm run package
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## JWT設計

- 署名方式: RS256（RSA + SHA-256）
- ペイロード: `{ deviceId, keyHint, iat, exp }`
- keyHint: download keyの先頭4桁+末尾4桁（例: "ABCD****WXYZ"）
- 有効期限: 30日間（ハートビート成功時にローリング更新）

## キー登録ルール

### 日次レート制限
- 1キーにつき1日3回まで register 可能（`keys/{hash}.registerCount`/`registerDate` で管理）
- 同一キー・同一デバイスの再登録（JWT再発行のみ）はカウント消費しない
- 異なるdeviceIdでも同一キーならカウントを共有する
- 超過時429: `Daily registration limit reached. Please try again tomorrow!`

### 累計登録数制限
- 1キーにつき累計50デバイスまで（`keys/{hash}.totalRegistrations` で管理）
- stale除外でdevices[]から削除されてもtotalRegistrationsは減少しない
- 超過時403: `Maximum lifetime registrations reached (50). Please contact support.`
- 旧 `keys/{hash}.maxDevices` フィールドは既存データ互換性のため残存するが、参照しない

### 古いデバイスの自動除外
- register 時に、同一キーの `devices[]` を走査する
- `lastHeartbeat` が30日以上前のデバイス、または Firestore にドキュメントが存在しないデバイスを除外する
- PC入れ替え等で古いデバイスが自動的にクリーンアップされる

### キー変更（別キーでの再登録）
- デバイスが既に別キーに紐づいている場合、旧キーの `devices[]` からデバイスを除外する
- 新キーの `devices[]` にデバイスを追加し、`devices/{deviceId}.registeredKey` を新キーに上書きする
- 旧キーの台数カウントが正しく減少する

### 同キー・同デバイスの再登録
- JWT を再発行するのみ。Firestore のデータは変更なし

### まとめ

| ケース | 動作 |
|--------|------|
| 新キー + 新デバイス | itch.io API検証（無効→403） → 新規作成（registerCount=1, totalRegistrations=1） → JWT発行 |
| 既存キー + 新デバイス | 日次レート制限 → 累計チェック → staleデバイス除外 → devices[]追加 → JWT発行 |
| 既存キー + 同デバイス | JWT再発行のみ（レート制限カウント消費しない） |
| 別キー + 既存デバイス | 旧キーからデバイス除外 → 新キーの日次/累計チェック → 新キーに追加 → JWT発行 |
| 日次レート超過（1キー3回/日） | 429 Daily registration limit reached |
| 累計登録数超過（1キー50デバイス） | 403 Maximum lifetime registrations reached |

## 管理スクリプト（admin.ts）

ユーザー問い合わせ対応やメンテナンス用の Firestore CRUD スクリプト。

```bash
cd gcp-update-server

# デバイス操作
npm run admin device:list                           # 全デバイス一覧
npm run admin device:get <deviceId>                 # デバイス詳細
npm run admin device:delete <deviceId>              # デバイス削除（キーからも除外）

# キー操作（平文 download key を指定。内部でSHA256ハッシュ化）
npm run admin key:list                              # 全キー一覧
npm run admin key:get <downloadKey>                 # キー詳細
npm run admin key:get-hash <keyHash>                # ハッシュ値で直接検索
npm run admin key:delete <downloadKey>              # キー削除（紐づくデバイスのregisteredKeyもクリア）
npm run admin key:remove-device <downloadKey> <deviceId>  # キーからデバイスを除外
npm run admin key:set-max <downloadKey> <maxDevices>      # 台数上限を変更

# config操作
npm run admin config:get                            # config/current を表示
npm run admin config:set <field> <value>            # フィールドを更新
npm run admin config:set serverMessage "Maintenance scheduled"  # 例: 全ユーザーへのメッセージ
npm run admin config:set serverMessage null          # 例: メッセージ削除
# 注意: config:set latestVersion はブロックされる（release:set を使用すること）

# release操作（チャネル別バージョン管理）
npm run admin release:list                          # 全チャネルのバージョン一覧
npm run admin release:get <channel>                 # チャネルのバージョン詳細（stable/beta/alpha）
npm run admin release:set <channel> <version>       # チャネルのバージョンを更新
npm run admin release:set stable 0.10.0             # 例: stable チャネルを更新
npm run admin release:set beta 0.11.0-beta.1        # 例: beta チャネルを更新
npm run admin release:set alpha 0.11.0-alpha.3      # 例: alpha チャネルを更新
```

前提: `gcloud auth application-default login` 済み

### ユーザー問い合わせ対応例

| 問い合わせ | 対応 |
|-----------|------|
| 日次レート制限に達した | 翌日に再試行を案内。繰り返す場合は `device:get` でregisterCount/registerDateを確認 |
| PC入れ替えで登録できない | 30日経過で自動除外される。急ぐ場合は `key:remove-device` で旧デバイスを除外 |
| アカウント削除要求 | `device:delete` でデバイス削除。`key:delete` でキー削除 |
| 登録状態がおかしい | `device:get` で registeredKey を確認。必要なら `device:delete` して再登録を案内 |

## リリース時の保守手順

新バージョンをリリースしたら、対応するチャネルのバージョンを更新する。

```bash
cd gcp-update-server

# stable リリース時（例: v0.11.0）
npm run admin release:set stable 0.11.0

# alpha リリース時（例: v0.11.0-alpha.1）
npm run admin release:set alpha 0.11.0-alpha.1

# beta リリース時（例: v0.11.0-beta.1）
npm run admin release:set beta 0.11.0-beta.1

# 確認
npm run admin release:list
```

alpha → beta → stable の昇格時はそれぞれのチャネルを更新する。stable 昇格時に alpha/beta のバージョンも同じかそれ以上に揃える必要はない（各チャネルは独立）。

## サービス制御（メンテナンス用）

```bash
cd gcp-update-server

bash scripts/service-control.sh stop     # 受付停止（ingress=internal）
bash scripts/service-control.sh start    # 受付再開（ingress=all, max=1）
bash scripts/service-control.sh status   # 現在の状態を表示
```

- `stop`: `ingress=internal` に設定。外部リクエストは 404 を返す（GCP内部通信のみ許可）
- `start`: `ingress=all, max-instances=1` に設定。外部リクエストを受け付ける
- インスタンス自体を完全停止するには Cloud Console から手動で max instances = 0 に設定する（CLI の `--max-instances=0` は Knative バリデーションで拒否されるため）
- アプリ側はハートビート失敗時にオフライン判定にフォールバックするため、サービス停止中もアプリは動作する（JWT有効なら全機能利用可、JWTなしなら初期状態 trial 維持）

## 課金確認

Cloud Console の課金レポートで確認する。billing account ID は `gcloud billing projects describe pomodoro-pet-prod` で取得できる。

```
https://console.cloud.google.com/billing/<BILLING_ACCOUNT_ID>/reports?project=pomodoro-pet-prod
```

min-instances=0 のため、リクエストがなければインスタンスは0台にスケールダウンし課金は発生しない。

## トライアルリセット防止

- 同一IPからの新規デバイス作成を月3回に制限
- UUID自体は再インストールでリセット可能（設計上の制約）
- 日次レート制限（1日3回）が実質的な防御ライン
