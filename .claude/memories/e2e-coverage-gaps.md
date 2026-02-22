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
