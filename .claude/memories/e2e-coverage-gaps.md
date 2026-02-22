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

## カバー済み項目（61テスト）

| ファイル | テスト数 | カバー範囲 |
|---------|---------|-----------|
| smoke.spec.ts | 3 | 起動・タイトル・Start Pomodoroボタン存在 |
| free-mode.spec.ts | 10 | 設定パネル開閉・ボタン選択・スナップショット復元・BG設定・Set確定・About画面 |
| pomodoro-flow.spec.ts | 4 | Start→WORK表示・Pause/Resume・Stop・タイマー完走→Congrats→free復帰 |
| settings-ipc.spec.ts | 11 | electronAPI存在・settings.json永続化（タイマー/BG/天気/雲量/テーマ）・再起動復元 |
| weather-panel.spec.ts | 10 | パネル開閉・天気タイプ/時間帯切替・雲量・リセット・スナップショット・排他表示 |
| button-visibility.spec.ts | 5 | 初期全表示・設定/統計/天気パネル時の排他制御・順次開閉復帰 |
| stats-panel.spec.ts | 4 | パネル開閉・Statistics見出し・排他表示 |
| fureai-mode.spec.ts | 4 | Entry→overlay表示・テキスト確認・ボタン排他・Exit→free復帰 |
| theme.spec.ts | 2 | colorScheme即時反映・スナップショット復元 |
| animation-state.spec.ts | 8 | デバッグインジケーター存在・初期状態・感情初期値・プリセット切替(march-cycle/rest-cycle/autonomous)・phaseProgress・satisfaction加算 |

## 未カバー項目

### A. テスト可能だが未実装（DOM/データで検証可能）

| # | 項目 | 検証方法 | 備考 |
|---|------|---------|------|
| 1 | プロンプト入力（ふれあいモード） | PromptInputにテキスト入力→Enter→デバッグインジケーターでstate変化を確認 | data-testid="prompt-input"が存在すれば実現可能 |
| 2 | 統計パネルの詳細表示 | StatsDrawer内の日付・completedCycles・focusTime等のテキストを検証 | data-testidの追加が必要な可能性あり |
| 3 | サイクル進捗ドット表示 | PomodoroTimerPanel内のドットSVG要素数・色を検証 | フェーズ遷移に伴うドット更新の確認 |
| 4 | タイムラインサマリー表示 | OverlayFree内のTimelineScheduleテキストを検証 | 設定変更→Set→表示値の一致確認 |
| 5 | 時刻表示（freeモード） | OverlayFree内のHH:MM表示テキストを検証 | 表示形式の確認のみ |
| 6 | ポモドーロ中の全フェーズ遷移確認 | デバッグインジケーターでmarch-cycle→rest-cycle→march-cycle→celebrate→joyful-rest→autonomousの順序を検証 | 現在はmarch-cycle→rest-cycle→Stop→autonomousのみ |
| 7 | work中のインタラクション拒否 | ポモドーロ開始→デバッグインジケーターでisInteractionLocked相当の確認 | デバッグインジケーターへの属性追加が必要 |
| 8 | バックグラウンドタイマー継続 | page.evaluate(() => window.dispatchEvent(new Event('blur')))→待機→focus→タイマー値が進んでいることを確認 | Electronのblur/focusシミュレーションが可能か要検証 |
| 9 | 感情パラメータの自然変化 | 長時間work後のfatigue増加をデバッグインジケーターで検証 | work=3秒では変化量が微小（≈0.0000003）のため実質検証不能。デバッグタイマーの秒数増加が必要 |
| 10 | affinity永続化 | settings.jsonのemotion.affinityをファイル読み込みで検証 | 餌やり操作がE2Eで困難なためaffinity変化を起こせない |

### B. テスト困難（Three.jsキャンバス内操作が必要）

| # | 項目 | 困難な理由 |
|---|------|-----------|
| 1 | キャラクタークリック→reaction状態 | Raycasterがキャンバス座標→3Dワールド座標変換で判定。キャラクターの画面位置が状態（march/wander）で変動 |
| 2 | キャラクタードラッグ→dragged状態 | Y軸方向のマウス移動量でGestureRecognizerが判定。3D空間での持ち上げ量の再現が困難 |
| 3 | キャラクター撫でる→pet状態 | X軸方向の左右ストロークをGestureRecognizerが判定。キャラクター上での正確な軌跡が必要 |
| 4 | 餌やり（ドラッグ＆ドロップ） | キャベツ/リンゴのキャンバス内位置特定→キャラクターまでのドラッグ→距離<2.5の判定。全てWebGL座標系 |
| 5 | ホバーカーソル変更 | Raycasterヒット判定に依存。canvas要素のcursor CSSプロパティは確認可能だが、ヒット自体が不確実 |
| 6 | クリック連打→damage2アニメーション | キャラクターへの5連続クリック（3秒以内）が必要。ヒット判定が前提 |
| 7 | ハートエフェクト発火 | FeedingSuccess イベントが餌やり成功（B-4）に依存。イベントをpage.evaluateで直接発火すれば表示確認は可能 |

### C. テスト不可能（DOM外で完結）

