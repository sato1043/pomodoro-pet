# キャラクターアニメーション対応表

## モデル基本情報

- **モデル**: `./models/ms07_Wildboar.FBX`
- **テクスチャ**: `./models/ms07_Wildboar_1.png`
- **スケール**: 0.022
- **リソースパス**: `./models/`

## 状態→アニメーション対応（デフォルト）

STATE_CONFIGS準拠の基本マッピング。AnimationResolverのデフォルトリゾルバが使用する。

| 状態 | アニメーション名 | FBXファイル | ループ | 持続時間 | 説明 |
|------|---------------|------------|--------|---------|------|
| idle | idle | ms07_Idle.FBX | ○ | 5〜15秒 | 待機 |
| wander | walk | ms07_Walk.FBX | ○ | 3〜8秒 | ふらつき歩き（break/free時） |
| march | walk | ms07_Walk.FBX | ○ | 30〜60秒 | 前進（work時） |
| sit | sit | ms07_Stunned.FBX | ○ | 10〜30秒 | 座る |
| sleep | sleep | ms07_Die.FBX | ○ | 15〜60秒 | 寝る |
| happy | happy | ms07_Jump.FBX | ✗ | 2〜5秒 | 喜ぶ（ワンショット） |
| reaction | wave | ms07_Attack_01.FBX | ✗ | 2〜3秒 | クリック反応（ワンショット） |
| dragged | idle | ms07_Idle.FBX | ○ | ∞ | つかまれている |
| pet | pet | ms07_Jump.FBX | ○ | 3〜8秒 | 撫でられている |
| refuse | refuse | ms07_Attack_01.FBX | ✗ | 1.5〜2.5秒 | 行動拒否 |
| feeding | sit | ms07_Stunned.FBX | ○ | 3〜5秒 | 餌を食べている |

## 追加アニメーションクリップ（5本）

EnrichedAnimationResolverのルールにより、コンテキストに応じて使用される。

| クリップ名 | FBXファイル | 説明 |
|-----------|------------|------|
| run | ms07_Run.FBX | 走り |
| attack2 | ms07_Attack_02.FBX | 攻撃モーション2 |
| damage1 | ms07_Damage_01.FBX | 横によろめく |
| damage2 | ms07_Damage_02.FBX | 後ろにのけぞる |
| getUp | ms07_GetUp.FBX | 起き上がり |

## FBXファイル逆引き（11ファイル）

| FBXファイル | 使用される状態/ルール |
|------------|-------------------|
| ms07_Idle.FBX | idle, dragged |
| ms07_Walk.FBX | wander, march（デフォルト/中盤速め/疲労歩き） |
| ms07_Stunned.FBX | sit, feeding |
| ms07_Die.FBX | sleep, 夜眠そうリアクション |
| ms07_Jump.FBX | happy, pet, なつきhappy, 生産的happy |
| ms07_Attack_01.FBX | reaction（デフォルト）, refuse（デフォルト） |
| ms07_Run.FBX | march終盤加速, 祝賀走り |
| ms07_Attack_02.FBX | リアクション変種, 満腹拒否, 食べ過ぎ拒否 |
| ms07_Damage_01.FBX | クリック連打苛立ち |
| ms07_Damage_02.FBX | クリック連打怒り, 拒否変種 |
| ms07_GetUp.FBX | sleep→idle起き上がり |

## AnimationResolverシステム

### アーキテクチャ

```
UpdateBehaviorUseCase（毎フレーム）
  → BehaviorStateMachine.tick() — 状態遷移判定
  → stateChanged時: AnimationContext組立
  → EnrichedAnimationResolver(ctx) — ルールマッチング
  → ThreeCharacterHandle.playAnimation(selection) — アニメーション再生
```

### AnimationContext

