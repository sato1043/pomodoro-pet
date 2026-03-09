# E2Eテストカバレッジ分析

## 技術的制約

E2Eテスト（Playwright + Electron）で検証できる範囲には技術的な制約がある。

| 制約 | 理由 |
|------|------|
| Three.jsキャンバス内の操作 | Raycaster判定はWebGL座標系で動作し、Playwrightのクリック座標からキャラクターへのヒット判定を再現できない |
| ドラッグ＆ドロップ（3D空間） | Z平面投影+NDCベースZ制御がキャンバス内で完結。Playwrightのmouse APIで3Dドラッグを制御できない |
| Web Audio API再生 | AudioContext/GainNode/OscillatorNodeの状態はDOM外。再生有無・音量・クロスフェードを検証する手段がない |
| WebGLレンダリング結果 | 雨・雪・雲エフェクト、ライティング、背景スクロールはGPUで描画されDOMに表れない |
| フェイクタイマー | Three.Clock・rAF・Web Audio APIが実時間に依存しており、page.clockでの制御は不安定（詳細は character-animation-mapping.md 参照） |

## カバー済み項目（151テスト / 22ファイル）

| ファイル | テスト数 | カバー範囲 |
|---------|---------|-----------|
| smoke.spec.ts | 3 | 起動・タイトル・Start Pomodoroボタン存在 |
| free-mode.spec.ts | 10 | 設定パネル開閉・ボタン選択・スナップショット復元・BG設定・Set確定・About画面 |
| free-display.spec.ts | 5 | 時刻AM/PM表示・タイムゾーン略称表示・タイムラインW/Bセグメント・設定サマリー・終了時刻表示 |
| pomodoro-flow.spec.ts | 4 | Start→WORK表示・Pause/Resume・Stop・タイマー完走→Congrats→free復帰 |
| pomodoro-detail.spec.ts | 7 | サイクル進捗ドット・インタラクションロック・全フェーズ遷移順序(celebrate/joyful-rest含む)・統計パネル値・affinity永続化・fatigue自然変化・バックグラウンドタイマー |
| settings-ipc.spec.ts | 17 | electronAPI存在・settings.json永続化（タイマー/BG/天気/雲量/シーンプリセット/テーマ/Autoテーマ/autoWeather）・再起動復元（BG/天気/雲量/プリセット/テーマ/Autoテーマ/autoWeather） |
| registration.spec.ts | 8 | ライセンス/アップデート/shell API存在・Registerリンク表示・登録パネル表示/CloseButton復帰/空キーエラー/入力・REGISTRATION_GUIDE読み込み |
| weather-panel.spec.ts | 17 | パネル開閉・シーンプリセット切替・天気タイプ/時間帯切替・雲量・リセット・スナップショット復元（天気+プリセット）・排他表示・autoWeather排他選択動作・autoWeather時Weather/Time操作でauto解除+Cloud行disabled・WeatherPanelにLocationボタン非存在・LocationButton常時表示・Time手動→autoWeather→再解除のフロー |
| world-map-modal.spec.ts | 7 | モーダル開閉・プリセット都市選択→座標更新・ケッペン気候区分表示・複数都市での分類表示・Set Location→モーダル閉+ラベル更新 |
| button-visibility.spec.ts | 5 | 初期全表示・設定/統計/天気パネル時の排他制御・順次開閉復帰 |
| stats-panel.spec.ts | 4 | パネル開閉・Statistics見出し・排他表示 |
| fureai-mode.spec.ts | 6 | Entry→overlay表示・テキスト確認・ボタン排他・バイオリズムグラフcompact-header内表示・キャラクター名compact-header内表示・Exit→free復帰 |
| prompt-input.spec.ts | 6 | プロンプト入力欄表示・walk→wander・座れ→sit・sleep→sleep・空文字無視・Sendボタン送信 |
| gallery-mode.spec.ts | 11 | ギャラリーモード遷移・ボタン排他・Clips/States/Rulesモード切替・情報バー更新・Exit復帰 |
| trial-restriction.spec.ts | 4 | trial badge表示・fureai/galleryロックオーバーレイ表示・オーバーレイ閉じる |
| theme.spec.ts | 3 | colorScheme即時反映・Autoテーマ選択+モード相互切替・スナップショット復元 |
| animation-state.spec.ts | 8 | デバッグインジケーター存在・初期状態・感情初期値・プリセット切替(march-cycle/rest-cycle/autonomous)・phaseProgress・satisfaction加算 |
| biorhythm.spec.ts | 3 | registeredでバイオリズム有効（NEUTRAL以外）・trialでNEUTRAL・モード切替でON/OFF |
| emotion-indicator.spec.ts | 6 | freeモード非表示・ふれあいモード表示・3アイコン確認・opacity整合・ふれあいモード終了で非表示・expiredで非表示 |
| emotion-history.spec.ts | 5 | 感情パラメータ永続化: 初期状態範囲確認・全サイクル完走後satisfaction増加・emotionHistory IPC API存在・emotion-history.jsonファイル生成検証（lastSession/daily/streakDays構造）・アプリ再起動後の感情パラメータ復元（two-launch） |
| window-controls.spec.ts | 5 | Minimize/Closeボタン存在・windowMinimize/windowClose API公開・Minimize後アプリ継続・frame: false確認 |
| emotion-trend.spec.ts | 5 | 感情推移グラフ: Emotion Trends表示・期間ボタン3種存在・データなし時メッセージ・ポモドーロ完走後SVG描画・期間切替動作（stats/emotionAccumulationが同一権限パターンのためexpired単独検証不可） |

