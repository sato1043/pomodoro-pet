# 要件定義: ポモドーロタイマー

## 最終目的
STEAMに公開可能なポモドーロタイマーアプリをTypeScriptで開発する

## コンセプト
3Dキャラクターが自律的に行動するバーチャルペット型ポモドーロタイマー

## 機能要件と実装状況

### 0. アプリケーションシーン（AppScene） — 実装済

#### 0.1 概要
アプリケーション全体の動作シーンを管理する。ポモドーロタイマーの内部状態（work/break/long-break/congrats）とは独立した上位概念である。

#### 0.2 シーン定義
- `free`: ポモドーロサイクルに入っていない自由な状態。キャラクターは自由行動（idle系自律遷移）およびインタラクション（摘まみ上げ・撫でる等）が可能
- `pomodoro`: ポモドーロサイクル実行中。タイマーUIが表示される
- `settings`: 設定画面（将来拡張用、現在はスタブ）

#### 0.3 表示シーン（DisplayScene）
AppSceneとPhaseTypeを組み合わせた5つの表示シーンで画面状態を管理する。
- `free` — freeモードUI
- `pomodoro:work` — 作業フェーズUI
- `pomodoro:break` — 休憩フェーズUI
- `pomodoro:long-break` — 長時間休憩フェーズUI
- `pomodoro:congrats` — サイクル完了祝福UI

#### 0.4 状態遷移
- `free → pomodoro`: ユーザーの明示的な開始操作（Start Pomodoroボタン）
- `pomodoro → free`: ユーザーの明示的な終了操作（Stopアイコン）。手動中断時は`PomodoroAborted`イベントを発行
- `pomodoro → congrats → free`: サイクル完了時の自動遷移。`CycleCompleted` → congrats（5秒表示）→ `PomodoroCompleted`イベント → freeへ自動遷移

#### 0.5 配置
- アプリケーション層（`src/application/app-scene/`）に配置
- `AppSceneManager`が純粋な状態ホルダー（EventBus不要）として機能
- `PomodoroOrchestrator`がEventBus経由で`AppSceneChanged`イベントを発行し、各コンポーネントが購読

### 1. ポモドーロタイマー — 実装済

#### 1.1 セット構造
- 作業25分 → 休憩5分 を1セットとする（デフォルト）
- 4セットで1サイクル（設定UIで1〜4を選択可能）
- 最終セット後に15分の長時間休憩（Sets=1はBreak、Sets>1の最終セットはLong Break）
- 最終workの直後にcongrats（5秒）を挿入
- サイクル完了（長時間休憩終了）後にタイマーを自動停止し、freeへ遷移
- 作業時間（25/50/90分）、休憩時間（5/10/15分）、長時間休憩（15/30/60分）、セット数（1〜4）を設定UIで変更可能
- `CyclePlan`値オブジェクト（`buildCyclePlan(config)`）がセット構造・休憩タイプ・congrats挿入を一元管理

#### 1.2 タイマーUI（React）
全UIコンポーネントはReact JSX（`.tsx`）で実装。`createPortal`でdocument.bodyにポータル化。

**freeモード（FreeTimerPanel）:**
- タイトル「Pomodoro Pet」を表示
- ☰/×トグルで設定パネルの展開/折りたたみを切り替え
- 折りたたみ時: タイムラインサマリー（CyclePlanベース色付き横棒グラフ＋現在時刻＋セット終了時刻＋合計時間）を表示
- 展開時: タイマー設定ボタングループ（Work [25/50/90], Break [5/10/15], Long Break [15/30/60], Sets [1/2/3/4]）を表示
- VolumeControl（サウンドプリセット選択・10段階ボリュームインジケーター・SVGミュートボタン）を常時表示
- 展開時はSetボタンで設定確定。押さずに閉じるとスナップショット復元（タイマー設定・サウンド設定・sfxPlayer同期）
- 折りたたみ時のボリューム/ミュート変更は即時保存
- 「Start Pomodoro」ボタンでポモドーロ開始

