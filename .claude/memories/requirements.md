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

#### 6.3 シーンプリセット
3種のプリセットで環境オブジェクトの構成を切替える。`ScenePreset`値オブジェクト（ドメイン層）が`ChunkSpec`を定義し、`ChunkDecorator`（インフラ層、Strategyパターン）がオブジェクト生成を担当する。

| プリセット | 木 | 草 | 岩 | 花 | 固有オブジェクト |
|---|---|---|---|---|---|
| meadow（草原） | 2 | 50 | 1 | 3 | — |
| seaside（海辺） | 0 | 20 | 0 | 0 | ヤシの木1（放物線幹+羽状複葉）、波打ち際（水面+泡）、貝殻8 |
| park（公園） | 5 | 0 | 0 | 0 | 歩道（中央）、街灯（歩道脇4m間隔・左右交互）、植え込み・花壇（歩道脇2m間隔）、ベンチ1 |

- チャンク寸法: 幅20 × 奥行10（全プリセット共通）
- 中央帯（x: ±3）を避けてオブジェクト配置（キャラクターの通路を確保）
- プリセット別環境音連動: meadow→forest、seaside→wind、park→forest
- ランタイム切替: `InfiniteScrollRenderer.rebuildChunks()`で全チャンクを破棄・再構築

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
- 保持ポリシー: 無期限保持。削除・クリーンアップ機能は未実装
- データ量目安: 1日あたり数百バイト（1レコード約150B）、年間約100KB
- 保存と表示の差異: 全期間のデータを保存するが、UIは最大13週（91日）分を可視化

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
- 手動選択: `setManualTimeOfDay(timeOfDay)`で擬似太陽/月位置によるテーマ生成（morning=高度10°東、day=50°南、evening=5°西、night=-20°地平線下）。候計算（eclipticLon）は実太陽位置を維持

#### 13.3 環境テーマ
- 20パターン（4天気×4時間帯+フォールバック）のルックアップテーブル
- パラメータ: 空色、霧色・距離、環境光・半球光・太陽光の色・強度・位置、地面色、露出
- sunny/dayが従来のハードコード値と一致
- seasideプリセット: skyColor/fogColor/hemiSkyColorをlightenColorで白方向25%明化、exposure×1.25・sunIntensity×1.2・ambientIntensity×1.15、groundColor/hemiGroundColorを砂色オーバーライド（全16パターン）
- 時間帯・天気切替時にsmoothstep補間で滑らかに遷移（autoTimeOfDay: 5秒、手動切替: 1.5秒）
- 補間対象: 色7個（lerpHexColor RGB分解）、float5個（lerpFloat）、vec3 1個（sunPosition）
- 補間中の割り込み: 現在の中間値から新目標へシームレスに再補間
- 雨/雪/雲エフェクトもテーマ遷移と同期したopacityフェードで滑らかに遷移
- 初回起動時はsetVisibleで即座表示（フェードなし）

#### 13.4 天気エフェクト
- 雨: LineSegments（650本）残像付き線分 + スプラッシュパーティクル（リングバッファ200個）
- 雪: Points（750個）sin/cosゆらゆら揺れ
- 雲: 半透明SphereGeometryクラスター（3-6個/雲）、6段階密度（0-100個）、z方向ドリフト。天気別色分け（sunny=白emissive自発光、cloudy/rainy/snowy=灰色）
- パーティクルのZ範囲をカメラ手前に来ないよう制限（Z_MIN=-15, Z_MAX=4）
- opacityフェード: 雨（0→0.4/0.5）、雪（0→0.7）、雲（0→CLOUD_CONFIGS[level].opacity）
- フェード中の方向反転: 現在のopacity比率から逆方向にフェード開始（不自然なジャンプなし）
- 雲の密度変更時クロスフェード: 古い雲を退場バッチに移してフェードアウト（2000ms）、新しい雲をフェードインで生成。退場中もドリフト継続

