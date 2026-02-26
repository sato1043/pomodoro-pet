# 機能一覧とライセンス制限マップ

**バージョン: 0.1.0**（= package.json）

このドキュメントはアプリの全ユーザー向け機能を列挙し、`FeatureName`型（`src/application/license/LicenseState.ts`）とのマッピングを定義する。特定バージョンにおける全機能セットのスナップショットとして機能する。

## FeatureName 一覧

`ENABLED_FEATURES`（`LicenseState.ts`）で定義されるライセンスモード別の有効化マップ。

| FeatureName | registered | trial | expired | restricted | 概要 |
|---|---|---|---|---|---|
| pomodoroTimer | o | o | o | o | ポモドーロタイマー本体（開始/停止/一時停止/フェーズ遷移） |
| timerSettings | o | o | x | x | タイマー設定（Work/Break/Long Break/Sets） |
| character | o | o | o | o | キャラクター行動（自律行動/march/インタラクション） |
| stats | o | o | x | x | 統計表示（ヒートマップ/日別集計） |
| fureai | o | o | x | x | ふれあいモード（餌やり/プロンプト入力） |
| weatherSettings | o | o | x | x | 天気設定UI（天気タイプ/雲量/時間帯選択） |
| soundSettings | o | o | x | x | サウンドプリセット選択 |
| backgroundNotify | o | o | x | x | バックグラウンド時のシステム通知 |
| emotionAccumulation | o | o | x | x | 感情パラメータの蓄積・永続化 |
| autoUpdate | o | o | x | x | 自動アップデートチェック・ダウンロード |

## 全機能一覧と FeatureName マッピング

### A. freeモードUI操作

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 1 | Start Pomodoroボタン | StartPomodoroButton.tsx | 操作 | pomodoroTimer | ポモドーロサイクル開始 |
| 2 | 設定パネル展開 | SettingsButton.tsx | 操作 | （制限不要） | タイマー設定・サウンド設定・テーマ等を展開 |
| 3 | 統計パネル表示 | StatsButton.tsx, StatsDrawer.tsx | 操作 | stats | 13週間ヒートマップ・日別集計を表示 |
| 4 | 天気設定パネル | WeatherButton.tsx, WeatherPanel.tsx | 操作 | weatherSettings | 天気タイプ・雲量・時間帯を選択・プレビュー |
| 5 | タイマー設定エディタ | OverlayFree.tsx | 操作 | timerSettings | Work/Break/Long Break/Sets入力 |
| 6 | サウンドプリセット選択 | VolumeControl.tsx | 操作 | soundSettings | silence/forest/rain/windプリセット切替 |
| 7 | テーマ切替 | OverlayFree.tsx | 操作 | （制限不要） | System/Light/Dark選択 |
| 8 | バックグラウンド設定 | OverlayFree.tsx | 操作 | backgroundNotify（通知トグル） | Audio/Notifyトグル |
| 9 | Aboutパネル | AboutContent.tsx | 操作 | （制限不要） | バージョン・ライセンス情報表示 |
| 10 | 法律文書表示 | LegalDocContent.tsx | 操作 | （制限不要） | EULA/Privacy Policy/LICENSE表示 |
| 11 | ライセンス登録 | RegistrationContent.tsx | 操作 | （制限不要） | Download Key入力・登録 |

### B. pomodoroモードUI操作

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 12 | 一時停止/再開 | PomodoroTimerPanel.tsx | 操作 | pomodoroTimer | Pause/Resumeボタン |
| 13 | ポモドーロ中止 | PomodoroTimerPanel.tsx | 操作 | pomodoroTimer | Stopボタン → PomodoroAborted |
| 14 | フェーズプログレス表示 | PomodoroTimerPanel.tsx | 自動 | pomodoroTimer | SVG円形プログレスリング |
| 15 | サイクル進捗ドット | PomodoroTimerPanel.tsx | 自動 | pomodoroTimer | 実施済み/現在/未実施フェーズのドット |
| 16 | 背景ティント | OverlayPomodoro.tsx | 自動 | pomodoroTimer | フェーズカラーのグラデーション |
| 17 | Congratsパネル | CongratsPanel.tsx | 自動 | pomodoroTimer | サイクル完了の祝福メッセージ+紙吹雪 |

### C. ふれあいモードUI操作

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 18 | ふれあいモード開始 | FureaiEntryButton.tsx | 操作 | fureai | リンゴアイコンで遷移 |
| 19 | ふれあいモード終了 | FureaiExitButton.tsx | 操作 | fureai | ←矢印で戻る |
| 20 | プロンプト入力 | PromptInput.tsx | 操作 | fureai | キーワード→行動遷移 |
| 21 | 餌やり | FeedingInteractionAdapter.ts | 操作 | fureai | ドラッグ＆ドロップ→feeding状態 |
| 22 | ハートエフェクト | HeartEffect.tsx | 自動 | fureai | 餌やり成功時のパーティクル |