| # | 項目 | 不可能な理由 |
|---|------|-------------|
| 1 | SFX再生（work-start, work-complete, fanfare, break-chill, break-getset, pomodoro-exit） | Web Audio APIのAudioBufferSourceNode再生状態はDOMに露出しない |
| 2 | BGMクロスフェード（break-chill→break-getset切替） | GainNodeのgain.valueの時間変化はDOM外 |
| 3 | 環境音プリセット再生（Rain/Forest/Wind） | OscillatorNode+BiquadFilterNodeの組み合わせがAudioContext内で完結 |
| 4 | 音量制御・ミュート状態 | AudioContext.suspend()/resume()の状態はDOMに露出しない |
| 5 | 雨エフェクト（LineSegments+スプラッシュ） | WebGLレンダリングパイプライン内 |
| 6 | 雪エフェクト（Points+ゆらゆら落下） | 同上 |
| 7 | 雲エフェクト（Sphere群+ドリフト） | 同上 |
| 8 | 背景スクロール（3チャンクリサイクル） | 同上 |
| 9 | 動的ライティング（20パターン） | ambient/hemisphere/sunの色・強度はGPUシェーダーで反映 |
| 10 | キャラクターアニメーション描画 | AnimationMixer+crossFadeToの結果はメッシュ変形としてGPUで描画 |
| 11 | システム通知の実表示 | Electron Notification APIがOS通知を発行。表示確認はOS依存 |
| 12 | バックグラウンド時のオーディオ抑制 | AudioContext.suspend()はDOM外。ミュートフラグの内部状態確認は可能だが実際の音声停止は検証不能 |

## 補足: デバッグインジケーターで検証可能な範囲

`#debug-animation-state`が公開するdata属性:

| 属性 | 現在テスト済み | 追加テスト可能な項目 |
|------|-------------|-------------------|
| data-state | idle, march | wander, sit, sleep, happy, reaction, dragged, pet, refuse, feeding（Three.js操作が前提のものを除く） |
| data-preset-name | autonomous, march-cycle, rest-cycle | joyful-rest, celebrate, fureai-idle |
| data-clip-name | idle | walk, run, sit, sleep, happy, wave, attack2, damage1, damage2, getUp（状態遷移の結果として） |
| data-phase-progress | >0の確認 | 特定範囲（0.3超、0.7超）でのアニメーション切替との連動 |
| data-emotion | 初期値, satisfaction>0.5 | fatigue蓄積, affinity変化（操作手段があれば） |
| data-recent-clicks | 未テスト | キャラクタークリックが前提のため困難 |
| data-total-feedings-today | 未テスト | 餌やり操作が前提のため困難 |
| data-previous-state | 未テスト | 特定遷移パターン（sleep→idle→getUpなど）の検証 |

## まとめ

| 分類 | 項目数 | 割合 |
|------|--------|------|
| カバー済み | 61テスト / 10ファイル | — |
| テスト可能だが未実装 | 10項目 | うち実用的に追加可能なものは#1〜#6の6項目 |
| テスト困難（Three.js依存） | 7項目 | page.evaluateでイベント直接発火すれば一部回避可能 |
| テスト不可能（DOM外） | 12項目 | ユニットテストでカバーする領域 |

現在のE2Eテストは **UIレイアウト・パネル制御・設定永続化・基本タイマーフロー・プリセット切替・感情パラメータ** をカバーしている。未カバー項目の大半はThree.jsキャンバス内操作またはWeb Audio API依存であり、E2Eテストの技術的限界に起因する。これらはドメイン層・アプリケーション層のユニットテスト（カバレッジ100%）で補完されている。

## E2E未カバー項目のテストオペレーションと確認内容

### A. テスト可能だが未実装の項目

#### A-1. プロンプト入力（ふれあいモード）

**前提**: アプリ起動済み、freeモード

**操作手順**:
1. `[data-testid="fureai-entry"]`をクリック
2. `[data-testid="overlay-fureai"]`の表示を待つ
3. プロンプト入力欄（プレースホルダー「指示を入力... (例: walk, 座れ, dance)」）にフォーカス
4. テキスト「walk」を入力してEnterキーを押下
5. デバッグインジケーターの`data-state`を確認
6. 入力欄が空になっていることを確認
7. テキスト「sit」を入力してEnterキーを押下
8. デバッグインジケーターの`data-state`を確認
9. テキスト「sleep」を入力してEnterキーを押下
10. デバッグインジケーターの`data-state`を確認
11. 空文字のままEnterキーを押下

**確認内容**:
- 手順4後: `data-state`が`wander`に変化する
- 手順6: 入力欄のvalueが空文字になる
- 手順7後: `data-state`が`sit`に変化する
- 手順9後: `data-state`が`sleep`に変化する
- 手順11: 状態が変化しない（空文字は無視される）

**認識されるキーワード一覧**:

| 行動 | 英語キーワード | 日本語キーワード |
|------|-------------|---------------|
| pet | pet, pat, stroke, rub | 撫, なで, ナデ |
| wander | walk, move, go | 歩, 散歩, 移動 |
| sit | sit, rest | 座, 休 |
| sleep | sleep, nap | 寝, 眠 |
| happy | happy, dance, joy | 喜, 踊, 嬉 |
| reaction | wave, hello, hi | 挨拶, 手を振 |
| idle | idle, stop, stay | 止, 待 |

