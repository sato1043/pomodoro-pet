# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-03-11

### Changed
- KouSelector UIリファクタリング — ドロップダウンを廃止しフルスクリーンオーバーレイリスト（テーブル+詳細パネル）に変更。2クリック選択（プレビュー→確定）。3段レイアウト（seasonラベル+#日付範囲 / 英語名 / Autoアイコン+リストアイコン）。リスト閉じるボタンをWeather戻るボタンと同位置・同サイズに統一。Autoアイコン色: inactive=白系、active=グレー系
- WeatherPanel Scene行にLocationボタン追加 — 右端に地球アイコンを配置。クリックでWeatherPanelを閉じてWorldMapModalを開き、WorldMapModal閉じると（Set Location/戻る両方）WeatherPanelに自動復帰。SceneFreeに`openedFromWeather`フラグ追加

### Added
- 七十二候セレクタ — KouDisplayを削除し、ウィンドウ上端中央にドロップダウン+Autoボタンの`KouSelector`を配置。Auto時は天文計算候に逐次追従、手動時は任意の候（0-71）を選択可能。候選択が気候データ・天気決定に連動。`WeatherConfig`に`autoKou`/`manualKouIndex`フィールド追加（永続化対応）。`EnvironmentSimulationService.setManualKou()`で手動候をオーバーライド
- 七十二候セレクタUI改善 — ドロップダウンを英語表示（`# Minor Cold 1st`形式）に変更。`KouDefinition`に`solarTermNameEn`フィールド追加（24節気の英語名）。詳細表示に候名和名（大フォント）・読み仮名（カッコ書き）・説明文を追加
- KouSelectorカレンダー日付範囲ドロップダウン — ドロップダウン表示を`# 1 |  1/ 5 -  1/ 9`形式（1-based候番号+天文計算による日付範囲）に変更。astronomy-engineのsearchSunLongitude()で全72候の開始日を年初に一括計算（`computeKouDateRanges()`）
- OverlayTitle節気・候表示 — フリーモードの日付ヘッダ横に現在の節気名+候位相を日本語で表示（例: `小寒 初候　3/10 Tue`）

