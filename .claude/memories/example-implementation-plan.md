**重要**: このファイルは実装計画策定時の参考資料として保存している。実作業時に変更対象にしないこと

通知機能 実装計画                                      
 ==========

 Context

 ポモドーロタイマーにシステム通知機能を追加する。

 課題: アプリがバックグラウンドのとき、フェーズ完了をユーザーに伝える手段がない
 解決: バックグラウンド時にシステム通知を発行し、代わりにSFXを抑制する

 ユーザー要件:
 - フォアグラウンド: 通知不要（画面+SFXで自明）
 - バックグラウンド: システム通知を発行、SFXは鳴らさない
 - 通知タイミング: フェーズ完了時 + サイクル完了時
 - 通知音: システム設定に従う（Electron Notification の silent デフォルト = false）
 - 設定UI: FreeTimerPanelの展開時にON/OFFトグル
 - 設定永続化: settings.json に含める

 方針

 概要

 1つの設定「通知ON/OFF」で以下の挙動を切替える:

 ┌──────────────────┬───────────────────────┬───────────────────────────────┐
 │       状態       │        通知ON         │            通知OFF            │
 ├──────────────────┼───────────────────────┼───────────────────────────────┤
 │ フォアグラウンド │ SFX再生、通知なし     │ SFX再生、通知なし             │
 ├──────────────────┼───────────────────────┼───────────────────────────────┤
 │ バックグラウンド │ SFX抑制、システム通知 │ SFX再生、通知なし（現行動作） │
 └──────────────────┴───────────────────────┴───────────────────────────────┘

 アーキテクチャ配置

 application層
 ├─ NotificationBridge (新規) — EventBus購読 → 通知発行判定
 ├─ TimerSfxBridge (変更) — shouldPlaySfx コールバック追加
 └─ AppSettingsService (変更) — notification設定の追加

 adapters層
 └─ ui/FreeTimerPanel.tsx (変更) — 通知ON/OFFトグルUI

 infrastructure層（なし — Electron Notification IPCで完結）

 desktop/
 ├─ main/index.ts (変更) — notification:show IPCハンドラ
 └─ preload/index.ts (変更) — showNotification API公開

 1. Electron Notification IPC

 desktop/main/index.ts — IPCハンドラ追加

 import { Notification } from 'electron'

 ipcMain.handle('notification:show', (_event, options: { title: string; body: string }) => {
   if (Notification.isSupported()) {
     new Notification({ title: options.title, body: options.body }).show()
   }
 })

 desktop/preload/index.ts — contextBridge拡張

 showNotification: (title: string, body: string): Promise<void> =>
   ipcRenderer.invoke('notification:show', { title, body })

 src/electron.d.ts — 型定義追加

 interface ElectronAPI {
   platform: string
   loadSettings(): Promise<Record<string, unknown> | null>
   saveSettings(settings: Record<string, unknown>): Promise<void>
   showNotification(title: string, body: string): Promise<void>  // 追加
 }

 2. NotificationBridge（アプリケーション層）

 src/application/notification/NotificationBridge.ts (新規)

 TimerSfxBridgeと同じEventBus購読パターン。

 export interface NotificationPort {
   show(title: string, body: string): void
 }

 export function bridgeTimerToNotification(
   bus: EventBus,
   notification: NotificationPort,
   isEnabled: () => boolean,
   isFocused: () => boolean
 ): () => void

 購読イベントと通知内容:

 ┌───────────────────────┬────────────────┬────────────────────────────────────────┐
 │       イベント        │  通知タイトル  │                通知本文                │
 ├───────────────────────┼────────────────┼────────────────────────────────────────┤
 │ PhaseCompleted(work)  │ 休憩の時間     │ 作業お疲れ様でした                     │
 ├───────────────────────┼────────────────┼────────────────────────────────────────┤
 │ PhaseCompleted(break) │ 作業の時間     │ 休憩終了、次の作業に取り掛かりましょう │
 ├───────────────────────┼────────────────┼────────────────────────────────────────┤
 │ PomodoroCompleted     │ サイクル完了！ │ ポモドーロサイクルが完了しました       │
 └───────────────────────┴────────────────┴────────────────────────────────────────┘

 スキップするイベント:
 - PhaseCompleted(long-break) → PomodoroCompletedでカバー（重複防止）
 - PhaseCompleted(congrats) → 内部遷移、通知不要

 判定ロジック:
 function shouldNotify(): boolean {
   return isEnabled() && !isFocused()
 }

 3. TimerSfxBridge変更

 src/application/timer/TimerSfxBridge.ts — 5番目のオプション引数を追加

 export function bridgeTimerToSfx(
   bus: EventBus,
   sfx: SfxPlayer,
   config: Partial<TimerSfxConfig> = {},
   audioControl?: AudioControl,
   shouldPlaySfx?: () => boolean  // 新規追加
 ): () => void

 各sfx.play()/sfx.playLoop()呼び出し前に判定:
 if (shouldPlaySfx && !shouldPlaySfx()) return

 後方互換: shouldPlaySfx未指定時は常に再生（現行動作）。

 4. AppSettingsService拡張

 src/application/settings/AppSettingsService.ts

 export interface NotificationConfigInput {
   readonly enabled: boolean
 }

 変更箇所:
 - currentNotification: NotificationConfigInput 状態追加（デフォルト { enabled: true }）
 - notificationConfig getter追加
 - updateNotificationConfig(input) メソッド追加
 - loadFromStorage() に通知設定の復元追加（テーマ→音声→通知→タイマーの順）
 - saveAllToStorage() に第4引数 notification 追加
 - resetToDefault() に通知設定のリセット追加

 src/application/settings/SettingsEvents.ts — イベント型追加

 | { type: 'NotificationLoaded'; notification: NotificationConfigInput; timestamp: number }

 settings.json 拡張:
 {
   "timer": { ... },
   "sound": { ... },
   "theme": "system",
   "notification": { "enabled": true }
 }

 IPC層（preload/main）は Record<string, unknown> で通信するため変更不要。

 5. useSettingsEditorフック変更

 src/adapters/ui/hooks/useSettingsEditor.ts

 - notificationEnabled state追加（settingsService.notificationConfig.enabledから初期化）
 - スナップショットに notificationEnabled を含める
 - confirm() で settingsService.updateNotificationConfig({ enabled: notificationEnabled }) 呼び出し
 - toggle() のスナップショット復元で通知設定も復元
 - SettingsEditorResult に notificationEnabled と setNotificationEnabled を追加

 6. FreeTimerPanel設定UI

 src/adapters/ui/FreeTimerPanel.tsx — FreeSettingsEditor内

 テーマ選択ボタンの直下に通知トグルを配置:

 [System] [Light] [Dark]        ← Theme
        [Notify ON/OFF]         ← 新規
 [Rain] [Forest] [Wind] [Silence]
 [speaker] [◄] [■■■■■□□□□□] [►]
 [           Set           ]

 テーマボタンと同じスタイル（themePreset）を再利用。選択中はactiveクラス。

 src/adapters/ui/styles/free-timer-panel.css.ts — 必要に応じてスタイル追加

 7. main.ts初期化

 src/main.ts

 // NotificationPort実装
 const notificationPort: NotificationPort = {
   show: (title, body) => window.electronAPI?.showNotification(title, body)
 }

 // NotificationBridge初期化
 bridgeTimerToNotification(
   bus,
   notificationPort,
   () => settingsService.notificationConfig.enabled,
   () => document.hasFocus()
 )

 // TimerSfxBridgeにshouldPlaySfx注入
 const shouldPlaySfx = () => {
   if (settingsService.notificationConfig.enabled && !document.hasFocus()) {
     return false
   }
   return true
 }

 bridgeTimerToSfx(bus, sfxPlayer, {
   breakChillGain: 0.25,
   breakGetsetGain: 0.25
 }, audio, shouldPlaySfx)

 変更ファイル一覧

 ┌───────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────┐
 │                         ファイル                          │                       変更内容                       │
 ├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ desktop/main/index.ts                                     │ notification:show IPCハンドラ追加                    │
 ├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ desktop/preload/index.ts                                  │ showNotification API追加                             │
 ├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ src/electron.d.ts                                         │ ElectronAPI.showNotification 型追加                  │
 ├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ src/application/notification/NotificationBridge.ts        │ 新規: EventBus購読→通知発行                          │
 ├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ src/application/timer/TimerSfxBridge.ts                   │ shouldPlaySfx オプション引数追加                     │
 ├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ src/application/settings/AppSettingsService.ts            │ 通知設定の追加（状態/getter/update/load/save/reset） │
 ├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ src/application/settings/SettingsEvents.ts                │ NotificationLoaded イベント型追加                    │
 ├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ src/adapters/ui/hooks/useSettingsEditor.ts                │ 通知設定のstate/snapshot/confirm追加                 │
 ├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ src/adapters/ui/FreeTimerPanel.tsx                        │ 通知ON/OFFトグルUI追加                               │
 ├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ src/adapters/ui/styles/free-timer-panel.css.ts            │ 通知セクションのスタイル追加（必要に応じて）         │
 ├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ src/main.ts                                               │ NotificationBridge初期化、shouldPlaySfx注入          │
 ├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ tests/application/notification/NotificationBridge.test.ts │ 新規: 通知Bridgeのテスト                             │
 ├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ tests/application/timer/TimerSfxBridge.test.ts            │ shouldPlaySfx関連テスト追加                          │
 ├───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ tests/application/settings/AppSettingsService.test.ts     │ 通知設定関連テスト追加                               │
 └───────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────┘

 テスト計画

 NotificationBridge.test.ts（新規）

 - バックグラウンド+有効時: PhaseCompleted(work)で通知発行
 - バックグラウンド+有効時: PhaseCompleted(break)で通知発行
 - バックグラウンド+有効時: PomodoroCompletedで通知発行
 - バックグラウンド+有効時: PhaseCompleted(long-break)では通知しない
 - フォアグラウンド時: 通知しない
 - 無効時: 通知しない
 - 解除関数で購読解除

 TimerSfxBridge.test.ts（追加）

 - shouldPlaySfx未指定: 既存テスト全パス（後方互換）
 - shouldPlaySfx=false: SFX再生しない
 - shouldPlaySfx=true: SFX再生する

 AppSettingsService.test.ts（追加）

 - 初期状態で通知設定enabled=true
 - updateNotificationConfigで値が変更される

 検証

 1. npx tsc --noEmit — 型チェック
 2. npm test — 全テストパス（既存+新規）
 3. 動作確認:
   - 通知ON → アプリを最小化 → ポモドーロ実行 → work完了時にシステム通知が出る、SFXは鳴らない
   - 通知OFF → アプリを最小化 → work完了時にSFXが鳴る、通知は出ない
   - 設定のスナップショット/復元: 通知ON/OFF変更後、Setを押さずに閉じると復元される
   - 設定永続化: 通知ON/OFFがsettings.jsonに保存・復元される

__END__