**pomodoroモード（PomodoroTimerPanel）:**
- タイトル非表示
- SVG円形プログレスリング（200px, r=90, stroke-width=12）でタイマー進捗をアナログ表現
- リング内にフェーズラベル＋フェーズカラー数字を配置（work=緑、break=青、long-break=紫、congrats=黄）
- 背景にフェーズカラーの下→上グラデーションティント（時間経過でalpha 0.04→0.24に濃化）
- 左肩にサイクル進捗ドット（フェーズ単位、完了=白、現在=フェーズカラー、未到達=半透明）
- 右肩にSVGアイコンボタン: pause/resume（❚❚/▶）、stop（■）

**congratsモード（CongratsPanel）:**
- 祝福メッセージ「Congratulations!」＋サブテキスト「Pomodoro cycle completed」
- CSS紙吹雪エフェクト（30個、6色、ランダムサイズ・遅延・形状）
- 5秒で自動dismiss、またはクリックで閉じてfreeモードに遷移

#### 1.3 デバッグ用タイマー短縮モード
- 環境変数 `VITE_DEBUG_TIMER` で有効化
- 書式: `VITE_DEBUG_TIMER=work/break/long-break/sets`（秒数指定）
- 省略部分は前の値を引き継ぐ。setsデフォルト=2
- 例: `10`（全10秒）、`10/5`（work=10秒、break=5秒）、`10/5/15/3`（各指定）
- `.env.development` に記述して `npm run dev` で起動
- break/long-breakが30秒未満の場合、break-getsetトリガー（残り30秒）が開始直後に発火する

### 2. 3Dキャラクター — 実装済

#### 2.1 モデル
- FBXモデル（ms07_Wildboar イノシシ）を使用
- テクスチャはPNG手動適用（FBX内のPSD参照は読めないため）
- FBX読み込み失敗時はプレースホルダーキャラクター（プリミティブ人型＋8種プロシージャルアニメーション）にフォールバック
- AnimationControllerによるcrossFadeブレンド（0.3秒）

#### 2.2 配置
- キャラクターは画面中央よりやや下に固定表示
- キャラクター自体は移動しない（背景がスクロールすることで歩行を表現）

### 3. キャラクター行動AI — 実装済

#### 3.1 状態
10状態ステートマシン:

| 状態 | アニメーション | scrolling | 説明 |
|---|---|---|---|
| idle | idle | false | 待機 |
| wander | walk | false | 自由歩き（break/free中のふらつき、スクロールなし） |
| march | walk | true | 目的ある前進（work中、スクロールあり） |
| sit | sit | false | 座る |
| sleep | sleep | false | 寝る |
| happy | happy | false | 喜ぶ |
| reaction | wave | false | リアクション（クリック応答） |
| dragged | idle | false | 摘まみ上げ中 |
| pet | pet | false | 撫でられ中 |
| refuse | refuse | false | インタラクション拒否（work中） |

#### 3.2 BehaviorPreset（行動プリセット）
宣言的に振る舞いを制御する5つのプリセット:

| プリセット | 用途 | 遷移サイクル | interactionLocked |
|---|---|---|---|
| autonomous | free時の自律行動 | idle→wander→sit→idle | false |
| march-cycle | work中の行進 | march→idle→march（march 30〜60秒、idle 3〜5秒） | true |
| rest-cycle | break中の休息 | happy→sit→idle→sit（happyは初回のみ） | false |
| joyful-rest | long-break中の喜び休息 | happy→sit→idle→happy（happy繰り返し） | false |
| celebrate | congrats時の祝福 | happy固定（lockedState） | false |

#### 3.3 プロンプト入力
- 英語/日本語キーワードマッチング（LLM不使用）
- 未知テキスト→idle にフォールバック

### 4. キャラクターインタラクション — 実装済

#### 4.1 ホバー
- Raycasterベースのヒットテスト
- カーソルがpointerに変化（`InteractionConfig`で状態別ホバーカーソルをカスタマイズ可能）

#### 4.2 クリック
- reactionアニメーション再生

#### 4.3 摘まみ上げ（ドラッグ）
- マウスドラッグでキャラクターをY軸方向に持ち上げる（0〜3にclamp）
- ドラッグ中はマウスX差分で横方向（X/Z）にも小さく揺れる
- 横揺れに連動してキャラクターがY軸で少し回転する（揺れ方向を向く）
- 離すとふわっと降りる（位置・回転ともに指数減衰アニメーション、毎フレーム×0.9）
- 摘まみ上げ中は背景スクロールしない