### Changed
- KouDefinitionにphaseNameEn/phaseNameJaフィールド追加 — 候位相の表示名（`'1st'`/`'2nd'`/`'3rd'`、`'初候'`/`'次候'`/`'末候'`）をKouDefinitionに追加
- SOLAR_TERMS/PHASESをタプル配列に統合 — `SOLAR_TERMS`を`readonly [string, string][]`（和名・英名ペア）に、`PHASES`を`readonly [KouPhase, string, string][]`（phase・英名・和名トリプル）に統合
- EnvironmentContextにkouDateRanges追加 — `KouDateRange`型（index/startDate/endDate）と`KouDateRangesComputedEvent`を追加。EnvironmentSimulationServiceの`computeKouDateRanges()`で年間全72候の開始日を天文計算し、EnvironmentContext経由でReact側に提供
- 雪アイコン — WeatherPanelの雪アイコンを雲+縦線から雪の結晶SVG（6軸+V字枝）に変更
- 雲量セグメント — レベルに応じたopacity濃淡（0.15〜1.0）を追加。外枠を`borderStrong`で常時表示し低雲量でも選択状態を視認可能に
- ケッペン気候区分表示 — 世界地図モーダルの座標情報にケッペン気候区分（例: Cfa Humid subtropical）を表示。`classifyKoppen()` 純粋関数で12ヶ月の気温・降水量データからE→B→A→C→D優先順位で30分類を算出。`KoppenClassification`型（code/label）。`AppDeps`に`climateGridPort`を追加しWorldMapModalに気候データアクセスを提供
- EnvironmentContext — 環境パラメータ（climate/currentKou/solarAltitude/isDaytime/timezone）をReact Contextで一元管理。EventBus購読→React状態変換のアダプター。updateClimate操作で永続化+イベント発行を内包
- テーマ自動切替（auto） — ThemePreferenceに4番目の選択肢'auto'を追加。太陽高度角ベース（市民薄明-6°閾値）でlight/darkを自動切替。useResolvedThemeにisDayTimeパラメータ追加。OverlayFreeのテーマ選択UIにSunriseIconアイコン追加。AppSettingsServiceのthemeバリデーションにauto対応
- 気候グリッドデータ生成スクリプト (`scripts/generate-climate-grid.ts`) — NASA POWER API (1991-2020 climatology) から5度格子の月別気候データを取得し `assets/data/climate-grid.json` に出力。中間キャッシュによる中断・再開対応。`npm run generate:climate` で実行
- 海岸線SVGパス生成スクリプト (`scripts/generate-coastline-path.ts`) — Natural Earth 110m GeoJSONから世界地図用SVGパスを生成し `assets/data/coastline-path.json` に出力。`npm run generate:coastline` で実行
- NASA POWERデータ帰属表示 — `licenses/ASSET_CREDITS.txt` にNASA POWER CERES/MERRA-2 Climatologyのクレジットを追加
- Phase 5.5アプリ統合 — EnvironmentSimulationServiceをmain.tsに接続。autoWeatherオン/オフ切替、WeatherDecisionChangedによるエフェクト反映、animateループ内tick()、autoTimeInterval連動
- フリーモードLocationButton — 右端ふれあいボタン上に地球アイコンボタン配置。クリックでWorldMapModalを開き地域選択→autoWeather自動有効化
- WeatherPanelのautoWeather有効化 — Autoボタンのdisabled解除。autoWeather時にWeather/Clouds/Time行をdisabled化。Locationボタン（GlobeIcon）でWorldMapModal起動
- 天文計算ベース環境シミュレーション（Phase 5.5） — astronomy-engineによる太陽/月位置のリアルタイム計算。太陽高度角・方位角・黄経・月齢・月照度から環境パラメータ（空色・露出・光源方向・月光色）を連続生成。薄明時の太陽/月クロスフェード対応
- 七十二候システム — 太陽黄経5度刻みで現在の候を特定。本朝七十二候の全72候定義（和名・読み・英名・説明）。候名UIオーバーレイ表示（フェードアニメーション付き）。候変更EventBusイベント
- 気候プロファイルシステム — 全球5度解像度気候グリッドデータ（ClimateGridPort）対応。月次気候データから72候単位へのコサイン補間。緯度経度から気温・降水量・降雪確率を自動推定
- 天気自動決定 — 気候データ+気温から天気タイプ・降水強度・雲密度を確率的に決定。決定論的PRNG（mulberry32）で日単位のシード。WeatherDecisionChangedイベント
- 雨量連動パーティクル数 — 降水強度に応じて雨（100〜1200本）/雪（100〜900個）のパーティクル数を動的変更。setDrawRange()によるBufferGeometry再作成なしの効率的な粒子数制御
- 世界地図UIモーダル — SVG等距円筒図法の世界地図。astronomy-engineによるterminator昼夜境界描画。8都市プリセット（Sydney/Tokyo/London/New York/Hawaii/Dubai/Reykjavik/Ushuaia）+クリック任意座標選択。選択地点中心スクロール（最短方向アニメーション）。1/3幅拡大表示・全画面化。Natural Earth IDLライン描画
- EnvironmentSimulationService — 天文計算・気候・天気決定・テーマ生成を統合するオーケストレーター。30秒間隔で天体位置を更新、日単位で天気を再決定
- 設定永続化にclimateフィールド追加 — settings.jsonのweather.climateに緯度・経度・ラベル・プリセット名を保存・復元（後方互換: 未設定時はDEFAULT_CLIMATE）
- タイムゾーン表示 — tz-lookupで緯度経度→IANAタイムゾーン自動解決。事前生成済み略称マッピング（386エントリ、103 DST対応）で正確な略称表示（JST/EST/AEDT等）。フリーモードの時計・タイムラインを選択地域の現地時刻で表示。`scripts/generate-timezone-abbr.ts`で生成

