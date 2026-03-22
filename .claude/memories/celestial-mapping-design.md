# 天球座標系とシーン座標系のマッピング設計

## 概要

3Dシーン内の天体（太陽・月）の表示位置とライティングを、天文学的に正確かつ視覚的に自然に描画するための座標系設計。天球座標系をThree.jsのシーン座標系から分離し、統一的な変換で全天体を一貫して配置する。

## 背景: なぜ座標系の分離が必要か

### 旧設計の問題

旧設計では`celestialToDirection(azimuth, altitude)`が天球の北（方位角0°）をThree.jsの-z方向にハードコードしていた。

```
旧: 天球北 = Three.js -z（固定）
```

この設計には3つの問題があった。

1. **カメラ視野との不一致** — カメラは-z方向（天球の北）を向くが、北半球では太陽は南の空にある。太陽は常にカメラの背後に位置し、画面に映らない
2. **アドホックなリマップ** — 月だけを画面内に表示するために個別の座標変換（`MOON_AZ_CENTER`, `MOON_AZ_RANGE`等）を適用していた
3. **座標系の混在** — 月の表示位置はリマップ済み座標、ライティング方向は実天球座標、月のフェーズテクスチャは月齢のみで決定。3つの座標系が混在し、月が黒く表示されるバグの原因となった

### 新設計の原則

天球座標系を独立した仮想モデルとして定義し、1つの変換関数で全天体をシーン座標に変換する。

```
新: 天球 → CelestialMapping（回転+圧縮） → Three.jsシーン
```

## 天球座標系

### 定義

天球座標系は天文学の地平座標系に基づく。

```typescript
interface CelestialCoordinate {
  azimuth: number   // 方位角（度）: 0=北, 90=東, 180=南, 270=西
  altitude: number  // 仰角（度）: -90〜+90
}
```

astronomy-engineが返す太陽・月の位置はこの座標系で表される。天球座標系はThree.jsの座標系とは完全に独立している。

### 天球上の天体配置

```
        北 (0°)
         |
西 (270°)─┼─ 東 (90°)
         |
        南 (180°)

太陽（北半球の場合）:
  日の出: 東（az≈90°）→ 南中: 南（az≈180°）→ 日没: 西（az≈270°）
  高度: 地平線（0°）→ 最大高度（季節による）→ 地平線（0°）

月:
  月の出〜月の入りも同様に東→南→西を移動
  ただし太陽との位置関係は月齢により異なる
```

## シーン座標系

### Three.jsの座標系

```
  +y（上）
   |
   |
   +------→ +x（画面右）
  /
 /
+z（カメラの後ろ = キャラクター進行方向）
```

- カメラは原点付近から-z方向を向く
- キャラクターは+z方向（カメラに向かって）に歩く
- -z方向が「画面の奥」

### 座標系の対応関係

```
天球          Three.jsシーン        画面上の位置
北 (az=0°)    +z方向               カメラの後ろ（不可視）
南 (az=180°)  -z方向               カメラ正面（画面中央奥）
東 (az=90°)   +x方向               画面右
西 (az=270°)  -x方向               画面左
天頂          +y方向               画面上
```

キャラクターの進行方向（+z）が天球の北に対応する。カメラは天球の南を向く。

## CelestialMapping: 天球→シーン変換

### 型定義

```typescript
interface CelestialMapping {
  viewDirection: number       // カメラが見ている天球方位（度）
  azimuthCompression: number  // 方位圧縮率
}
```

### デフォルト値

```typescript
const DEFAULT_CELESTIAL_MAPPING = {
  viewDirection: 180,        // カメラは天球の南を向く
  azimuthCompression: 0.5,   // 180°→90°に圧縮
}
```

### 変換関数

```typescript
function celestialToScene(coord, mapping) {
  const sceneAzDeg = (coord.azimuth - mapping.viewDirection) * mapping.azimuthCompression
  const altRad = coord.altitude * π / 180
  const azRad = sceneAzDeg * π / 180
  return {
    x: -cos(altRad) * sin(azRad),  // 東→+x, 西→-x
    y: sin(altRad),                  // 高度→+y
    z: -cos(altRad) * cos(azRad),   // 南→-z（カメラ正面）
  }
}
```

### viewDirection（視線方向）

`viewDirection=180`により、天球の南（方位角180°）がシーンの-z（カメラ正面）にマップされる。

```
viewDirection=180の場合:
  天球方位 → sceneAz = (az - 180) * compression
  南(180°) → sceneAz = 0°    → カメラ正面
  東(90°)  → sceneAz = -45°  → 画面右
  西(270°) → sceneAz = +45°  → 画面左
  北(0°)   → sceneAz = -90°  → 画面右端外
```

### azimuthCompression（方位圧縮）

実際の天球では東の地平線から西の地平線まで方位角180°（半天球）が見える。カメラのFOVは60°程度しかないため、方位を圧縮して画面内に収める。

```
圧縮なし（1.0）:  東(±90°)は画面外
圧縮 0.5:         東→西の180°が90°に圧縮。日の出/日没は±45°
圧縮 0.33:        東→西の180°が60°に圧縮。日の出/日没は±30°（FOV内）
```