未認識キーワードはidleにフォールバックする。大文字小文字の区別なし（部分文字列マッチ）。

**実装上の前提**: PromptInputにdata-testid属性が必要。現在は未付与。

---

#### A-2. 統計パネルの詳細表示

**前提**: アプリ起動済み、freeモード。事前にポモドーロを1回以上完走済み（統計データあり）

**操作手順**:
1. `[data-testid="stats-toggle"]`をクリック
2. 「Statistics」見出しの表示を待つ
3. サマリーカード（Today / 7 Days / 30 Days）の表示を確認
4. ヒートマップ（13週カレンダー）の表示を確認
5. 累積時間チャート（折れ線グラフ）の表示を確認
6. ポモドーロを1サイクル完走する
7. 再度統計パネルを開く

**確認内容**:

サマリーカード:
- 3列（Today / 7 Days / 30 Days）のラベルが表示される
- 各列にworkPhasesCompleted（数値）が表示される
- 各列にtotalWorkMsのフォーマット済み表示がある（60分未満: `{min}m`、60-120分: `{h}h`、120分以上: `{h}h{m}m`）
- 単数形「work」/ 複数形「works」が数値に応じて切り替わる

ヒートマップ:
- 月ラベル（Jan, Feb, ...）が上部に表示される
- 曜日ラベル（Mon, Wed, Fri）が左側に表示される
- セルサイズ11×11px、間隔2px
- 色の濃さがwork回数に連動する（0回: 透明、1回: 0.15、2回: 0.3、3-4回: 0.5、5回以上: 0.7）
- 当日セルにstrokeボーダー（stroke-width 1.5）がある
- 凡例「Less [5段階] More」が表示される
- セルホバー時にツールチップ「{date}: {count} work(s)」が表示される

累積時間チャート:
- SVG（320×80）でX/Y軸が描画される
- 日次累積ポイントを結ぶ折れ線パスが表示される
- 最新ポイントに発光サークル（パルスアニメーション）がある
- 累積時間ラベルが表示される

データなし時:
- 「No data」テキストが表示される

手順6-7後:
- Todayの数値が増加している

**実装上の前提**: StatsDrawer内の各要素にdata-testid属性が必要な可能性がある。

---

#### A-3. サイクル進捗ドット表示

**前提**: アプリ起動済み、freeモード。VITE_DEBUG_TIMER=3/2/3/2（Sets=2）

**操作手順**:
1. Start Pomodoroをクリック
2. WORKフェーズ表示を待つ
3. サイクル進捗ドット（オーバーレイ左上付近）を確認
4. work→break遷移を待つ
5. ドットの色変化を確認
6. break→work遷移を待つ（Set2）
7. ドットの色変化を確認
8. Stopで終了

**確認内容**:

ドットの構造:
- congratsフェーズを除いたフェーズ数分のドット（&#9679;）が表示される
- Sets=2の場合: work, break, work, long-breakの4ドット

ドットの色ルール:
- 現在フェーズより前のドット: `var(--theme-text-secondary)`（完了済み）
- 現在フェーズのドット: `phaseColor[phase].filled`（work=緑、break=青、long-break=紫）
- 現在フェーズより後のドット: `var(--theme-surface-hover)`（未到達）

手順3: 1番目のドットがwork色（緑）、2-4番目が未到達色
手順5: 1番目が完了色、2番目がbreak色（青）、3-4番目が未到達色
手順7: 1-2番目が完了色、3番目がwork色（緑）、4番目が未到達色

---

#### A-4. タイムラインサマリー表示

**前提**: アプリ起動済み、freeモード

**操作手順**:
1. OverlayFree内のタイムラインサマリーを確認
2. `[data-testid="settings-toggle"]`をクリック
3. Work=50、Sets=2に設定
4. `[data-testid="set-button"]`をクリック
5. サマリー表示を再確認

**確認内容**:

タイムラインバー:
- フェーズセグメント（W=work、B=break、LB=long-break）が横並びで表示される
- 各セグメントの幅がフェーズ時間に比例している
- work: `tlSegWork`クラス（緑系）
- break: `tlSegBreak`クラス（青系）
- long-break: `tlSegLongBreak`クラス（紫系）

セットラベル:
- Sets=2の場合「Set 1」「Set 2」が表示される

終了時刻:
- 各セット終了時刻が12時間形式（HH:MM AM/PM）で表示される
- 現在時刻+各セットの所要時間に基づく

手順4-5: Work=50分に変更後、タイムラインバーのworkセグメント幅が増加し、終了時刻が後ろにずれる

---

#### A-5. 時刻表示（freeモード）

**前提**: アプリ起動済み、freeモード

**操作手順**:
1. OverlayFree内の時刻表示エリアを確認
2. 表示形式を確認
3. 1分以上待って更新を確認