#### 4.4 撫でる
- `GestureRecognizer`がドラッグ（Y軸持ち上げ）と撫でる（左右ストローク）を判定
- 撫でるとpetアニメーション再生

#### 4.5 インタラクションロック
- ポモドーロwork中（march-cycleプリセット）は`interactionLocked: true`
- ロック中にインタラクションするとrefuseアニメーション再生

### 5. タイマー↔キャラクター連携 — 実装済

#### 5.1 PomodoroOrchestratorによる一元管理
`PomodoroOrchestrator`がAppScene遷移・タイマー操作・キャラクター行動を一元管理する。階層間連動は直接コールバック（`onBehaviorChange`）で実行し、EventBusはUI/インフラへの通知のみに使用する。

#### 5.2 フェーズ→BehaviorPresetマッピング
`phaseToPreset()`純粋関数でフェーズをBehaviorPresetに変換:

| フェーズ | BehaviorPreset | キャラクター行動 |
|---|---|---|
| work | march-cycle | marchで前進（スクロール）、短い休憩を挟む |
| break | rest-cycle | happy→sit→idle循環 |
| long-break | joyful-rest | happy繰り返し→sit→idle循環 |
| congrats | celebrate | happy固定 |

#### 5.3 シーン別の行動
- freeモード → autonomousプリセット（idle→wander→sit→idle循環、スクロールなし、インタラクション可能）
- pomodoroモードwork → march-cycleプリセット（march→idle→march循環、スクロールあり、インタラクションロック）
- pomodoroモードbreak/long-break → rest-cycle/joyful-restプリセット（スクロールなし、インタラクション可能）
- congrats → celebrateプリセット（happy固定）
- pause → autonomousプリセット（自由行動に復帰）

### 6. 環境生成 — 実装済

#### 6.1 無限スクロール背景
- チャンクベースのリサイクル方式（3チャンク）
- キャラクターが手前（+Z）に歩くので、背景は奥方向（-Z）に流れる
- チャンクがリサイクル閾値を超えると、最後尾に再配置＋オブジェクト再生成

#### 6.2 シーン設定
- 進行方向: デフォルト+Z（奥→手前）、設定で変更可能
- スクロール速度: 1.5 units/sec
- `shouldScroll()`純粋関数で、現在の状態でスクロールすべきかを判定

#### 6.3 チャンク仕様
- 幅40 × 奥行20
- 木4本、草100本（InstancedMesh）、岩2個、花7個
- 中央帯（x: ±3）を避けてオブジェクト配置（キャラクターの通路を確保）

#### 6.4 霧・描画
- 霧（Fog）: start=15, end=35
- ACESFilmicToneMapping
- PCFSoftShadowMap

### 7. 環境音 — 実装済

#### 7.1 プロシージャル環境音
- Web Audio APIによるプロシージャル生成（外部mp3不要）
- プリセット: Rain, Forest, Wind, Silence
- VolumeControl（音量インジケーター・ミュートトグル）で制御
- `AudioAdapter`が再生/停止/音量/ミュート管理。`MAX_GAIN=0.25`でUI音量値をスケーリング
- 初期値はvolume=0/isMuted=true（起動時のデフォルト音量フラッシュ防止、loadFromStorage後に復元）

#### 7.2 SFX音声フィードバック（TimerSfxBridge）
`TimerSfxBridge`（アプリケーション層）がEventBus購読でタイマーSFXを一元管理:
- `PhaseStarted(work)` → work開始音再生
- `PhaseStarted(congrats)` → ファンファーレ再生
- `PhaseStarted(break)` → work完了音再生（long-break前はcongrats→ファンファーレのためスキップする遅延判定）
- `PomodoroAborted` → `pomodoro-exit.mp3`を再生

#### 7.3 休憩BGM
- break/long-break開始時に環境音を停止し`break-chill.mp3`をクロスフェードループ再生
- 残り30秒で`break-getset.mp3`に3秒クロスフェード切替（`PhaseTimeTrigger`を活用）
- break/long-break終了時にBGM停止・環境音復帰
- pause時はBGM停止、resume時は自動復帰
- `AudioControl`インターフェースで環境音の停止/復帰を抽象化