## 未カバー項目

### A. テスト困難 — Three.jsキャンバス内操作

全項目がRaycasterヒット判定またはWebGL座標系のドラッグ操作に依存する。キャラクターの画面位置はmarch/wander/idleの状態やスクロールで変動するため、Playwrightのpage.click({x, y})やmouse APIでは正確な操作を保証できない。

#### A-1. キャラクター直接操作（Raycaster依存）

| # | 項目 | 困難な理由 |
|---|------|-----------|
| 1 | クリック→reaction状態 | キャラクターの画面位置が状態やスクロールで変動し、ヒット判定を再現できない |
| 2 | ドラッグ→dragged状態 | Y軸方向のマウス移動量でGestureRecognizerが判定。3D空間での持ち上げ量の再現が困難 |
| 3 | 撫でる→pet状態 | X軸方向の左右ストロークをGestureRecognizerが判定。キャラクター上での正確な軌跡が必要 |
| 4 | ホバーカーソル変更 | Raycasterヒット判定に依存。canvas要素のcursor CSSは読み取れるがヒット自体が不確実 |
| 5 | クリック連打→damage2アニメーション | キャラクターへの5連続クリック（3秒以内）が必要。ヒット判定が前提 |

#### A-2. 餌やり操作（3D空間ドラッグ）

| # | 項目 | 困難な理由 |
|---|------|-----------|
| 6 | 餌やり（ドラッグ＆ドロップ） | キャベツ/リンゴのキャンバス内位置特定→キャラクターまでのドラッグ→距離<2.5判定。全てWebGL座標系 |
| 7 | ハートエフェクト発火 | FeedingSuccessイベントが餌やり成功（#6）に依存。EventBusをwindowに公開すればpage.evaluateで回避可能 |
| 8 | 餌やりバイオリズムブースト | applyFeedingBoost()はFeedingSuccess（#6）に依存。餌やり操作自体がThree.jsキャンバス内 |
| 9 | 撫でバイオリズムブースト | applyPettingBoost()はpet_end（#3）に依存。撫で操作自体がThree.jsキャンバス内 |
| 10 | バイオリズムブースト5分線形減衰 | ブースト効果の時間経過による減衰は実時間5分待機が必要。フェイクタイマー非対応 |
| 11 | バイオリズム連動アニメーションルール発火 | high-activity-energetic-idle等4ルールの発火はactivity/sociability/focusの値+確率依存。キャンバス内描画で結果確認不可 |

### A-3. ライセンス/アップデート — サーバー依存

E2Eテスト環境（`!app.isPackaged`）ではHEARTBEAT_URLが未設定のため、サーバー通信が発生しない。開発モードではライセンス状態がtrial固定。

| # | 項目 | 困難な理由 |
|---|------|-----------|
| 12 | ハートビートAPI通信 | GCP Cloud Functionが必要。E2Eテスト環境ではサーバーが存在しない |
| 13 | download key 登録（サーバー検証） | itch.io APIとFirestoreが必要。モックサーバー構築は可能だが費用対効果が低い |
| 14 | JWT発行・検証フロー | RS256鍵ペアとサーバーが必要 |
| 15 | deviceId 自動生成 | `app.isPackaged=true`の環境でのみresolveLicenseが動作するため |
| 16 | LicenseToast 表示（expired/restricted） | 開発モードではtrial固定のため、expired/restrictedのトーストが表示されない |
| 17 | UpdateNotification 表示 | autoUpdaterがパッケージ済みアプリでのみ動作。GitHub Releasesとの連携が必要 |
| 18 | autoUpdater ダウンロード/インストール | パッケージ済みアプリ + GitHub Releases上の新バージョンが必要 |
| 19 | 2段階オンラインチェック（Stage 1 + Stage 2） | 実ネットワーク状態に依存。オフライン/タイムアウトの再現が困難 |
| 20 | 機能制限モード（expired/restricted時のUI無効化） | サーバー通信なしではexpired/restrictedに遷移できない |

### B. テスト不可能 — DOM外で完結

#### B-1. オーディオ（Web Audio API）

AudioContext/GainNode/OscillatorNode/AudioBufferSourceNodeの状態はDOMに露出しない。

| # | 項目 | 内容 |
|---|------|------|
| 1 | SFX再生 | work-start/work-complete/fanfare/break-chill/break-getset/pomodoro-exit |
| 2 | BGMクロスフェード | break-chill→break-getset（GainNode gain.valueの3秒線形遷移） |
| 3 | 環境音プリセット再生 | Rain/Forest/Wind（プロシージャル生成、OscillatorNode+BiquadFilterNode） |
| 4 | 音量制御・ミュート | AudioContext.suspend()/resume()の状態がDOM外 |
| 5 | バックグラウンドオーディオ抑制 | setBackgroundMuted()によるAudioContext.suspend()はDOM外。タイマー継続自体はE2Eテスト済み |

#### B-2. WebGLレンダリング

GPUで描画される視覚エフェクト。DOMに表れない。

