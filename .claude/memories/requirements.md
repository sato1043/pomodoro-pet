# 要件定義: ポモドーロタイマー

## 最終目的
STEAMに公開可能なポモドーロタイマーアプリをTypeScriptで開発する

## コンセプト
3Dキャラクターが自律的に行動するバーチャルペット型ポモドーロタイマー

## 機能要件と実装状況

### 1. ポモドーロタイマー — 実装済
- 作業25分 / 休憩5分のサイクル
- タイマーUI（Start/Pause/Reset、MM:SS表示）
- 作業→休憩の自動遷移、サイクルカウント

### 2. 3Dキャラクター — 実装済
- FBXモデル（ms07_Wildboar）導入済、テクスチャPNG手動適用
- プレースホルダーキャラクター（FBX読み込み失敗時のフォールバック）
- AnimationControllerによるcrossFadeブレンド

### 3. キャラクター行動AI — 実装済
- 7状態ステートマシン: idle, wander, sit, sleep, happy, reaction, dragged
- 自律行動: idle→wander→sit→idle循環（タイムアウト自動遷移）
- プロンプト入力: 英語/日本語キーワードマッチング（LLM不使用）
- フォールバック: 未知テキスト→idle

### 4. キャラクターインタラクション — 実装済
- Raycasterベースのヒットテスト
- ホバー: カーソルpointerに変化
- クリック: reactionアニメーション再生
- ドラッグ&ドロップ: 地面平面上でマウス追従移動（±9範囲clamp）

### 5. 環境音 — 実装済
- Web Audio APIによるプロシージャル生成（外部mp3不要）
- プリセット: Rain, Forest, Wind, Silence
- 音量スライダー、ミュートトグル

### 6. 環境映像 — 未実装（nice-to-have）

### 7. 環境生成 — 実装済
- 地面40x40、木12本、草300本（InstancedMesh）、岩5個、花20個
- 霧（Fog）、ACESFilmicToneMapping、PCFSoftShadowMap

### 8. タイマー↔キャラクター連携 — 実装済
- 作業開始→sit、作業完了→happy、休憩開始→idle、リセット→idle

## 非機能要件
- プラットフォーム: Windows
- デスクトップアプリ: Electron
- electron-builder NSIS設定済
- 将来Steam公開対応（steamworks.js統合可能な構造）