### Changed
- autoWeatherとロケーション設定を分離 — 地点選択がautoWeather=trueを強制しなくなった。envSimServiceはautoWeather状態に関わらず常に稼働し天文計算ベースのテーマ生成を継続。autoWeatherはenvSimService内部の天気自動決定（decideWeather）の有効/無効のみを制御。LocationButton・KouDisplayはautoWeather非依存で常に表示。WeatherPanelのAutoボタンを天気アイコンと排他選択に変更（Autoクリック→auto有効、天気アイコンクリック→auto解除）。WeatherPanel内のLocationボタン（GlobeIcon）を削除（フリーモードのLocationButtonに一本化）
- ClimateGridAdapter APIをデータ注入方式に変更 — `createClimateGridAdapter(data: ClimateGridJson)` でビルド時バンドルされたJSONデータを直接受け取る。`load(url)` / `fetch` / `isLoaded=false` フォールバックを廃止。`ClimateGridJson` 型をexport
- 陸地データをne_110m_coastline（LineString）からne_110m_land（Polygon）に変更 — 閉じたポリゴンでSVG fillが正しく機能し、180°境界でのアーティファクトを解消
- 日付変更線をNatural Earth ne_110m_geographic_linesの正確なデータに変更（手動14点概略→2047座標）
- generate-coastline-path.tsの出力を `{path, idlPath}` に拡張

### Fixed
- autoWeatherとautoTimeOfDayの独立制御 — Weather Auto有効化時にtimeOfDayが強制的に自動（実太陽位置）に切り替わるバグを修正。main.tsのsetManualTimeOfDay条件からautoWeather依存を除去。WeatherPanel.tsxのTime行ボタンからautoWeather強制解除を除去。autoWeatherとautoTimeOfDayが完全に独立して動作するように変更
- ClimateGridAdapterの降水量単位修正 — NASA POWERのPRECTOTCORR（mm/day日平均）をmm/month（月間降水量）に変換せずそのまま出力していた問題を修正。各月の日数を掛けて正しいmm/month値を返すように変更。降水量連動の地面色計算・降水確率・ケッペン気候区分の精度が向上
- Terminator昼夜境界の反転バグ修正 — `Math.atan2`を`Math.atan`に変更。負の赤緯（9月〜3月）でatan2が2/3象限の値を返しclampで誤った緯度になる問題を解消
- Ushuaiaタイムゾーン表示を`-03`から`ART`に修正 — tz-lookupがUshuaia座標をAmerica/Punta_Arenas（チリ）に誤マッピングする境界精度問題を`TZ_BOUNDARY_OVERRIDES`テーブルで補正。generate-timezone-abbrにArgentina`-03`→`ART`ポストプロセス追加
- 手動timeOfDay選択がシーンに反映されないバグ修正 — `EnvironmentSimulationService.setManualTimeOfDay()`を追加。autoWeather=false かつ autoTimeOfDay=false 時に擬似太陽/月位置でテーマを生成（morning=高度10°、day=50°、evening=5°、night=-20°）。候計算は実太陽位置を維持
- 手動天気/時間帯切替時のテーマ遷移が30秒かかるバグ修正 — 手動操作（setManualTimeOfDay/setManualWeather/setAutoWeather/onClimateChanged/onScenePresetChanged）時の遷移時間を1.5秒に短縮。通常の30秒間隔天体更新時のみ30秒遷移を維持
- 起動時に永続化された時間帯設定がシーンに反映されないバグ修正 — WeatherConfigChangedハンドラでオーバーライド設定をstart()より前に移動。applyImmediate()が内部状態のみ更新しtick()がnullを返す問題に対し、start()直後にapplyThemeToScene()を明示的に呼び出し

## [0.7.0] - 2026-03-05