**確認内容**:
- 時刻が12時間形式（HH:MM AM/PM）で表示される
- 毎秒更新される（useEffect setInterval 1000ms）
- 分が変わるタイミングで表示が更新される

---

#### A-6. ポモドーロ中の全フェーズ遷移確認

**前提**: アプリ起動済み、freeモード。VITE_DEBUG_TIMER=3/2/3/2

**操作手順**:
1. Start Pomodoroをクリック
2. 各フェーズ遷移ごとにデバッグインジケーターの`data-preset-name`を記録
3. タイマー完走後、freeモード復帰を待つ

**確認内容**:

遷移順序（Sets=2）:

| 経過 | フェーズ | data-preset-name | data-state |
|------|---------|-----------------|-----------|
| 0秒 | work (Set1) | march-cycle | march |
| 3秒 | break (Set1) | rest-cycle | happy→sit→idle |
| 5秒 | work (Set2) | march-cycle | march |
| 8秒 | congrats | celebrate | happy |
| 13秒 | long-break | joyful-rest | happy→sit→idle |
| 16秒 | 自動終了→free | autonomous | idle |

確認ポイント:
- 6種のプリセット（autonomous, march-cycle, rest-cycle, celebrate, joyful-rest, fureai-idle）のうち5種がポモドーロサイクル中に使用される
- 各遷移で暗転トランジション（350ms×2）が入る
- congratsフェーズでは「Congratulations!」テキストと紙吹雪エフェクトが表示される
- long-breakの後に自動でexitPomodoroが実行されfreeモードに復帰する

**現在のテストとの差分**: animation-state.spec.tsではmarch-cycle→rest-cycle→（Stop）→autonomousのみ確認している。celebrate, joyful-restの確認が欠けている。

---

#### A-7. work中のインタラクション拒否

**前提**: アプリ起動済み、freeモード

**操作手順**:
1. Start Pomodoroをクリック
2. WORKフェーズ表示を待つ
3. キャンバス上のキャラクターをクリック
4. キャラクターの状態を確認

**確認内容**:
- work中はisInteractionLocked()がtrueを返す
- クリック時にrefuse状態に遷移する（`data-state`=`refuse`）
- カーソルが`not-allowed`になる
- refuse状態は1.5〜2.5秒で元のmarch状態に復帰する

**実装上の制約**: キャラクターへのクリックヒット判定がThree.js Raycasterに依存するため、E2E自動化は困難。デバッグインジケーターに`data-interaction-locked`属性を追加すればロック状態の確認は可能。

---

#### A-8. バックグラウンドタイマー継続

**前提**: アプリ起動済み、ポモドーロ実行中

**操作手順**:
1. Start Pomodoroをクリック
2. WORKフェーズ表示を待つ
3. タイマー値（MM:SS）を記録
4. `page.evaluate(() => window.dispatchEvent(new Event('blur')))`でバックグラウンド化
5. 2秒待機
6. `page.evaluate(() => window.dispatchEvent(new Event('focus')))`でフォアグラウンド復帰
7. タイマー値を再確認

**確認内容**:
- 手順7: タイマー値が手順3から約2秒進んでいる（バックグラウンド中もsetInterval(1000ms)でtickが継続する）
- rAFループのorchestrator.tickはwindowFocused=false時にスキップされるが、bgIntervalが代わりにtickを呼ぶ

**追加確認（BG Audio OFF時）**:
1. 設定でBG Audio=OFFにする
2. 同様にblur→2秒→focusを実行
3. タイマーが進んでいることを確認（オーディオ抑制とタイマー継続は独立）

**実装上の注意**: Electronのblur/focusイベントがpage.evaluateでのdispatchEventで正しくシミュレートされるか要検証。electronApp.evaluate等でBrowserWindow.blur()を呼ぶ方が確実な可能性がある。

---

#### A-9. 感情パラメータの自然変化

**前提**: アプリ起動済み、freeモード

**操作手順**:
1. デバッグインジケーターの`data-emotion`でfatigueの初期値を記録（0）
2. Start Pomodoroをクリック
3. work=3秒のフェーズ終了を待つ
4. `data-emotion`でfatigueの値を確認

**確認内容**:
- work中のfatigue増加レート: +0.0000001/ms
- work=3秒（3000ms）での増加量: 0.0000001 × 3000 = 0.0003
- 検出限界: JSON.stringifyの精度で0.0003は検出可能だが、極めて微小

**実用的な制約**: VITE_DEBUG_TIMER=3/2/3/2ではwork=3秒のため変化量が微小すぎる。有意な変化を検証するにはwork=300秒（5分）程度のデバッグタイマー設定が必要（fatigue ≈ 0.03）。現在のE2Eビルド設定では事実上検証不能。

自然変化レート一覧:

| パラメータ | work中 | 非work時 | 25分workでの変化量 |
|-----------|--------|---------|-----------------|
| fatigue | +0.0000001/ms | -0.00000005/ms | +0.15 |
| satisfaction | 変化なし | -0.00000001/ms | — |
| affinity | -0.000000001/ms | 同左 | -0.0015 |

---

#### A-10. affinity永続化

**前提**: アプリ起動済み、freeモード

