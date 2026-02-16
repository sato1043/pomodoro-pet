# シーンチェンジ演出（暗転トランジション）設計

## 概要

free↔pomodoro、work↔breakのモード切替に映画的なシーンチェンジ演出（暗転フェードアウト→フェードイン）を導入する。

## 遷移フロー

```
現在の画面 → フェードアウト(350ms) → [画面暗転中にモード切替] → フェードイン(350ms) → 新しい画面
```

## DisplayScene — 表示シーンキー

AppSceneとPhaseTypeを結合したフラットなキー。遷移グラフの頂点。

```typescript
type DisplayScene = 'free' | 'pomodoro:work' | 'pomodoro:break' | 'pomodoro:long-break' | 'pomodoro:congrats'
```

## 宣言的シーン遷移グラフ (DISPLAY_SCENE_GRAPH)

すべてのシーンとその遷移ルールを1つの定数として宣言的に定義する。遷移判定はテーブルルックアップであり、条件分岐ロジックを持たない。

- `free → pomodoro:work`: blackout
- `pomodoro:work → pomodoro:break/long-break/congrats`: immediate（暗転なし）
- `pomodoro:break/long-break → pomodoro:work`: blackout
- `pomodoro:congrats → free`: blackout

## レイヤー分離

```
アプリケーション層: DisplayScene + DISPLAY_SCENE_GRAPH + DisplayTransitionState
  → シーン定義、遷移ルール（データ）、状態管理（テーブルルックアップ）

アダプター層: SceneTransition
  → 暗転レンダリング（DOM操作のみ）
```

## microtaskコアレシング

startPomodoro()は同期的にAppSceneChangedとPhaseStartedを連続発火する。queueMicrotaskで1回のflushにまとめることで、二重トランジションを防ぐ。

```
AppSceneChanged(pomodoro) → pendingTarget = 'pomodoro:work'
PhaseStarted(work)        → pendingTarget = 'pomodoro:work' (同値上書き)
→ microtask: 1回だけflush → blackout 1回
```

## ファイル構成

```
新規:
  src/application/app-scene/DisplayTransition.ts  — 型 + グラフ定数 + 状態クラス
  src/adapters/ui/SceneTransition.ts              — 暗転レンダリング（DOM）

変更:
  src/adapters/ui/TimerOverlay.ts                 — requestTransition + EventBus購読置換
```

## 全画面暗転

TimerOverlayだけでなく3Dシーン・キャラクターも含む全画面を覆う。`z-index: 10000`。