現在の設定（compression=0.5, FOV=60°）では、日の出・日没位置（±45°）はFOV（±30°）をやや超えるが、南中付近の太陽と月は画面内に収まる。

### 統一変換の利点

全天体が同一の変換を通るため、以下が保証される。

- 太陽と月のシーン内相対位置が天球上の相対位置と一致する
- ライティング方向（DirectionalLight）が太陽の表示位置と一致する
- 月のフェーズテクスチャの明暗方向がシーン内の太陽方向と一致する

## 月の満ち欠け（月齢）

### 現象の仕組み

月は自ら発光せず、太陽光の反射で光って見える。月の見え方は**太陽・月・地球の位置関係**（離角）のみで決まる。

```
太陽光 →→→→→→→

        ● 月（常に太陽側の半球が照らされている）
       ╱
      ╱  ← 離角（太陽-地球-月の角度）
     ╱
    🌍 地球（観測者）
```

月は常に太陽に面した半球が明るい。地球からどの角度で見るかによって、明るい面がどれだけ見えるかが変わる。

### 離角と月の形

| 離角 (phaseDeg) | 名称 | 見え方 | 位置関係 |
|---|---|---|---|
| 0° | 新月 | 見えない | 太陽と同じ方向（太陽側の面が背を向ける） |
| 90° | 上弦 | 右半分が明 | 太陽の90°東（太陽側の面が横から見える） |
| 180° | 満月 | 全面が明 | 太陽の反対側（太陽側の面が正面を向く） |
| 270° | 下弦 | 左半分が明 | 太陽の90°西（上弦の反対側） |

月の公転周期は約29.5日（朔望月）。この周期で0°→360°を一周する。

### 月齢と候（七十二候）の関係

候は太陽の黄経（太陽暦）に基づく約5日間の区分。月の公転は太陽暦とは独立しているため、同じ候でも年によって月齢は異なる。候から月齢を一意に決定することはできない。

現在の実装では、astronomy-engineが現在時刻の実際の月齢（phaseDeg, illuminationFraction）を計算し、手動timeOfDay設定時もこの実月齢を引き継ぐ。

## 月の描画

### テクスチャ生成（MoonPhase.ts）

`generateMoonPhasePixels(phaseDeg, size, illumination, rotationRad)`が月面テクスチャを動的に生成する。

#### 球面terminator

明暗境界（terminator）は3D球面座標で計算する。2D平面の直線比較ではなく、球面の法線ベクトルを使うことで楕円形のterminatorが自然に得られる。

```typescript
// 球面terminator判定
// rnx: 太陽方向に回転済みのx座標
// nz: 球面のz座標（視点方向の深さ）
const terminatorValue = rnx * sin(phaseRad) - nz * cos(phaseRad)
// terminatorValue > 0 → lit, < 0 → dark
```

この式は全フェーズ（0°〜360°）で正しく動作する。

- 新月(0°): `rnx*0 - nz*1 = -nz < 0` → 全面暗
- 上弦(90°): `rnx*1 - nz*0 = rnx` → 右半分明（直線terminator）
- 満月(180°): `rnx*0 - nz*(-1) = nz > 0` → 全面明
- 中間角度: nzの影響で楕円形のterminator

#### テクスチャ回転（moonSunAngle）

`moonSunAngle`はシーン座標系での太陽→月方向を表す角度（ラジアン）。テクスチャの(nx, ny)座標をこの角度で回転させてからterminator判定に使うことで、明暗方向が太陽方向に一致する。

```typescript
const rnx = nx * cos(moonSunAngle) - ny * sin(moonSunAngle)
```

### メッシュ（MoonEffect.ts）

月はCircleGeometry（平面の円盤）で描画する。テクスチャ自体にリム暗化（球面の陰影）やマリア模様が含まれているため、平面メッシュでも3D球体の質感が得られる。

SphereGeometryを使わない理由: 2D円形テクスチャをSphereGeometryのUV（メルカトル的投影）に巻き付けると、赤道と極の歪みが生じる（蝶の羽状のアーティファクト）。

```typescript
const moonGeometry = new THREE.CircleGeometry(1.0, 64)
// lookAtでカメラに正対させる
moonMesh.lookAt(0, 0, 0)
```

## 関連ソースファイル

| ファイル | 役割 |
|---|---|
| `src/domain/environment/value-objects/CelestialMapping.ts` | 天球座標系の型定義、celestialToScene変換、computeMoonSunAngle |
| `src/domain/environment/value-objects/CelestialTheme.ts` | 天体位置→テーマパラメータ生成（celestialToScene使用） |
| `src/domain/environment/value-objects/MoonPhase.ts` | 月面テクスチャ生成（球面terminator、回転対応） |
| `src/infrastructure/three/MoonEffect.ts` | 月3Dオブジェクト（CircleGeometry、lookAt） |
| `src/infrastructure/astronomy/AstronomyAdapter.ts` | astronomy-engineラッパー（実天文データ取得） |
| `tests/domain/environment/CelestialMapping.test.ts` | CelestialMapping単体テスト（15件） |