**操作手順**:
1. affinityを変化させる操作を行う（餌やり: +0.05、撫でる: +0.10）
2. 設定変更をトリガーする（天気変更→Set等でsaveAllToStorageを発火）
3. `{userData}/settings.json`の`emotion.affinity`を読み取る
4. アプリを再起動
5. デバッグインジケーターの`data-emotion`でaffinityの値を確認

**確認内容**:
- 手順3: settings.jsonにemotion.affinityが保存されている
- 手順5: 再起動後のaffinityが保存値と一致する（createDefaultEmotionState(affinity)で復元）

**実用的な制約**: affinity変化の操作手段（餌やり/撫でる）がThree.jsキャンバス内操作のためE2E自動化困難。page.evaluateでEmotionServiceのapplyEvent()を直接呼び出せば回避可能だが、統合テストとしての意味が薄れる。

---

### B. テスト困難な項目（Three.jsキャンバス内操作）

#### B-1. キャラクタークリック→reaction状態

**前提**: アプリ起動済み、freeモード、キャラクターがidle状態

**操作手順**:
1. キャンバス上のキャラクターの位置を目視で確認
2. キャラクターの体の中心付近をクリック
3. デバッグインジケーターの`data-state`を確認

**確認内容**:
- クリック後`data-state`が`reaction`に変化する
- `data-clip-name`が`wave`（デフォルト）または`attack2`（50%確率で変種）
- 2〜3秒後にreactionが終了し次の状態（idle等）に遷移する
- `data-recent-clicks`が1増加する

**困難な理由**: キャラクターの画面上の位置はmarch/wander/idleの状態やスクロールで変動する。Raycasterのヒット判定はキャンバス内の3D座標系で行われるため、Playwrightのpage.click({x, y})では正確なヒットを保証できない。

---

#### B-2. キャラクタードラッグ→dragged状態

**前提**: アプリ起動済み、freeモード、キャラクターがidle状態

**操作手順**:
1. キャラクターの体をマウスダウン
2. マウスをY軸方向（上方向）に8px以上移動（deltaY > |deltaX|の条件を満たす）
3. GestureRecognizerがdragと判定
4. キャラクターが持ち上がるアニメーションを目視確認
5. マウスを左右に動かしてスウェイを確認
6. マウスアップで離す
7. フォールアニメーション（90%減衰/フレーム）を確認

**確認内容**:
- 手順3後: `data-state`が`dragged`に変化する
- 手順3後: `data-clip-name`が`idle`（dragged状態はidleアニメーション）
- キャラクターのY座標が上昇する（最大MAX_LIFT_HEIGHT=3ユニット）
- 左右移動でキャラクターがX方向にスウェイする（最大MAX_SWAY=0.5ユニット）
- スウェイに応じて回転する（最大SWAY_ROTATION=0.4ラジアン）
- 手順7: キャラクターが元のY=0に落下する
- カーソルが`grabbing`に変化する

**ジェスチャー判定の閾値**:
- dragThresholdY: 8px（Y方向移動量がこの値を超え、かつ|deltaY| > |deltaX|でdrag判定）

---

#### B-3. キャラクター撫でる→pet状態

**前提**: アプリ起動済み、freeモード、キャラクターがidle状態

**操作手順**:
1. キャラクターの体をマウスダウン
2. マウスをX軸方向（右方向）に6px以上移動
3. マウスの方向を反転し、ピーク位置から6px以上逆方向に移動
4. GestureRecognizerがpetと判定
5. 撫でるアニメーションを目視確認
6. マウスアップで離す

**確認内容**:
- 手順4後: `data-state`が`pet`に変化する
- `data-clip-name`が`happy`（pet状態はhappyアニメーション、loop=true）
- キャラクターがX方向に穏やかにスウェイする（PET_SWAY_SCALE=0.3）
- 回転量がdragより小さい（PET_MAX_ROTATION=0.15ラジアン）
- カーソルが`grab`に変化する
- 3〜8秒後にpet状態が終了する

**ジェスチャー判定の閾値**:
- petThresholdX: 6px（X方向移動量）
- petDirectionChanges: 1（方向反転1回でpet判定）
- |deltaX| > |deltaY|であること（Y優先だとdrag判定になる）

---

#### B-4. 餌やり（ドラッグ＆ドロップ）

**前提**: アプリ起動済み、ふれあいモード（`[data-testid="fureai-entry"]`クリック済み）

**操作手順**:
1. キャンバス上の食べ物オブジェクト（キャベツまたはリンゴ）を目視確認
2. 食べ物をマウスダウン
3. キャラクターの方向にドラッグ（Z平面投影で3D空間を移動）
4. キャラクターとの距離が2.5ユニット以内の位置でマウスアップ
5. feeding成功を確認
6. 3秒後に食べ物が再出現することを確認

**確認内容**:

成功時（距離 < 2.5）:
- 食べ物オブジェクトが非表示になる
- `data-state`が`feeding`に変化する
- `data-clip-name`が`sit`（feeding状態はsitアニメーション代用）
- `FeedingSuccess`イベントが発火する
- ハートエフェクト（10個のSVGハート）が画面中央付近に表示される
- `data-total-feedings-today`が1増加する
- `data-emotion`のsatisfactionが+0.15、affinityが+0.05増加する
- 3〜5秒後にfeeding→happy遷移（fureai-idleプリセットの遷移定義）
- 3000ms後に食べ物が元の位置に再出現する