#### 13.5 天気設定UI（WeatherPanel）
- コンパクトフローティングパネル（bottom:10, left:66）
- Scene行: meadow/seaside/parkの3アイコンボタン（山/波/木のSVGアイコン）
- Weather行: 天気4種アイコン + Auto（排他選択。Autoクリック→auto有効、天気アイコンクリック→auto解除）。雪アイコンは雪の結晶SVG（6軸+V字枝）
- Time行: 時間帯4種アイコン + Auto（autoWeather時もクリック可能、クリックでautoWeather解除）
- 雲量: 6段階セグメントバー（丸ボタン20px、`borderStrong`枠線常時表示）+ リセットボタン。レベルに応じてopacity濃淡（0.15〜1.0）
- 即座反映方式: 操作時にEventBus発行+settingsService永続化を同時実行。Setボタン・スナップショット復元なし
- パネル表示中: カメラをふれあいモード位置に後退、キャラクターmarch-cycleプリセット
- autoTimeOfDayのintervalをプレビュー中一時停止（保存値上書き防止）

#### 13.6 永続化
- `{userData}/settings.json`のweatherフィールドに保存・復元
- cloudDensityLevel、scenePresetも永続化
- scenePresetが未設定の場合（旧バージョンのsettings.json）は'meadow'にフォールバック
- climateフィールド（mode/presetName/latitude/longitude/label）も永続化（後方互換: 未設定時はDEFAULT_CLIMATE）

#### 13.7 天文計算ベース環境シミュレーション — 実装済
astronomy-engineによるローカル天文計算と気候定数テーブルの組み合わせで環境を連続的にシミュレートする。

##### 13.7.1 天文計算基盤
- astronomy-engine（npmパッケージ）による太陽/月位置のリアルタイム計算
- 太陽: 高度角（altitude）、方位角（azimuth）、黄経（eclipticLon）
- 月: 高度角、方位角、月齢（phase）、照度（illumination）
- `AstronomyPort`インターフェース（ドメイン層）でインフラ層の天文ライブラリを抽象化
- `AstronomyAdapter`（インフラ層）がastronomy-engineをラップして実装
- 30秒間隔で天体位置を更新

##### 13.7.2 天体→環境パラメータ連続生成
- 太陽高度角→空色（breakpoint補間、天気による灰色ティント付き）
- 太陽高度角→太陽色（白→オレンジ→赤のグラデーション）
- 太陽高度角→exposure（smoothstep関数、-6°〜40°の連続変化）
- 夜間: 月齢+月高度→月光色・月光強度
- 薄明時（太陽高度-6°〜6°）: 太陽光と月光のクロスフェード
- 天気による減光（WEATHER_DIMMING: sunny=0, cloudy=0.35, rainy=0.55, snowy=0.45）
- シーンプリセットによるオーバーライド（seaside: 砂浜地面色、空色明化）
- 旧THEME_TABLEルックアップに代わる連続関数方式

##### 13.7.3 天体→光源の向き
- 日中: 太陽方位角・高度角→DirectionalLight方向ベクトル
- 夜間: 月方位角・高度角→DirectionalLight方向ベクトル
- 薄明時: 太陽/月方向を線形補間でクロスフェード

##### 13.7.4 七十二候
- 太陽黄経5度刻みで現在の候を特定（`resolveKou(eclipticLon)`）
- 本朝七十二候の全72候を定義（KOU_DEFINITIONS）
- 各候: index, solarTermName, phase（初候/次候/末候）, nameJa, readingJa, nameEn, description, eclipticLonStart
- `kouProgress(eclipticLon)`: 候内の進行度（0.0〜1.0）
- `KouChanged`イベントをEventBusで発行（候が変わったとき）