### D. キャラクター動作

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 23 | 自律行動 | BehaviorPreset.ts, BehaviorStateMachine.ts | 自動 | character | idle→wander→sitループ |
| 24 | 行進サイクル | BehaviorPreset.ts | 自動 | character | work中のmarch+速度加速 |
| 25 | 休憩サイクル | BehaviorPreset.ts | 自動 | character | break中のhappy→sit→idle |
| 26 | 祝賀行動 | BehaviorPreset.ts | 自動 | character | congrats中の固定状態 |
| 27 | ふれあい行動 | BehaviorPreset.ts | 自動 | fureai | fureaiモードのidle/feeding/happyサイクル |
| 28 | クリック反応 | ThreeInteractionAdapter.ts | 操作 | character | クリック→InteractionTracker記録 |
| 29 | 撫で操作 | GestureRecognizer.ts | 操作 | character | 左右ストローク→pet状態 |
| 30 | 摘まみ上げ | ThreeInteractionAdapter.ts | 操作 | character | ドラッグでY軸持ち上げ |
| 31 | インタラクションロック | BehaviorStateMachine.ts | 自動 | character | work中のインタラクション拒否 |

### E. タイマー動作

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 32 | ポモドーロ状態遷移 | PomodoroStateMachine.ts | 自動 | pomodoroTimer | work→break→long-break→congrats |
| 33 | フェーズトリガー | PhaseTrigger.ts | 自動 | pomodoroTimer | 残り30秒のBGM切替トリガー |
| 34 | 手動中止 | PomodoroStateMachine.ts | 操作 | pomodoroTimer | exitManually()→PomodoroAborted |
| 35 | 一時停止/再開 | PomodoroStateMachine.ts | 操作 | pomodoroTimer | pause()/resume() |

### F. 感情パラメータ

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 36 | 満足度 | EmotionState.ts | 自動 | emotionAccumulation | ポモドーロ完了で上昇、非work時に減衰 |
| 37 | 疲労 | EmotionState.ts | 自動 | emotionAccumulation | work中に蓄積、非work時に回復 |
| 38 | 好感度 | EmotionState.ts, EmotionService.ts | 永続化 | emotionAccumulation | 餌やり/撫で/完了で上昇、永続化 |
| 39 | 感情イベント反応 | EmotionState.ts | 自動 | emotionAccumulation | 4イベントの数値変化テーブル |

### G. 統計と記録

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 40 | 日別統計記録 | StatisticsService.ts | 自動 | （制限不要） | ポモドーロ完了/中止時の記録 |
| 41 | ヒートマップ表示 | StatsDrawer.tsx | 自動 | stats | 13週間の日別完了数を可視化 |
| 42 | 期間別集計表示 | StatsDrawer.tsx | 自動 | stats | 当日/7日/当月の集計 |

### H. サウンド・エフェクト

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 43 | タイマー開始音 | TimerSfxBridge.ts | 自動 | pomodoroTimer | work開始時のSFX |
| 44 | Work完了音 | TimerSfxBridge.ts | 自動 | pomodoroTimer | break開始時のSFX |
| 45 | ファンファーレ | TimerSfxBridge.ts | 自動 | pomodoroTimer | congrats開始時のSFX |
| 46 | Break BGM | TimerSfxBridge.ts | 自動 | pomodoroTimer | 休憩中ループ+残り30秒切替 |
| 47 | Exit SFX | TimerSfxBridge.ts | 自動 | pomodoroTimer | ポモドーロ中止音 |
| 48 | 環境音 | ProceduralSounds.ts | 操作 | （制限不要） | Forest/Rain/Wind生成 |
| 49 | テストサウンド | VolumeControl.tsx | 操作 | （制限不要） | ボリューム操作時の確認音 |
| 50 | ボリューム制御 | AudioAdapter.ts, SfxPlayer.ts | 操作 | （制限不要） | 音量スライダー |
| 51 | ミュート制御 | VolumeControl.tsx | 操作 | （制限不要） | ミュート/解除 |
| 52 | バックグラウンドAudio抑制 | main.ts | 自動 | （制限不要） | blur時のAudio停止/復帰 |

### I. システム通知

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 53 | フェーズ完了通知 | NotificationBridge.ts | 自動 | backgroundNotify | バックグラウンド時のトースト |
| 54 | ポモドーロ完了通知 | NotificationBridge.ts | 自動 | backgroundNotify | サイクル完了のトースト |

