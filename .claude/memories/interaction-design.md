# インタラクション設計

## 概要

キャラクターとのインタラクションは3種類ある。

| インタラクション | ジェスチャー | キャラクター状態 |
|---|---|---|
| クリック | キャラクター上でクリック | reaction |
| 摘まみ上げ | 押しながら上方向に移動 | dragged |
| 撫でる | 押しながら左右にストローク | pet |

## 関連ソースファイル

| ファイル | 役割 |
|---|---|
| `src/domain/character/services/GestureRecognizer.ts` | ジェスチャー判定純粋ロジック |
| `src/domain/character/services/BehaviorStateMachine.ts` | `InteractionKind`型定義と状態遷移 |
| `src/domain/character/value-objects/CharacterState.ts` | `pet`状態の設定（animationClip, duration等） |
| `src/adapters/three/ThreeInteractionAdapter.ts` | マウスイベント→ジェスチャー判定→状態遷移の統合 |
| `src/application/character/InterpretPromptUseCase.ts` | プロンプトからのpet遷移キーワード |

## ジェスチャー判定フロー

```
mousedown on character → pending状態
  ↓ mousemove
  ├─ Y方向が閾値(8px)超 かつ Y > |X| → drag確定 → drag_start
  ├─ X方向のピークから閾値(6px)以上逆行 → pet確定 → pet_start
  └─ 閾値未達 → pending継続
  ↓ mouseup
  ├─ drag確定済み → drag_end + 落下アニメーション
  ├─ pet確定済み → pet_end → idle復帰
  └─ pending → click（reaction）として処理
```

## GestureRecognizer設計

### 基本原則

- **先着確定方式**: 最初に閾値を超えたジェスチャーが確定する
- **確定後は不変**: `kind !== 'pending'` なら `update()` は確定済みの `kind` を返し続ける。確定後に別のジェスチャーに切り替わることはない
- **Three.js/DOM非依存**: 純粋関数としてドメイン層に配置。テスト可能

### 方向転換検出アルゴリズム（ピーク追跡方式）

```
1. 最初に petThresholdX(6px) 以上X方向に移動 → direction確定、peakX記録
2. 同方向の移動が続く → peakX更新
3. peakXから petThresholdX 以上逆行 → directionChanges++、direction反転、peakX更新
4. directionChanges >= petDirectionChanges(1回) → pet確定
```

始点からの累積deltaXの符号変化ではなく、ピーク位置からの逆行を検出する方式を採用した。理由は、始点を跨がなくても「右に10px→左に6px」のようなストロークで方向転換を自然に検出できるためである。

### ドラッグ判定の方向優勢条件

```typescript
// ドラッグ判定: Y方向が閾値超過 かつ Y方向がX方向より優勢
if (deltaY > dragThresholdY && deltaY > Math.abs(deltaX))
```

`deltaY > Math.abs(deltaX)` 条件がないと、左右ストローク中に上方向に微小にドリフトした場合（8px超）、pet方向転換検出よりも先にdrag判定が成立してしまう。Y方向がX方向より優勢なときのみdragを確定させることで、ストローク中の誤判定を防ぐ。

### 設定値

| パラメータ | デフォルト値 | 意味 |
|---|---|---|
| `dragThresholdY` | 8px | ドラッグ判定のY方向閾値 |
| `petThresholdX` | 6px | 撫でる判定のストローク閾値 |
| `petDirectionChanges` | 1回 | pet確定に必要な方向転換回数 |

## InteractionKind型

```typescript
type InteractionKind =
  | 'click' | 'hover'
  | 'drag_start' | 'drag_end'
  | 'pet_start' | 'pet_end'
```

将来のインタラクション追加時はこの型にリテラルを追加する。

## pet状態の設計

### dragged vs pet

| 性質 | dragged | pet |
|---|---|---|
| タイムアウト | しない（`maxDurationMs: Infinity`） | する（3-8秒） |
| tick()免除 | あり | なし |
| プロンプト遷移 | 拒否 | 許可 |
| scrolling | false | false |

### keepAlive()によるタイムアウト延長

`pet` 状態は有限の持続時間（3-8秒）を持つ。プロンプト経由のpetはタイムアウト後にidleに遷移する。

インタラクション由来のpetでは、mousemoveのたびに `stateMachine.keepAlive()` を呼び `elapsedMs` を0にリセットする。撫でている間はタイムアウトしない。mouseupで `pet_end` が発火し明示的にidleに遷移する。

### アニメーション

- FBXモデル: `ms07_Jump.FBX`（happyと同じFBX）を `pet` 名で登録
- PlaceholderCharacter: 左右に小さく揺れる専用アニメーション
- 将来pet専用FBXを用意したとき、`animationPaths.pet` のパスを差し替えるだけで済む

## ThreeInteractionAdapterの状態管理

```typescript
type InteractionMode = 'none' | 'pending' | 'drag' | 'pet'
```

旧実装の `isDragging: boolean` から `interactionMode` に変更した。将来のインタラクション追加時はこの型にモードを追加する。

clickイベントリスナーは削除し、mouseupのpendingパスがclick処理を担う。

## 拡張ガイド

新しいインタラクション（例: tickle, poke）を追加する手順:

1. `CharacterStateName` + `STATE_CONFIGS` にリテラル追加
2. `InteractionKind` にリテラル追加（例: `'tickle_start' | 'tickle_end'`）
3. `GestureKind` に判定結果を追加し、`update()` に判定ロジックを実装
4. `TIMEOUT_TRANSITIONS` にエントリ追加
5. `BehaviorStateMachine.transition()` の interaction ケースに分岐追加
6. `ThreeInteractionAdapter` の `InteractionMode` に新モードを追加し、mousemove/mouseupの分岐を追加
7. PlaceholderCharacter + FBX `animationPaths` にアニメーション追加
8. テスト追加（GestureRecognizer, BehaviorStateMachine, InterpretPrompt）