### Added
- 環境シーンプリセットシステム — EnvironmentChunkのオブジェクト生成をStrategy/Factory化（ChunkDecorator）。meadow（草原）/seaside（海辺）/park（公園）の3プリセット。各プリセットに固有の3Dオブジェクト（seaside: ヤシの木・波打ち際・泡・貝殻、park: 歩道・街灯・植え込み・花壇・ベンチ・広葉樹）。WeatherPanelにScene選択行追加。プリセット別環境音連動（meadow→forest, seaside→wind, park→forest）。settings.jsonのweather.scenePresetに永続化。ScenePreset値オブジェクト（ドメイン層）で型安全にプリセット定義
- seasideプリセットの砂浜地面色 — seaside選択時にgroundColorとhemiGroundColorを砂色にオーバーライド。天気×時間帯の全16パターンで明度を維持した砂色を定義。snowy時は雪をかぶった砂浜色。テーマ遷移（lerp）によるプリセット切替時の滑らかな色変化に対応
- seasideプリセットの夏演出強化 — 空色・霧色・半球光をlightenColorで白方向25%明るく補正。exposure×1.25・sunIntensity×1.2・ambientIntensity×1.15の輝度ブースト
- 天気別雲色 — sunny時は白雲（emissive自発光で真っ白）、cloudy/rainy/snowy時は灰色雲に変更。CloudEffectにsetWeatherColor API追加
- seasideヤシの木 — 放物線カーブの幹（7セグメント）、4〜5枚の羽状複葉フロンド（中心線+葉片15対）、波打ち際・泡・貝殻の3Dオブジェクト配置
- parkプリセット改善 — 中央歩道（石畳色PlaneGeometry）追加。街灯を歩道脇に4m間隔・左右交互の等間隔配置に変更（高さ2.4倍）。植え込み・花壇を歩道脇沿い2m間隔配置に変更。街路樹・ベンチを歩道近傍に配置。草を削除

### Performance
- seasideプリセットのdraw call削減 — mergeGeometriesで幹7→1・葉片~135→5・泡~66→1に統合。チャンク当たり約210→15 Meshに削減

## [0.6.0] - 2026-03-05

### Added
- 時間帯遷移のlerp補間 — EnvironmentThemeParamsの全パラメータ（色7個・float5個・vec3 1個）をsmoothstep補間で滑らかに遷移。autoTimeOfDay時5秒、手動切替時1.5秒。補間中の割り込みは中間値から新目標へシームレスに再補間。ThemeLerp純粋関数群（ドメイン層）+ ThemeTransitionService（アプリケーション層）で構成
- 天気エフェクトのopacityフェード — 雨/雪/雲エフェクトの切替をsetVisible即座切替からfadeIn/fadeOutによる滑らかなopacity遷移に変更。テーマ遷移と同期したdurationで動作。フェード中の方向反転は現在のopacityから継続。雲の密度変更時は古い雲を退場バッチに移してフェードアウト（2000ms）しながら新しい雲をフェードイン。初回起動時はsetVisibleで即座表示を維持

### Changed
- WeatherPanelのSetボタンを廃止 — 天気・時間帯・雲量・シーンプリセットの変更が選択時に即座に設定に反映・永続化されるように変更。スナップショット復元（キャンセル）機能を削除

### Fixed
- E2Eテスト: emotion-indicator opacity整合テストのフレーキー修正 — EmotionStateUpdatedの1秒スロットリングによるデバッグデータとReactコンポーネントのタイミング差をtoPassリトライで吸収

## [0.5.1] - 2026-03-04

### Changed
- Emotion TrendsグラフをCumulative Timeと同じ折れ線グラフスタイルに統一。スプライン曲線→直線折れ線、glowフィルター・イベントバー・Y軸ラベル/グリッド線・X軸日付ラベル・期間選択ボタンを削除。各曲線末尾にドット表示。レイアウト（パディング・高さ・幅）をCumulative Timeと統一
- Emotion Trendsにデータ未記録日の補間（fillDailyGaps）を追加。startDate〜endDateの全日付を生成し、データがない日は直前の感情値を引き継ぐ

### Fixed
- EmotionIndicatorが値読み込み前に非表示になる問題を修正。初期状態で最低opacity（0.15）のプレースホルダーアイコンを表示するように変更

## [0.5.0] - 2026-03-04