| # | 項目 | 内容 |
|---|------|------|
| 6 | 雨エフェクト | LineSegments（650本）+スプラッシュパーティクル+opacityフェード（fadeIn/fadeOut） |
| 7 | 雪エフェクト | Points（750個）+sin/cosゆらぎ落下+opacityフェード（fadeIn/fadeOut） |
| 8 | 雲エフェクト | SphereGeometry群の6段階密度+ドリフト+opacityフェード（fadeIn/fadeOut）+密度変更時の退場バッチクロスフェード+天気別色（sunny=白emissive自発光、cloudy/rainy/snowy=灰色） |
| 9 | 背景スクロール | 3チャンクリサイクル |
| 10 | シーンプリセット3Dオブジェクト | meadow（木・草・岩・花）/seaside（ヤシの木・波打ち際・泡・貝殻）/park（歩道・街灯・植え込み・花壇・ベンチ・広葉樹）の描画結果 |
| 11 | 動的ライティング | 4天気×4時間帯の20パターン（ambient/hemisphere/sun）+seasideプリセットの空色明化・輝度ブースト+降水量連動地面色（乾燥/湿潤ブレンド） |
| 12 | キャラクターアニメーション描画 | AnimationMixer+crossFadeToによるメッシュ変形 |

#### B-3. OS依存

| # | 項目 | 内容 |
|---|------|------|
| 13 | システム通知の実表示 | Electron Notification APIがOS通知を発行。表示確認はOS依存 |

## 補足: デバッグインジケーターで検証可能な範囲

`#debug-animation-state`が公開するdata属性:

| 属性 | テスト済み | 未テスト（Three.js操作が前提） |
|------|----------|----------------------------|
| data-state | idle, march, wander, sit, sleep | happy, reaction, dragged, pet, refuse, feeding |
| data-preset-name | autonomous, march-cycle, rest-cycle, celebrate, joyful-rest | fureai-idle |
| data-clip-name | idle | walk, run, sit, sleep, happy, wave, attack2, damage1, damage2, getUp |
| data-phase-progress | >0の確認 | 特定範囲（0.3超、0.7超）でのアニメーション切替連動 |
| data-emotion | 初期値, satisfaction>0.5, fatigue>0, opacity整合検証 | affinity変化（操作手段がキャンバス内） |
| data-interaction-locked | true（work中） | — |
| data-recent-clicks | — | キャラクタークリックが前提 |
| data-total-feedings-today | — | 餌やり操作が前提 |
| data-previous-state | — | 特定遷移パターン（sleep→idle→getUpなど） |
| data-biorhythm | registered時にNEUTRAL以外、trial時にNEUTRAL | ブースト反映後の値（餌やり/撫で操作が前提） |
| data-biorhythm-boost | — | 餌やり/撫で操作がThree.jsキャンバス内で完結するため |

## まとめ

| 分類 | 項目数 |
|------|--------|
| カバー済み | 151テスト / 22ファイル |
| テスト困難（Three.jsキャンバス操作） | 11項目 |
| テスト困難（サーバー依存） | 9項目 |
| テスト不可能（DOM外で完結） | 13項目 |
| WorldMapModal — SVG座標/アニメーション依存（E2E困難） | 5項目 |
| WorldMapModal/環境 — E2E未実装（検証可能） | 5項目（13項目中8項目実装済み） |
| 天文シミュレーション — WebGL依存（E2E困難） | 4項目 |
| 手動テスト手順 | 10項目（D-5-1〜D-5-10） |

E2Eテストは **UIレイアウト・パネル制御・設定永続化・タイマーフロー（完走含む）・全フェーズ遷移・プリセット切替・シーンプリセット切替・感情パラメータ・感情パラメータ永続化（emotion-history.jsonファイル生成・再起動復元）・感情インジケーター（表示/非表示/opacity整合/ライセンス制限）・感情推移グラフ（表示・データなし/あり・期間切替）・プロンプト入力・インタラクションロック・統計値・affinity永続化・バックグラウンドタイマー・ライセンスAPI存在確認・RegistrationDialog UI操作・カスタムタイトルバー（ウィンドウ操作ボタン・frame: false確認）・バイオリズムON/OFF（ライセンスモード連動）・Autoテーマ選択+モード相互切替+永続化+再起動復元・autoWeather排他選択動作+disabled連動+永続化+再起動復元・LocationButton常時表示・WeatherPanelからLocationボタン削除確認・Time手動選択→autoWeather→再解除フロー** をカバーしている。未カバー項目はThree.jsキャンバス内操作（バイオリズムブースト含む）、サーバー通信依存、Web Audio API / WebGL / OS通知依存であり、E2Eテストの技術的限界に起因する。WorldMapModalはSVG+DOMで構成され13項目中8項目（モーダル開閉・プリセット選択・座標更新・ケッペン気候区分表示・Set Location適用・autoWeather永続化等）がE2Eテスト実装済み。残り5項目が未実装。SVG座標変換やrAFアニメーション等5項目は自動検証困難なため手動テスト手順（D-5-2〜D-5-7）で補完する。Phase 5.5の純粋関数ロジックはユニットテストでカバー済み（Terminator 8テスト、ClimateData 40テスト、normalizeLon 11テスト、coastline-path 16テスト、CelestialTheme 29テスト、WeatherDecision 22テスト、SolarPosition 11テスト、Kou 17テスト、ClimateGridAdapter 7テスト、useResolvedTheme 20テスト、AppSettingsService loadFromStorage 9テスト、EnvironmentSimulationService 30テスト）。ライセンス判定ロジック（LicenseState.ts）はユニットテスト（66テスト）で全パターンカバーされている。

### D. Phase 5.5 天文シミュレーション・世界地図UI

Phase 5.5の天文計算ベース環境シミュレーションとWorldMapModalはSceneFree.tsx/WeatherPanel.tsxに統合済み。E2Eテストで検証可能な項目と、技術的制約で困難な項目に分類する。

#### D-1. E2Eテスト困難 — SVG座標変換・アニメーション依存

