# FBXモデル導入ノウハウ

## 静的アセット配信

electron-viteでFBX等のバイナリアセットをrendererに配信するには `publicDir` を使う。

```ts
// electron.vite.config.ts
renderer: {
  root: 'src',
  publicDir: '../assets',  // assets/ をpublicディレクトリに指定
}
```

- dev: Vite devサーバーが `assets/` 配下を `/` として配信する
- build: `out/renderer/` に全ファイルがコピーされる
- FBXLoaderは `/models/ファイル名.FBX` でアクセスできる

## テクスチャが表示されない問題

### 原因
FBXファイル内部のテクスチャ参照が `.psd`（Photoshop形式）を指している場合がある。
Three.jsのFBXLoaderは `.psd` を読み込めないためテクスチャが欠落する。

### 確認方法
```bash
strings -n 10 model.FBX | grep -i -E '\.psd|\.png|\.jpg|filename'
```

### 解決策
FBX読み込み後にテクスチャを手動で差し替える。

```ts
const texture = new THREE.TextureLoader().load('/models/texture.png')
texture.colorSpace = THREE.SRGBColorSpace
group.traverse((child) => {
  if (child instanceof THREE.Mesh) {
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const mat of materials) {
      if (mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshStandardMaterial) {
        mat.map = texture
        mat.color.set(0xffffff)      // FBXLoaderが暗い色を設定するのをリセット
        mat.emissive?.set(0x000000)   // 自己発光もリセット
        mat.needsUpdate = true
      }
    }
  }
})
```

### 色が暗くなる問題
- FBXLoaderはマテリアルの `color` を暗い値（灰色〜黒）で設定することがある
- テクスチャと `color` は乗算されるため、全体が暗くなる
- `mat.color.set(0xffffff)` で白にリセットするとテクスチャ本来の色になる

## FBXLoaderのresourcePath

テクスチャの相対パス解決に `setResourcePath` を使用する。

```ts
const loader = new FBXLoader()
loader.setResourcePath('/models/')  // テクスチャをこのパスから探す
```

## スケール

- FBXモデルはcm単位が多い（Mixamo等）。Three.jsはm単位のため `0.01` が基本
- モデルによって異なるため目視で調整が必要
- 今回のモデル（ms07_Wildboar）は `0.03` が適切だった

## アニメーションマッピング

ペット行動に対して、利用可能なアニメーションFBXを意味的に近いもので割り当てる。

| ペット状態 | アニメーションクリップ名 | 割当FBX | 理由 |
|-----------|----------------------|---------|------|
| idle | idle | ms07_Idle.FBX | 待機 |
| wander | walk | ms07_Walk.FBX | 歩行 |
| sit | sit | ms07_Stunned.FBX | うずくまりに近い |
| sleep | sleep | ms07_Die.FBX | 横たわりに近い |
| happy | happy | ms07_Jump.FBX | 跳ねる≒喜び |
| reaction | wave | ms07_Attack_01.FBX | リアクション動作 |
| dragged | idle | ms07_Idle.FBX | 掴まれ中 |

専用アニメーションがない状態は、視覚的に近い別アニメーションで代用する。

## 複数テクスチャPNG

同梱の `ms07_Wildboar_1.png` 〜 `_6.png` はカラーバリエーション（色違いスキン）。
`main.ts` で `diffuseTexturePath` を変更すれば切り替え可能。