### Added
- 感情推移グラフUI — StatsDrawer内にsatisfaction/fatigue/affinityの3曲線折れ線グラフを追加。期間切替（7d/30d/All）、ポモドーロ完了数イベントバー、ダーク/ライトテーマ対応。extractDailyTrendEntries/buildEmotionTrendData/computeDateRange純粋関数で構成。pointsToPathをBiorhythmChartから再利用。canUse('emotionAccumulation')でライセンス制御
- 感情パラメータ全永続化 — satisfaction/fatigue/affinityを`{userData}/emotion-history.json`に保存し起動間で復元。日次スナップショット・イベントカウント（pomodoroCompleted/pomodoroAborted/fed/petted）・連続利用日数（streakDays）を記録。EmotionHistoryService/EmotionHistoryBridge/EmotionHistory純粋関数で構成
- クロスセッション時間経過変化 — 起動時に放置時間に応じた感情変化を適用。satisfaction減衰（-0.02/時、上限-0.30）、fatigue回復（-0.05/時）、affinity減衰（-0.03/日、猶予4h、上限-0.15）。連続利用3日以上でaffinityボーナス（+0.01/日、上限+0.10）
- 感情パラメータ永続化のE2Eテスト（3テスト）— emotionHistory IPC API存在確認・emotion-history.jsonファイル生成検証（lastSession/daily/streakDays構造）・アプリ再起動後の感情パラメータ復元（two-launchパターン）

### Fixed
- E2Eテスト: emotion-history.spec.tsの感情変化テストをBREAK待ちから全サイクル完走待ちに修正（PomodoroCompletedは全サイクル完走時のみ発火するため）
- E2Eテスト: emotion-history.jsonの残存データによる感情初期値の汚染を防ぐcleanEmotionHistoryヘルパーを追加（animation-state.spec.ts・emotion-history.spec.ts）

## [0.4.0] - 2026-03-03

### Added
- OSスリープ抑制機能 — ポモドーロ実行中にOSのスリープ/サスペンドを抑制。Electronの`powerSaveBlocker` APIを使用。設定UIでON/OFF切替可能（デフォルトON）、settings.jsonに永続化

## [0.3.2] - 2026-03-03

### Changed
- ウィンドウ最小化・閉じるボタンのアイコンをホバー時のみ表示（フェードイン演出付き）
- Galleryモードの上部マージンを下部と同等に縮小（top: 36→10px）

## [0.3.1] - 2026-03-03

### Changed
- バイオリズムグラフ・EmotionIndicator・CharacterNameEditorを統計パネル/独立配置からCompactHeader（タイトルオーバーレイ）内に統合。BiorhythmChartを独立コンポーネントとして抽出

### Added
- buildBiorhythmCurves/pointsToPathの純粋関数ユニットテスト（12テスト）
- ふれあいモードでのバイオリズムグラフ・キャラクター名表示のE2Eテスト（2テスト）

### Fixed
- E2Eテスト: emotion-indicator.spec.tsを統計パネル→ふれあいモードの配置変更に追従
- E2Eテスト: biorhythm.spec.tsのtrialモードNEUTRAL判定でタイミング依存の失敗を修正

## [0.3.0] - 2026-03-02

### Added
- バイオリズム機能 — キャラクターの行動に日単位の周期的な状態変動（activity=5日/sociability=7日/focus=11日の正弦波周期）を導入。registeredライセンスのみ有効
- バイオリズムに基づく4つの新アニメーションルール: high-activity-energetic-idle, low-activity-sleepy-idle, high-sociability-reaction, high-focus-march
- 餌やり/撫でによるバイオリズムブースト（5分間で線形減衰）
- pet_end時のEmotionService感情イベント発行（petted）を追加
- 統計パネルにバイオリズムグラフ追加（ネオンカラーのサインカーブ+カーブ上移動アニメーション）

### Changed
- register APIのデバイス台数制限（3台）をキー単位の日次レート制限（1日3回）+ 累計登録数制限（50デバイス）に変更
- staleデバイス自動除外の閾値を90日→30日に短縮
- 新規キー作成時のmaxDevicesフィールド設定を廃止（既存データは互換性のため残存）
- register APIのユニットテスト追加（vitest、12テストケース）