失敗時（距離 ≥ 2.5）:
- 食べ物が300msイージングで元の位置にスナップバックする
- 状態変化なし

**食べ物オブジェクトの仕様**:
- キャベツ: SphereGeometry重ね合わせ、スケール0.3
- リンゴ: 赤球体+茎+葉、スケール0.15
- 配置数: 8個（キャベツ4+リンゴ4）
- ふれあいモード時のみ表示

**ドラッグの3D制御**:
- Z平面投影でNDC→ワールド座標変換
- 前方移動時にアーク軌道（ARC_HEIGHT=0.85で弧を描く）
- Z_RANGE=8、Z_POWER=1.3（奥ほど加速するべき乗カーブ）
- 最低Y座標: MIN_Y=0.1

---

#### B-5. ホバーカーソル変更

**前提**: アプリ起動済み、freeモード

**操作手順**:
1. マウスをキャンバスの空白エリアに移動
2. マウスをキャラクターの上に移動
3. カーソルの変化を目視確認
4. ポモドーロを開始してwork中にキャラクターにホバー
5. カーソルの変化を確認

**確認内容**:

状態別カーソル:

| 状態 | カーソル |
|------|---------|
| idle / wander / march / sit / sleep / happy / reaction | pointer |
| dragged | grabbing |
| pet | grab |
| refuse | not-allowed |
| feeding | default |
| インタラクションロック中（work時） | not-allowed |

- 手順2: カーソルが`pointer`に変化する
- 手順4: カーソルが`not-allowed`に変化する（isInteractionLocked=true）
- キャラクター外に移動するとデフォルトカーソルに戻る

**確認可能性**: canvas要素のstyle.cursorプロパティはDOMから読み取れるため、キャラクターへのホバーが成功すればPlaywrightで検証可能。ただしRaycasterヒット自体がキャラクター位置に依存。

---

#### B-6. クリック連打→damage2アニメーション

**前提**: アプリ起動済み、freeモード、キャラクターがidle状態

**操作手順**:
1. キャラクターを3秒以内に3回クリック
2. デバッグインジケーターの`data-recent-clicks`と`data-clip-name`を確認
3. キャラクターを3秒以内に5回クリック
4. 同様に確認

**確認内容**:

3回クリック（recentClicks=3）:
- EnrichedAnimationResolverのルール5「click-irritation」が適用される
- `data-clip-name`が`damage1`（横によろめく）に変化する
- `data-state`は`reaction`

5回クリック（recentClicks≥5）:
- ルール4「click-spam-reaction」が適用される（ルール5より優先）
- `data-clip-name`が`damage2`（後ろにのけぞる）に変化する

クリック間隔が3秒を超えた場合:
- InteractionTrackerの3秒スライディングウィンドウにより古いクリックが除去される
- recentClicksが減少し、通常のreactionアニメーション（wave/attack2）に戻る

---

#### B-7. ハートエフェクト発火

**前提**: アプリ起動済み、ふれあいモード

**操作手順（手動）**: B-4の餌やり成功時に自動発火

**操作手順（EventBus直接発火による回避策）**:
1. ふれあいモードに遷移
2. `page.evaluate(() => { /* EventBusのFeedingSuccessイベントを発火 */ })`を実行
3. ハートエフェクトのDOM要素を確認

**確認内容**:
- 10個の`<span>`要素（heartクラス）がdocument.bodyのポータルとして生成される
- 各ハートにSVGハートアイコン（fill="#e91e63"、ピンク色）が含まれる
- 位置: left 35-65%、top 40-60%（画面中央付近にランダム分散）
- animationDuration: 1.2〜2.0秒
- animationDelay: 0〜0.4秒
- fontSize: 18〜34px
- CSSアニメーション「floatUp」で上方向に浮き上がりフェードアウトする
- triggerKey=0の初期状態ではハート要素は描画されない（nullを返す）

**回避策の実現可能性**: EventBusインスタンスがwindowスコープから参照可能であれば、page.evaluateでFeedingSuccessイベントを直接発火できる。ただし現在のアーキテクチャではEventBusはmain.tsのクロージャ内にあり、グローバルに公開されていない。デバッグ用のwindow.__eventBus__公開が必要。

---

### C. テスト不可能な項目（DOM外で完結）

#### C-1. SFX再生

**手動テスト手順**:
1. Start Pomodoroをクリック
2. work開始音（work-start.mp3）が再生されることを耳で確認
3. work完了を待つ
4. work完了音（work-complete.mp3）が再生されることを確認
5. break中にbreak-chill.mp3がループ再生されることを確認
6. breakの残り30秒（デバッグタイマーでは開始直後）にbreak-getset.mp3にクロスフェードすることを確認
7. 全サイクル完走後にファンファーレ（fanfare.mp3）が再生されることを確認
8. 別のポモドーロを開始しStopをクリック
9. ポモドーロ終了音（pomodoro-exit.mp3）が再生されることを確認

