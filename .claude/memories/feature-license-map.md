# 機能一覧とライセンス制限マップ

**バージョン: 0.9.1**（= package.json）

このドキュメントはアプリの全ユーザー向け機能を列挙し、`FeatureName`型（`src/application/license/LicenseState.ts`）とのマッピングを定義する。特定バージョンにおける全機能セットのスナップショットとして機能する。

## FeatureName 一覧

`ENABLED_FEATURES`（`LicenseState.ts`）で定義されるライセンスモード別の有効化マップ。

| FeatureName | registered | trial | expired | restricted | 概要 |
|---|---|---|---|---|---|
| pomodoroTimer | o | o | o | o | ポモドーロタイマー本体（開始/停止/一時停止/フェーズ遷移） |
| timerSettings | o | o | x | x | タイマー設定（Work/Break/Long Break/Sets） |
| character | o | o | o | o | キャラクター行動（自律行動/march/インタラクション） |
| stats | o | o | x | x | 統計表示（ヒートマップ/日別集計） |
| fureai | o | - | x | x | ふれあいモード（餌やり/プロンプト入力） |
| gallery | o | - | x | x | アニメーションギャラリー（クリップ/状態/ルール一覧プレビュー） |
| weatherSettings | o | o | x | x | 天気設定UI（天気タイプ/雲量/時間帯選択/autoWeather排他選択/シーンプリセット）。Locationボタンは常時表示（weatherSettings非依存） |
| soundSettings | o | o | x | x | サウンドプリセット選択 |
| backgroundNotify | o | o | x | x | バックグラウンド時のシステム通知 |
| emotionAccumulation | o | o | x | x | 感情パラメータの蓄積・永続化 |
| autoUpdate | o | o | x | x | 自動アップデートチェック・ダウンロード |
| biorhythm | o | - | x | x | バイオリズム（activity/sociability/focus周期変動） |
| dataExportImport | o | - | x | x | データエクスポート/インポート（settings+statistics+emotionHistory） |

## 全機能一覧と FeatureName マッピング

### A. freeモードUI操作

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 1 | Start Pomodoroボタン | StartPomodoroButton.tsx | 操作 | pomodoroTimer | ポモドーロサイクル開始 |
| 2 | 設定パネル展開 | SettingsButton.tsx | 操作 | （制限不要） | タイマー設定・サウンド設定・テーマ等を展開 |
| 3 | 統計パネル表示 | StatsButton.tsx, StatsDrawer.tsx | 操作 | stats | 13週間ヒートマップ・日別集計を表示 |
| 4 | 天気設定パネル | WeatherButton.tsx, WeatherPanel.tsx | 操作 | weatherSettings | シーンプリセット・天気タイプ・雲量・時間帯を選択・プレビュー |
| 5 | タイマー設定エディタ | OverlayFree.tsx | 操作 | timerSettings | Work/Break/Long Break/Sets入力 |
| 6 | サウンドプリセット選択 | VolumeControl.tsx | 操作 | soundSettings | silence/forest/rain/windプリセット切替 |
| 7 | テーマ切替 | OverlayFree.tsx | 操作 | （制限不要） | System/Light/Dark/Auto選択 |
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

