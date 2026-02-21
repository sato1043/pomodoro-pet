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

## イベント分離によるトランジション管理

startPomodoro()は同期的にAppSceneChangedとPhaseStartedを連続発火する。SceneRouter（AppSceneChanged購読）とOverlayPomodoro（PhaseStarted購読）がそれぞれ独立したコンポーネントで処理するため、microtaskコアレシングは不要。startPomodoro時のblackout midpoint内でScenePomodoroがマウントされ、OverlayPomodoroはuseState初期化で正しいフェーズを取得する。

## ファイル構成

```
アプリケーション層:
  src/application/app-scene/DisplayTransition.ts  — 型 + グラフ定数 + 状態クラス

アダプター層:
  src/adapters/ui/SceneRouter.tsx       — AppSceneChanged購読 + シーン間blackout
  src/adapters/ui/OverlayPomodoro.tsx   — PhaseStarted購読 + イントラ・ポモドーロblackout
  src/adapters/ui/SceneTransition.tsx   — 暗転レンダリング（DOM）
```

## SceneTransitionの2インスタンス共存

SceneRouter（シーン間）とOverlayPomodoro（イントラ・ポモドーロ）がそれぞれSceneTransitionを所有する。両方ともportalでdocument.bodyに描画される（z-index: 10000）。同時発火しない設計: SceneRouterはAppSceneChanged時、OverlayPomodoroはPhaseStarted時に発火する。

## 全画面暗転

SceneTransitionは3Dシーン・キャラクターも含む全画面を覆う。`z-index: 10000`。