| フィールド | 型 | ソース |
|-----------|---|--------|
| state | CharacterStateName | BehaviorStateMachine.currentState |
| previousState | CharacterStateName \| null | BehaviorStateMachine.previousState |
| presetName | CharacterBehavior | BehaviorStateMachine.currentPreset |
| phaseProgress | number (0.0〜1.0) | PomodoroStateMachine.phaseProgress |
| emotion | EmotionState? | EmotionService.state |
| interaction | InteractionHistory? | InteractionTracker.history |
| timeOfDay | TimeOfDay? | resolveTimeOfDay(hour) |
| todayCompletedCycles | number? | StatisticsService.getDailyStats(today) |

### EnrichedAnimationResolverルール一覧（優先順位順）

| # | ルール名 | 条件 | clipName | loop | speed |
|---|---------|------|---------|------|-------|
| 1 | fatigue-march | march + fatigue > 0.8 | walk | ○ | 0.8 |
| 2 | full-feeding-refuse | feeding + satisfaction > 0.9 | attack2 | ✗ | — |
| 3 | overfed-refuse | feeding + totalFeedingsToday >= 5 | attack2 | ✗ | — |
| 4 | click-spam-reaction | reaction + recentClicks >= 5 | damage2 | ✗ | — |
| 5 | click-irritation | reaction + recentClicks >= 3 | damage1 | ✗ | — |
| 6 | night-sleepy-reaction | reaction + night + affinity > 0.5 | sleep | ✗ | — |
| 7 | productive-happy-reaction | reaction + todayCompletedCycles >= 3 | happy | ✗ | — |
| 8 | march-late-run | march + phaseProgress > 0.7 | run | ○ | — |
| 9 | march-mid-speed | march + 0.3 < phaseProgress <= 0.7 | walk | ○ | 1.2 |
| 10 | reaction-variation | reaction + random < 0.5 | attack2 | ✗ | — |
| 11 | refuse-variation | refuse + random < 0.5 | damage2 | ✗ | — |
| 12 | getup-from-sleep | idle + previousState=sleep | getUp | ✗ | — |
| 13 | celebrate-run | happy + celebrate + random < 0.3 | run | ✗ | 1.2 |
| 14 | affinity-happy | idle + previousState≠sleep + affinity > 0.7 + random < 0.15 | happy | ✗ | — |
| — | デフォルト | 上記いずれにも該当しない | STATE_CONFIGS準拠 | — | — |

## 感情パラメータシステム

### EmotionState（3パラメータ）

| パラメータ | 範囲 | 初期値 | 永続化 |
|-----------|------|--------|--------|
| satisfaction | 0.0〜1.0 | 0.5 | ✗ |
| fatigue | 0.0〜1.0 | 0.0 | ✗ |
| affinity | 0.0〜1.0 | 0.0（永続化値から復元） | ○ |

### イベント効果

| イベント | satisfaction | fatigue | affinity |
|---------|-------------|---------|---------|
| fed | +0.15 | — | +0.05 |
| petted | — | — | +0.10 |
| pomodoro_completed | +0.20 | -0.10 | — |
| pomodoro_aborted | -0.10 | — | — |

### 自然変化（tickEmotion per ms）

| パラメータ | work中 | 非work時 |
|-----------|--------|---------|
| fatigue | +0.0000001 (25分で約+0.15) | -0.00000005 (回復) |
| satisfaction | 変化なし | -0.00000001 (緩やか減衰) |
| affinity | -0.000000001 (約16分で-0.001) | 同左 |

## アニメーションのテストについて

### ユニットテスト

ドメイン層・アプリケーション層は全カバレッジ100%。

- `AnimationResolver.test.ts` — デフォルトリゾルバが全11状態でSTATE_CONFIGS準拠
- `EnrichedAnimationResolver.test.ts` — 全16ルールの個別テスト+統合テスト。ランダム関数は注入で制御
- `EmotionState.test.ts` — 純粋関数テスト（イベント効果・自然変化・クランプ）
- `InteractionTracker.test.ts` — クリック3秒ウィンドウ・餌やり回数・resetDaily
- `BehaviorStateMachine.test.ts` — previousState追跡・march速度phaseProgress連動
- `PomodoroStateMachine.test.ts` — phaseProgressゲッター

