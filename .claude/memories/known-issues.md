# Known Issues & Tips

- electron-vite@5がvite@6対応。electron-vite@2はvite@5まで
- WSL2での`npm run package`/`npm run package:dir`はwineが必要。rcedit（exeのバージョン情報埋め込み）とsigntool（コード署名）がwine経由で実行されるため。
  wineの初期セットアップ:
  `sudo dpkg --add-architecture i386 && sudo apt-get update && sudo apt-get install -y wine wine32:i386`
  `rm -rf ~/.wine && wineboot --init`
  wineが正しくセットアップされていれば、証明書なしでも署名スキップされてビルド成功する。
  | 状態 | 結果 |
  |---|---|
  | wineなし | 失敗（rceditが実行できない） |
  | wineあり・証明書なし | 成功（署名スキップ） |
  コード署名証明書はDigiCert等の商用認証局から年間数万円で購入が必要。SSL/TLS証明書・商業登記電子証明書・AWS ACM等では代替不可。自分用・社内用なら署名不要。
  WSL2からWindows側のsigntool.exeを直接呼べるはずだが、electron-builderはWSL2をLinuxとして検出しwine経由のパスに入るため対応していない。`sign`オプションでカスタムスクリプトを書けば可能だが、証明書がなければ不要
- プロダクションビルドではアセットパスを相対パス（`./models/...`、`./audio/...`）にする必要がある。絶対パス（`/models/...`）だとファイルプロトコルでルートを指してしまい読み込み失敗する
- `npm run deploy:local`でwin-unpackedを`C:\temp\pomodoro-pet`にコピーしてexeを起動できる。ビルドからの一連の流れ: `npm run package:dir && npm run deploy:local`
- アプリアイコンは`build/icon.png`（512x512 RGBA）を元に`npm run icon`で`build/icon.ico`（6サイズ内包）を生成。ImageMagickが必要（`sudo apt install -y imagemagick`）。
  小サイズほど強いシャープニング（256px:0.5 → 16px:2.0）を適用しているが、タスクバー（32x32）では細部が潰れる限界がある。
  根本改善には小サイズ用の簡略化デザイン（太い輪郭線・シンプルなシルエット）を別途作成する必要がある
- Ubuntu 24.04では `libasound2` → `libasound2t64` に名称変更されている
- プロシージャル環境音はWeb Audio APIのノイズ+フィルタ+LFOで実現可能（外部mp3不要）
- WSL2でGPU初期化失敗時は`app.commandLine.appendSwitch('enable-unsafe-swiftshader')`でソフトウェアWebGLにフォールバック（desktop/main/index.tsに設定済み）
- WSL2では絵文字フォントが利用不可な場合がある。インラインSVGで代替する
- `electron-store` v9+はESM専用で`externalizeDepsPlugin()`のCJS出力と衝突する。設定永続化にはNode.js標準API（`fs` + `app.getPath('userData')`）で直接JSON読み書きする方式を採用
- 設定ファイル保存先: `{userData}/settings.json`（Windowsなら`%APPDATA%/pomodoro-pet/settings.json`）
- WSL2で音声を再生するには`libpulse0`が必要。WSLgのPulseServerソケット経由でWindows側に音声出力する
- WSL2のPulseAudio環境ではWeb Audio APIのAudioNode生成・破棄を繰り返すとストリームリソースがリークし、音声が途切れる。約10分のアイドルで自動復旧する。`pkill -f pulseaudio`で即座にリセット可能。Windowsネイティブ実行では発生しない
- `document.hasFocus()`はElectronで信頼できない（最小化してもtrueを返す場合がある）。バックグラウンド検出にはblur/focusイベントのフラグ管理を使用する
- `requestAnimationFrame`はブラウザ/Electronのバックグラウンドタブで停止する。バックグラウンドでもタイマーを進めるにはsetIntervalを併用する。ただしElectronではrAFがバックグラウンドでも低頻度（1fps程度）で継続する場合があり、setIntervalとrAFの両方が`orchestrator.tick`を呼ぶとタイマーが2倍速で進む。対策としてrAFループ内の`orchestrator.tick`は`windowFocused`が`true`のときのみ実行する
- Windowsのトースト通知には`app.setAppUserModelId()`が必須。未設定だと通知が表示されない
