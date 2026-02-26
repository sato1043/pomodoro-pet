# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-27

### Added
- ポモドーロタイマー（work/break/long-break/congratsフェーズ遷移、一時停止/再開/中止）
- キャラクター行動システム（自律行動、march/rest/celebrateプリセット、インタラクション）
- ふれあいモード（餌やりドラッグ＆ドロップ、プロンプト入力、ハートエフェクト）
- 感情パラメータ（satisfaction/fatigue/affinity、イベント反応、affinity永続化）
- 統計機能（日別記録、13週間ヒートマップ、期間別集計）
- 天気設定（sunny/cloudy/rainy/snowy、雲量6段階、時間帯4種+auto、天気エフェクト描画）
- サウンドシステム（環境音プリセット、タイマーSFX、Break BGM、ボリューム/ミュート制御）
- バックグラウンド対応（タイマー継続、オーディオ抑制、システム通知）
- テーマ切替（System/Light/Dark）
- 設定永続化（settings.json/statistics.json、Electron IPC経由）
- ライセンス管理（ハートビートAPI、JWT RS256検証、registered/trial/expired/restricted 4モード）
- ライセンスモード別機能制限（ENABLED_FEATURESマップ、LicenseContext、UI制限適用）
- 自動アップデート（electron-updater、チェック/ダウンロード/インストール、通知バナー）
- ライセンス登録UI（Registration Panel、Download Key入力）
- デバッグ支援（VITE_DEBUG_TIMER、VITE_DEBUG_LICENSE、DevTools自動起動、E2Eインジケーター）
- 無限スクロール背景（6チャンク配置、リサイクル、EnvironmentThemeルックアップ）
- シーン遷移（free/pomodoro/fureai、ブラックアウトトランジション）
- About/EULA/Privacy Policy/Third-party Licenses表示
- 法的文書（PolyForm Noncommercial 1.0.0、CLA、CONTRIBUTING、PRIVACY_POLICY）