**トリガーとファイル対応**:

| トリガーイベント | ファイル | タイミング | ゲイン |
|---------------|---------|----------|-------|
| PhaseStarted(work) | ./audio/work-start.mp3 | workフェーズ開始時 | 1.0 |
| PhaseStarted(break) + pendingWorkComplete | ./audio/work-complete.mp3 | break開始時（long-break前はスキップ） | 1.0 |
| PhaseStarted(congrats) | ./audio/fanfare.mp3 | congratsフェーズ開始時 | 1.0 |
| PhaseStarted(break/long-break) | ./audio/break-start.mp3 | break/long-break開始時 | 1.0 |
| PhaseStarted(break/long-break) | ./audio/break-chill.mp3 | break/long-break中ループ再生 | 0.25 |
| TriggerFired(break-getset/long-break-getset) | ./audio/break-getset.mp3 | 残り30秒でクロスフェード切替 | 0.25 |
| PomodoroAborted | ./audio/pomodoro-exit.mp3 | 手動停止時 | 1.0 |

**特殊ロジック**:
- long-break前のwork完了時: pendingWorkCompleteフラグで遅延判定し、congrats→ファンファーレが優先されるためwork完了音はスキップ
- break BGMクロスフェード: 3000msかけてbreak-chill→break-getsetにクロスフェード
- break終了時: 保存していた環境音プリセットを復元し、ループを停止

---

#### C-2. BGMクロスフェード

**手動テスト手順**:
1. Start Pomodoroをクリック
2. work→break遷移を待つ
3. break-chill.mp3のループ再生開始を確認
4. breakの残り30秒（デバッグタイマーではbreak開始直後）を待つ
5. break-chill.mp3がフェードアウトし、break-getset.mp3がフェードインすることを確認
6. クロスフェード時間は3000ms（3秒）

**確認内容**:
- フェードアウト: 現在のループのGainNodeが1.0→0.0に3秒かけて線形減衰
- フェードイン: 新しいループのGainNodeが0.0→1.0に3秒かけて線形増加
- 切替中に音声の途切れがない（同時再生期間がある）

---

#### C-3. 環境音プリセット再生

**手動テスト手順**:
1. 設定パネルを開く
2. VolumeControlのプリセットボタンをクリック（Rain / Forest / Wind / Silence）
3. 各プリセットに対応する環境音が再生されることを確認
4. Silenceを選択すると環境音が停止することを確認

**確認内容**:
- Rain: ブラウンノイズ+ローパスフィルタ（雨音を模擬）
- Forest: ホワイトノイズ+バンドパスフィルタ+LFO（虫の声を模擬）
- Wind: ピンクノイズ+ローパスフィルタ+LFO（風音を模擬）
- Silence: 全OscillatorNode停止
- 全てWeb Audio APIのプロシージャル生成（外部mp3ファイル不使用）

---

#### C-4. 音量制御・ミュート状態

**手動テスト手順**:
1. 設定パネルを開く
2. VolumeControlのボリュームセグメント（10段階）をクリック
3. 音量が変化することを確認
4. ミュートボタンをクリック
5. 音声が停止することを確認（AudioContext.suspend()）
6. 再度ミュートボタンをクリック
7. 音声が復帰することを確認（AudioContext.resume()）

**確認内容**:

ボリューム制御:
- 10個のセグメントspan要素で表示（i番目クリックで音量=(i+1)/10）
- 音量0〜volLevel-1のセグメントに`.on`クラス（塗りつぶし表示）
- 左矢印(◀): 0.1減少（最小0）
- 右矢印(▶): 0.1増加（最大1.0）
- MAX_GAIN=0.25でUI値をスケーリング（UI上1.0=実効0.25）
- 音量変更時にテストサウンド（./audio/test.mp3）が再生される

ミュート制御:
- ミュート時: スピーカーアイコンがX付きに変化、AudioContext.suspend()
- ミュート解除時: スピーカーアイコンが通常に復帰、AudioContext.resume()
- ミュート前の音量が保存され、解除時に復元される
- 音量が0以下になると自動ミュート、0超になると自動ミュート解除

---

#### C-5〜C-8. 天気エフェクト・背景スクロール

**手動テスト手順**:

雨エフェクト（C-5）:
1. 天気パネルでrainyを選択→Set
2. 650本のLineSegmentsによる残像付き雨粒が描画されることを確認
3. 地面到達時にスプラッシュパーティクル（リングバッファ最大200個）が発生することを確認

雪エフェクト（C-6）:
1. 天気パネルでsnowyを選択→Set
2. 750個のPointsによる雪粒が描画されることを確認
3. 各パーティクルがsin/cosでX/Z方向にゆらゆら揺れながら落下することを確認

雲エフェクト（C-7）:
1. 天気パネルで雲量を0〜5の各段階に設定
2. 密度に応じた雲数（0=なし〜5=overcast最大100個）が描画されることを確認
3. 雲がZ方向にゆっくりドリフトすることを確認

