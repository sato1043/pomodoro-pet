# 開発ガイド

## Build & Development Commands

```bash
git submodule update --init  # assets/ サブモジュール初期化（初回clone後に必要）
npm run dev          # Electron + Vite HMR 開発サーバー起動
npm run dev:alpha    # alphaチャネルで開発サーバー起動（VITE_RELEASE_CHANNEL=alpha）
npm run dev:beta     # betaチャネルで開発サーバー起動（VITE_RELEASE_CHANNEL=beta）
npm run build        # electron-vite プロダクションビルド（out/ に出力）
npm run build:alpha  # alphaチャネルでプロダクションビルド
npm run build:beta   # betaチャネルでプロダクションビルド
npm test             # Vitest テスト全実行
npm run test:watch   # Vitest ウォッチモード
npx vitest run tests/domain/timer/PomodoroStateMachine.test.ts  # 単一テスト実行
npm run test:coverage  # カバレッジ付きテスト（コミット前必須）
npm run package      # ビルド + Windows NSISインストーラー生成（release/ に出力、--publish never）
npm run package:alpha  # alphaチャネルでパッケージ
npm run package:beta   # betaチャネルでパッケージ
npm run package:dir  # ビルド + 展開済みディレクトリ出力
npm run test:e2e     # Playwright E2Eテスト（xvfb-run + デバッグタイマービルド）
npm run test:e2e:headed  # E2Eテスト（GUI表示あり、Windows/GUI環境用）
npm run deploy:local # win-unpackedをC:\temp\pomodoro-petにコピーしてexe起動
npm run icon         # build/icon.pngからマルチサイズICO生成（要ImageMagick）
npm run licenses     # THIRD_PARTY_LICENSES.txt生成（npmライセンス+ASSET_CREDITS.txt結合）
npm run generate:climate    # 気候グリッドデータ生成（NASA POWER API → assets/data/climate-grid.json）
npm run generate:coastline  # 海岸線SVGパス生成（Natural Earth 110m → assets/data/coastline-path.json）
npm run generate:tz-abbr    # タイムゾーン略称マッピング生成（tz-lookup + system tzdata → assets/data/timezone-abbr.json）
```

### WSL2で必要なシステムパッケージ

```bash
# Electron実行に必要（npm run dev）
sudo apt install -y libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 libgtk-3-0t64 libgbm1 libasound2t64 libxshmfence1 libxdamage1 libxrandr2 libxcomposite1 libxfixes3 libpango-1.0-0 libcairo2 libpulse0

# Windowsパッケージビルドに必要（npm run package / package:dir）
sudo dpkg --add-architecture i386 && sudo apt-get update && sudo apt-get install -y wine wine32:i386
rm -rf ~/.wine && wineboot --init

# アイコンICO生成に必要（npm run icon）
sudo apt install -y imagemagick
```

## Static Assets

`assets/` はprivate submodule（`sato1043/pomodoro-pet-assets`）として管理されている。購入素材（FBXモデル・テクスチャ・音声）の著作権は第三者が保持するため、ソースコード（public）と分離している。

`assets/` はViteの`publicDir`（`electron.vite.config.ts`）に設定されている。配下のファイルは `./models/ファイル名`、`./audio/ファイル名` でランタイムからアクセスされる。

### パターンA: submoduleありビルド

privateリポジトリ `sato1043/pomodoro-pet-assets` へのSSHアクセス権が必要。

```bash
git clone git@github.com:sato1043/pomodoro-pet.git
cd pomodoro-pet
git submodule update --init   # assets/ を取得
npm install
npm run dev
```

### パターンB: assetsなしビルド

submoduleを取得しなくてもビルド・起動は通る。以下のフォールバックが動作する。

- **3Dモデル**: FBXの読み込みに失敗すると `PlaceholderCharacter`（ピンクの球体+プロシージャルアニメーション）が表示される（`src/infrastructure/three/PlaceholderCharacter.ts`）
- **音声**: MP3ファイルのfetch失敗時に `SfxPlayer` がサイレントバッファ（無音）を返す（`src/infrastructure/audio/SfxPlayer.ts`）
- **環境音**: `ProceduralSounds`（forest/rain/wind）はコード生成のため素材不要

```bash
git clone https://github.com/sato1043/pomodoro-pet.git
cd pomodoro-pet
# git submodule update --init は省略可
npm install
npm run dev
```

### パターンC: 自前assetsを配置してビルド

submoduleを使わず、自分で入手した素材を配置する場合。`assets/` ディレクトリに以下の構造でファイルを配置する。

