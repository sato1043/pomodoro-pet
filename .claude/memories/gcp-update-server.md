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
  │   └─ config/current
  │
  └─ Secret Manager
      ├─ jwt-private-key (RS256秘密鍵、--set-secretsで環境変数にマウント)
      ├─ itchio-api-key
      └─ rate-limit-config
```

## API仕様

### POST /api/heartbeat

入力:
```json
{ "deviceId": "string", "appVersion": "string", "downloadKey": "string (optional)" }
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
5. config/currentからサーバーメッセージ・最新バージョン取得
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
2. 旧キーのクリーンアップ（デバイスが別キーに紐づいていた場合、旧キーのdevices[]からデバイスを除外）
3. keys/{hash}確認
   - 未登録 → itch.io APIで検証（初期段階ではスキップ）→ 新規作成
   - 登録済み + 同デバイス → JWT再発行（データ変更なし）
   - 登録済み + 別デバイス → 古いデバイスの自動除外 → 台数チェック
4. devices/{deviceId}.registeredKey = hash, keyHint更新
5. keys/{hash}.devicesにdeviceId追加
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
| maxDevices | number | 台数上限（デフォルト: 3） |
| validatedAt | Timestamp | itch.io APIで最終検証した日時 |
| valid | boolean | itch.io APIの検証結果 |
| createdAt | Timestamp | 作成日時 |

### config/current
| フィールド | 型 | 説明 |
|---|---|---|
| serverMessage | string \| null | 全ユーザーに表示するメッセージ |
| forceUpdateBelowVersion | string \| null | この版未満は強制更新 |
| latestVersion | string | 最新バージョン番号 |
| trialDays | number | トライアル日数（デフォルト: 30） |
| jwtExpiryDays | number | JWT有効期限日数（デフォルト: 30） |

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
    init-firestore.ts   # config/current 初期データ投入
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

# 3. Firestore 初期データ投入（config/current ドキュメント作成）
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

### 動作確認（スモークテスト）

```bash
cd gcp-update-server
bash scripts/smoke-test.sh
```

7テストを自動実行し、テスト後に Firestore のテストデータを自動削除する。

| # | テスト内容 | 期待結果 |
|---|-----------|---------|
| 1 | heartbeat 新規デバイス | trialValid=true, trialDaysRemaining=30 |
| 2 | heartbeat 同デバイス再送 | trialValid=true（継続） |
| 3 | register download key | success=true, jwt存在, keyHint存在 |
| 4 | heartbeat 登録済みデバイス | registered=true, jwt存在 |
| 5 | register 同キー再登録 | success=true |
| 6 | register deviceId未指定 | error存在 |
| 7 | heartbeat appVersion未指定 | error存在 |

前提: `gcloud auth application-default login` 済み（クリーンアップに必要）

個別の curl による手動テスト:

```bash
# API_URL は deploy.sh 完了時に表示される（例: https://api-XXXXX-an.a.run.app）

# heartbeat テスト（新規デバイス → トライアル開始）
curl -X POST $API_URL/api/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-001","appVersion":"0.1.0"}'

# register テスト（download key 登録）
curl -X POST $API_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-001","downloadKey":"test-key-12345"}'

# heartbeat テスト（登録済みデバイス → JWT返却）
curl -X POST $API_URL/api/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-001","appVersion":"0.1.0"}'
```

### 注意事項

- itch.io API による download key 検証は初期段階ではスキップ（TODO コメント付き）
- `--set-secrets="JWT_PRIVATE_KEY=jwt-private-key:latest"` でSecret Managerの秘密鍵が `process.env.JWT_PRIVATE_KEY` に直接マウントされる。Secret Manager API呼び出しは不要（`@google-cloud/secret-manager` 依存なし）
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

download_keys配列が空でなければ有効なキー。

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

### 台数制限
- 1つの download key につき最大N台（デフォルト: 3台、`keys/{hash}.maxDevices` で設定）
- 台数は `keys/{hash}.devices[]` の要素数で管理

### 古いデバイスの自動除外
- register 時に、同一キーの `devices[]` を走査する
- `lastHeartbeat` が90日以上前のデバイス、または Firestore にドキュメントが存在しないデバイスを除外する
- 除外後の台数で上限判定を行う
- PC入れ替え等で新デバイスが登録できなくなる問題を防ぐ

### キー変更（別キーでの再登録）
- デバイスが既に別キーに紐づいている場合、旧キーの `devices[]` からデバイスを除外する
- 新キーの `devices[]` にデバイスを追加し、`devices/{deviceId}.registeredKey` を新キーに上書きする
- 旧キーの台数カウントが正しく減少する

### 同キー・同デバイスの再登録
- JWT を再発行するのみ。Firestore のデータは変更なし

### まとめ

| ケース | 動作 |
|--------|------|
| 新キー + 新デバイス | キー検証 → devices[] 追加 → JWT発行 |
| 既存キー + 新デバイス | 古いデバイス除外 → 台数チェック → devices[] 追加 → JWT発行 |
| 既存キー + 同デバイス | JWT再発行のみ |
| 別キー + 既存デバイス | 旧キーからデバイス除外 → 新キーに追加 → JWT発行 |
| 台数超過 | 403 Device limit reached |

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
npm run admin config:set latestVersion 0.2.0        # 例: 最新バージョン更新
npm run admin config:set serverMessage "Maintenance scheduled"  # 例: 全ユーザーへのメッセージ
npm run admin config:set serverMessage null          # 例: メッセージ削除
```

前提: `gcloud auth application-default login` 済み

### ユーザー問い合わせ対応例

| 問い合わせ | 対応 |
|-----------|------|
| 台数上限に達した | `key:list` → `key:get` で確認 → 古いデバイスを `key:remove-device` で除外 |
| PC入れ替えで登録できない | 同上。または `key:set-max` で上限を一時的に緩める |
| アカウント削除要求 | `device:delete` でデバイス削除。`key:delete` でキー削除 |
| 登録状態がおかしい | `device:get` で registeredKey を確認。必要なら `device:delete` して再登録を案内 |

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

## トライアルリセット防止

- 同一IPからの新規デバイス作成を月3回に制限
- UUID自体は再インストールでリセット可能（設計上の制約）
- 台数制限（サーバー側devices[]管理）が実質的な防御ライン