#### 7.4 SfxPlayer（インフラ層）
- MP3ワンショット再生（`play`）およびループ再生（`playLoop`/`stop`）
- `crossfadeMs`指定時はループ境界・曲間切替でクロスフェード
- per-source GainNodeで個別フェード制御＋ファイル別音量補正（`gain`パラメータ）
- fetch+decodeAudioDataでデコードし、バッファキャッシュで2回目以降は即時再生
- `MAX_GAIN=0.25`でUI音量値をスケーリング

### 8. シーンチェンジ演出 — 実装済

#### 8.1 宣言的シーン遷移グラフ
- `DISPLAY_SCENE_GRAPH`定数で全遷移ルールをテーブル定義
- `DisplayTransitionState`によるテーブルルックアップで遷移効果を解決

#### 8.2 遷移効果
| 遷移 | 効果 |
|---|---|
| free → pomodoro:work | blackout（暗転） |
| pomodoro:break → pomodoro:work | blackout |
| pomodoro:long-break → pomodoro:work | blackout |
| pomodoro:congrats → free | blackout |
| pomodoro:work → pomodoro:break/long-break/congrats | immediate（即時切替） |

#### 8.3 暗転オーバーレイ（SceneTransition）
- 全画面暗転オーバーレイ（`z-index: 10000`）
- `playBlackout(cb)`: opacity 0→1 (350ms) → cb() → opacity 1→0 (350ms)
- forwardRef+useImperativeHandleで親からの呼び出しに対応

#### 8.4 イベント分離
- SceneRouter（AppSceneChanged購読）とOverlayPomodoro（PhaseStarted購読）がそれぞれ独立したコンポーネントで処理するため、同期バッチイベントは自然に分離される

### 9. タイマー設定カスタマイズ — 実装済

#### 9.1 設定項目
- Work: 25 / 50 / 90 分
- Break: 5 / 10 / 15 分
- Long Break: 15 / 30 / 60 分
- Sets: 1 / 2 / 3 / 4
- サウンドプリセット: Rain / Forest / Wind / Silence
- 音量: 0〜10段階
- ミュート: on/off

#### 9.2 AppSettingsService
- `updateTimerConfig()`: 分→ms変換＋`createConfig()`バリデーション＋`SettingsChanged`イベント発行
- `updateSoundConfig()`: サウンド設定保存＋即時永続化
- `SettingsChanged`購読でsession再作成→UI再構築のフロー

### 10. 設定永続化 — 実装済

#### 10.1 保存先
- `{userData}/settings.json`（Windowsなら`%APPDATA%/pomodoro-pet/settings.json`）

#### 10.2 方式
- Node.js標準API（`fs` + `app.getPath('userData')`）で直接JSON読み書き
- `electron-store`はESM/CJS衝突のため不採用
- Electron IPC（`settings:load`/`settings:save`）→ preload contextBridge → renderer

#### 10.3 起動時復元
- `loadFromStorage()`でサウンド→タイマーの順でイベント発行
- `SoundSettingsLoaded`でAudioAdapter+SfxPlayerの両方にvolume/mute適用

### 11. カメラ・画面 — 実装済

#### 11.1 カメラ
- ほぼ水平の視点でキャラクターを見る（上からではない）
- キャラクターが画面やや下に表示される（タイマーUIが画面中央付近に来るように）

#### 11.2 画面サイズ
- iPhoneと同じ縦横比（390×844、iPhone 15相当）

### 12. 統計・履歴 — 実装済

#### 12.1 データモデル
- `DailyStats`型で日次集計: completedCycles、abortedCycles、workPhasesCompleted、breakPhasesCompleted、totalWorkMs、totalBreakMs
- `StatisticsData`型: `Record<'YYYY-MM-DD', DailyStats>`

