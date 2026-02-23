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

## カバー済み項目（78テスト / 13ファイル）

| ファイル | テスト数 | カバー範囲 |
|---------|---------|-----------|
| smoke.spec.ts | 3 | 起動・タイトル・Start Pomodoroボタン存在 |
| free-mode.spec.ts | 10 | 設定パネル開閉・ボタン選択・スナップショット復元・BG設定・Set確定・About画面 |
| free-display.spec.ts | 4 | 時刻AM/PM表示・タイムラインW/Bセグメント・設定サマリー・終了時刻表示 |
| pomodoro-flow.spec.ts | 4 | Start→WORK表示・Pause/Resume・Stop・タイマー完走→Congrats→free復帰 |
| pomodoro-detail.spec.ts | 7 | サイクル進捗ドット・インタラクションロック・全フェーズ遷移順序(celebrate/joyful-rest含む)・統計パネル値・affinity永続化・fatigue自然変化・バックグラウンドタイマー |
| settings-ipc.spec.ts | 11 | electronAPI存在・settings.json永続化（タイマー/BG/天気/雲量/テーマ）・再起動復元 |
| weather-panel.spec.ts | 10 | パネル開閉・天気タイプ/時間帯切替・雲量・リセット・スナップショット・排他表示 |
| button-visibility.spec.ts | 5 | 初期全表示・設定/統計/天気パネル時の排他制御・順次開閉復帰 |
| stats-panel.spec.ts | 4 | パネル開閉・Statistics見出し・排他表示 |
| fureai-mode.spec.ts | 4 | Entry→overlay表示・テキスト確認・ボタン排他・Exit→free復帰 |
| prompt-input.spec.ts | 6 | プロンプト入力欄表示・walk→wander・座れ→sit・sleep→sleep・空文字無視・Sendボタン送信 |
| theme.spec.ts | 2 | colorScheme即時反映・スナップショット復元 |
| animation-state.spec.ts | 8 | デバッグインジケーター存在・初期状態・感情初期値・プリセット切替(march-cycle/rest-cycle/autonomous)・phaseProgress・satisfaction加算 |

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
| 6 | 雨エフェクト | LineSegments（650本）+スプラッシュパーティクル |
| 7 | 雪エフェクト | Points（750個）+sin/cosゆらぎ落下 |
| 8 | 雲エフェクト | SphereGeometry群の6段階密度+ドリフト |
| 9 | 背景スクロール | 3チャンクリサイクル |
| 10 | 動的ライティング | 4天気×4時間帯の20パターン（ambient/hemisphere/sun） |
| 11 | キャラクターアニメーション描画 | AnimationMixer+crossFadeToによるメッシュ変形 |

#### B-3. OS依存

| # | 項目 | 内容 |
|---|------|------|
| 12 | システム通知の実表示 | Electron Notification APIがOS通知を発行。表示確認はOS依存 |

## 補足: デバッグインジケーターで検証可能な範囲

`#debug-animation-state`が公開するdata属性:

| 属性 | テスト済み | 未テスト（Three.js操作が前提） |
|------|----------|----------------------------|
| data-state | idle, march, wander, sit, sleep | happy, reaction, dragged, pet, refuse, feeding |
| data-preset-name | autonomous, march-cycle, rest-cycle, celebrate, joyful-rest | fureai-idle |
| data-clip-name | idle | walk, run, sit, sleep, happy, wave, attack2, damage1, damage2, getUp |
| data-phase-progress | >0の確認 | 特定範囲（0.3超、0.7超）でのアニメーション切替連動 |
| data-emotion | 初期値, satisfaction>0.5, fatigue>0 | affinity変化（操作手段がキャンバス内） |
| data-interaction-locked | true（work中） | — |
| data-recent-clicks | — | キャラクタークリックが前提 |
| data-total-feedings-today | — | 餌やり操作が前提 |
| data-previous-state | — | 特定遷移パターン（sleep→idle→getUpなど） |

## まとめ

| 分類 | 項目数 |
|------|--------|
| カバー済み | 78テスト / 13ファイル |
| テスト困難（Three.jsキャンバス操作） | 7項目 |
| テスト不可能（DOM外で完結） | 12項目 |

E2Eテストは **UIレイアウト・パネル制御・設定永続化・タイマーフロー（完走含む）・全フェーズ遷移・プリセット切替・感情パラメータ・プロンプト入力・インタラクションロック・統計値・affinity永続化・バックグラウンドタイマー** をカバーしている。未カバー項目はThree.jsキャンバス内操作またはWeb Audio API / WebGL / OS通知依存であり、E2Eテストの技術的限界に起因する。これらはドメイン層・アプリケーション層のユニットテスト（カバレッジ100%）で補完されている。

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
| 雨 | LineSegments 650本 + スプラッシュ（リングバッファ最大200個） |
| 雪 | Points 750個 + sin/cosゆらぎ落下 |
| 雲 | SphereGeometry群、6段階密度（0=none〜5=overcast最大100個） |
| 背景スクロール | 3チャンクリサイクル（視界外でregenerate()） |

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

#### B-9. バックグラウンドオーディオ抑制

BG Audio=OFF時: blur→`AudioContext.suspend()`でリソース解放、focus→`resume()`で復帰。ユーザーミュートとは独立管理。タイマー継続自体はE2Eテスト済み（pomodoro-detail.spec.ts）。