WorldMapModalはDOM（SVG+HTML）で描画されるが、以下の項目はPlaywrightでの自動検証が困難である。

| # | 項目 | 困難な理由 |
|---|------|-----------|
| 1 | 地図クリック→カスタム座標 | SVG viewBoxの動的変更（centerLonによるスクロール）でクリック座標→緯度経度変換がビューポート依存。getBoundingClientRect()の結果がテスト環境で不安定 |
| 2 | スクロールアニメーション | requestAnimationFrameベースのease-out quad補間。フェイクタイマー非対応（Three.Clock同様の制約）。アニメーション途中の状態検証が困難 |
| 3 | 最短方向スクロール判定 | `((target - current) % 360 + 540) % 360 - 180`による方向計算。結果はviewBox変更として現れるがアニメーション完了待ちが必要 |
| 4 | 3枚並べ描画のシームレス表示 | MAP_OFFSETS=[-360, 0, 360]の3つのgroupが正しく並ぶかはSVGレンダリング結果。DOMには3つのg要素として存在するが視覚的シームレスさの検証は不可 |
| 5 | 昼夜ターミネーター描画の正確性 | SVG polygonとして存在するが、天文計算の正確性はユニットテスト（Terminator.test.ts: 8テスト）でカバー済み |

#### D-2. E2Eテスト困難 — WebGLレンダリング依存

| # | 項目 | 困難な理由 |
|---|------|-----------|
| 6 | 天文計算ベースのライティング | CelestialThemeが生成するsunColor/skyColor/exposure等はWebGLシーンに適用。DOMに表れない |
| 7 | 太陽/月方位に基づく光源方向 | computeLightDirectionの結果はDirectionalLightのpositionに反映。WebGL内で完結 |
| 8 | 降水量連動パーティクル数 | computeParticleCountの結果はRainEffect/SnowEffectのパーティクル数に反映。WebGL内で完結 |
| 9 | 降水量連動地面色 | temperatureToGroundColor（気温+降水量→乾燥/湿潤ブレンド）の結果はgroundColorとしてWebGLシーンに適用。DOMに表れない。ユニットテスト（ClimateData 26テスト、CelestialTheme 29テスト）でカバー済み |

#### D-3. E2Eテスト未実装 — 統合後に検証可能な項目

以下はDOM/SVGベースであり、E2Eテストで検証可能である。

| # | 項目 | 検証方法 | 状態 |
|---|------|----------|------|
| 1 | KouDisplay表示 | `[data-testid="kou-display"]`の存在とテキスト内容 | 未実装 |
| 2 | WorldMapModal開閉 | LocationButton→モーダル開→戻るボタン→モーダル閉 | **実装済み** |
| 3 | プリセット都市ボタン選択 | モーダル内プリセットボタンクリック→座標情報テキスト更新（`worldmap-coords`要素） | **実装済み** |
| 4 | プリセット都市ピン選択 | モーダル内SVG都市ピンクリック→座標情報テキスト更新 | 未実装 |
| 5 | Set Location→設定適用 | 「Set Location」クリック→モーダル閉→LocationButtonラベル更新 | **実装済み** |
| 5b | ケッペン気候区分表示 | プリセット都市選択→`worldmap-koppen`要素にコード+ラベル表示 | **実装済み** |
| 6 | autoWeather設定永続化 | settings-ipc.spec.tsにautoWeather=true→再起動→復元の検証追加 | **実装済み** |
| 7 | climate設定永続化 | settings-ipc.spec.tsにclimate→再起動→復元の検証追加 | 未実装 |
| 8 | IDL（日付変更線）パス存在 | SVG内にstrokeDasharray付きpathが存在すること | 未実装 |
| 9 | 陸地パス存在 | SVG内にfill="#2a4a2a"のpathが存在すること | 未実装 |
| 10 | autoWeather排他選択動作 | weather-panel.spec.tsでAuto⇔天気アイコン排他切替+disabled確認 | **実装済み** |
| 11 | LocationButton常時表示 | weather-panel.spec.tsでフリーモードでの`location-button`存在確認 | **実装済み** |
| 12 | WeatherPanelからLocationボタン削除 | weather-panel.spec.tsで`weather-location`非存在確認 | **実装済み** |

#### D-4. ユニットテストカバレッジ

Phase 5.5関連の純粋関数はユニットテストでカバー済み。