##### 13.7.5 気候プロファイル
- 全球5度解像度気候グリッドデータ（ClimateGridPort）
- 双線形補間で任意の緯度経度から月次気候データ（気温・降水量・降雪確率）を取得
- 海洋セルは最近傍の陸地セルにスナッピング
- `interpolateToKouClimate()`: 月次12データ→72候単位のコサイン補間
- `estimateTemperature()`: 日中のコサイン近似気温変動
- `temperatureToGroundColor()`: 気温→地面色の連続マッピング（seasideは砂色固定）
- 8都市プリセット: Sydney, Tokyo, London, New York, Hawaii, Dubai, Reykjavik, Ushuaia
- `ClimateConfig`値オブジェクト（mode/presetName/latitude/longitude/label/timezone）

##### 13.7.5b タイムゾーン
- `resolveTimezone(lat, lon)`: tz-lookupで緯度経度→IANAタイムゾーン名を解決（海上はEtc/GMTフォールバック）。TZ_BOUNDARY_OVERRIDESで既知の境界精度問題を補正（例: Ushuaia座標→America/Argentina/Ushuaia）
- `getLocationTime(date, tz)`: Intl.DateTimeFormatで指定TZの時刻取得
- `formatTimezoneLabel(tz, date)`: 事前生成済みtimezone-abbr.json（386エントリ、103 DST対応）から略称取得
- フリーモードの時計・タイムラインを選択地域の現地時刻で表示
- TZラベル（JST/EST/AEDT等）をAM/PM直上に表示

##### 13.7.6 天気自動決定
- `decideWeather(kouClimate, estimatedTempC, seed)`: 気候データ+気温→天気タイプ・降水強度・雲密度を確率的に決定
- `mulberry32(seed)`: 決定論的32bit PRNG。日単位のシードで同じ日は同じ天気
- 降雪判定: 気温<2°Cで雨→雪に変換
- `WeatherDecisionChanged`イベントをEventBusで発行

##### 13.7.7 雨量連動パーティクル数
- `computeParticleCount(weather, precipIntensity)`: 降水強度→粒子数
- 雨: 100〜1200本（LineSegments）
- 雪: 100〜900個（Points）
- `setDrawRange()`による動的粒子数制御（BufferGeometry再作成なし）
- PARTICLE_COUNT_MAXサイズでバッファを事前確保

##### 13.7.8 七十二候セレクタ
- `KouSelector`コンポーネント（createPortalでdocument.bodyに描画）
- ウィンドウ上端中央に背景なし表示（position: fixed, top: 36px、ドラッグ領域の下）
- `<select>`ドロップダウンで72候を英語表示（`# 0 Minor Cold 1st`形式、モノスペースフォント）
- ドロップダウン下に詳細表示: 英語名 / 節気+フェーズ和名（大フォント） / 候名和名（大フォント） / 読み仮名（全角カッコ書き） / 説明文 / λ=黄経+Autoアイコン
- `KouDefinition`に`solarTermNameEn`フィールド（24節気の英語名）を追加
- Autoボタン（時計アイコン）でauto/手動切替
- Auto時（`autoKou: true`）: ドロップダウンのvalueが天文計算の`currentKou`に逐次追従
- 手動時（`autoKou: false`）: ドロップダウンで選択した候indexが`manualKouIndex`として`EnvironmentSimulationService.setManualKou()`に伝搬
- ドロップダウン手動変更で`autoKou`が自動的にfalseに切り替わる
- `WeatherConfig`に`autoKou: boolean`と`manualKouIndex: number`を追加（永続化対応）
- WorldMapModal表示中は非表示