背景スクロール（C-8）:
1. ポモドーロを開始（march状態でスクロール=true）
2. 3チャンクの環境オブジェクトが進行方向にスクロールすることを確認
3. チャンクが視界外に出た際にリサイクル（先頭に再配置+regenerate()）されることを確認

---

#### C-9. 動的ライティング（20パターン）

**手動テスト手順**:
1. 天気パネルで4天気タイプ×4時間帯+autoの組み合わせを順に選択→Set
2. 各組み合わせでライティング・空色・霧が変化することを目視確認

**確認内容**:

20パターン（4天気×4時間帯+フォールバック）:

| 天気/時間帯 | morning | day | evening | night |
|-----------|---------|-----|---------|-------|
| sunny | 暖色朝焼け | 明るい青空 | オレンジ夕焼け | 暗い星空 |
| cloudy | 薄曇り朝 | グレー空 | 暗い夕曇り | 深い夜曇り |
| rainy | 暗い雨朝 | 灰色雨空 | 暗い雨夕 | 暗い雨夜 |
| snowy | 白い雪朝 | 明るい雪空 | 薄暗い雪夕 | 青白い雪夜 |

変化するパラメータ:
- 空色（scene.background）
- 霧（scene.fog.color, scene.fog.far）
- アンビエントライト（色・強度）
- ヘミスフィアライト（sky色・ground色・強度）
- ディレクショナルライト（色・強度・位置）
- 地面色
- 露出（renderer.toneMappingExposure）

---

#### C-10. キャラクターアニメーション描画

**手動テスト手順**:
1. 各状態（idle/wander/march/sit/sleep/happy/reaction/dragged/pet/refuse/feeding）への遷移を発生させる
2. FBXモデルのアニメーションが正しく再生されることを目視確認
3. crossFadeTo（0.3秒ブレンド）で滑らかに遷移することを確認

**確認内容（11状態×アニメーション）**:

| 状態 | アニメーション | FBXファイル | ループ |
|------|-------------|------------|--------|
| idle | idle | ms07_Idle.FBX | ○ |
| wander | walk | ms07_Walk.FBX | ○ |
| march | walk→run（終盤） | ms07_Walk.FBX→ms07_Run.FBX | ○ |
| sit | sit | ms07_Stunned.FBX | ○ |
| sleep | sleep | ms07_Die.FBX | ○ |
| happy | happy | ms07_Jump.FBX | ✗ |
| reaction | wave/attack2 | ms07_Attack_01/02.FBX | ✗ |
| dragged | idle | ms07_Idle.FBX | ○ |
| pet | happy | ms07_Jump.FBX | ○ |
| refuse | refuse/damage2 | ms07_Attack_01/Damage_02.FBX | ✗ |
| feeding | sit | ms07_Stunned.FBX | ○ |

---

#### C-11. システム通知の実表示

**手動テスト手順**:
1. 設定でBG Notify=ONにする
2. Start Pomodoroをクリック
3. アプリウィンドウを最小化またはフォーカスを外す（バックグラウンド化）
4. work完了を待つ
5. Windowsのシステム通知を確認
6. break完了を待つ
7. 通知を確認
8. 全サイクル完走後の通知を確認

**確認内容**:

| タイミング | タイトル | 本文 |
|-----------|---------|------|
| work完了 | 休憩の時間 | 作業お疲れ様でした |
| break完了 | 作業の時間 | 休憩終了、次の作業に取り掛かりましょう |
| ポモドーロ完了 | サイクル完了！ | ポモドーロサイクルが完了しました |

条件:
- `isEnabled()`=true（BG Notify=ON）かつ`!isFocused()`（バックグラウンド）の両方を満たす場合のみ通知
- long-break完了はPomodoroCompletedイベントでカバーされる（重複通知なし）
- congratsフェーズは内部遷移のため通知なし
- `app.setAppUserModelId()`が設定済みであること（Windows通知の前提条件）

---

#### C-12. バックグラウンド時のオーディオ抑制

**手動テスト手順**:
1. 環境音をRainに設定、音量を上げる
2. Start Pomodoroをクリック（work-start.mp3が再生される）
3. アプリウィンドウのフォーカスを外す
4. 環境音とSFXが停止/抑制されることを確認
5. アプリにフォーカスを戻す
6. 環境音が復帰することを確認

**確認内容**:

BG Audio=OFF時:
- blur時: `audio.setBackgroundMuted(true)` + `sfxPlayer.setBackgroundMuted(true)`
- AudioAdapter: `AudioContext.suspend()`でシステムリソース解放
- SfxPlayer: ループ停止 + `ctx.suspend()`、`play()`/`playLoop()`はミュート中早期リターン
- focus時: `setBackgroundMuted(false)`で復帰、`AudioContext.resume()`

BG Audio=ON時:
- blur/focus時にsetBackgroundMutedは呼ばれない
- 環境音・SFXはバックグラウンドでも継続再生

ユーザーミュートとの独立管理:
- ユーザーがミュートボタンで手動ミュートした状態は、BG Audio設定とは独立
- BG Audio=OFFでbackgroundMuted=trueの状態からfocusで復帰しても、ユーザーミュート状態は維持される