### E2Eテストの課題

アニメーション変化はThree.js内部で完結しDOMに表れないため、Playwright標準手法では検証できない。

**検証不能な理由:**

1. `AnimationController.play(clipName)`の結果はWebGLレンダリングにのみ反映される。DOM属性・テキスト・CSSクラスとして露出しない
2. 16ルール中6つが`Math.random()`依存。E2E環境でシード固定する仕組みがない
3. 感情パラメータ（fatigue等）の蓄積が遅く、E2Eテスト実行時間に合わない

**対策: デバッグDOMインジケーター（方式A）**

`VITE_DEBUG_TIMER`有効時のみ、`#debug-animation-state`要素をdocument.bodyに追加し、内部状態をdata属性で公開する。

```html
<div id="debug-animation-state" style="display:none"
  data-clip-name="walk"
  data-emotion='{"satisfaction":0.5,"fatigue":0.1,"affinity":0.3}'
  data-recent-clicks="0"
  data-phase-progress="0.45"
  data-previous-state="idle">
</div>
```

これによりE2Eテスト可能になる項目:

| テスト項目 | 決定的? | アサート方法 |
|-----------|--------|------------|
| work終盤でrunクリップに切替 | ○ | `data-clip-name="run"`をポーリング待機 |
| クリック5連打でdamage2 | ○ | 5回クリック→`data-clip-name="damage2"` |
| sleep→idle時にgetUp | ○ | プロンプト「sleep」→タイムアウト→`data-clip-name="getUp"` |
| 餌やりでaffinity上昇 | ○ | 餌やり→`data-emotion`のaffinity > 0を検証 |
| marchのphaseProgress連動速度 | ○ | `data-phase-progress`の値変化を検証 |
| リアクションバリエーション | ✗ | ランダム依存のため不可 |
| affinity永続化 | ○ | settings.jsonの`emotion.affinity`をファイル読み込みで検証 |

**注意:** デバッグインジケーターはプロダクションビルドには含まれない（`VITE_DEBUG_TIMER`未設定時は生成されない）。

### フェイクタイマーが使えない理由

Playwright 1.45+の`page.clock` APIは`Date`・`setTimeout`・`setInterval`・`requestAnimationFrame`・`performance.now()`を制御できるが、このアプリでは実用上困難である。

| 依存箇所 | 問題 |
|----------|------|
| `THREE.Clock` | `performance.now()`ベース。フェイク化するとdelta計算が壊れるか、手動フレーム送りが必要 |
| `requestAnimationFrame` | レンダリングループの駆動源。フェイク化すると自然に発火せず`clock.runFor(16)`の繰り返しが必要 |
| `AnimationMixer` | rAFのdeltaに依存。フレーム送りタイミング次第でアニメーション遷移が不安定化 |
| Web Audio API | 内部タイマーが独立しており`page.clock`では制御不能 |
| `setInterval`(1秒) | バックグラウンドタイマー。rAFとの二重tick制御が崩れる |

WebGL + Web Audio を含むアプリではフェイクタイマーは不向きである。`VITE_DEBUG_TIMER`によるタイマー短縮方式が実時間ベースで全パイプラインが正常動作するため、現行アプローチが最適である。

## 設定箇所

- `src/main.ts` — FBXConfig定義（13アニメーション）、AnimationResolver/EmotionService/InteractionTracker初期化・接続
- `src/domain/character/value-objects/CharacterState.ts` — 状態設定（持続時間・遷移ルール）
- `src/domain/character/services/EnrichedAnimationResolver.ts` — アニメーション選択ルール定義
- `src/domain/character/value-objects/EmotionState.ts` — 感情パラメータの変化率定義
- `src/application/settings/AppSettingsService.ts` — affinity永続化（settings.json）