### C2. ギャラリーモードUI操作

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 81 | ギャラリーモード開始 | GalleryEntryButton.tsx | 操作 | gallery | 左下グリッドアイコンで遷移 |
| 82 | ギャラリーモード終了 | GalleryExitButton.tsx | 操作 | gallery | ←矢印で戻る |
| 83 | クリップモード一覧 | OverlayGallery.tsx | 操作 | gallery | 13クリップFBXアニメーション個別再生 |
| 84 | 状態モード一覧 | OverlayGallery.tsx | 操作 | gallery | 11状態アニメーション個別再生（loopオーバーライド対応） |
| 85 | ルールモード一覧 | OverlayGallery.tsx | 操作 | gallery | 14ルールAnimationSelection再生 |
| 86 | アニメーション情報表示 | OverlayGallery.tsx | 自動 | gallery | 2行構成情報バー（description+モード別詳細） |

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
| 91 | キャラクター名設定 | CharacterNameEditor.tsx, AppSettingsService.ts | 操作 | fureai | ふれあいモード内でキャラクターに任意の名前を付ける（settings.jsonに永続化） |
| 92 | バイオリズム周期変動 | BiorhythmState.ts, BiorhythmService.ts | 自動 | biorhythm | activity(5日)/sociability(7日)/focus(11日)の正弦波周期で行動が変化 |
| 93 | バイオリズムブースト | BiorhythmState.ts, BiorhythmService.ts | 自動 | biorhythm | 餌やり/撫でで一時的にactivity/sociabilityをブースト（5分間で線形減衰） |
| 94 | バイオリズム行動変化 | EnrichedAnimationResolver.ts | 自動 | biorhythm | 4新ルール: energetic-idle, sleepy-idle, sociability-reaction, focus-march |
| 95 | バイオリズム持続時間変調 | BehaviorStateMachine.ts | 自動 | biorhythm | activity値による状態持続時間の変調（0.7x〜1.3x） |
| 96 | バイオリズムグラフ | StatsDrawer.tsx | 統計パネル | biorhythm | 3軸ネオンカラーサインカーブ+カーブ上移動アニメーション |

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
| 90 | 感情インジケーターUI | EmotionIndicator.tsx, StatsDrawer.tsx | 自動 | emotionAccumulation | ♥⚡★アイコンのopacity表示（統計パネル内） |
| 96 | 感情履歴永続化 | EmotionHistoryService.ts, EmotionHistoryBridge.ts | 永続化 | emotionAccumulation | 全感情パラメータの起動間復元+日次スナップショット+イベントカウント+クロスセッション時間経過変化 |
| 98 | 感情推移グラフ | EmotionTrendChart.tsx, StatsDrawer.tsx | 統計パネル | emotionAccumulation | satisfaction/fatigue/affinityの3曲線折れ線グラフ+ポモドーロ完了数イベントバー（期間切替7d/30d/All） |

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
| 99 | シーンプリセット選択 | ScenePreset.ts, ChunkDecorator.ts, decorators/*.ts | 操作 | weatherSettings | meadow/seaside/parkの3プリセット切替+環境音連動 |
| 66 | 天気エフェクト描画 | RainEffect.ts, SnowEffect.ts, CloudEffect.ts | 自動 | （制限不要） | 選択された天気の描画（設定UIを制限すれば十分）。opacityフェード（fadeIn/fadeOut）でテーマ遷移と同期。雲は密度変更時に退場バッチクロスフェード |
| 67 | ライティング | main.ts, EnvironmentTheme.ts | 自動 | （制限不要） | 時間帯×天気のルックアップテーブル適用 |
| 68 | オートタイムオブデイ | main.ts | 自動 | （制限不要） | 1分間隔の時間帯更新 |
| 69 | 天気プレビューカメラ | main.ts | 自動 | weatherSettings | パネル表示中のカメラ後退 |
| 100 | 天文計算シミュレーション | EnvironmentSimulationService.ts | 自動 | （制限不要） | astronomy-engineによる太陽/月位置→環境パラメータ連続生成 |
| 101 | 七十二候セレクタ | KouSelector.tsx | 操作 | （制限不要） | ウィンドウ上端ドロップダウン+Autoボタン。Auto/手動切替で候を選択→気候データ・天気決定に反映 |
| 102 | 世界地図UI | WorldMapModal.tsx, LocationButton.tsx | 操作 | （制限不要） | SVG世界地図+terminator+都市プリセット+座標選択。LocationButtonはフリーモードに常時配置（autoWeather非依存）。WeatherPanelからのLocationボタンは削除済み |
| 103 | 気候プロファイル | ClimateData.ts, ClimateGridAdapter.ts | 自動 | （制限不要） | 緯度経度から72候分気候データ自動生成 |
| 104 | 天気自動決定 | WeatherDecision.ts | 自動 | （制限不要） | 気候データ+気温→天気タイプ確率的決定 |
| 105 | 雨量連動パーティクル | RainEffect.ts, SnowEffect.ts | 自動 | （制限不要） | 降水強度→粒子数動的変更 |

### L. バックグラウンド動作

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 70 | バックグラウンドタイマー継続 | main.ts | 自動 | pomodoroTimer | setInterval(1秒)でtick |
| 71 | フォーカス復帰時の時間帯更新 | main.ts | 自動 | （制限不要） | autoTimeOfDay時の反映 |
| 97 | OSスリープ抑制 | SleepPreventionBridge.ts, ipc-handlers.ts | 自動 | （制限不要） | ポモドーロ中のOS sleep/suspend抑制（設定でON/OFF） |

### M. シーン遷移

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 72 | AppScene遷移 | SceneRouter.tsx, DisplayTransition.ts | 自動 | （制限不要） | free/pomodoro/fureai/gallery切替 |
| 73 | ブラックアウトトランジション | SceneTransition.tsx | 自動 | （制限不要） | 暗転エフェクト |

### N. 設定永続化

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 74 | 設定自動保存 | desktop/main/index.ts | 自動 | （制限不要） | settings.json保存 |
| 75 | 統計データ自動保存 | desktop/main/index.ts | 自動 | （制限不要） | statistics.json保存 |
| 76 | 起動時設定復元 | AppSettingsService.ts | 自動 | （制限不要） | loadFromStorage() |
| 106 | データエクスポート | export-import.ts, OverlayFree.tsx | 操作 | dataExportImport | settings+statistics+emotionHistoryをJSONファイルにエクスポート |
| 107 | データインポート | export-import.ts, OverlayFree.tsx | 操作 | dataExportImport | JSONファイルからインポート+バリデーション+アプリ再起動 |

### O. ライセンスUI

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 87 | トライアルバッジ | TrialBadge.tsx | 自動 | （制限不要） | trial中に右下に「Trial」を薄く常時表示 |
| 88 | プレミアム機能ロックオーバーレイ | FeatureLockedOverlay.tsx | 操作 | （制限不要） | trial中のfureai/galleryボタン押下時に購入インセンティブ表示 |

### P. ユーティリティ

| # | 機能名 | 実装箇所 | 種別 | FeatureName | 概要 |
|---|---|---|---|---|---|
| 77 | 外部リンク | desktop/main/index.ts | 操作 | （制限不要） | shell.openExternal() |
| 89 | カスタムタイトルバー | WindowTitleBar.tsx, ipc-handlers.ts | 操作 | （制限不要） | frame: false + 最小化/閉じるボタン + ドラッグ移動 |
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
| 0.9.1 | バグ修正 | KouSelector E2Eテスト修正（settingsSummary pointer-events重なり）+ 設定パネルレイアウト修正（Data:行統合） |
| 0.9.0 | 機能追加 | データエクスポート/インポート機能追加（#106,#107）。settings+statistics+emotionHistoryのJSONファイルエクスポート/インポート。バージョン互換性検証、確認ダイアログ、deviceId/license情報保持マージ、インポート後アプリ再起動。`dataExportImport` FeatureName追加（registered専用、trial/expired/restricted無効） |
| 0.8.1 | バグ修正 | KouSelector autoKou/manualKouIndex変更時にWeatherConfigChangedイベント未発行によるReact再レンダリング不具合修正 |
| 0.8.0 | 機能追加+UI改善 | 天文計算ベース環境シミュレーション追加（#100-105）。KouSelectorリスト化（ドロップダウン→フルスクリーンオーバーレイリスト、2クリック選択）。WeatherPanel Scene行にLocationボタン追加（WorldMapModal復帰フロー）。autoWeatherとロケーション設定を分離（envSimService常時稼働、autoWeather排他選択化、LocationButton常時表示） |
| 0.7.0 | 機能追加 | 環境シーンプリセットシステム追加（#99）。meadow/seaside/parkの3プリセット、WeatherPanel Scene行（即座反映・Setボタン廃止）、環境音連動、settings.json永続化。seaside演出強化（ヤシの木・波打ち際・砂浜地面色・空色明化・輝度ブースト・mergeGeometries描画最適化）。天気別雲色（sunny=白emissive/それ以外=灰色）。park改善（歩道・街灯等間隔・植え込み歩道脇沿い・街路樹5本） |
| 0.6.0 | 機能追加 | 天気エフェクトopacityフェード追加。テーマ遷移と同期したfadeIn/fadeOut、雲密度変更時の退場バッチクロスフェード |
| 0.5.1 | UI改善+バグ修正 | Emotion TrendsグラフをCumulative Timeと同スタイルに統一（直線折れ線・レイアウト統一・不要UI削除・日付補間追加）。EmotionIndicatorの値読み込み前非表示を修正 |
| 0.5.0 | 機能追加 | 感情推移グラフUI追加（#98）。StatsDrawer内にsatisfaction/fatigue/affinityの3曲線折れ線グラフ+ポモドーロイベントバー。期間切替（7d/30d/All）、ダーク/ライト対応 |
| 0.4.0 | 機能追加 | OSスリープ抑制機能追加（#97）。ポモドーロ中のpowerSaveBlocker制御、設定UIトグル、settings.json永続化 |
| 0.3.2 | UI改善 | ウィンドウボタンのホバー時のみアイコン表示、Galleryモード上部マージン縮小 |
| 0.3.1 | リファクタ | バイオリズムグラフ・EmotionIndicator・CharacterNameEditorをCompactHeader内に統合、BiorhythmChart独立コンポーネント化、E2Eテスト追従修正 |
| 0.3.0 | 機能追加 | バイオリズム機能追加（#92-96）、FeatureName 'biorhythm' 追加、registeredのみ有効（trial無効）。統計パネルにバイオリズムグラフ追加（#96） |
| 0.2.1 | バグ修正 | register APIデバイス自動作成、heartbeat merge:trueレースコンディション対策、ギャラリーUI重なり修正 |
| 0.2.0 | 機能追加 | キャラクター名設定追加（#91）、ふれあいモード内にCharacterNameEditor配置、AppSettingsServiceにcharacterConfig追加 |
| 0.2.0 | 機能追加 | ギャラリーモード追加（#81-86）、カスタムタイトルバー追加（#89）、感情インジケーターUI追加（#90）、frame: false化、ウィンドウ操作IPC追加、Clips/States/Rulesの3モード、CompactHeader共通化、ふれあいボタン右下移動、FeatureName 'gallery' 追加、EmotionStateUpdatedイベント+EmotionIndicator.tsx新規追加 |
| 0.2.0 | 制限変更 | trial で fureai/gallery を無効化（registered限定のプレミアム機能に変更） |
| 0.1.1 | バージョン同期 | リリースインフラ整備に伴うバージョン同期（機能変更なし） |
| 0.1.0 | 初版 | 全80機能定義、10項目のFeatureName策定、ライセンス制限マップ策定 |
