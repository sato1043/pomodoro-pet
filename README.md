pomodoro-pet v0.1.0
==========

3Dバーチャルペット型ポモドーロタイマー（STEAM公開を目指す）

- アーキテクチャ

クリーンアーキテクチャ（依存方向: 外→内のみ）

domain ← application ← adapters ← infrastructure

3つのドメインコンテキスト: タイマー, キャラクター, 環境
モジュール間通信はEventBus（Pub/Sub）で疎結合

- 技術スタック: TypeScript + Electron + Three.js + Vite

- 素材の入手先
    - https://downraindc3d.itch.io/wildboar
 
__END__