```
assets/
├── models/
│   ├── ms07_Wildboar.FBX          # ベースモデル
│   ├── ms07_Idle.FBX              # アニメーション（idle）
│   ├── ms07_Walk.FBX              # アニメーション（walk/wander）
│   ├── ms07_Stunned.FBX           # アニメーション（sit）
│   ├── ms07_Die.FBX               # アニメーション（sleep）
│   ├── ms07_Jump.FBX              # アニメーション（happy/pet）
│   ├── ms07_Attack_01.FBX         # アニメーション（wave/refuse）
│   ├── ms07_Run.FBX               # アニメーション（run）
│   ├── ms07_Attack_02.FBX         # アニメーション（attack2）
│   ├── ms07_Damage_01.FBX         # アニメーション（damage1）
│   ├── ms07_Damage_02.FBX         # アニメーション（damage2）
│   ├── ms07_GetUp.FBX             # アニメーション（getUp）
│   └── ms07_Wildboar_1〜6.png     # テクスチャ（6枚）
└── audio/
    ├── work-start.mp3             # work開始音
    ├── work-complete.mp3          # work完了音
    ├── break-start.mp3            # break開始音
    ├── break-chill.mp3            # break BGMループ
    ├── break-getset.mp3           # break残り30秒BGM
    ├── fanfare.mp3                # サイクル完了ファンファーレ
    ├── pomodoro-exit.mp3          # ポモドーロ手動中断音
    └── test.mp3                   # 音量テスト用
```

ファイル名はコード内でハードコードされている（`src/main.ts`、`src/application/timer/TimerSfxBridge.ts`）。名前を変える場合はコード側も修正が必要。

素材の入手先は [asset-licensing-distribution.md](asset-licensing-distribution.md) を参照。

### 気候グリッドデータ

`assets/data/climate-grid.json` はNASA POWER APIから生成した5度格子の月別気候データ（1991-2020 climatology）。天気自動決定機能（Phase 5.5）で使用する。

このデータはビルド時にJSバンドルにインポートされる（`import data from '../assets/data/climate-grid.json'`）。データが存在しない場合はビルドエラーになる。

**生成手順:**

```bash
# 前提: assets/ サブモジュールが初期化済みであること
git submodule update --init

# 気候データ生成（約30分、中断・再開可能）
npm run generate:climate

# 中間キャッシュのクリア（再生成したい場合）
rm -rf tmp/climate-cache/
```

生成スクリプト（`scripts/generate-climate-grid.ts`）は2592地点を700ms間隔でAPI呼び出しする。中間結果は `tmp/climate-cache/` にキャッシュされるため、中断しても途中から再開できる。

生成完了後、assetsサブモジュールへのコミットが必要（下記「サブモジュールへのコミット手順」参照）。

### サブモジュールへのコミット手順

`assets/` サブモジュール内のファイルを変更した場合、2段階のコミットが必要。

```bash
# 1. サブモジュール内でコミット
cd assets
git add data/climate-grid.json
git commit -m "Add climate grid data (NASA POWER 1991-2020)"
git push origin main
cd ..

# 2. 親リポジトリでサブモジュール参照を更新
git add assets
git commit -m "Update assets submodule (climate grid data)"
```

**注意事項:**
- サブモジュール内の `git push` には `sato1043/pomodoro-pet-assets` への書き込み権限（SSH鍵）が必要
- `git clone` 後にサブモジュールを初期化していない場合、`assets/` は空ディレクトリになる
- CIでは `git submodule update --init` をビルド前に実行する必要がある
- サブモジュールの参照（コミットハッシュ）は親リポジトリの `git add assets` で記録される

## デバッグ設定

`.env.development` で開発用の設定を行う。

### 環境変数

```bash
# タイマー短縮モード（秒数指定）
# 書式: VITE_DEBUG_TIMER=work/break/long-break/sets
# 省略部分は前の値を引き継ぐ。setsデフォルト=2
# .env.development に以下を記述して npm run dev で起動
VITE_DEBUG_TIMER=10         # 全フェーズ10秒、Sets=2
VITE_DEBUG_TIMER=10/5       # work=10秒、break=5秒、long-break=5秒、Sets=2
VITE_DEBUG_TIMER=10/5/15    # work=10秒、break=5秒、long-break=15秒、Sets=2
VITE_DEBUG_TIMER=10/5/15/3  # work=10秒、break=5秒、long-break=15秒、Sets=3
# 注意: break/long-breakが30秒未満の場合、break-getsetトリガー（残り30秒）が開始直後に発火する

# ライセンスモード固定（デバッグ用）
# 有効値: registered / trial / expired / restricted
# 設定するとハートビートをスキップし、指定モードでUI制限を確認できる
VITE_DEBUG_LICENSE=expired

# DevTools自動オープン
VITE_DEV_TOOLS=1

# 開発サーバーのポート変更（デフォルト: 5173）
VITE_DEV_PORT=3000

# ハートビートAPI URL（設定するとライセンスチェックが有効になる）
# 未設定の場合、ライセンス状態は初期値（trial）を維持しハートビートを実行しない
VITE_HEARTBEAT_URL=https://api-XXXXX-an.a.run.app

# ストアURL（デフォルト: https://www.updater.cc）
VITE_STORE_URL=https://www.updater.cc

# リリースチャネル（デフォルト: stable）
# 有効値: stable / beta / alpha
# alpha に設定すると実験的機能（LLM関連等）のUIが出現する
# beta/alpha ではウィンドウ左下にチャネルバッジが表示される
VITE_RELEASE_CHANNEL=alpha

# 自動アップデートチェック（デバッグ用）
# true にするとdev環境でもautoUpdaterが動作する（VITE_DEBUG_LICENSEと併用）
VITE_DEBUG_AUTO_UPDATE=true
```