##### 13.7.9 世界地図UI
- `WorldMapModal`コンポーネント（createPortalでdocument.bodyに全画面表示）
- SVG等距円筒図法。1/3幅表示（viewBox幅120°）で各地域を拡大表示
- 3枚並べ描画（-360/0/+360オフセット）でスクロール端の途切れ防止
- Layer構成: 海洋背景(#1a3a5c) → 陸地(ne_110m_land Polygon) → 国際日付変更線(ne_110m_geographic_lines) → 夜側オーバーレイ → 都市ピン → カスタム選択ピン
- `computeTerminatorPolygon(declination, gha)`: astronomy-engineの赤緯/GHAからterminator多角形を計算。atan使用（atan2は負の赤緯で誤動作）
- 8都市プリセット: CITY_PRESETSからピン表示（選択中はオレンジ、非選択は白）
- 地図クリックまたはプリセット選択で中心スクロール（最短方向ease-outアニメーション）
- Set Locationボタン（SetButtonと同スタイル）で`ClimateConfig`を適用
- 戻るボタン: LocationButtonと同位置（fixed, bottom:168, right:10）に左矢印アイコン
- モーダル開閉時にterminatorを1回更新

##### 13.7.10 統合シミュレーション
- `EnvironmentSimulationService`（アプリケーション層）が全サブシステムを統合
- `start(climate, scenePreset)`: 気候データ読み込み→初回計算→即座テーマ適用
- `tick(deltaMs)`: 30秒間隔で天体位置更新→テーマ再生成→遷移。日付変更時に天気再決定
- `onClimateChanged(climate)`: 気候データ再取得→再計算→テーマ遷移
- `stop()`: キャッシュクリア
- `setAutoWeather(enabled)`: autoWeather有効/無効を切替。無効時は`setManualWeather()`で設定した天気をテーマ計算に使用
- `setManualWeather(weather)`: autoWeather=false時の手動天気を設定し、テーマを再生成
- `setManualTimeOfDay(timeOfDay | null)`: 手動時間帯設定。擬似太陽/月位置でテーマを生成（候計算は実太陽位置を維持）。nullで実太陽位置に復帰
- `setManualKou(kouIndex | null)`: 手動候設定。指定indexの候の気候データで天気決定・気温推定を行う（天体位置計算は実時刻を維持）。nullで天文計算候に復帰。候変更時に天気再決定を強制
- 手動操作（setManualTimeOfDay/setManualWeather/setAutoWeather/setManualKou等）時のテーマ遷移は1.5秒。通常30秒間隔の天体更新時は30秒遷移
- 起動時のテーマ適用: オーバーライド設定→start()→applyThemeToScene()の順序で即座にシーンに反映
- envSimServiceはautoWeather状態に関わらず常に稼働（天文計算・テーマ生成は常時実行）
- autoWeatherは天気自動決定（decideWeather）の有効/無効のみを制御
- ロケーション設定（LocationButton/WorldMapModal）はautoWeather非依存で常に利用可能
- KouSelectorは常時表示（WorldMapModal表示中のみ非表示）

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
- affinityはsettings.jsonに永続化（互換性維持）
- 全感情パラメータ（satisfaction/fatigue/affinity）は`{userData}/emotion-history.json`に永続化（起動間復元）
- fatigue > 0.8でmarch速度が0.8に減速（疲れ歩き）
- affinity > 0.7でランダム15%のidle→happyアニメーション（なつき表現）
- satisfaction > 0.9でfeeding時にattack2アニメーション（満腹拒否）

#### 14.3.1 感情インジケーターUI — 実装済
- 統計パネル（StatsDrawer）のCumulative Timeグラフ下に♥（satisfaction）⚡（fatigue）★（affinity）の3アイコンを表示
- 各値をopacityで表現: opacity = 0.15 + value × 0.85（0.0→0.15, 1.0→1.0）
- CSS transition 0.5s easeでスムーズに変化
- `EmotionStateUpdated`イベント（EventBus）で1秒間隔スロットリング通知。感情イベント発生時は即時通知
- 統計パネル表示中のみ表示（freeモード等では非表示）
- `emotionAccumulation`ライセンス制限: expired/restrictedでは非表示
- インラインコンポーネント（StatsDrawer内に配置）

#### 14.3.2 感情パラメータ永続化・履歴記録 — 実装済
- 全感情パラメータ（satisfaction/fatigue/affinity）を`{userData}/emotion-history.json`に永続化
- 起動時に前回セッションの全パラメータを復元（emotion-history.jsonのlastSessionから）
- lastSessionがない場合はsettings.jsonのaffinityにフォールバック
- 日次スナップショット: 感情イベント発生時に当日の感情状態を記録
- 日次イベントカウント: pomodoroCompleted/pomodoroAborted/fed/pettedの回数を日次で集計
- 連続利用日数（streakDays）の追跡
- EmotionHistoryBridge: EventBus経由でPomodoroCompleted/PomodoroAborted/FeedingSuccessを購読し自動記録
- pettedイベントはInteractionAdapter経由で直接記録
- `emotionAccumulation`ライセンス制限に連動（expired/restrictedでは感情変化・履歴記録ともスキップ）
- クロスセッション時間経過変化: 起動時にlastSession.timestampからの経過時間に基づき感情を変化
  - satisfaction: -0.02/時（上限-0.30）— 放置中の退屈
  - fatigue: -0.05/時（0まで回復）— 放置中の休息
  - affinity: -0.03/日（猶予4時間、上限-0.15）— 長期不在の忘却
  - streakボーナス: 連続利用3日以上で+0.01/日（上限+0.10）
  - 5分未満の再起動は無視

#### 14.4 リアクション多様化
- クリック連打（3秒以内3回）→damage1（苛立ち）
- クリック連打（3秒以内5回）→damage2（怒り）
- 夜間＋高affinity→sleepアニメーション（眠そう）
- 当日3サイクル以上完了→happyアニメーション（ご機嫌）
- 餌やり5回以上→attack2（もういらない）
- reactionのランダム50%でattack2バリエーション
- refuseのランダム50%でdamage2バリエーション

#### 14.5 キャラクター名設定 — 実装済
- ふれあいモード内にCharacterNameEditorを配置（CompactHeaderの下、マージン24px）
- デフォルト名: `'Wildboar'`
- 名前テキスト（28px、textSecondary色、ドロップシャドウ付き）を画面中央にセンタリング表示
- 名前の右に鉛筆アイコンボタンを配置（absolute配置でセンタリングに影響しない）
- 鉛筆ボタンクリックのみで編集モードに遷移（名前テキストクリックでは遷移しない）
- 編集モード: テキスト入力（幅300px）に切り替わり、Enter/blurで確定、Escapeでキャンセル
- 文字数制限: 最大20文字
- 空文字確定時はデフォルト名に復帰
- `{userData}/settings.json`の`character.name`に永続化
- `AppSettingsService.updateCharacterConfig()`で保存、`CharacterConfigChanged`イベント発行
- 常時表示はしない（ふれあいモード内のみ表示）
- ライセンス: fureaiモード内の機能のためregistered限定（新FeatureNameは不要）

#### 14.6 バイオリズム — 実装済
- キャラクターの行動に日単位の周期的な状態変動を導入する
- 3軸: activity（周期5日）、sociability（周期7日）、focus（周期11日）
- 各軸の値は正弦波で-1.0〜1.0の範囲を変動する
- originDay（初回起動時刻）を基点に経過日数から計算する。originDayは`{userData}/settings.json`のbiorhythm.originDayに永続化
- 日付ベースの決定論的ノイズを加算（amplitude=0.1）
- ケアブースト: 餌やりでactivity+0.3/sociability+0.2、撫ででactivity+0.1/sociability+0.4。5分間で線形減衰
- focusはブースト対象外
- ブーストは加算合成（各軸上限1.0、時間は最大値）
- ライセンス: registeredのみ有効。それ以外はNEUTRAL（全軸0）でバイオリズムの影響なし
- UI表示: 統計パネルにバイオリズムグラフ（3軸ネオンカラーサインカーブ前後3日、カーブ上を移動するドットアニメーション、凡例付き）。canUse('biorhythm')でregistered限定表示
- 行動への影響:
  - activity高(>0.5): idle時に25%の確率でhappy再生、状態持続時間0.7倍（素早い遷移）
  - activity低(<-0.5): idle時に20%の確率でsleep再生、状態持続時間1.3倍（のんびり）
  - sociability高(>0.5): reaction時にhappy再生
  - focus高(>0.5): march序盤(phaseProgress<=0.3)でwalk speed 1.1
- 実装ファイル: BiorhythmState.ts（型+純粋関数）、BiorhythmService.ts（サービス）、EnrichedAnimationResolver.ts（4新ルール）、BehaviorStateMachine.ts（getDurationModifier）

### 15. OSスリープ抑制 — 実装済

#### 15.1 概要
- ポモドーロ実行中にOSのスリープ/サスペンドを抑制する
- Electronの`powerSaveBlocker.start('prevent-app-suspension')`で実現

#### 15.2 制御フロー
- `SleepPreventionBridge`がAppSceneChangedイベントを購読
- scene='pomodoro' && preventSleep有効 → `powerSaveBlocker.start()`
- scene!='pomodoro'（ポモドーロ終了/中断） → `powerSaveBlocker.stop()`
- 二重start防止（active状態で再度pomodoroイベントが来てもno-op）

#### 15.3 設定
- `PowerConfigInput { preventSleep: boolean }` — デフォルトON
- OverlayFree設定展開時に「Pomodoro: [🌙]」トグルで切替
- `{userData}/settings.json`の`power.preventSleep`に永続化
- 全ライセンスモードで利用可能（FeatureName追加不要）

#### 15.4 IPC
- `sleepBlocker:start` — powerSaveBlocker開始、IDをモジュール変数に保持
- `sleepBlocker:stop` — 保持したIDでpowerSaveBlocker停止

### 16. 環境映像 — 未実装（nice-to-have）

### 17. ライセンス機能制限 — 実装済

#### 17.1 ライセンスモード
- 4モード: registered / trial / expired / restricted
- registered/trialは全10機能が有効
- expired/restrictedはpomodoroTimer + characterのみ有効（残り8機能は無効）

#### 17.2 機能制限マップ（ENABLED_FEATURES）
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

#### 17.3 UI制限（LicenseContext）
- `LicenseProvider`（React Context）+ `useLicenseMode()`フックで全UIからcanUse()判定
- null（初期/非Electron）はtrial扱い → 全機能有効
- SceneFree: StatsButton/FureaiEntryButton/WeatherButtonをcanUseで表示制御
- OverlayFree: FreeTimerSettings非表示、サウンドプリセット非表示、通知トグルdisabled

#### 17.4 レンダラー側制限（main.ts）
- `currentLicenseMode`変数を`onLicenseChanged`で更新
- EmotionService.tick()/applyEvent()をisFeatureEnabled()でガード
- NotificationBridge isEnabledコールバックにisFeatureEnabled()判定追加

#### 17.5 メインプロセス制限（desktop/main/index.ts）
- `update:check`/`update:download` IPCハンドラでexpired/restricted時に早期リターン
- 起動時の自動チェックは既にregistered/trialに制限済み

#### 17.6 デバッグ
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
- UI層はReact 19で実装。`AppContext`による依存注入、`EnvironmentContext`で環境パラメータ一元管理、`useEventBus`フックでEventBus購読
- UIテーマ: System/Light/Dark/Autoの4モード。SystemはOS prefers-color-scheme追従。AutoはEnvironmentContextのisDaytime（太陽高度 > -6°市民薄明）でlight/darkを自動切替。`ThemeContext` + `useResolvedTheme`で解決
- CSS: vanilla-extract（`.css.ts`）でコンポーネント別にスコープ化。OverlayFree/OverlayPomodoro共用の`overlay.css.ts`
- テスト: Vitest v2、ドメイン層・アプリケーション層に集中