#### 12.2 記録タイミング
- `PhaseCompleted(work)` → workPhasesCompleted++、totalWorkMs += config.workDurationMs
- `PhaseCompleted(break)` → breakPhasesCompleted++、totalBreakMs += config.breakDurationMs
- `PhaseCompleted(long-break)` → breakPhasesCompleted++、totalBreakMs += config.longBreakDurationMs
- `PomodoroCompleted` → completedCycles++
- `PomodoroAborted` → abortedCycles++
- `PhaseCompleted(congrats)` → スキップ（内部遷移）

#### 12.3 永続化
- `{userData}/statistics.json`（settings.jsonとは別ファイル）
- Electron IPC（`statistics:load`/`statistics:save`）→ preload contextBridge → renderer
- 更新ごとに即座にsave（イベント頻度が低いためdebounce不要）

#### 12.4 統計ドロワーUI（StatsDrawer）
- FreeTimerPanel右上のチャートアイコン（棒グラフ型SVG）から表示切替
- サマリー3カード: Today / 7 Days / 30 Days（work完了数 + 累計時間）
- 13週カレンダーヒートマップ（SVGベース、7行×13列、work完了数5段階、テーマ対応）
- 累計(work+break)時間の折れ線グラフ（SVGベース、軸+線のみ、最終点に放射状グラデーション脈動アニメーション+累計分数表示）

### 13. 天気エフェクト — 実装済

#### 13.1 天気タイプ
- 4種: sunny / cloudy / rainy / snowy
- 各天気にプリセット雲量を定義（sunny=1, cloudy=3, rainy=4, snowy=4）

#### 13.2 時間帯
- 4種: morning(5-8h) / day(9-16h) / evening(17-19h) / night(20-4h)
- Auto: `resolveTimeOfDay(hour)`で現在時刻から解決（1分間隔監視）
- 手動選択も可能

#### 13.3 環境テーマ
- 20パターン（4天気×4時間帯+フォールバック）のルックアップテーブル
- パラメータ: 空色、霧色・距離、環境光・半球光・太陽光の色・強度・位置、地面色、露出
- sunny/dayが従来のハードコード値と一致

#### 13.4 天気エフェクト
- 雨: LineSegments（650本）残像付き線分 + スプラッシュパーティクル（リングバッファ200個）
- 雪: Points（750個）sin/cosゆらゆら揺れ
- 雲: 半透明SphereGeometryクラスター（3-6個/雲）、6段階密度（0-100個）、z方向ドリフト
- パーティクルのZ範囲をカメラ手前に来ないよう制限（Z_MIN=-15, Z_MAX=4）

#### 13.5 天気設定UI（WeatherPanel）
- コンパクトフローティングパネル（bottom:110, left:66）
- アイコンボタン: 天気4種 + Auto(disabled) / 時間帯4種 + Auto
- 雲量: 6段階セグメントバー（丸ボタン20px）+ リセットボタン
- ドラフトstate方式: 操作でプレビュー（EventBus発行のみ）、Setで永続化、閉じるとスナップショット復元
- パネル表示中: カメラをふれあいモード位置に後退、キャラクターmarch-cycleプリセット
- autoTimeOfDayのintervalをプレビュー中一時停止（保存値上書き防止）

#### 13.6 永続化
- `{userData}/settings.json`のweatherフィールドに保存・復元
- cloudDensityLevelも永続化

### 14. キャラクター表情・感情表現 — 実装済

#### 14.1 AnimationResolverシステム
- コンテキスト依存のアニメーション選択基盤（`AnimationContext`→`AnimationSelection`）
- デフォルトリゾルバ（STATE_CONFIGS準拠）とEnrichedAnimationResolver（16ルール）の2段構成
- 未使用FBX5本（Run/Attack_02/Damage_01/Damage_02/GetUp）を読み込み登録
- PlaceholderCharacterにも5クリップのフォールバックアニメーション追加

#### 14.2 フェーズ連動アニメーション
- work中盤（phaseProgress 0.3〜0.7）: walkアニメーションをspeed=1.2で再生
- work終盤（phaseProgress > 0.7）: runアニメーションに切替
- march移動速度もphaseProgressに連動（1.5→2.5 units/sec）
- sleep→idle遷移時にgetUpアニメーション再生
- congrats時にランダム30%で走り喜び（run speed=1.2）