### Vite環境変数の仕組み

`VITE_HEARTBEAT_URL`/`VITE_STORE_URL`は`electron.vite.config.ts`の`loadEnv()`で読み込まれ、メインプロセスの`define`で`__HEARTBEAT_URL__`/`__STORE_URL__`としてビルド時に埋め込まれる。ライセンス状態の初期値は`trial`。`__HEARTBEAT_URL__`が設定されている場合のみ起動10秒後にハートビートを実行し、結果に基づき状態遷移する。未設定の場合は`trial`を維持する。この制御はdev/prodに関わらず`__HEARTBEAT_URL__`の有無だけで決まる。

`VITE_DEBUG_LICENSE`は`electron.vite.config.ts`で`__DEBUG_LICENSE__`としてメインプロセスに埋め込まれ、レンダラーでは`import.meta.env.VITE_DEBUG_LICENSE`として参照される。設定するとハートビートをスキップし、指定モードの`LicenseState`をレンダラーにpushする。`VITE_HEARTBEAT_URL`との併用時は`VITE_DEBUG_LICENSE`が優先される。

`VITE_RELEASE_CHANNEL`は`electron.vite.config.ts`で`__RELEASE_CHANNEL__`としてメインプロセスに埋め込まれ、レンダラーでは`import.meta.env.VITE_RELEASE_CHANNEL`として参照される。チャネル×ライセンスモードの2軸で機能有効化を判定する。デフォルトは`stable`。詳細は[release-infrastructure.md](release-infrastructure.md)を参照。

`VITE_DEBUG_AUTO_UPDATE`は`electron.vite.config.ts`で`__DEBUG_AUTO_UPDATE__`としてメインプロセスに埋め込まれる。`true`に設定すると`app.isPackaged`ガードをバイパスし、開発ビルドでもautoUpdater（チェック・ダウンロード・インストール）が動作する。`VITE_DEBUG_LICENSE`と併用することで、デバッグ環境でアップデートフロー全体をテストできる。

Viteは`NODE_ENV`に応じてenvファイルを選択する:

| コマンド | NODE_ENV | 読み込まれるenvファイル |
|---|---|---|
| `npm run dev` | development | `.env` + `.env.development` |
| `npm run build` / `npm run package` | production | `.env` + `.env.production` |

`VITE_*`変数はビルド時に`import.meta.env.VITE_*`へ静的埋め込みされる。パッケージ済みアプリの実行時にenvファイルは参照されない。

`.env.production`に`VITE_DEBUG_TIMER`を記述すれば、パッケージビルドでもデバッグタイマーが有効になる。

`.env.development`、`.env.production`、`.env.local` はすべて `.gitignore` に含まれるためコミットされない。

### ライセンス管理（GCPバックエンド）

サーバー上のキー・デバイス状態の確認や操作には `gcp-update-server/` の admin スクリプトを使う。
前提: `gcloud auth application-default login` 済み。

```bash
cd gcp-update-server

# デバイス操作
npm run admin device:list                    # 全デバイス一覧
npm run admin device:get <deviceId>          # デバイス詳細

# キー操作（平文 download key を指定。内部でSHA256ハッシュ化）
npm run admin key:list                       # 全キー一覧
npm run admin key:get <downloadKey>          # キー詳細

# デバッグ用キー登録（itch.io検証スキップ中のため任意文字列で可）
curl -X POST $API_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"<deviceId>","downloadKey":"debug-key-xxx"}'
```

# サービス状態確認
bash scripts/service-control.sh status

# 課金確認（ブラウザで Cloud Console 課金レポートを開く）
# billing account ID は gcloud billing projects describe pomodoro-pet-prod で確認
# https://console.cloud.google.com/billing/<BILLING_ACCOUNT_ID>/reports?project=pomodoro-pet-prod
```

詳細（全コマンド・ユーザー問い合わせ対応例）は [gcp-update-server.md](gcp-update-server.md) を参照。

## テスト

### ユニットテスト（Vitest）

テストはドメイン層とアプリケーション層に集中。Three.js依存のアダプター/インフラ層はテスト対象外。テストファイル一覧は [architecture.md](architecture.md) を参照。

**コミット前に必ず `npm run test:coverage` を実行すること。** テスト全件通過とカバレッジレポート（`coverage.txt`）の更新を確認してからコミットする。

### E2Eテスト（Playwright）

PlaywrightでElectronアプリの統合テストを実行。`VITE_DEBUG_TIMER=3/2/3/2`で短縮ビルドし、全ポモドーロサイクルを約1.5分で検証する。WSL2ではxvfb-runが必要（`sudo apt install -y xvfb`）。

テストファイル一覧は [architecture.md](architecture.md) を参照。

vanilla-extractのハッシュ化クラス名を回避するため、テスト対象のインタラクティブ要素には`data-testid`属性を使用する。