| モジュール | テスト数 | カバー内容 |
|-----------|---------|-----------|
| Terminator.ts | 8 | 昼夜境界計算（atan修正・負の赤緯・ghaオフセット） |
| ClimateData.ts | 40 | 72候按分・気温推定・地面色（降水量連動乾燥/湿潤ブレンド・湿潤テーブル緑チャンネル一定性・25-35°C遷移・上限値）・CITY_PRESETS構造検証（8都市座標）・ケッペン気候区分（13テスト: Af/Am/Aw/BWh/BWk/BSh/Cfb/Cfa/Cs系/Df系/ET/EF・南半球対応） |
| WorldMapModal.tsx (normalizeLon) | 11 | 経度正規化（境界値・日付変更線超過・多重周回） |
| generate-coastline-path.ts | 16 | SVGパス生成（ringToSubpath/lineToSubpath/landFeaturesToSvgPath/extractIdlPath） |
| CelestialTheme.ts | 29 | 天体テーマ計算（降水量連動地面色・avgPrecipMmデフォルト値） |
| WeatherDecision.ts | 22 | 天気自動決定 |
| SolarPosition.ts | 11 | 太陽位置計算 |
| Kou.ts | 17 | 七十二候 |
| ClimateGridAdapter.ts | 7 | 気候グリッド補間・mm/day→mm/month変換 |
| Timezone.ts | 16 | タイムゾーン解決・時刻変換・略称表示・DST対応・境界補正 |
| generate-timezone-abbr.ts | 6 | 略称生成・Etc/*スキップ・DST判定・Argentina ARTポストプロセス |
| useResolvedTheme.ts | 20 | テーマ解決ロジック（light/dark/system/auto全モード・isDaytime境界値-6°・solarAltitude=null） |
| AppSettingsService.ts (loadFromStorage) | 9 | theme復元（system/light/dark/auto全4値・ThemeLoadedイベント発行・無効値拒否・未設定/非文字列/null） |
| EnvironmentSimulationService.ts | 30 | start/stop/tick・天体位置・候解決・天気決定・テーマ遷移・setAutoWeather/setManualWeather・setManualTimeOfDay（擬似太陽位置によるテーマオーバーライド・候計算非影響・stop時リセット）・手動操作時の遷移時間1.5秒/通常tick時30秒・autoWeather状態管理・天気ソース切替・currentWeather停止時null |

#### D-5. 手動テスト手順

##### D-5-1. KouDisplay表示確認

**前提**: EnvironmentSimulationServiceがmain.tsに統合済み（autoWeather状態に関わらず常時稼働）

**操作手順**:
1. アプリ起動
2. 画面上のKouDisplay領域（`data-testid="kou-display"`）を確認

**確認内容**:
- autoWeatherの状態に関わらず、currentKou !== null時に七十二候名が表示される
- 候の切り替わり日（約5日周期）に表示が更新される
- 無効な日時でもフォールバック候（小寒: 雁北郷）が表示される

##### D-5-2. WorldMapModal — 基本操作

**操作手順**:
1. フリーモードのLocationButton（右端地球アイコン）をクリック
2. 全画面の世界地図モーダルが開く

**確認内容**:
- 世界地図（海洋背景#1a3a5c + 陸地#2a4a2a）が全画面表示される
- 昼夜ターミネーター（黒半透明オーバーレイ）が現在時刻に基づいて表示される
- 8都市のプリセットピン（白丸+都市名ラベル）が表示される
- 国際日付変更線（白破線）が表示される
- 戻るボタン（矢印アイコン、右下fixed）が表示される
- 戻るボタンクリックでモーダルが閉じる

##### D-5-3. WorldMapModal — プリセット都市選択

**操作手順**:
1. モーダル下部のプリセットボタンバーからTokyoをクリック
2. 次にNew Yorkをクリック
3. 次にUshuaiaをクリック

**確認内容**:
- 選択した都市のピンがオレンジ色（#ff6644）に変化し、半径が大きくなる
- 座標情報表示（モーダル下部中央）が選択した都市名と座標に更新される
- 地図が選択した都市を中心にスクロールアニメーションする
- スクロールは最短方向に向かう（例: Tokyo→New Yorkは東回り180°超なので西回り）
- 日付変更線を跨ぐスクロールでもジャンプせずスムーズに移動する
- アニメーションはease-out quad（最初速く、終わり緩やか）

##### D-5-4. WorldMapModal — カスタム地点選択

**操作手順**:
1. 地図上の任意の地点をクリック

**確認内容**:
- クリック地点に緑色ピン（#44ff66）が表示される
- 座標情報が「Custom (XX.X°N/S, YY.Y°E/W)」形式で更新される
- プリセットボタンの選択状態が解除される
- 地図がクリック地点を中心にスクロールする

##### D-5-5. WorldMapModal — Set Location適用

**操作手順**:
1. 都市またはカスタム地点を選択した状態で「Set Location」ボタンをクリック

**確認内容**:
- モーダルが閉じる
- LocationButtonのラベルが選択した都市名/座標に更新される
- 設定が永続化される（アプリ再起動後も同じ地点が選択されている）

##### D-5-5b. タイムゾーン表示

**確認内容**:
- フリーモードの時計AM/PM直上にTZ略称が表示される（例: JST, EST, HST）
- 地域変更（Set Location）後にTZ略称が更新される
- 時計・タイムラインの時刻が選択地域の現地時刻を反映する
- カスタム座標選択時もTZ略称が表示される

##### D-5-6. WorldMapModal — 全画面表示の視覚品質

**確認内容**:
- 地図がウィンドウ幅いっぱいに表示される（VB_WIDTH=120で1/3拡大表示）
- `preserveAspectRatio="xMidYMid slice"`により上下が切れず比率が維持される
- プリセットボタンのフォントサイズが十分大きい（22px）
- 座標情報テキストが中央揃え・フォントサイズ22px

##### D-5-7. WorldMapModal — 8都市プリセットの網羅確認

**操作手順**: 各都市を順にクリックして地図中心とピン位置を確認

| 都市 | 確認ポイント |
|------|------------|
| Tokyo | 日本列島の関東付近にピン。東経139° |
| Sydney | オーストラリア東海岸にピン。南半球 |
| London | イギリス南東部にピン。経度≒0° |
| New York | 北米東海岸にピン。西経74° |
| Dubai | アラビア半島東岸にピン。東経55° |
| Hawaii | 太平洋中央にピン。北緯21° |
| Reykjavik | アイスランド南西にピン。北緯64° |
| Ushuaia | 南米最南端にピン。南緯55° |

##### D-5-8. Autoテーマの昼夜切替

**前提**: EnvironmentSimulationService統合済み（autoWeather状態に関わらず常時稼働し太陽高度を計算）

**操作手順**:
1. 設定パネルでテーマを「Auto」に設定してSet確定
2. 朝（太陽高度 > -6°）と夜（太陽高度 ≤ -6°）にアプリを起動

**確認内容**:
- 昼間: UIテーマがlight（明るい背景・暗いテキスト）
- 夜間: UIテーマがdark（暗い背景・明るいテキスト）
- 薄明帯（日の出/日の入り前後）: 市民薄明閾値-6°を境にlight↔dark切替
- LocationButtonで地域を変更した場合、即座にタイムゾーンのisDaytimeが再評価される

**E2Eテストとの差分**: E2EテストではcolorSchemeが'light'/'dark'のいずれかであることのみ検証。実際の昼夜判定が正しいかは実時刻・地域に依存するため手動で確認する。ユニットテスト（useResolvedTheme.test.ts: 20テスト）でisDaytime境界値-6°の正確性は検証済み。

##### D-5-9. 天文計算ベースのライティング変化

**前提**: EnvironmentSimulationServiceがmain.tsに統合済み

**操作手順A（autoTimeOfDay=true / autoWeather=true時の自動ライティング）**:
1. 異なる時間帯（朝/昼/夕/夜）にアプリを起動
2. 画面のライティング・空色・霧色を目視確認

**確認内容**:
- 朝: 暖色（オレンジ系）の低い光
- 昼: 白色系の高い光+青空
- 夕: 暖色の低い光+夕焼け空
- 夜: 暗い環境光+月光（月が出ている場合）
- 薄明帯（日の出/日の入り前後）で昼夜がスムーズにクロスフェードする

**操作手順B（手動timeOfDay選択によるライティング変化）**:
1. 天気パネルを開く
2. Time行でMorning/Day/Evening/Nightを順にクリック

**確認内容**:
- Morning: 擬似太陽高度10°（東方向）のオレンジ系ライティングに即時遷移する
- Day: 擬似太陽高度50°（南方向）の明るい白色系ライティングに即時遷移する
- Evening: 擬似太陽高度5°（西方向）の暖色低光ライティングに即時遷移する
- Night: 擬似太陽高度-20°（地平線下）の暗い月光ライティングに即時遷移する
- Time Auto: 実太陽位置に基づくライティングに即時復帰する
- autoWeather有効化→解除後も手動timeOfDay選択が正しく動作する

##### D-5-10. autoWeather天気自動決定

**前提**: EnvironmentSimulationServiceがmain.tsに統合済み、autoWeather=true、climate設定済み

**操作手順**:
1. 天気パネルでautoWeather=ONに設定
2. Locationで東京を選択
3. 天気の自動変化を確認

**確認内容**:
- 七十二候の切り替わり時に天気が自動更新される
- 気候データ（東京の月平均気温・降水量）に基づいた妥当な天気が選択される
- 気温2度未満の降水時は雪になる
- 降水量に連動して雨/雪のパーティクル数が変化する

## 手動テストオペレーション詳細

### A. Three.jsキャンバス内操作

#### A-1. キャラクタークリック→reaction状態

**操作手順**:
1. キャンバス上のキャラクターの体の中心付近をクリック
2. デバッグインジケーターの`data-state`を確認

**確認内容**:
- `data-state`が`reaction`に変化する
- `data-clip-name`が`wave`または`attack2`（50%確率）
- 2〜3秒後にreaction終了→次の状態（idle等）に遷移
- `data-recent-clicks`が1増加する

---

#### A-2. キャラクタードラッグ→dragged状態

**操作手順**:
1. キャラクターの体をマウスダウン
2. Y軸方向に8px以上移動（deltaY > |deltaX|でdrag判定）
3. 左右に動かしてスウェイ確認
4. マウスアップで離す

**確認内容**:
- `data-state`が`dragged`に変化する
- Y座標上昇（最大MAX_LIFT_HEIGHT=3）
- X方向スウェイ（最大MAX_SWAY=0.5、回転MAX=0.4ラジアン）
- マウスアップ後に元のY=0に落下（90%減衰/フレーム）
- カーソルが`grabbing`

---

#### A-3. キャラクター撫でる→pet状態

**操作手順**:
1. キャラクターの体をマウスダウン
2. X軸方向に6px以上移動
3. 方向反転してピークから6px以上逆方向に移動（|deltaX| > |deltaY|）

**確認内容**:
- `data-state`が`pet`に変化する
- `data-clip-name`が`happy`（loop=true）
- カーソルが`grab`
- 3〜8秒後にpet状態終了

---

#### A-4. 餌やり（ドラッグ＆ドロップ）

**操作手順**:
1. ふれあいモードでキャンバス上の食べ物をマウスダウン
2. キャラクター方向にドラッグ（Z平面投影で3D空間を移動）
3. 距離2.5ユニット以内でマウスアップ

**確認内容（成功時）**:
- 食べ物が非表示、`data-state`=`feeding`、`data-clip-name`=`sit`
- `FeedingSuccess`イベント発火→ハートエフェクト（10個のSVGハート）
- `data-total-feedings-today`+1、satisfaction+0.15、affinity+0.05
- 3000ms後に食べ物が再出現

**確認内容（失敗時）**: 食べ物が300msイージングで元の位置にスナップバック

---

#### A-5. ホバーカーソル変更

**確認内容**: 状態別カーソル

| 状態 | カーソル |
|------|---------|
| idle / wander / march / sit / sleep / happy / reaction | pointer |
| dragged | grabbing |
| pet | grab |
| refuse | not-allowed |
| feeding | default |
| インタラクションロック中（work時） | not-allowed |

---

#### A-6. クリック連打→damage2アニメーション

**操作手順**: キャラクターを3秒以内に3回（または5回）クリック

**確認内容**:
- 3回（recentClicks=3）: `data-clip-name`=`damage1`（横によろめく）
- 5回（recentClicks≥5）: `data-clip-name`=`damage2`（後ろにのけぞる）
- 3秒超経過でスライディングウィンドウにより通常reactionに復帰

---

#### A-7. ハートエフェクト発火

餌やり成功（A-4）時に自動発火。10個のSVGハート（fill="#e91e63"）がdocument.bodyポータルとして生成され、CSSアニメーション「floatUp」で浮き上がりフェードアウト。

**回避策**: EventBusをwindowに公開すればpage.evaluateでFeedingSuccessを直接発火可能だが、現在はmain.tsクロージャ内のためグローバル参照不可。

---

#### A-8. 餌やり/撫でバイオリズムブースト

餌やり成功（A-4）またはpet_end（A-3）時にバイオリズムブーストが適用される。

**確認内容（餌やり後）**:
- `data-biorhythm-boost`のactivity+0.3、sociability+0.2
- remainingMsが300000（5分）から線形減衰
- 5分経過後にブースト値がゼロに到達

**確認内容（撫で後）**:
- `data-biorhythm-boost`のactivity+0.1、sociability+0.4
- 同上の減衰挙動

**確認内容（連続ブースト）**:
- 既存ブースト中に追加操作→値が加算合成（各軸上限1.0、remainingMsは最大値）

---

#### A-9. バイオリズム連動アニメーションルール

バイオリズム値に応じて4つの追加アニメーションルールが発火する。全てキャンバス内描画で結果を確認する必要がある。

| ルール | 条件 | 効果 |
|--------|------|------|
| high-activity-energetic-idle | idle + autonomous + activity>0.5 + random<0.25 | happyアニメーション再生 |
| low-activity-sleepy-idle | idle + autonomous + activity<-0.5 + random<0.20 | sleepアニメーション再生 |
| high-sociability-reaction | reaction + sociability>0.5 | happyアニメーション再生 |
| high-focus-march | march + focus>0.5 + phaseProgress<=0.3 | walk speed:1.1 |

**確認方法**: `VITE_DEBUG_LICENSE=registered npm run dev`でregisteredモード起動し、`data-biorhythm`で現在のバイオリズム値を確認しながらキャラクターの行動変化を観察する。

---

### B. DOM外で完結する項目

#### B-1. SFX再生

| トリガーイベント | ファイル | タイミング | ゲイン |
|---------------|---------|----------|-------|
| PhaseStarted(work) | work-start.mp3 | workフェーズ開始時 | 1.0 |
| PhaseStarted(break) + pendingWorkComplete | work-complete.mp3 | break開始時（long-break前はスキップ） | 1.0 |
| PhaseStarted(congrats) | fanfare.mp3 | congratsフェーズ開始時 | 1.0 |
| PhaseStarted(break/long-break) | break-chill.mp3 | break/long-break中ループ再生 | 0.25 |
| TriggerFired(break-getset/long-break-getset) | break-getset.mp3 | 残り30秒でクロスフェード切替 | 0.25 |
| PomodoroAborted | pomodoro-exit.mp3 | 手動停止時 | 1.0 |

---

#### B-2. BGMクロスフェード

break-chill→break-getsetの3000msクロスフェード。GainNode gain.valueの線形遷移。同時再生期間あり。

---

#### B-3. 環境音プリセット再生

Rain（ブラウンノイズ+LP）、Forest（ホワイトノイズ+BP+LFO）、Wind（ピンクノイズ+LP+LFO）。全てWeb Audio APIプロシージャル生成。

---

#### B-4. 音量制御・ミュート

10段階セグメント表示。MAX_GAIN=0.25でスケーリング。ミュート時はAudioContext.suspend()、解除時にresume()。

---

#### B-5. 天気エフェクト・背景スクロール

| 項目 | 内容 |
|------|------|
| 雨 | LineSegments 650本 + スプラッシュ（リングバッファ最大200個）+ opacityフェード（rainMat: 0→0.4、splashMat: 0→0.5） |
| 雪 | Points 750個 + sin/cosゆらぎ落下 + opacityフェード（0→0.7） |
| 雲 | SphereGeometry群、6段階密度（0=none〜5=overcast最大100個）+ opacityフェード + 密度変更時の退場バッチクロスフェード（2000ms）+ 天気別色（sunny=白emissive、それ以外=灰色） |
| 背景スクロール | 3チャンクリサイクル（視界外でregenerate()） |

**天気エフェクトopacityフェード — 手動テスト手順**:

##### B-5-1. sunny→rainy フェードイン

**操作手順**:
1. 天気パネルでsunnyを選択した状態を確認
2. rainyに切り替える

**確認内容**:
- 雨粒とスプラッシュが徐々に表示される（opacity 0→0.4/0.5）
- テーマ遷移（空色・ライティング変化）と同期してフェードが進行する
- フェード完了後に定常状態のopacityになる

##### B-5-2. rainy→sunny フェードアウト

**操作手順**:
1. rainy状態から天気パネルでsunnyに切り替える

**確認内容**:
- 雨粒とスプラッシュが徐々に消える（opacity 0.4/0.5→0）
- フェード完了後に雨粒が完全に非表示になる

##### B-5-3. rainy→snowy クロスフェード

**操作手順**:
1. rainy状態から天気パネルでsnowyに切り替える

**確認内容**:
- 雨がフェードアウトし、同時に雪がフェードインする（独立動作、同時進行）
- 両エフェクトが一時的に共存する

##### B-5-4. 雲密度変更クロスフェード

**操作手順**:
1. 雲量スライダーを1（very sparse）に設定
2. 雲量スライダーを5（overcast）に変更

**確認内容**:
- 古い雲がフェードアウトしながらドリフト継続する（2000ms）
- 新しい雲がフェードインで出現する
- 古い雲のフェードアウト完了後にシーンから除去される

##### B-5-5. フェード中の方向反転

**操作手順**:
1. sunny→rainyに切り替え、フェードイン途中で再度sunnyに切り替える

**確認内容**:
- 現在のopacity位置からフェードアウトが開始する（0に戻ってからではない）
- 不自然なジャンプが発生しない

##### B-5-6. autoTimeOfDay同期

**操作手順**:
1. Auto Time of Dayを有効にする
2. 天気を変更する

**確認内容**:
- テーマ遷移duration（THEME_TRANSITION_DURATION_AUTO_MS）と同じ時間でエフェクトがフェードする

##### B-5-7. 初回起動時の即座表示

**操作手順**:
1. 設定でrainy+雲量3に設定してアプリを終了
2. アプリを再起動する

**確認内容**:
- 雨と雲がフェードなしで即座に表示される（setVisibleによる即座切替）

---

#### B-6. 動的ライティング（20パターン）

4天気×4時間帯のルックアップテーブル。空色・霧・ambient/hemisphere/sunの色/強度/位置・地面色・露出が変化。

---

#### B-7. キャラクターアニメーション描画

11状態×FBXアニメーション。AnimationMixer + crossFadeTo（0.3秒ブレンド）。

| 状態 | アニメーション | ループ |
|------|-------------|--------|
| idle | idle | ○ |
| wander | walk | ○ |
| march | walk→run（終盤） | ○ |
| sit | sit | ○ |
| sleep | sleep | ○ |
| happy | happy | ✗ |
| reaction | wave/attack2 | ✗ |
| dragged | idle | ○ |
| pet | happy | ○ |
| refuse | refuse/damage2 | ✗ |
| feeding | sit | ○ |

---

#### B-8. システム通知の実表示

| タイミング | タイトル | 本文 |
|-----------|---------|------|
| work完了 | 休憩の時間 | 作業お疲れ様でした |
| break完了 | 作業の時間 | 休憩終了、次の作業に取り掛かりましょう |
| ポモドーロ完了 | サイクル完了！ | ポモドーロサイクルが完了しました |

条件: BG Notify=ONかつバックグラウンド時のみ。`app.setAppUserModelId()`が前提。

---

### C. ライセンス/アップデート — サーバー依存

#### C-1. ハートビートAPI（トライアル開始）

**前提**: GCPバックエンド構築済み + HEARTBEAT_URL設定済み

**操作手順**:
1. deviceIdなし（settings.json初期状態）でパッケージ済みアプリを起動
2. 起動後10秒待つ

**確認内容**:
- settings.jsonにdeviceIdが生成されている（UUID形式）
- Firestoreのdevices/{deviceId}にtrialStartDateが記録されている
- トライアル期間中: LicenseToastが表示されない
- 30日経過後: LicenseToastに「Your trial period has ended」が表示される

---

#### C-2. download key登録

**前提**: GCPバックエンド + itch.io APIキー設定済み

**操作手順**:
1. 設定パネル → Registerリンク → RegistrationDialogを開く
2. 有効なdownload keyを入力して「Register」をクリック

**確認内容**:
- ダイアログが閉じる
- Registerリンクが「Registered (****WXYZ)」に変化（key末尾4桁表示）
- settings.jsonにjwt、downloadKeyが保存されている
- Firestoreのdevices/{deviceId}.registeredKeyにハッシュが記録されている

---

#### C-3. LicenseToast表示（expired/restricted）

**操作手順**:
1. トライアル30日経過後（またはFirestoreで直接trialStartDateを古い日付に変更）にパッケージ済みアプリを起動

**確認内容**:
- LicenseToast（data-testid="license-toast"）が表示される
- 「Your trial period has ended. Register to unlock all features.」メッセージ
- 「Get Pomodoro Pet」ボタンクリックでitch.ioページが開く

---

#### C-4. UpdateNotification表示

**前提**: GitHub Releasesに現行バージョンより新しいバージョンがpush済み

**操作手順**: パッケージ済み登録済みアプリを起動し、10秒待つ

**確認内容**:
- UpdateNotification（data-testid="update-notification"）が表示される
- バージョン番号が正しい
- 「Download」ボタンでダウンロード開始
- ダウンロード完了後「Restart Now」ボタンが表示される
- ポモドーロ中はUpdateNotificationが非表示

---

#### C-5. オフライン時の動作

**操作手順**: ネットワーク切断状態で登録済みアプリを起動

**確認内容**:
- JWT有効: 全機能利用可 + トースト「Could not verify registration status」
- JWT期限切れ（30日超）: 全機能利用可 + 同トースト
- JWTなし: restricted モード + 機能制限

---

#### B-9. バックグラウンドオーディオ抑制

BG Audio=OFF時: blur→`AudioContext.suspend()`でリソース解放、focus→`resume()`で復帰。ユーザーミュートとは独立管理。タイマー継続自体はE2Eテスト済み（pomodoro-detail.spec.ts）。
