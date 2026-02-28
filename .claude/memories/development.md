# 開発ガイド

## Build & Development Commands

```bash
git submodule update --init  # assets/ サブモジュール初期化（初回clone後に必要）
npm run dev          # Electron + Vite HMR 開発サーバー起動
npm run build        # electron-vite プロダクションビルド（out/ に出力）
npm test             # Vitest テスト全実行
npm run test:watch   # Vitest ウォッチモード
npx vitest run tests/domain/timer/PomodoroStateMachine.test.ts  # 単一テスト実行
npm run test:coverage  # カバレッジ付きテスト（コミット前必須）
npm run package      # ビルド + Windows NSISインストーラー生成（release/ に出力、--publish never）
npm run package:dir  # ビルド + 展開済みディレクトリ出力
npm run test:e2e     # Playwright E2Eテスト（xvfb-run + デバッグタイマービルド）
npm run test:e2e:headed  # E2Eテスト（GUI表示あり、Windows/GUI環境用）
npm run deploy:local # win-unpackedをC:\temp\pomodoro-petにコピーしてexe起動
npm run icon         # build/icon.pngからマルチサイズICO生成（要ImageMagick）
npm run licenses     # THIRD_PARTY_LICENSES.txt生成（npmライセンス+ASSET_CREDITS.txt結合）
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
```

### Vite環境変数の仕組み

`VITE_HEARTBEAT_URL`/`VITE_STORE_URL`は`electron.vite.config.ts`の`loadEnv()`で読み込まれ、メインプロセスの`define`で`__HEARTBEAT_URL__`/`__STORE_URL__`としてビルド時に埋め込まれる。ライセンス状態の初期値は`trial`。`__HEARTBEAT_URL__`が設定されている場合のみ起動10秒後にハートビートを実行し、結果に基づき状態遷移する。未設定の場合は`trial`を維持する。この制御はdev/prodに関わらず`__HEARTBEAT_URL__`の有無だけで決まる。

`VITE_DEBUG_LICENSE`は`electron.vite.config.ts`で`__DEBUG_LICENSE__`としてメインプロセスに埋め込まれ、レンダラーでは`import.meta.env.VITE_DEBUG_LICENSE`として参照される。設定するとハートビートをスキップし、指定モードの`LicenseState`をレンダラーにpushする。`VITE_HEARTBEAT_URL`との併用時は`VITE_DEBUG_LICENSE`が優先される。

Viteは`NODE_ENV`に応じてenvファイルを選択する:

| コマンド | NODE_ENV | 読み込まれるenvファイル |
|---|---|---|
| `npm run dev` | development | `.env` + `.env.development` |
| `npm run build` / `npm run package` | production | `.env` + `.env.production` |

`VITE_*`変数はビルド時に`import.meta.env.VITE_*`へ静的埋め込みされる。パッケージ済みアプリの実行時にenvファイルは参照されない。

`.env.production`に`VITE_DEBUG_TIMER`を記述すれば、パッケージビルドでもデバッグタイマーが有効になる。

`.env.development`、`.env.production`、`.env.local` はすべて `.gitignore` に含まれるためコミットされない。

## テスト

### ユニットテスト（Vitest）

テストはドメイン層とアプリケーション層に集中。Three.js依存のアダプター/インフラ層はテスト対象外。テストファイル一覧は [architecture.md](architecture.md) を参照。

**コミット前に必ず `npm run test:coverage` を実行すること。** テスト全件通過とカバレッジレポート（`coverage.txt`）の更新を確認してからコミットする。

### E2Eテスト（Playwright）

PlaywrightでElectronアプリの統合テストを実行。`VITE_DEBUG_TIMER=3/2/3/2`で短縮ビルドし、全ポモドーロサイクルを約1.5分で検証する。WSL2ではxvfb-runが必要（`sudo apt install -y xvfb`）。

テストファイル一覧は [architecture.md](architecture.md) を参照。

vanilla-extractのハッシュ化クラス名を回避するため、テスト対象のインタラクティブ要素には`data-testid`属性を使用する。