### Fixed
- DevTools自動起動が.env.developmentから効かない問題を修正（mainプロセスのdefineに追加）
- main.tsのcurrentLicenseMode TDZエラーを修正（宣言順序の修正）

## [0.2.1] - 2026-03-01

### Fixed
- ギャラリーモードでCompactHeaderとGalleryTopBarのオーバーレイが重なる問題を修正
- register APIでheartbeat未到達時に「Device not found」エラーになる問題を修正（デバイス自動作成で対応）

## [0.2.0] - 2026-03-01

### Added
- キャラクター名設定 — ふれあいモード内でキャラクターに名前を付けられる機能。settings.jsonに永続化
- 感情インジケーターUI — 統計パネルに♥⚡★アイコンで感情パラメータを可視化
- カスタムタイトルバー — OSタイトルバー除去、最小化・閉じるボタン+ドラッグ移動
- アニメーションギャラリー — Clips/States/Rulesの3モードでアニメーションを一覧プレビュー
- ライセンス制限UI — TrialBadge表示、プレミアム機能ロックオーバーレイ

### Changed
- メインプロセスを6モジュールに分割
- trialモードでfureai/galleryを無効化（registered限定に変更）
- ふれあいモード遷移ボタンを右下に移動

## [0.1.1] - 2026-02-27

### Added
- GitHub Actionsリリースワークフロー（タグ push → Windows ビルド → GitHub Releases）
- SfxPlayerに音声ファイル欠損時のサイレントフォールバック（submodule未初期化でも動作可能）
- リリースセットアップ手順書（ci-release-setup.md）

### Changed
- assets/をprivate submodule（pomodoro-pet-assets）に移行 — ソースコードpublic化に対応
- git履歴から購入素材を完全除去（git filter-repo）
- electron-builderに--publish neverを追加（アップロードはsoftprops/action-gh-releaseに委譲）

### Fixed
- NSIS oneClick設定の矛盾を修正（allowToChangeInstallationDirectoryを削除）

## [0.1.0] - 2026-02-27

### Added
- ポモドーロタイマー（work/break/long-break/congratsフェーズ遷移、一時停止/再開/中止）
- キャラクター行動システム（自律行動、march/rest/celebrateプリセット、インタラクション）
- ふれあいモード（餌やりドラッグ＆ドロップ、プロンプト入力、ハートエフェクト）
- 感情パラメータ（satisfaction/fatigue/affinity、イベント反応、affinity永続化）
- 統計機能（日別記録、13週間ヒートマップ、期間別集計）
- 天気設定（sunny/cloudy/rainy/snowy、雲量6段階、時間帯4種+auto、天気エフェクト描画）
- サウンドシステム（環境音プリセット、タイマーSFX、Break BGM、ボリューム/ミュート制御）
- バックグラウンド対応（タイマー継続、オーディオ抑制、システム通知）
- テーマ切替（System/Light/Dark）
- 設定永続化（settings.json/statistics.json、Electron IPC経由）
- ライセンス管理（ハートビートAPI、JWT RS256検証、registered/trial/expired/restricted 4モード）
- ライセンスモード別機能制限（ENABLED_FEATURESマップ、LicenseContext、UI制限適用）
- 自動アップデート（electron-updater、チェック/ダウンロード/インストール、通知バナー）
- ライセンス登録UI（Registration Panel、Download Key入力）
- デバッグ支援（VITE_DEBUG_TIMER、VITE_DEBUG_LICENSE、DevTools自動起動、E2Eインジケーター）
- 無限スクロール背景（6チャンク配置、リサイクル、EnvironmentThemeルックアップ）
- シーン遷移（free/pomodoro/fureai、ブラックアウトトランジション）
- About/EULA/Privacy Policy/Third-party Licenses表示
- 法的文書（PolyForm Noncommercial 1.0.0、CLA、CONTRIBUTING、PRIVACY_POLICY）