### J. ライセンス・アップデート

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 55 | ライセンス状態チェック | desktop/main/index.ts | 自動 | （制限不要） | ハートビート+JWT検証 |
| 56 | ライセンス登録フロー | desktop/main/index.ts | 操作 | （制限不要） | Download Key→JWT保存 |
| 57 | JWT署名検証 | desktop/main/index.ts | 自動 | （制限不要） | RS256検証 |
| 58 | ハートビート | desktop/main/index.ts | 自動 | （制限不要） | 定期接続確認 |
| 59 | ライセンストースト | LicenseToast.tsx | 自動 | （制限不要） | expired/restricted時の通知バナー |
| 60 | 機能制限判定 | LicenseState.ts | 自動 | （制限不要） | ENABLED_FEATURESマップ参照 |
| 61 | アップデートチェック | desktop/main/index.ts | 自動 | autoUpdate | 差分情報取得 |
| 62 | アップデートダウンロード | desktop/main/index.ts | 操作 | autoUpdate | ファイルDL |
| 63 | アップデートインストール | desktop/main/index.ts | 操作 | autoUpdate | Quit & Install |
| 64 | アップデート通知バナー | UpdateNotification.tsx | 自動 | autoUpdate | available/downloaded表示 |

### K. 環境・シーン

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 65 | 背景スクロール | ScrollUseCase.ts, InfiniteScrollRenderer.ts | 自動 | character | march/wander時のチャンクスクロール |
| 66 | 天気エフェクト描画 | RainEffect.ts, SnowEffect.ts, CloudEffect.ts | 自動 | （制限不要） | 選択された天気の描画（設定UIを制限すれば十分） |
| 67 | ライティング | main.ts, EnvironmentTheme.ts | 自動 | （制限不要） | 時間帯×天気のルックアップテーブル適用 |
| 68 | オートタイムオブデイ | main.ts | 自動 | （制限不要） | 1分間隔の時間帯更新 |
| 69 | 天気プレビューカメラ | main.ts | 自動 | weatherSettings | パネル表示中のカメラ後退 |

### L. バックグラウンド動作

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 70 | バックグラウンドタイマー継続 | main.ts | 自動 | pomodoroTimer | setInterval(1秒)でtick |
| 71 | フォーカス復帰時の時間帯更新 | main.ts | 自動 | （制限不要） | autoTimeOfDay時の反映 |

### M. シーン遷移

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 72 | AppScene遷移 | SceneRouter.tsx, DisplayTransition.ts | 自動 | （制限不要） | free/pomodoro/fureai切替 |
| 73 | ブラックアウトトランジション | SceneTransition.tsx | 自動 | （制限不要） | 暗転エフェクト |

### N. 設定永続化

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 74 | 設定自動保存 | desktop/main/index.ts | 自動 | （制限不要） | settings.json保存 |
| 75 | 統計データ自動保存 | desktop/main/index.ts | 自動 | （制限不要） | statistics.json保存 |
| 76 | 起動時設定復元 | AppSettingsService.ts | 自動 | （制限不要） | loadFromStorage() |

### O. ユーティリティ

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 77 | 外部リンク | desktop/main/index.ts | 操作 | （制限不要） | shell.openExternal() |
| 78 | デバッグインジケーター | main.ts | 開発用 | — | E2Eテスト用DOM |
| 79 | デバッグタイマー | TimerConfig.ts | 開発用 | — | VITE_DEBUG_TIMER |
| 80 | DevTools自動起動 | desktop/main/index.ts | 開発用 | — | VITE_DEV_TOOLS |

## 制限不要機能の分類と根拠

### 基本UI・インフラ（制限すると体験が破綻）

- **#2 設定パネル展開**: テーマ切替・About・登録パネルへのアクセス導線。制限するとexpiredユーザーが登録できなくなる
- **#7 テーマ切替**: 視覚的好みの問題。収益に無関係
- **#9,#10 About/法律文書**: むしろ常時表示すべき情報
- **#11 ライセンス登録**: expired/restrictedユーザーが登録する唯一の導線

### サウンド基本操作（操作性に直結）

- **#48 環境音再生**: 環境音自体はプリセット選択UIのみ制限すれば十分（#6 soundSettings）
- **#49,#50,#51 テストサウンド/ボリューム/ミュート**: 基本的な音量操作を奪う合理的理由がない
- **#52 バックグラウンドAudio抑制**: OS統合のシステム動作

### 記録系（制限すると登録後にデータ欠損）

- **#40 日別統計記録**: バックエンドの記録。表示UI（#41,#42 stats）を制限すれば十分。記録自体を止めると登録後に過去データが欠損する

### 天気描画（設定UIの制限で十分）

- **#66,#67,#68 天気エフェクト/ライティング/オートタイムオブデイ**: 設定UI（#4 weatherSettings）を制限すればデフォルト天気（sunny/day）で動作する。描画自体を止める必要はない

### ライセンスシステム自体

- **#55-60**: ライセンス判定・登録・トーストはシステム基盤。制限対象ではなく制限の仕組み側

### シーン遷移・永続化・外部リンク

- **#72,#73 シーン遷移**: アプリの基本動作
- **#74,#75,#76 永続化**: 設定・統計の保存はインフラ層
- **#77 外部リンク**: 登録ページへの導線に必要

### 開発用

- **#78,#79,#80**: ユーザー向け機能ではない

## 変更履歴

| バージョン | 種別 | 概要 |
|---|---|---|
| 0.1.0 | 初版 | 全80機能定義、10項目のFeatureName策定、ライセンス制限マップ策定 |