#### 14.3 感情パラメータシステム
- 3パラメータ: satisfaction（満足度）、fatigue（疲労度）、affinity（親密度）
- イベント効果: 餌やり(+satisfaction, +affinity)、撫でる(+affinity)、ポモドーロ完了(+satisfaction, -fatigue)、ポモドーロ中断(-satisfaction)
- 自然変化: work中にfatigue増加、非work時にfatigue回復・satisfaction緩やか減衰、affinity常時微減
- affinityのみsettings.jsonに永続化
- fatigue > 0.8でmarch速度が0.8に減速（疲れ歩き）
- affinity > 0.7でランダム15%のidle→happyアニメーション（なつき表現）
- satisfaction > 0.9でfeeding時にattack2アニメーション（満腹拒否）

#### 14.4 リアクション多様化
- クリック連打（3秒以内3回）→damage1（苛立ち）
- クリック連打（3秒以内5回）→damage2（怒り）
- 夜間＋高affinity→sleepアニメーション（眠そう）
- 当日3サイクル以上完了→happyアニメーション（ご機嫌）
- 餌やり5回以上→attack2（もういらない）
- reactionのランダム50%でattack2バリエーション
- refuseのランダム50%でdamage2バリエーション

### 15. 環境映像 — 未実装（nice-to-have）

### 16. ライセンス機能制限 — 実装済

#### 16.1 ライセンスモード
- 4モード: registered / trial / expired / restricted
- registered/trialは全10機能が有効
- expired/restrictedはpomodoroTimer + characterのみ有効（残り8機能は無効）

#### 16.2 機能制限マップ（ENABLED_FEATURES）
デフォルト無効方式。`ENABLED_FEATURES`マップに明示的に列挙された機能のみ有効（安全側に倒れる）。

| FeatureName | registered/trial | expired/restricted |
|---|---|---|
| pomodoroTimer | 有効 | 有効 |
| timerSettings | 有効 | 無効 |
| character | 有効 | 有効 |
| stats | 有効 | 無効 |
| fureai | 有効 | 無効 |
| weatherSettings | 有効 | 無効 |
| soundSettings | 有効 | 無効 |
| backgroundNotify | 有効 | 無効 |
| emotionAccumulation | 有効 | 無効 |
| autoUpdate | 有効 | 無効 |

#### 16.3 UI制限（LicenseContext）
- `LicenseProvider`（React Context）+ `useLicenseMode()`フックで全UIからcanUse()判定
- null（初期/非Electron）はtrial扱い → 全機能有効
- SceneFree: StatsButton/FureaiEntryButton/WeatherButtonをcanUseで表示制御
- OverlayFree: FreeTimerSettings非表示、サウンドプリセット非表示、通知トグルdisabled

#### 16.4 レンダラー側制限（main.ts）
- `currentLicenseMode`変数を`onLicenseChanged`で更新
- EmotionService.tick()/applyEvent()をisFeatureEnabled()でガード
- NotificationBridge isEnabledコールバックにisFeatureEnabled()判定追加

#### 16.5 メインプロセス制限（desktop/main/index.ts）
- `update:check`/`update:download` IPCハンドラでexpired/restricted時に早期リターン
- 起動時の自動チェックは既にregistered/trialに制限済み

#### 16.6 デバッグ
- `VITE_DEBUG_LICENSE`環境変数でモード固定（ハートビートスキップ）
- 詳細: [feature-license-map.md](feature-license-map.md)

## 非機能要件
- プラットフォーム: Windows
- デスクトップアプリ: Electron v33
- electron-builder NSIS設定済
- 将来Steam公開対応（steamworks.js統合可能な構造）
- クリーンアーキテクチャ（domain ← application ← adapters ← infrastructure）
- ドメイン層は純粋関数/オブジェクトで構成、Three.jsやDOMに依存しない
- TypeScript strict mode
- UI層はReact 19で実装。`AppContext`による依存注入、`useEventBus`フックでEventBus購読
- CSS: vanilla-extract（`.css.ts`）でコンポーネント別にスコープ化。OverlayFree/OverlayPomodoro共用の`overlay.css.ts`
- テスト: Vitest v2、ドメイン層・アプリケーション層に集中
