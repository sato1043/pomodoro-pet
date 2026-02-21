# React移行とCSS方式の選定

## React導入の経緯と効果

### 移行前の課題

UI層は命令型DOM操作（`.ts`）で実装されていた。以下の問題があった。

- **イベントハンドリングの脆弱性**: `dangerouslySetInnerHTML`相当のinnerHTMLでSVGを注入すると、注入された要素はReactのファイバーツリー外になる。結果、親要素のonClickが子SVGのクリックで発火しないバグが発生した
- **状態管理の分散**: 各コンポーネントが独自にDOM参照・状態変数・setIntervalを管理しており、disposeの漏れやメモリリークのリスクがあった
- **テーマ・スタイル変更の波及管理が困難**: DOMの生成・更新・破棄をすべて手動で追跡する必要があった

### React化による改善

- **宣言的UI**: 状態→UIの写像が明確になり、状態変更時の更新漏れがなくなった
- **コンポーネントライフサイクルの自動管理**: useEffectのクリーンアップでsetInterval停止・EventBus購読解除が確実に行われる
- **イベント委譲の正常化**: JSX SVGコンポーネントはファイバーツリー内にあるため、onClickが正しく伝播する
- **依存注入の統一**: AppContext（React Context）で全依存を一元注入し、props drilling不要
- **ポータルによるDOM配置の柔軟性**: `createPortal`でdocument.bodyに直接配置しつつ、Reactのイベント伝播はコンポーネントツリーに従う

### 移行時に発見・修正した問題

| 問題 | 原因 | 対策 |
|------|------|------|
| pause/stopボタンが反応しない | innerHTML SVGがファイバーツリー外 | JSX SVGコンポーネントに置換 |
| sfxPlayer音量が同期されない | VolumeControlからsfx同期呼び出しの欠落 | syncSfx()関数を追加 |
| 3Dシーンへのクリックが透過しない | コンテナ全体にpointerEvents:'auto'を設定 | CSS側の個別pointer-events:autoに戻す |
| テキスト文字アイコンがWSL2で表示不可 | 絵文字フォント未インストール | インラインSVGコンポーネントに統一 |

---

## CSS方式の選定

### 現状の課題

- 単一の`timer-overlay.css`（現`overlay.css.ts`）にグローバルセレクタで全スタイルを定義
- PromptInputはインラインスタイルのみで、`::placeholder`・`:focus`・`:hover`等の擬似クラスが欠落
- ダークモード導入を予定しており、テーマ管理の仕組みが必要

### 評価した選択肢

#### 1. CSS Modules

- Viteビルトインサポート。追加ライブラリ不要
- `.module.css`にリネームするだけでスコープ自動化
- 学習コスト最低
- **欠点**: テーマ変数は手動のCSS Custom Propertiesで管理する必要があり、変数名のtypoや構造不一致がランタイムまで検出不可能

#### 2. ランタイムCSS-in-JS（styled-components, Emotion）

- styled-componentsは2025年3月にメンテナンスモード入り。新規採用非推奨
- EmotionはReact Server Components対応を断念
- ランタイムでスタイル生成するためパフォーマンスコストあり
- **結論: 不採用**

#### 3. vanilla-extract（ゼロランタイムCSS-in-JS）

- CSSプロパティ名・値をcsstype経由でコンパイル時に型チェック
- `createThemeContract()`でテーマ構造を型として定義し、ライト/ダークテーマ間の構造一致をコンパイル時に保証
- `recipe()`でバリアント型を自動導出（`RecipeVariants<typeof button>`）
- ゼロランタイム（ビルド時にCSSファイルを生成）
- `@vanilla-extract/vite-plugin`でVite統合

#### 4. Tailwind CSS

- ユーティリティファーストで高い生産性
- npm週間DL数で圧倒的1位（~3000万）
- **欠点**: ユーティリティクラス名の学習コスト。この規模のプロジェクトではオーバーキル。既存CSSの書き直しが大きい

### CSS Modules vs vanilla-extract の比較

| 観点 | CSS Modules | vanilla-extract |
|------|-------------|-----------------|
| CSSプロパティ名のtypo検出 | 不可（ランタイムで無効になるだけ） | コンパイル時エラー |
| CSSプロパティ値の検証 | 不可 | ユニオン型で検証 |
| テーマ構造の一致保証 | 不可（CSS変数名の文字列一致に依存） | `createThemeContract()`で型保証 |
| テーマ変数参照のtypo | 不可（`var(--my-colr)`が無効値になるだけ） | `vars.color.brand`でコンパイル時検出 |
| バリアント型安全性 | なし（clsx等で手動管理） | `recipe()` + `RecipeVariants`で自動導出 |
| 存在しないクラス名参照 | 不可（`Record<string,string>`型） | キーが厳密なユニオン型 |
| 擬似クラス対応 | CSS標準構文（OK） | TypeScript内でも型チェック付きで記述可能 |
| 学習コスト | 最低（CSSそのまま） | 中〜高（`style`, `recipe`, `sprinkles`等の独自API） |
| ランタイムコスト | ゼロ | ゼロ |
| Vite統合 | ビルトイン | プラグイン追加（`@vanilla-extract/vite-plugin`） |
| 動的スタイル | className文字列結合 | `createVar()` + `assignInlineVars()` |

### 選定結果: **vanilla-extract**

ダークモード導入により複数テーマの構造一致を保証する必要がある。CSS Modulesではテーマ変数管理が文字列依存になり、テーマ追加時（ハイコントラスト等）の構造不整合リスクが高い。vanilla-extractの`createThemeContract()`によるコンパイル時テーマ検証がこのリスクを排除する。

学習コストは高いが、テーマ管理の安全性と長期的な保守性が投資に見合う。

### 移行計画

1. `@vanilla-extract/css` + `@vanilla-extract/vite-plugin` を導入
2. テーマコントラクト定義（`theme.css.ts`）: カラー・スペーシング・フォント等
3. ライトテーマ・ダークテーマの値を定義
4. `timer-overlay.css`（現`overlay.css.ts`）をコンポーネント別の`.css.ts`に段階的に移行
5. PromptInputのインラインスタイルを`.css.ts`に移行（擬似クラス対応）
6. 動的スタイル（フェーズカラー・プログレス等）は`createVar()` + `assignInlineVars()`で対応
