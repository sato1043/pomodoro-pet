# 環境シーンのバリエーション — 設計ドキュメント

環境シーンシステムの全体設計を記述する。Phase 1-3およびPhase 5.5（全9サブフェーズ）は実装済み。

## Phase構成

| Phase | 内容 | 状態 |
|---|---|---|
| Phase 1 | EnvironmentChunkのプリセット化基盤 | 完了 |
| Phase 2 | シーンプリセット追加（meadow/seaside/park） | 完了 |
| Phase 3 | 時間帯遷移のlerp補間 | 完了 |
| ~~Phase 4~~ | ~~天気API連携 autoWeather~~ | Phase 5.5fに統合 |
| ~~Phase 5~~ | ~~時間帯に応じた影の向き~~ | Phase 5.5cに統合 |
| Phase 5.5 | 天文計算ベース環境シミュレーション（9サブフェーズ） | 完了 |

---

## アーキテクチャとファイルマップ

### ドメイン層

| ファイル | 役割 |
|---|---|
| `src/domain/environment/value-objects/ScenePreset.ts` | ScenePresetName型、ScenePreset値オブジェクト、3プリセット定義 |
| `src/domain/environment/value-objects/WeatherConfig.ts` | WeatherConfig値オブジェクト、WeatherType/TimeOfDay/CloudDensityLevel型 |
| `src/domain/environment/value-objects/EnvironmentTheme.ts` | EnvironmentThemeParams型、THEME_TABLE（16テーマ）、seasideオーバーライド |
| `src/domain/environment/value-objects/SceneConfig.ts` | ChunkSpec型、SceneConfig型 |
| `src/domain/environment/value-objects/ThemeLerp.ts` | ThemeTransitionState型、lerp/smoothstep補間関数群 |

### アプリケーション層

| ファイル | 役割 |
|---|---|
| `src/application/settings/AppSettingsService.ts` | 天気設定の読み書き・永続化・WeatherConfigChangedイベント発行 |
| `src/application/settings/SettingsEvents.ts` | WeatherConfigChanged等の設定変更イベント定義 |
| `src/application/environment/ThemeTransitionService.ts` | テーマ遷移の状態管理・tick駆動の補間実行 |
| `src/application/environment/EnvironmentCoordinator.ts` | 環境設定シーンのcoordinator。enter/exit + WeatherPreviewOpenイベント発行 |

### インフラ層

| ファイル | 役割 |
|---|---|
| `src/infrastructure/three/EnvironmentChunk.ts` | チャンク生成・グラウンドメッシュ・デコレーター適用 |
| `src/infrastructure/three/ChunkDecorator.ts` | ChunkDecoratorインターフェース・createChunkDecoratorファクトリ |
| `src/infrastructure/three/decorators/MeadowDecorator.ts` | 草原装飾（木・草・岩・花） |
| `src/infrastructure/three/decorators/SeasideDecorator.ts` | 海岸装飾（水面・泡・椰子の木・貝殻） |
| `src/infrastructure/three/decorators/ParkDecorator.ts` | 公園装飾（歩道・街灯・ベンチ・植え込み・広葉樹） |
| `src/infrastructure/three/CloudEffect.ts` | 雲エフェクト（6段階密度・天気色・クロスフェード） |
| `src/infrastructure/three/RainEffect.ts` | 雨エフェクト（LineSegments残像+スプラッシュ） |
| `src/infrastructure/three/SnowEffect.ts` | 雪エフェクト（sin/cosゆらゆら揺れ） |
| `src/infrastructure/three/MoonEffect.ts` | 3D月オブジェクト（満ち欠けテクスチャ+グロー+水平線フェード） |
| `src/infrastructure/three/EnvironmentBuilder.ts` | 環境構築の統合エントリーポイント |

### アダプター層

| ファイル | 役割 |
|---|---|
| `src/adapters/ui/WeatherPanel.tsx` | 天気設定UI（Weather/Cloud/Time/Scene選択） |
| `src/adapters/ui/WeatherButton.tsx` | environmentシーン遷移ボタン（freeモードに配置） |
| `src/adapters/ui/SceneFree.tsx` | freeモードの3Dシーン統合（WeatherButtonクリックでenvironmentシーンに遷移） |
| `src/adapters/ui/EnvironmentContext.tsx` | 環境パラメータのReact Context一元管理（climate/currentKou/solarAltitude/isDaytime/timezone/kouDateRanges）。KouDateRangesComputedEvent購読でkouDateRangesを更新 |
| `src/adapters/ui/hooks/useResolvedTheme.ts` | ThemePreference→ResolvedTheme解決（system/light/dark/auto） |

### テスト（実装済み）

| ファイル | 対象 |
|---|---|
| `tests/domain/environment/ScenePreset.test.ts` | ScenePreset値オブジェクト |
| `tests/domain/environment/WeatherConfig.test.ts` | WeatherConfig値オブジェクト |
| `tests/domain/environment/EnvironmentTheme.test.ts` | テーマ解決ロジック |

### Phase 5.5 追加ファイル（想定）

**ドメイン層**:

| ファイル | 役割 |
|---|---|
| `src/domain/environment/value-objects/SolarPosition.ts` | SolarPosition型、LunarPosition型、AstronomyPortインターフェース |
| `src/domain/environment/value-objects/Kou.ts` | KouDefinition型（phaseNameEn/phaseNameJa含む）、KOU_DEFINITIONS定数（72候）、SOLAR_TERMS（`readonly [string, string][]`和英ペアタプル配列）、PHASES（`readonly [KouPhase, string, string][]`トリプルタプル配列）、resolveKou()、kouProgress() |
| `src/domain/environment/value-objects/ClimateData.ts` | ClimateConfig型、KouClimate型、MonthlyClimateData型、ClimateGridPortインターフェース、KoppenClassification型、interpolateToKouClimate()、estimateTemperature()、classifyKoppen()（ケッペン気候区分30分類算出） |
| `src/domain/environment/value-objects/WeatherDecision.ts` | WeatherDecision型、decideWeather()、computeParticleCount() |
| `src/domain/environment/value-objects/CelestialTheme.ts` | computeThemeFromCelestial()（月データ5フィールド計算含む）、computeLightDirection()（月光intensity係数0.8） |
| `src/domain/environment/value-objects/MoonPhase.ts` | generateMoonPhasePixels() — 月位相テクスチャ生成純粋関数（Three.js非依存） |
| `src/domain/environment/value-objects/Terminator.ts` | TerminatorResult型、getSubSolarPoint()、getTerminatorPoints()、buildTerminatorPolygon() |
| `src/domain/environment/value-objects/Timezone.ts` | resolveTimezone()（tz-lookupラッパー+TZ_BOUNDARY_OVERRIDES境界補正）、getLocationTime()、formatTimezoneLabel()。timezone-abbr.json参照 |

**アプリケーション層**:

| ファイル | 役割 |
|---|---|
| `src/application/environment/EnvironmentSimulationService.ts` | 統合シミュレーション駆動。tick()で天体位置取得→パラメータ生成→遷移。KouDateRange型、computeKouDateRanges()で年間全72候の開始日を天文計算（searchSunLongitude連鎖探索）。kouDateRangesゲッター。KouDateRangesComputedEventをEventBusで発行 |

**インフラ層**:

| ファイル | 役割 |
|---|---|
| `src/infrastructure/astronomy/AstronomyAdapter.ts` | astronomy-engineラッパー。AstronomyPort実装（太陽+月） |
| `src/infrastructure/climate/ClimateGridAdapter.ts` | `createClimateGridAdapter(data: ClimateGridJson)` — ビルド時バンドルJSONデータ注入。双線形補間・海洋スナッピング。NASA POWER mm/day→mm/month変換。ClimateGridPort実装 |
| `scripts/generate-climate-grid.ts` | NASA POWER APIから5度格子気候データを生成 → `assets/data/climate-grid.json` |
| `scripts/generate-timezone-abbr.ts` | tz-lookup全座標スキャン+system tzdataでTZ略称マッピング生成 → `assets/data/timezone-abbr.json`（386エントリ）。Argentina `-03`→`ART`ポストプロセス |

**アダプター層**:

| ファイル | 役割 |
|---|---|
| `src/adapters/ui/SceneEnvironment.tsx` | environmentシーンコンテナ。WeatherPanel+KouSelector+WorldMapModal+EnvironmentExitButtonを統合。内部状態`view: 'weather' | 'worldMap'`で表示切替 |
| `src/adapters/ui/EnvironmentExitButton.tsx` | environmentモードからfreeモードへの戻るボタン |
| `src/adapters/ui/WorldMapModal.tsx` | 世界地図SVGモーダル。terminator描画・都市ピン・クリック選択 |
| `src/adapters/ui/KouSelector.tsx` | 七十二候セレクタ。SceneEnvironmentのweatherビュー内で表示。カレンダー日付範囲形式ドロップダウン+Autoボタン |
| `src/adapters/ui/OverlayTitle.tsx` | フリーモード日付ヘッダ。currentKou propで節気名+候位相を日本語表示（例: `小寒 初候　3/10 Tue`） |

**アセット・スクリプト**:

| ファイル | 役割 |
|---|---|
| `assets/climate/grid-data.json` | 5度解像度の全球気候グリッドデータ |
| `assets/data/coastline-path.json` | Natural Earth 110m海岸線SVGパス（パブリックドメイン） |
| `scripts/download-climate-data.ts` | WorldClim GeoTIFFダウンロード+ダウンサンプル+JSON出力 |

**テスト（想定）**:

| ファイル | 対象 |
|---|---|
| `tests/domain/environment/Kou.test.ts` | 候解決ロジック |
| `tests/domain/environment/ClimateData.test.ts` | グリッド補間・候按分・気温推定 |
| `tests/domain/environment/WeatherDecision.test.ts` | 天気決定ロジック |
| `tests/domain/environment/CelestialTheme.test.ts` | 天体→テーマ変換（月光ブースト・moonPosition含む） |
| `tests/domain/environment/MoonPhase.test.ts` | 月位相テクスチャ生成 |
| `tests/domain/environment/Terminator.test.ts` | 昼夜境界線計算 |

---

## 実装済み: Phase 1-3

### 型定義

#### ScenePreset

```typescript
type ScenePresetName = 'meadow' | 'seaside' | 'park'

interface ScenePreset {
  readonly name: ScenePresetName
  readonly chunkSpec: ChunkSpec
}
```

#### WeatherConfig

```typescript
type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy'
type TimeOfDay = 'morning' | 'day' | 'evening' | 'night'
type CloudDensityLevel = 0 | 1 | 2 | 3 | 4 | 5

interface WeatherConfig {
  readonly weather: WeatherType
  readonly timeOfDay: TimeOfDay
  readonly autoWeather: boolean
  readonly autoTimeOfDay: boolean
  readonly cloudDensityLevel: CloudDensityLevel
  readonly scenePreset: ScenePresetName
}
```

#### EnvironmentThemeParams

```typescript
interface EnvironmentThemeParams {
  readonly skyColor: number          // hex (0xRRGGBB)
  readonly fogColor: number
  readonly fogNear: number
  readonly fogFar: number
  readonly ambientColor: number
  readonly ambientIntensity: number  // 0.0-1.0
  readonly hemiSkyColor: number
  readonly hemiGroundColor: number
  readonly hemiIntensity: number
  readonly sunColor: number
  readonly sunIntensity: number
  readonly sunPosition: { readonly x: number; readonly y: number; readonly z: number }
  readonly groundColor: number
  readonly exposure: number
}
```

#### ChunkSpec

```typescript
interface ChunkSpec {
  readonly width: number
  readonly depth: number
  readonly treeCount: number
  readonly grassCount: number
  readonly rockCount: number
  readonly flowerCount: number
}
```

### テーマ解決

THEME_TABLE: 4天気 x 4時間帯 = 16パターンのEnvironmentThemeParamsをルックアップテーブルで定義。

seasideプリセットには追加オーバーライドあり:
- SEASIDE_GROUNDテーブルで天気別砂浜色を定義
- sky/fog色を25%明度アップ（lightenColor）
- exposure x1.25, sunIntensity x1.2, ambientIntensity x1.15

### ChunkDecorator

`createChunkDecorator(presetName)` ファクトリで3種のデコレーターを生成。各デコレーターはChunkSpecの配置カウントに基づいてThree.jsオブジェクトを生成・配置する。

| プリセット | 装飾要素 |
|---|---|
| meadow | 針葉樹・草（InstancedMesh）・岩・花（4色） |
| seaside | 水面・波打ち際泡（12セグメント）・椰子の木（放物線幹+ピンナ付き葉）・貝殻（8個） |
| park | 歩道（中央1.5m幅）・広葉樹・ベンチ・街灯（4m間隔等間隔）・植え込み/花壇（歩道脇沿い） |

### 天気エフェクト

| エフェクト | 粒子数 | 主要パラメータ |
|---|---|---|
| 雲 (CloudEffect) | 0-100個（密度6段階） | Y: 5-8m, ドリフト0.3m/s, 球体3-6個/雲, 密度変更時2sクロスフェード |
| 雨 (RainEffect) | 650本 + splash 200 | 落下8m/s, 残像0.2m, splash寿命0.3s |
| 雪 (SnowEffect) | 750個 | 落下1.5m/s, 左右揺れ振幅0.8m, 周波数0.5-1.5Hz |

全エフェクトは `fadeIn(durationMs)` / `fadeOut(durationMs)` でopacityフェード対応。

### 3D月オブジェクト (MoonEffect)

| パラメータ | 値 |
|---|---|
| ジオメトリ | SphereGeometry(1.0, 32, 32), scale 3.0 |
| 配置距離 | celestialToDirection(azimuth, altitude) × 50（fog無効） |
| テクスチャ | Canvas 128×128、generateMoonPhasePixels()で動的更新 |
| グロー | BackSide半透明球（scale 1.3×月球体）、色0xaabbdd、opacity=0.15×moonOpacity×moonIllumination |
| 水平線フェード | altitude -2°〜+5°で0→1 |
| 天気減衰 | MOON_WEATHER_DIMMING: sunny=1.0, cloudy=0.4, rainy=0.1, snowy=0.1 |
| テクスチャ更新閾値 | phaseDeg差<1° かつ illumination差<0.01 のときスキップ |

月データはEnvironmentThemeParamsの5フィールド（moonPosition, moonPhaseDeg, moonIllumination, moonIsVisible, moonOpacity）として30秒間隔のlerp補間パイプラインを通過する。applyThemeToScene()内でmoonEffect.update(params)が呼ばれる。

#### 月光照明ブースト

| パラメータ | 旧値 | 新値 |
|---|---|---|
| DirectionalLight intensity（夜間月光係数） | frac × 0.4 | frac × 0.8 |
| nightAmbientIntensity | lerp(0.05, 0.25) | lerp(0.08, 0.40) |
| nightExposure | lerp(0.05, 0.3) | lerp(0.08, 0.45) |
| 地面色（夜間） | 気温ベース固定 | moonBrightness×0.3でMOONLIGHT_COLOR方向にブレンド |

#### フィルライト（補助照明）

キャラクターの顔を最低限照らす補助DirectionalLight。主照明が弱い夜間でもキャラクターが真っ黒にならないようカメラ方向から常時照射。

| パラメータ | 値 |
|---|---|
| 色 | 0xb0c4de（ライトスチールブルー） |
| 位置 | (0, 2, 5) — カメラ正面やや上 |
| castShadow | false |
| intensity | exposureに応じて動的調整 |

**動的intensity計算**:
```
dayNightT = clamp(1 - exposure / 1.2, 0, 1)
fillTarget = 0.01 + (0.60 - 0.01) * dayNightT
intensity = min(fillTarget / max(exposure, 0.05), 5.0)
```

| シーン | exposure | fillTarget | intensity | 実効照度 |
|---|---|---|---|---|
| 昼間 | 1.2 | 0.01 | 0.008 | 0.01 |
| 満月の夜 | 0.45 | 0.37 | 0.82 | 0.37 |
| 新月の夜 | 0.08 | 0.56 | 5.0(上限) | 0.40 |

#### 月位相テクスチャ生成 (MoonPhase.ts)

ドメイン層の純粋関数。`generateMoonPhasePixels(phaseDeg, size, illumination) → Uint8ClampedArray`。

- phaseDegからterminator曲線（明暗境界）を球面座標で算出
- リムライト効果（エッジ暗化）
- マリア模様（sin関数による簡易パターン）
- ソフトエッジアルファ（外周10%でフェードアウト）
- 暗部は完全黒ではなく微かに可視（darkSide = 0.03 × brightness × 255）

### ThemeLerp補間

- `smoothstep(t)`: 3t^2 - 2t^3
- `lerpThemeParams(from, to, t)`: EnvironmentThemeParamsの全フィールドを一括補間（色はRGB成分別、vec3は各軸別）
- autoTimeOfDay遷移: 5000ms
- 手動切替: 1500ms
- 補間中の割り込みは中間値から新目標へシームレスに再補間

### WeatherPanel UI

4行構成:
1. **Scene行**: meadow/seaside/park のSVGアイコンボタン3つ
2. **Weather行**: sunny/cloudy/rainy/snowy のアイコンボタン4つ + Auto（天気アイコンと排他選択）
3. **Cloud行**: 0-5段階のセグメントバー + Resetボタン（autoWeather時disabled）
4. **Time行**: morning/day/evening/night のアイコンボタン4つ + Autoトグル（autoWeatherと独立動作）

ドラフトstate + Setボタン方式（プレビュー → 確定/スナップショット復元）。

### 設定永続化

settings.jsonの`weather`オブジェクト:

```json
{
  "weather": {
    "weather": "sunny",
    "timeOfDay": "day",
    "autoWeather": false,
    "autoTimeOfDay": false,
    "cloudDensityLevel": 1,
    "scenePreset": "meadow"
  }
}
```

復元時の検証: 各フィールドを型チェックし、不正値はデフォルトにフォールバック。

### 統合シーケンス

**起動時**:
1. AppSettingsService.loadFromStorage() で settings.json 復元
2. WeatherConfigChanged イベント発行
3. resolveEnvironmentTheme(weather, timeOfDay, scenePreset) → EnvironmentThemeParams
4. createChunkDecorator(scenePreset) → デコレーター決定
5. CloudEffect.setDensity(cloudDensityLevel) + setWeatherColor(weather)
6. WeatherEffect (rain/snow) fadeIn/fadeOut

**ユーザー操作時（WeatherPanel）**:
1. ボタンクリック → draftState更新 → applyConfig()
2. settingsService.updateWeatherConfig(partial) → WeatherConfigChanged イベント
3. ThemeTransitionService.transitionTo(target, 1500ms)
4. scenePreset変更時: EnvironmentChunk.regenerate()
5. エフェクト更新: fadeIn/fadeOut

---

## 未実装: Phase 5.5 — 天文計算ベース環境シミュレーション

旧Phase 4（天気API連携）と旧Phase 5（影の向き）をPhase 5.5に統合する。外部天気APIに依存せず、astronomy-engineによるローカル天文計算と気候定数テーブルの組み合わせで環境を連続的にシミュレートする。

### Phase統合の経緯

| 旧Phase | 吸収先 | 理由 |
|---|---|---|
| Phase 4（天気API連携） | Phase 5.5f | 外部API不要。気候定数+確率的天気決定で代替 |
| Phase 5（影の向き） | Phase 5.5c | 太陽方位角・高度角の計算が5.5aで実現されるため |

### サブフェーズ構成

| サブフェーズ | 内容 | 依存 |
|---|---|---|
| 5.5a | 天文計算基盤 — astronomy-engine導入、太陽位置（高度角・方位角・黄経）+ 月位置（高度角・方位角・月齢・照度）計算 | なし |
| 5.5b | 天体→明るさ — 日中は太陽高度角、夜間は月齢+月高度からexposure/sunIntensity/skyColor/月光色等を連続生成 | 5.5a |
| 5.5c | 天体→光源の向き — 日中は太陽、夜間は月の方位角+高度角からDirectionalLightを連動。薄明時はクロスフェード | 5.5a |
| 5.5d | 七十二候解決 — 太陽黄経5度刻みで現在の候を特定。本朝七十二候の候名・説明を定義 | 5.5a |
| 5.5e | 気候プロファイル — WorldClim全球グリッドデータ(5度解像度)同梱、任意の緯度経度から72候分気候データを自動生成 | 5.5d |
| 5.5f | 天気自動決定 — 気候データから天気タイプ・雨量・雪判定を確率的に決定。autoWeather実装 | 5.5e |
| 5.5g | 雨量連動 — 降水量→RainEffect/SnowEffect粒子数可変 | 5.5f |
| 5.5h | 七十二候UI表示 — 現在の候名をUIに表示、候変更イベント発火 | 5.5d |
| 5.5i | 世界地図UI — SVG世界地図+昼夜境界線+プリセット都市+クリック座標選択 | 5.5a, 5.5e |

### 設計概要図

```
[astronomy-engine]                     [全球気候グリッドデータ]
 太陽: 高度角・方位角・黄経             WorldClim 5度解像度
 月:   高度角・方位角・月齢・照度       任意の緯度経度→双線形補間
 (リアルタイム連続計算)                 → 72候分KouClimateに按分
       |                                     |
       v                                     v
 ┌─────────────────────────────────────────────────┐
 │        EnvironmentSimulationService              │
 │                                                  │
 │  1. 太陽黄経  → 現在の候              (5.5d)    │
 │  2. 候+気候   → 気温推定              (5.5e)    │
 │  3. 気候+気温 → 天気決定+降水量        (5.5f)    │
 │  4. 太陽高度角+天気 → 日中の明るさ     (5.5b)    │
 │  5. 月齢+月高度+天気 → 夜間の明るさ    (5.5b)    │
 │  6. 天体方位角 → 光源の向き/影         (5.5c)    │
 │  7. 降水量   → エフェクト粒子数       (5.5g)    │
 └─────────────────────────────────────────────────┘
       |                              |           |
       v                              v           v
 EnvironmentThemeParams          WeatherEffects  [七十二候UI]
 (連続値)                       (雨/雪粒子数)   候名・説明 (5.5h)

 [世界地図UI] → 緯度経度の選択 (5.5i)
```

---

### 5.5a: 天文計算基盤

#### 依存ライブラリ

[astronomy-engine](https://github.com/cosinekitty/astronomy) (MIT, npm: `astronomy-engine`)
- TypeScript対応（`.ts` ソース + `.d.ts` 同梱）
- 太陽関連: `SunPosition()`, `Horizon()`, `SearchSunLongitude()`, `Seasons()`, `EclipticLongitude()`
- 月関連: `MoonPhase()`, `Illumination()`, `Equator()`, `SearchRiseSet()`

#### AstronomyPort（ドメイン層ポート）

```typescript
/** 太陽位置の計算結果 */
interface SolarPosition {
  readonly altitude: number     // 高度角 (度, -90〜+90。正=地平線上、負=地平線下)
  readonly azimuth: number      // 方位角 (度, 0〜360。北=0, 東=90, 南=180, 西=270)
  readonly eclipticLon: number  // 黄経 (度, 0〜360。春分点=0)
}

/** 月位置の計算結果 */
interface LunarPosition {
  readonly altitude: number              // 高度角 (度, -90〜+90)
  readonly azimuth: number               // 方位角 (度, 0〜360)
  readonly phaseDeg: number              // 月齢角度 (0=新月, 90=上弦, 180=満月, 270=下弦)
  readonly illuminationFraction: number  // 照度割合 (0.0=新月, 1.0=満月)
  readonly isAboveHorizon: boolean       // 地平線上にあるか
}

/** 天文計算のポートインターフェース（ドメイン層で定義、インフラ層で実装） */
interface AstronomyPort {
  /** 指定日時・緯度経度での太陽位置を返す */
  getSolarPosition(date: Date, latitude: number, longitude: number): SolarPosition

  /** 指定日時・緯度経度での月位置を返す */
  getLunarPosition(date: Date, latitude: number, longitude: number): LunarPosition

  /** 太陽黄経が指定値に達する日時を探索する（候の境界日時の計算用） */
  searchSunLongitude(targetLon: number, startDate: Date, limitDays: number): Date | null
}
```

#### AstronomyAdapter（インフラ層実装）

astronomy-engineをラップしてAstronomyPortを実装する。

```typescript
// インフラ層
import {
  Body, EclipticLongitude, Equator, Horizon, Illumination,
  MakeObserver, MakeTime, MoonPhase, SearchSunLongitude
} from 'astronomy-engine'

function createAstronomyAdapter(): AstronomyPort {
  return {
    getSolarPosition(date, latitude, longitude) {
      const time = MakeTime(date)
      const observer = new Observer(latitude, longitude, 0)
      const sunEq = Equator(Body.Sun, time, observer, true, true)
      const sunHor = Horizon(time, observer, sunEq.ra, sunEq.dec, 'normal')
      const ecl = SunPosition(time)
      return { altitude: sunHor.altitude, azimuth: sunHor.azimuth, eclipticLon: ecl.elon }
    },
    getLunarPosition(date, latitude, longitude) {
      const time = MakeTime(date)
      const observer = new Observer(latitude, longitude, 0)
      const moonEq = Equator(Body.Moon, time, observer, true, true)
      const moonHor = Horizon(time, observer, moonEq.ra, moonEq.dec, 'normal')
      const phaseDeg = MoonPhase(time)
      const illum = Illumination(Body.Moon, time)
      return {
        altitude: moonHor.altitude,
        azimuth: moonHor.azimuth,
        phaseDeg,
        illuminationFraction: illum.phase_fraction,
        isAboveHorizon: moonHor.altitude > 0,
      }
    },
    searchSunLongitude(targetLon, startDate, limitDays) {
      const time = MakeTime(startDate)
      const result = SearchSunLongitude(targetLon, time, limitDays)
      return result ? result.date : null
    }
  }
}
```

注: astronomy-engine v2.1.19 の型定義（`astronomy.d.ts`）で確認済みのAPI:
- `HorizontalCoordinates`: `.altitude`（高度角）、`.azimuth`（方位角）
- `IlluminationInfo`: `.phase_fraction`（照度割合 0-1）、`.phase_angle`（位相角）、`.mag`（視等級）
- `MoonPhase()` → `number`: 0〜360度（新月=0, 満月=180）
- `EclipticLongitude()` → `number`: 0〜360度
- `SiderealTime()` → `number`: 0〜24時間（グリニッジ視恒星時）

#### AstronomyAdapter非ポートヘルパー

5.5i（世界地図terminator）で必要な太陽赤緯・グリニッジ時角を取得する関数。AstronomyPortインターフェースには含めず、AstronomyAdapter内部のヘルパーとして実装する。

```typescript
import { Body, Equator, MakeTime, Observer, SiderealTime } from 'astronomy-engine'

/** 太陽赤緯とグリニッジ時角を返す（terminator計算用） */
function getSolarDeclinationAndGHA(date: Date): { declination: number; gha: number } {
  const time = MakeTime(date)
  const observer = new Observer(0, 0, 0)  // 地心
  const sunEq = Equator(Body.Sun, time, observer, true, true)

  const declination = sunEq.dec  // 赤緯 (度)

  // グリニッジ時角 = (グリニッジ恒星時 - 太陽赤経) * 15度/時
  const gst = SiderealTime(time)  // グリニッジ恒星時 (時)
  const gha = ((gst - sunEq.ra) * 15 + 360) % 360  // 度

  return { declination, gha }
}
```

WorldMapModal.tsxから直接呼び出す。ポートを経由しない理由: terminator計算はUI表示専用であり、ドメインロジックではないため。

---

### 5.5b: 天体→明るさ

太陽高度角と月の情報から連続的にEnvironmentThemeParamsの明るさ関連パラメータを導出する。天気タイプ（5.5fで決定済み）を入力として受け取り、天気による減衰を適用する。

#### 高度角と環境の対応

```
altitude (度)     状態            既存TimeOfDayとの対応
───────────────────────────────────────────────────
> 30°              フル日照        day
10° 〜 30°         朝夕の中間光    morning/evening (遷移域)
0° 〜 10°          薄明            morning/evening (低角度)
-6° 〜 0°          市民薄明        夕暮れ/黎明
-12° 〜 -6°        航海薄明        深い夕暮れ
< -12°             天文薄明〜夜    night
```

#### パラメータ導出関数

```typescript
/**
 * 天体位置+天気からEnvironmentThemeParamsを生成する純粋関数（ドメイン層）。
 * 実行順: 天気決定(5.5f) → 本関数(5.5b) の順で呼ばれる。
 * weatherは5.5fのdecideWeather()で事前に決定済みの値を受け取る。
 */
function computeThemeFromCelestial(
  solar: SolarPosition,
  lunar: LunarPosition,
  weatherDecision: WeatherDecision,
  estimatedTempC: number,
  scenePreset: ScenePresetName
): EnvironmentThemeParams
```

注: `weatherDecision`（天気タイプ+降水強度+雲密度）を受け取ることで、天気による明るさ減衰やskyColor変調を正確に反映する。`estimatedTempC`はgroundColorの季節変化に使用する。

#### EnvironmentThemeParams全14フィールドの導出式

以下で使用する共通ヘルパー:

注: `lerpFloat`、`lerpHexColor`、`smoothstep`は既存の`ThemeLerp.ts`からexportされている。`lightenColor`は既存の`EnvironmentTheme.ts`に定義済み（Phase 5.5実装時にexportへ変更する）。設計文書内の`lerp(a, b, t)`は`lerpFloat(a, b, t)`を指す。

```typescript
/** 範囲指定smoothstep: edge0→edge1の範囲でtを0→1に変換し、smoothstep適用 */
function rangedSmoothstep(t: number, edge0: number, edge1: number): number {
  const x = Math.max(0, Math.min(1, (t - edge0) / (edge1 - edge0)))
  return x * x * (3 - 2 * x)
}

/** 天気による減衰係数 */
const WEATHER_DIMMING: Record<WeatherType, number> = {
  sunny: 1.0, cloudy: 0.7, rainy: 0.5, snowy: 0.55,
}

/** 天気による太陽ピーク強度 */
const PEAK_SUN_INTENSITY: Record<WeatherType, number> = {
  sunny: 2.5, cloudy: 1.2, rainy: 0.8, snowy: 0.9,
}
```

**1. exposure**:
```typescript
const dayExposure = lerp(0.15, 1.2, rangedSmoothstep(altitude, -6, 40))
const nightExposure = lerp(0.05, 0.3, moonBrightness)
exposure = altitude > 0 ? dayExposure
         : altitude > -6 ? lerp(nightExposure, dayExposure, twilightFactor)
         : nightExposure
```

**2. sunIntensity**:
```typescript
sunIntensity = Math.max(0, Math.sin(altitude * Math.PI / 180)) * PEAK_SUN_INTENSITY[weather]
// altitude < 0 の場合は自動的に0になる
```

**3. sunColor** — 太陽高度角→色温度マッピング:

| altitude | sunColor | 色温度の体感 |
|---|---|---|
| < 0度 | 0x000000（使われない） | 太陽なし |
| 0-5度 | 0xff4400 | 深い赤橙 |
| 5-15度 | 0xff8844 → 0xffcc88 | 橙〜暖色 |
| 15-30度 | 0xffcc88 → 0xfff0d0 | 暖色→暖白 |
| > 30度 | 0xfff5e0 | ほぼ白（正午の太陽） |

```typescript
function altitudeToSunColor(altitude: number): number {
  if (altitude <= 0) return 0x000000
  if (altitude <= 5)  return lerpHexColor(0xff4400, 0xff8844, altitude / 5)
  if (altitude <= 15) return lerpHexColor(0xff8844, 0xffcc88, (altitude - 5) / 10)
  if (altitude <= 30) return lerpHexColor(0xffcc88, 0xfff0d0, (altitude - 15) / 15)
  return 0xfff5e0
}
```

**4. skyColor** — `altitudeToSkyColor(altitude, weather)`:

| altitude | sunny | cloudy | rainy |
|---|---|---|---|
| < -12度 | 0x0a0e2a (暗紺) | 0x081848 | 0x061438 |
| -12〜-6度 | 0x1a2850 | 0x152040 | 0x0e1838 |
| -6〜0度 | 0xff6644 (薄明橙) | 0xcc5540 | 0x993830 |
| 0〜10度 | 0xffc9a8 (朝焼) | 0x90b4e0 | 0x7098c8 |
| 10〜30度 | 0xaaddf0 (明るい青) | 0x80a8e0 | 0x6090c0 |
| > 30度 | 0x87ceeb (昼の青空) | 0x6898e0 | 0x5888b8 |

```typescript
/** ブレークポイント列を線形補間するヘルパー */
function interpolateColorTable(
  table: { alt: number; color: number }[],
  altitude: number
): number {
  if (altitude <= table[0].alt) return table[0].color
  for (let i = 1; i < table.length; i++) {
    if (altitude <= table[i].alt) {
      const t = (altitude - table[i - 1].alt) / (table[i].alt - table[i - 1].alt)
      return lerpHexColor(table[i - 1].color, table[i].color, t)
    }
  }
  return table[table.length - 1].color
}

function altitudeToSkyColor(altitude: number, weather: WeatherType): number {
  // 晴天ベースの色テーブル（6ブレークポイント）
  const sunnyColors = [
    { alt: -12, color: 0x0a0e2a },
    { alt: -6,  color: 0x1a2850 },
    { alt: 0,   color: 0xff6644 },
    { alt: 10,  color: 0xffc9a8 },
    { alt: 30,  color: 0xaaddf0 },
    { alt: 50,  color: 0x87ceeb },
  ]
  // ブレークポイント間を線形補間
  const baseColor = interpolateColorTable(sunnyColors, altitude)

  // 天気による変調: 灰色方向にブレンド
  const grayTint: Record<WeatherType, { color: number; factor: number }> = {
    sunny: { color: 0, factor: 0 },
    cloudy: { color: 0x8898a8, factor: 0.3 },
    rainy:  { color: 0x506878, factor: 0.45 },
    snowy:  { color: 0x90a0b0, factor: 0.25 },
  }
  const tint = grayTint[weather]
  return tint.factor > 0 ? lerpHexColor(baseColor, tint.color, tint.factor) : baseColor
}
```

**5. fogColor**: skyColorに追従。やや白寄りにシフト。
```typescript
fogColor = lerpHexColor(skyColor, 0xffffff, 0.15)
```

**6-7. fogNear / fogFar**: 天気と高度角で可変。
```typescript
const baseFogNear = lerp(6, 15, rangedSmoothstep(altitude, -12, 30))
const baseFogFar = lerp(18, 35, rangedSmoothstep(altitude, -12, 30))
// 天気による視程の短縮
const visibilityFactor: Record<WeatherType, number> = {
  sunny: 1.0, cloudy: 0.9, rainy: 0.7, snowy: 0.65,
}
fogNear = baseFogNear * visibilityFactor[weather]
fogFar = baseFogFar * visibilityFactor[weather]
```

**8. ambientColor**:
```typescript
// 日中: 暖色系の環境光
const dayAmbientColor = lerpHexColor(0xffaa66, 0xffeedd, rangedSmoothstep(altitude, 0, 30))
// 夜間: 月光色 or 星明かり色
const nightAmbientColor = moonAmbient  // 前述のmoonAmbient計算結果
// 薄明帯で補間
ambientColor = altitude > 0 ? dayAmbientColor
             : altitude > -6 ? lerpHexColor(nightAmbientColor, dayAmbientColor, twilightFactor)
             : nightAmbientColor
```

**9. ambientIntensity**:
```typescript
const dayAmbientIntensity = lerp(0.15, 0.6, rangedSmoothstep(altitude, -12, 20))
  * WEATHER_DIMMING[weather]
const nightAmbientIntensity = lerp(0.05, 0.25, moonBrightness)
ambientIntensity = altitude > 0 ? dayAmbientIntensity
                 : altitude > -6 ? lerp(nightAmbientIntensity, dayAmbientIntensity, twilightFactor)
                 : nightAmbientIntensity
```

**10. hemiSkyColor**: skyColorに追従（同値）。
```typescript
hemiSkyColor = skyColor
```

**11. hemiGroundColor**: groundColorに追従（同値）。
```typescript
hemiGroundColor = groundColor
```

**12. hemiIntensity**: ambientIntensityの0.85倍。
```typescript
hemiIntensity = ambientIntensity * 0.85
```

**13. groundColor**: 気温ベース + プリセットオーバーライド。
```typescript
groundColor = temperatureToGroundColor(estimatedTempC, scenePreset)
// seasideプリセット: 砂浜色固定 0xd4b878（季節変動なし）
// それ以外: 気温による連続lerp（5.5eのテーブル参照）
```

**14. sunPosition**: 5.5cのcomputeLightDirection()が別途計算するため、ここではダミー値を入れる。EnvironmentSimulationServiceで上書き。

#### 薄明帯のクロスフェード

太陽altitude -6度〜0度の範囲で、日中パラメータと夜間パラメータを補間する:

```typescript
// twilightFactor: -6度で0.0、0度で1.0
const twilightFactor = rangedSmoothstep(altitude, -6, 0)

// 各パラメータで使用:
// value = lerp(nightValue, dayValue, twilightFactor)
```

smoothstepを使うことで、薄明帯の中間点（altitude=-3度付近）で変化が緩やかになり、自然な遷移を実現する。

#### 月光パラメータ

```typescript
const MOONLIGHT_COLOR = 0x8899bb   // 青みがかったグレー
const STARLIGHT_COLOR = 0x1a1a2e   // 暗い紺
const FULL_MOON_TINT  = 0xaabbcc   // 満月に近いときの明るい青白

// 月光の基本明るさ
const baseMoonBrightness = lunar.isAboveHorizon
  ? lerp(0.1, 0.8, lunar.illuminationFraction)
  : 0.1

// 天気による月光減衰
const MOON_WEATHER_DIMMING: Record<WeatherType, number> = {
  sunny: 1.0, cloudy: 0.4, rainy: 0.1, snowy: 0.1,
}
const moonBrightness = baseMoonBrightness * MOON_WEATHER_DIMMING[weather]

// 月光によるambientColor
const moonAmbient = lunar.isAboveHorizon
  ? lerpHexColor(MOONLIGHT_COLOR, FULL_MOON_TINT, lunar.illuminationFraction)
  : STARLIGHT_COLOR
```

#### シーンプリセットのautoモードオーバーライド

autoモードでもシーンプリセット固有の補正を適用する。既存の手動モードと同じ補正ロジックを再利用:

```typescript
function applyPresetOverride(
  params: EnvironmentThemeParams,
  scenePreset: ScenePresetName
): EnvironmentThemeParams {
  if (scenePreset === 'seaside') {
    return {
      ...params,
      skyColor: lightenColor(params.skyColor, 0.25),
      fogColor: lightenColor(params.fogColor, 0.25),
      hemiSkyColor: lightenColor(params.hemiSkyColor, 0.25),
      exposure: params.exposure * 1.25,
      sunIntensity: params.sunIntensity * 1.2,
      ambientIntensity: params.ambientIntensity * 1.15,
    }
  }
  // meadow, park: 補正なし
  return params
}
```

#### 既存THEME_TABLEとの対応関係

computeThemeFromCelestialが生成する値は、THEME_TABLEの16パターンの「通過点」を近似する連続関数として設計されている。

| TimeOfDay | 対応する太陽altitude | THEME_TABLE参照値（sunny基準） |
|---|---|---|
| morning | 5-15度 | exposure=1.0, sunIntensity=1.0, skyColor=0xffc9a8 |
| day | 40-60度 | exposure=1.2, sunIntensity=1.2, skyColor=0x87ceeb |
| evening | 0-10度 | exposure=0.9, sunIntensity=0.8, skyColor=0xff8844 |
| night | < -12度 | exposure=1.2, sunIntensity=1.2（※THEME_TABLEの値。autoモードではcomputeThemeFromCelestialのsunIntensity=0をtick() Step 7でcomputeLightDirectionの月光強度に上書き）, skyColor=0x0a0e2a |

連続関数の出力がこれらの参照値と大きく乖離しないことを、テストケースで検証する。

#### 既存autoTimeOfDayとの関係

- `autoTimeOfDay=true` 時: 太陽+月の位置からの連続計算を使用（4段階の離散TimeOfDayは内部的に廃止）
- `autoTimeOfDay=false` 時: 従来通り手動選択の4段階TimeOfDay → THEME_TABLE参照（後方互換）

---

### 5.5c: 天体方位→光源の向き

太陽と月の位置からDirectionalLightの方向と強度を算出する。日中は太陽、夜間は月がシーンの主光源となる。

```typescript
/** 太陽・月の位置からDirectionalLightのパラメータを生成（ドメイン層純粋関数） */
function computeLightDirection(
  solar: SolarPosition,
  lunar: LunarPosition
): { position: { x: number; y: number; z: number }; color: number; intensity: number }
```

#### 方位角・高度角→3Dベクトル変換

```typescript
function celestialToDirection(azimuth: number, altitude: number): { x: number; y: number; z: number } {
  // x = -cos(altitude) * sin(azimuth)  （東西方向）
  // y = sin(altitude)                   （高さ）
  // z = -cos(altitude) * cos(azimuth)   （南北方向）
}
```

#### 光源切替ロジック

```
太陽altitude > 0°:
  → 主光源 = 太陽
  → position = celestialToDirection(solar.azimuth, solar.altitude)
  → color = 暖色系 (0xfff4e6〜0xffffff、高度角で変化)
  → intensity = sin(solar.altitude * PI/180) * peakIntensity

太陽altitude -6°〜0° (薄明):
  → 太陽光と月光の補間遷移
  → 太陽が沈むにつれ月光へクロスフェード

太陽altitude < -6° (夜):
  → lunar.isAboveHorizon = true:
    → 主光源 = 月
    → position = celestialToDirection(lunar.azimuth, lunar.altitude)
    → color = 月光色 (0x8899bb、青白い)
    → intensity = lunar.illuminationFraction * 0.4
  → lunar.isAboveHorizon = false:
    → 主光源なし（環境光のみ）
    → intensity ≈ 0
```

影の長さは主光源の高度角に自然に連動する: 高い=短い影、低い=長い影。満月の夜は月光による淡い影が落ちる。新月や月没時は影なし。

---

### 5.5d: 七十二候解決

太陽黄経を5度刻みで分割し、略本暦の七十二候（明治7年/1874年改訂。原型は渋川春海の本朝七十二候/1685年）に対応づける。

#### 候の定義

```typescript
/** 候の位相（初候・次候・末候） */
type KouPhase = 'initial' | 'middle' | 'final'

/** 七十二候の定義 */
interface KouDefinition {
  readonly index: number             // 0-71（小寒初候=0, ..., 冬至末候=71）
  readonly solarTermName: string     // 親の節気名（漢字）
  readonly solarTermNameEn: string   // 親の節気名（英語）
  readonly phase: KouPhase
  readonly phaseNameEn: string       // 候位相の英語表示名（'1st' | '2nd' | '3rd'）
  readonly phaseNameJa: string       // 候位相の日本語表示名（'初候' | '次候' | '末候'）
  readonly eclipticLonStart: number  // 開始黄経 (度)。(index*5 + 285) % 360
  readonly nameJa: string            // 候名（例: 「東風解凍」）
  readonly nameEn: string            // 英語名
  readonly readingJa: string         // 読み仮名
  readonly description: string       // 説明文
}

/** 全72候の定義テーブル */
const KOU_DEFINITIONS: readonly KouDefinition[]
```

#### eclipticLonStartの計算

```
eclipticLonStart = (index * 5 + 285) % 360

例:
  index=0  (小寒初候):  (0*5+285)%360 = 285度
  index=3  (大寒初候):  (3*5+285)%360 = 300度
  index=15 (春分初候):  (15*5+285)%360 = 0度   ← 春分点
  index=33 (夏至初候):  (33*5+285)%360 = 90度
  index=51 (秋分初候):  (51*5+285)%360 = 180度
  index=69 (冬至初候):  (69*5+285)%360 = 270度
  index=71 (冬至末候):  (71*5+285)%360 = 280度
```

#### KOU_DEFINITIONS全72候テーブル

略本暦（明治7年/1874年改訂）準拠。

| idx | 節気 | 相 | 黄経 | 候名 | readingJa | English | description |
|---|---|---|---|---|---|---|---|
| 0 | 小寒 | 初 | 285 | 芹乃栄 | せりすなわちさかう | Parsley flourishes | 芹が盛んに生い茂る |
| 1 | 小寒 | 次 | 290 | 水泉動 | しみずあたたかをふくむ | Springs thaw | 地中の泉が動き始める |
| 2 | 小寒 | 末 | 295 | 雉始雊 | きじはじめてなく | Pheasants start to call | 雄の雉が鳴き始める |
| 3 | 大寒 | 初 | 300 | 款冬華 | ふきのはなさく | Butterbur sprouts | 蕗の薹が蕾を出す |
| 4 | 大寒 | 次 | 305 | 水沢腹堅 | さわみずこおりつめる | Ice thickens on streams | 沢の水が厚く凍る |
| 5 | 大寒 | 末 | 310 | 鶏始乳 | にわとりはじめてとやにつく | Hens begin to lay | 鶏が卵を産み始める |
| 6 | 立春 | 初 | 315 | 東風解凍 | はるかぜこおりをとく | East wind thaws ice | 春の風が氷を解かし始める |
| 7 | 立春 | 次 | 320 | 黄鶯睍睆 | うぐいすなく | Bush warblers sing | 鶯が山里で鳴き始める |
| 8 | 立春 | 末 | 325 | 魚上氷 | うおこおりをいずる | Fish emerge from ice | 割れた氷の間から魚が飛び出す |
| 9 | 雨水 | 初 | 330 | 土脉潤起 | つちのしょううるおいおこる | Rain moistens the soil | 雨が降って土が湿り気を含む |
| 10 | 雨水 | 次 | 335 | 霞始靆 | かすみはじめてたなびく | Mist begins to linger | 霞がたなびき始める |
| 11 | 雨水 | 末 | 340 | 草木萌動 | そうもくめばえいずる | Grass sprouts, trees bud | 草木が芽吹き始める |
| 12 | 啓蟄 | 初 | 345 | 蟄虫啓戸 | すごもりむしとをひらく | Hibernating insects emerge | 冬ごもりの虫が出てくる |
| 13 | 啓蟄 | 次 | 350 | 桃始笑 | ももはじめてさく | First peach blossoms | 桃の花が咲き始める |
| 14 | 啓蟄 | 末 | 355 | 菜虫化蝶 | なむしちょうとなる | Caterpillars become butterflies | 青虫が羽化して蝶になる |
| 15 | 春分 | 初 | 0 | 雀始巣 | すずめはじめてすくう | Sparrows start to nest | 雀が巣を作り始める |
| 16 | 春分 | 次 | 5 | 桜始開 | さくらはじめてひらく | First cherry blossoms | 桜の花が咲き始める |
| 17 | 春分 | 末 | 10 | 雷乃発声 | かみなりすなわちこえをはっす | Distant thunder | 遠くで雷の音がし始める |
| 18 | 清明 | 初 | 15 | 玄鳥至 | つばめきたる | Swallows return | 燕が南からやってくる |
| 19 | 清明 | 次 | 20 | 鴻雁北 | こうがんかえる | Wild geese fly north | 雁が北へ渡っていく |
| 20 | 清明 | 末 | 25 | 虹始見 | にじはじめてあらわる | First rainbows | 雨の後に虹が出始める |
| 21 | 穀雨 | 初 | 30 | 葭始生 | あしはじめてしょうず | First reeds sprout | 葦が芽を吹き始める |
| 22 | 穀雨 | 次 | 35 | 霜止出苗 | しもやんでなえいづる | Last frost, rice seedlings | 霜が止み苗が育ち始める |
| 23 | 穀雨 | 末 | 40 | 牡丹華 | ぼたんはなさく | Peonies bloom | 牡丹の花が咲く |
| 24 | 立夏 | 初 | 45 | 蛙始鳴 | かわずはじめてなく | Frogs start singing | 蛙が鳴き始める |
| 25 | 立夏 | 次 | 50 | 蚯蚓出 | みみずいづる | Worms surface | 蚯蚓が地上に出てくる |
| 26 | 立夏 | 末 | 55 | 竹笋生 | たけのこしょうず | Bamboo shoots sprout | 筍が生えてくる |
| 27 | 小満 | 初 | 60 | 蚕起食桑 | かいこおきてくわをはむ | Silkworms feast on mulberry | 蚕が桑を盛んに食べ始める |
| 28 | 小満 | 次 | 65 | 紅花栄 | べにばなさかう | Safflowers bloom | 紅花が盛んに咲く |
| 29 | 小満 | 末 | 70 | 麦秋至 | むぎのときいたる | Wheat ripens | 麦が熟し麦秋となる |
| 30 | 芒種 | 初 | 75 | 蟷螂生 | かまきりしょうず | Praying mantises hatch | 蟷螂が生まれ出る |
| 31 | 芒種 | 次 | 80 | 腐草為蛍 | くされたるくさほたるとなる | Fireflies emerge | 腐った草が蛍になる |
| 32 | 芒種 | 末 | 85 | 梅子黄 | うめのみきばむ | Plums turn yellow | 梅の実が黄ばんで熟す |
| 33 | 夏至 | 初 | 90 | 乃東枯 | なつかれくさかるる | Self-heal withers | 夏枯草が枯れる |
| 34 | 夏至 | 次 | 95 | 菖蒲華 | あやめはなさく | Irises bloom | あやめの花が咲く |
| 35 | 夏至 | 末 | 100 | 半夏生 | はんげしょうず | Crow-dipper sprouts | 烏柄杓が生える |
| 36 | 小暑 | 初 | 105 | 温風至 | あつかぜいたる | Warm winds blow | 暖かい風が吹いてくる |
| 37 | 小暑 | 次 | 110 | 蓮始開 | はすはじめてひらく | First lotus blossoms | 蓮の花が開き始める |
| 38 | 小暑 | 末 | 115 | 鷹乃学習 | たかすなわちわざをならう | Hawks learn to fly | 鷹の幼鳥が飛ぶことを覚える |
| 39 | 大暑 | 初 | 120 | 桐始結花 | きりはじめてはなをむすぶ | Paulownia produces seeds | 桐の花が実を結び始める |
| 40 | 大暑 | 次 | 125 | 土潤溽暑 | つちうるおうてむしあつし | Earth is hot and steamy | 土が湿り蒸し暑くなる |
| 41 | 大暑 | 末 | 130 | 大雨時行 | たいうときどきふる | Great rains sometimes fall | 時々大雨が降る |
| 42 | 立秋 | 初 | 135 | 涼風至 | すずかぜいたる | Cool winds blow | 涼しい風が立ち始める |
| 43 | 立秋 | 次 | 140 | 寒蝉鳴 | ひぐらしなく | Evening cicadas sing | 蜩が鳴き始める |
| 44 | 立秋 | 末 | 145 | 蒙霧升降 | ふかききりまとう | Thick fog descends | 深い霧が立ち込める |
| 45 | 処暑 | 初 | 150 | 綿柎開 | わたのはなしべひらく | Cotton flowers bloom | 綿の実を包む萼が開く |
| 46 | 処暑 | 次 | 155 | 天地始粛 | てんちはじめてさむし | Heat starts to dissipate | ようやく暑さが鎮まる |
| 47 | 処暑 | 末 | 160 | 禾乃登 | こくものすなわちみのる | Rice ripens | 稲が実る |
| 48 | 白露 | 初 | 165 | 草露白 | くさのつゆしろし | Dew glistens white | 草に降りた露が白く光る |
| 49 | 白露 | 次 | 170 | 鶺鴒鳴 | せきれいなく | Wagtails sing | 鶺鴒が鳴き始める |
| 50 | 白露 | 末 | 175 | 玄鳥去 | つばめさる | Swallows leave | 燕が南へ帰っていく |
| 51 | 秋分 | 初 | 180 | 雷乃収声 | かみなりすなわちこえをおさむ | Thunder ceases | 雷が鳴り響かなくなる |
| 52 | 秋分 | 次 | 185 | 蟄虫坏戸 | むしかくれてとをふさぐ | Insects seal their doors | 虫が土中に籠もり穴をふさぐ |
| 53 | 秋分 | 末 | 190 | 水始涸 | みずはじめてかるる | Farmers drain fields | 田畑の水を干し始める |
| 54 | 寒露 | 初 | 195 | 鴻雁来 | こうがんきたる | Wild geese return | 雁が飛来し始める |
| 55 | 寒露 | 次 | 200 | 菊花開 | きくのはなひらく | Chrysanthemums bloom | 菊の花が咲く |
| 56 | 寒露 | 末 | 205 | 蟋蟀在戸 | きりぎりすとにあり | Crickets chirp at the door | 蟋蟀が戸の辺りで鳴く |
| 57 | 霜降 | 初 | 210 | 霜始降 | しもはじめてふる | First frost | 霜が降り始める |
| 58 | 霜降 | 次 | 215 | 霎時施 | こさめときどきふる | Light rain sometimes falls | 小雨がしとしと降る |
| 59 | 霜降 | 末 | 220 | 楓蔦黄 | もみじつたきばむ | Maples and ivy turn yellow | 紅葉や蔦が色づく |
| 60 | 立冬 | 初 | 225 | 山茶始開 | つばきはじめてひらく | Camellias bloom | 山茶花が咲き始める |
| 61 | 立冬 | 次 | 230 | 地始凍 | ちはじめてこおる | Land starts to freeze | 大地が凍り始める |
| 62 | 立冬 | 末 | 235 | 金盞香 | きんせんかさく | Daffodils bloom | 水仙の花が咲く |
| 63 | 小雪 | 初 | 240 | 虹蔵不見 | にじかくれてみえず | Rainbows hide | 虹を見かけなくなる |
| 64 | 小雪 | 次 | 245 | 朔風払葉 | きたかぜこのはをはらう | North wind blows leaves | 北風が木の葉を払い落とす |
| 65 | 小雪 | 末 | 250 | 橘始黄 | たちばなはじめてきばむ | Tangerines begin to turn | 橘の実が黄色く色づき始める |
| 66 | 大雪 | 初 | 255 | 閉塞成冬 | そらさむくふゆとなる | Cold sets in, winter begins | 天地の気が塞がり冬となる |
| 67 | 大雪 | 次 | 260 | 熊蟄穴 | くまあなにこもる | Bears retreat to dens | 熊が冬ごもりのために穴に入る |
| 68 | 大雪 | 末 | 265 | 鱖魚群 | さけのうおむらがる | Salmon gather and swim upstream | 鮭が群がり川を上る |
| 69 | 冬至 | 初 | 270 | 乃東生 | なつかれくさしょうず | Self-heal sprouts | 夏枯草が芽を出す |
| 70 | 冬至 | 次 | 275 | 麋角解 | おおしかのつのおつる | Deer shed antlers | 大鹿の角が落ちる |
| 71 | 冬至 | 末 | 280 | 雪下出麦 | ゆきわたりてむぎいづる | Wheat sprouts under snow | 雪の下で麦が芽を出す |

#### 候解決ロジック

```typescript
/** 太陽黄経から現在の候を解決 */
function resolveKou(eclipticLon: number): KouDefinition

/** 太陽黄経から候内での経過比率を返す（隣接候との補間用） */
function kouProgress(eclipticLon: number): { kou: KouDefinition; progress: number }
```

`resolveKou`: `eclipticLon`を5で割った商をインデックスとし、黄経の起点オフセット（小寒=285°）を考慮して`KOU_DEFINITIONS`から引く。

#### astronomy-engineとの連携

候の境界日時を正確に求める場合:
```typescript
// 次の候の開始日時を探索
const nextKouStartDate = astronomyPort.searchSunLongitude(
  nextKou.eclipticLonStart,
  currentDate,
  30 // 最大30日先まで探索
)
```

通常の環境パラメータ計算では`SunPosition(date)`の黄経を`resolveKou()`に渡すだけで十分。`searchSunLongitude()`は候変更イベントの正確なタイミング検知に使用する。

---

### 5.5e: 気候プロファイル

天文計算では得られない気温・湿度・降水量を、全球気候グリッドデータから任意の緯度経度について取得する。

#### 全球気候グリッドデータ

**データソース**: [WorldClim 2.1](https://www.worldclim.org/) (CC BY 4.0)
- 月別平均気温(tavg)・最高気温(tmax)・最低気温(tmin)・降水量(prec)・湿度
- 元データ: 10分解像度のGeoTIFF

**5度グリッドにダウンサンプルして同梱**:
- 解像度: 5度（約550km間隔）。バーチャルペットの環境演出には十分
- グリッド数: 36(緯度) x 72(経度) = 2,592ポイント（陸地のみならさらに少ない）
- パラメータ: 月別12ヶ月 x 5値(tavg/tmax/tmin/prec/humidity) = 60値/ポイント
- データサイズ: Float32で約600KB。JSON圧縮で200-300KB程度

**ビルドパイプライン**:

```
[開発時: npm run climate:download]
  1. WorldClim GeoTIFF（10分解像度）をダウンロード
  2. Node.jsスクリプトで5度グリッドにダウンサンプル（平均集約）
  3. 海洋グリッドを除外（陸地マスク適用）
  4. JSON形式で出力
  5. assets/climate/grid-data.json に配置

[ビルド時]
  Vite publicDir経由で /climate/grid-data.json として同梱

[ランタイム]
  fetch('/climate/grid-data.json') → メモリにロード
```

assets/はprivate submoduleのため、気候データもそこに配置すれば配布方式と整合する。

#### グリッドデータJSONスキーマ

```typescript
/** grid-data.json のトップレベル構造 */
interface ClimateGridJson {
  readonly meta: {
    readonly source: 'WorldClim 2.1'
    readonly resolution: 5              // 度
    readonly generatedAt: string        // ISO 8601
  }
  readonly grid: readonly ClimateGridPoint[]
}

/** 1グリッドポイント */
interface ClimateGridPoint {
  readonly lat: number   // グリッド中心の緯度（-87.5, -82.5, ..., 87.5）
  readonly lon: number   // グリッド中心の経度（-177.5, -172.5, ..., 177.5）
  readonly months: readonly [
    // 12要素: [tavg, tmax, tmin, prec, humidity] の5値タプル
    [number, number, number, number, number],  // January
    [number, number, number, number, number],  // February
    // ... (12ヶ月分)
    [number, number, number, number, number],  // December
  ]
}
```

サンプル:

```json
{
  "meta": { "source": "WorldClim 2.1", "resolution": 5, "generatedAt": "2026-01-01T00:00:00Z" },
  "grid": [
    {
      "lat": 37.5, "lon": 137.5,
      "months": [
        [3.1, 7.2, -0.8, 48, 58],
        [3.8, 8.1, 0.1, 62, 59],
        [7.2, 12.4, 2.5, 105, 62],
        [12.8, 18.2, 7.9, 118, 65],
        [17.4, 22.5, 12.8, 130, 70],
        [20.9, 25.1, 17.5, 165, 76],
        [24.8, 29.0, 21.6, 148, 78],
        [26.1, 30.5, 22.8, 162, 74],
        [22.4, 26.8, 19.2, 205, 76],
        [16.8, 21.2, 13.4, 190, 72],
        [11.2, 15.8, 7.2, 88, 66],
        [5.8, 10.6, 1.8, 46, 60]
      ]
    }
  ]
}
```

#### ダウンロードスクリプトの処理パイプライン

`scripts/download-climate-data.ts`の処理ステップ:

```
Step 1: WorldClimから10分解像度GeoTIFFをダウンロード
  URL: https://biogeo.ucanr.edu/data/worldclim/v2.1/base/
  ファイル: wc2.1_10m_tavg.tif, wc2.1_10m_tmax.tif, wc2.1_10m_tmin.tif,
           wc2.1_10m_prec.tif, wc2.1_10m_vapr.tif（水蒸気圧→湿度に変換）
  各ファイルに12バンド（1月〜12月）

Step 2: GeoTIFFをNode.jsで読み込み（geotiff npmパッケージ）
  const tiff = await fromFile('wc2.1_10m_tavg.tif')
  const image = await tiff.getImage()

Step 3: 5度グリッドにダウンサンプル
  36(緯度) x 72(経度) のグリッドそれぞれについて:
    a. 5度x5度の範囲に含まれる10分解像度ピクセルを収集（約30x30ピクセル）
    b. NoData値（-9999や海洋）を除外
    c. 残りのピクセルの平均値を算出
    d. 有効ピクセルが0の場合はそのグリッドポイントをスキップ（海洋）

Step 4: 湿度の変換
  WorldClimのvapr（水蒸気圧, kPa）→ 相対湿度に変換:
  relativeHumidity = (vapr / saturatedVaporPressure(tavg)) * 100
  saturatedVaporPressure(T) = 0.6108 * exp(17.27 * T / (T + 237.3))

Step 5: JSON出力
  ClimateGridJson形式でassets/climate/grid-data.jsonに書き出し
```

npm script登録:
```json
{
  "scripts": {
    "climate:download": "tsx scripts/download-climate-data.ts"
  }
}
```

devDependencies追加: `geotiff`（GeoTIFF読み込み）、`tsx`（TypeScriptスクリプト実行、既存）。

#### ClimateGridPort（ドメイン層ポート）

```typescript
/** 月別気候データ（1グリッドポイント分） */
interface MonthlyClimateData {
  readonly month: number           // 1-12
  readonly avgTempC: number
  readonly avgHighTempC: number
  readonly avgLowTempC: number
  readonly avgHumidity: number     // 0-100
  readonly avgPrecipMm: number    // 月間降水量 (mm)
}

/** 気候グリッドデータへのアクセスポート */
interface ClimateGridPort {
  /** 指定緯度経度の月別気候データを返す（最寄り4グリッド点の双線形補間） */
  getMonthlyClimate(latitude: number, longitude: number): readonly MonthlyClimateData[]

  /** グリッドデータの読み込み状態 */
  readonly isLoaded: boolean
}
```

#### グリッドから72候分のKouClimateを自動生成

月別12エントリのグリッドデータを72候に線形按分する。

```typescript
/** 月別気候データを72候分に按分する純粋関数 */
function interpolateToKouClimate(
  monthlyData: readonly MonthlyClimateData[]
): readonly KouClimate[]
```

#### ヘルパー関数

```typescript
/** MonthlyClimateDataのフィールド名→タプルインデックス変換 */
function fieldIndex(field: keyof Omit<MonthlyClimateData, 'month'>): number {
  const map: Record<string, number> = {
    avgTempC: 0, avgHighTempC: 1, avgLowTempC: 2, avgPrecipMm: 3, avgHumidity: 4,
  }
  return map[field]
}

/** 月の日数（うるう年非考慮。概算用途なので十分） */
function daysInMonth(month: number): number {
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
}

/** 年内通算日から月番号(1-12)を返す（概算） */
function dayOfYearToMonth(dayOfYear: number): number {
  const cumDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365]
  for (let m = 1; m <= 12; m++) {
    if (dayOfYear < cumDays[m]) return m
  }
  return 12
}

/** 指定通算日から当月末日までの残り日数 */
function daysUntilEndOfMonth(dayOfYear: number, month: number): number {
  const cumDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365]
  return cumDays[month] - dayOfYear
}

/** Dateから年内通算日を返す */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

/** 単一月内に収まる候の気候データ生成 */
function buildKouClimate(
  kouIndex: number,
  m: MonthlyClimateData,
  kouDays: number
): KouClimate {
  const avgPrecipMm = m.avgPrecipMm * kouDays / daysInMonth(m.month)
  return {
    kouIndex,
    avgTempC: m.avgTempC,
    avgHighTempC: m.avgHighTempC,
    avgLowTempC: m.avgLowTempC,
    avgHumidity: m.avgHumidity,
    avgPrecipMm,
    precipProbability: Math.min(0.95, avgPrecipMm / (kouDays * 10)),
  }
}
```

#### 按分アルゴリズム疑似コード

```typescript
function interpolateToKouClimate(
  monthlyData: readonly MonthlyClimateData[]
): readonly KouClimate[] {
  const result: KouClimate[] = []

  for (let kouIndex = 0; kouIndex < 72; kouIndex++) {
    // Step 1: 候のおおよその日付範囲を計算
    // 黄経から日付への概算: 1年365.25日 / 360度 ≒ 1.0146日/度
    // 小寒（黄経285度）≒ 1月6日を起点
    const eclipticStart = (kouIndex * 5 + 285) % 360
    const dayOfYearStart = eclipticLonToDayOfYear(eclipticStart)
    const dayOfYearEnd = eclipticLonToDayOfYear((eclipticStart + 5) % 360)
    const kouDays = (dayOfYearEnd - dayOfYearStart + 365) % 365 || 5

    // Step 2: 候が属する月を特定（月境界をまたぐ場合は2ヶ月）
    const startMonth = dayOfYearToMonth(dayOfYearStart)  // 1-12
    const endMonth = dayOfYearToMonth(dayOfYearEnd)      // 1-12

    if (startMonth === endMonth) {
      // 候が1つの月に収まる場合: その月のデータをそのまま使用
      const m = monthlyData[startMonth - 1]
      result.push(buildKouClimate(kouIndex, m, kouDays))
    } else {
      // 候が月境界をまたぐ場合: 2つの月のデータを日数比で按分
      const daysInStartMonth = daysUntilEndOfMonth(dayOfYearStart, startMonth)
      const daysInEndMonth = kouDays - daysInStartMonth
      const ratio = daysInStartMonth / kouDays  // startMonth側の重み

      const m1 = monthlyData[startMonth - 1]
      const m2 = monthlyData[endMonth - 1]
      result.push(buildKouClimateBlended(kouIndex, m1, m2, ratio, kouDays))
    }
  }

  return result
}

/** 黄経→年内通算日の概算 */
function eclipticLonToDayOfYear(eclipticLon: number): number {
  // 春分（黄経0度）≒ 3月20日 = day 79
  // 1度 ≒ 1.0146日
  return Math.round(((eclipticLon * 1.0146) + 79) % 365.25)
}

/** 按分合成 */
function buildKouClimateBlended(
  kouIndex: number, m1: MonthlyClimateData, m2: MonthlyClimateData,
  ratio: number, kouDays: number
): KouClimate {
  const lerp = (a: number, b: number) => a * ratio + b * (1 - ratio)
  const avgPrecipMm = lerp(
    m1.avgPrecipMm * kouDays / daysInMonth(m1.month),
    m2.avgPrecipMm * kouDays / daysInMonth(m2.month)
  )
  return {
    kouIndex,
    avgTempC: lerp(m1.avgTempC, m2.avgTempC),
    avgHighTempC: lerp(m1.avgHighTempC, m2.avgHighTempC),
    avgLowTempC: lerp(m1.avgLowTempC, m2.avgLowTempC),
    avgHumidity: lerp(m1.avgHumidity, m2.avgHumidity),
    avgPrecipMm,
    precipProbability: Math.min(0.95, avgPrecipMm / (kouDays * 10)),
  }
}
```

#### ClimateGridAdapterの双線形補間

```typescript
function getMonthlyClimate(lat: number, lon: number): readonly MonthlyClimateData[] {
  // Step 1: 最寄り4グリッド点を特定
  const gridStep = 5  // 度
  const latIdx = (lat + 87.5) / gridStep  // 0-based連続インデックス
  const lonIdx = (lon + 177.5) / gridStep

  const lat0 = Math.floor(latIdx)  // 下側の行
  const lat1 = Math.min(lat0 + 1, 35)  // 上側の行
  const lon0 = Math.floor(lonIdx)
  const lon1 = (lon0 + 1) % 72  // 経度は循環

  // Step 2: 補間重み
  const tLat = latIdx - lat0  // 0.0-1.0
  const tLon = lonIdx - lon0  // 0.0-1.0

  // Step 3: 4隅のデータ取得（海洋ポイントは最寄り陸地にスナップ済み）
  const p00 = getGridPoint(lat0, lon0)
  const p01 = getGridPoint(lat0, lon1)
  const p10 = getGridPoint(lat1, lon0)
  const p11 = getGridPoint(lat1, lon1)

  // Step 4: 各月について双線形補間
  return Array.from({ length: 12 }, (_, monthIdx) => {
    const lerp = (field: keyof MonthlyClimateData) => {
      if (field === 'month') return monthIdx + 1
      const v00 = p00.months[monthIdx][fieldIndex(field)]
      const v01 = p01.months[monthIdx][fieldIndex(field)]
      const v10 = p10.months[monthIdx][fieldIndex(field)]
      const v11 = p11.months[monthIdx][fieldIndex(field)]
      // 双線形補間: lerp(lerp(v00,v01,tLon), lerp(v10,v11,tLon), tLat)
      const bottom = v00 + (v01 - v00) * tLon
      const top = v10 + (v11 - v10) * tLon
      return bottom + (top - bottom) * tLat
    }
    return {
      month: monthIdx + 1,
      avgTempC: lerp('avgTempC'),
      avgHighTempC: lerp('avgHighTempC'),
      avgLowTempC: lerp('avgLowTempC'),
      avgHumidity: lerp('avgHumidity'),
      avgPrecipMm: lerp('avgPrecipMm'),
    } as MonthlyClimateData
  })
}
```

**precipProbabilityの導出**: WorldClimのグリッドデータには降水確率が直接含まれない。月間降水量から以下の経験式で推定する:
```
precipProbability = clamp(avgPrecipMm / (候日数 * 10), 0, 0.95)
```
候あたり平均降水量(mm)を候の日数(約5日)で割り、1日あたり10mmを100%降水の基準とする。上限0.95で完全な毎日降水は避ける。

#### 型定義

```typescript
/** 1候分（約5日間）の気候定数 */
interface KouClimate {
  readonly kouIndex: number            // 0-71
  readonly avgTempC: number            // 平均気温 (℃)
  readonly avgHighTempC: number        // 平均最高気温 (℃)
  readonly avgLowTempC: number         // 平均最低気温 (℃)
  readonly avgHumidity: number         // 平均湿度 (0-100%)
  readonly precipProbability: number   // 降水確率 (0.0-1.0)
  readonly avgPrecipMm: number         // 候あたり（約5日）平均降水量 (mm)
}

/** 気候設定 */
interface ClimateConfig {
  readonly mode: 'preset' | 'custom'
  readonly presetName?: string          // プリセット選択時
  readonly latitude: number
  readonly longitude: number
  readonly label: string                // 都市名 or "Custom (35.7°N, 139.7°E)"
}
```

#### プリセット都市

気候帯の多様性を考慮して5都市を選定:

| 都市 | 緯度 | 経度 | 気候区分 | 選定理由 |
|---|---|---|---|---|
| Tokyo | 35.6762 | 139.6503 | 温暖湿潤 (Cfa) | 四季が明確。デフォルト |
| Sydney | -33.8688 | 151.2093 | 温暖湿潤 (Cfa) | 南半球 |
| London | 51.5074 | -0.1278 | 西岸海洋性 (Cfb) | 高緯度・曇天多い |
| Hawaii | 21.3069 | -157.8583 | 熱帯雨林 (Af) | 太平洋中央 |
| Reykjavik | 64.1466 | -21.9426 | 亜極地海洋性 (Cfc) | 極地寄り。白夜/極夜 |

#### 気温推定

```typescript
/** 現在日時の推定気温を返す（ドメイン層純粋関数） */
function estimateTemperature(
  kouClimate: KouClimate,
  hourOfDay: number
): number
```

日内変動モデル:
- 最高気温出現: 14時頃
- 最低気温出現: 日の出直前（約5時）
- `temp = avgTempC + (avgHighTempC - avgLowTempC) / 2 * cos((hourOfDay - 14) * PI / 12)`

隣接候との補間: `kouProgress()`のprogressで隣接候の気候データを線形補間し、候の境界で値が急変しないようにする。

#### 気温→環境パラメータ

| 気温範囲 | groundColor傾向 | 補足 |
|---|---|---|
| > 25℃ | 濃い緑 (0x4a7a2e) | 盛夏 |
| 15〜25℃ | 明るい緑 (0x5d8a3c) | 春・秋 |
| 5〜15℃ | 黄〜茶 (0x8a7a3c) | 晩秋・早春 |
| 0〜5℃ | くすんだ茶 (0x6a5a3a) | 冬 |
| < 0℃ | 灰白 (0x8a8a7a) | 厳冬 |

上記は目安。実際には連続的にlerp補間する。

```typescript
function temperatureToGroundColor(tempC: number, scenePreset: ScenePresetName): number
```

seasideプリセットではgroundColorを砂浜色に固定（季節変動しない）。

---

### 5.5f: 天気自動決定

気候データから確率的に天気タイプと降水量を決定する。

#### 決定ロジック

```typescript
interface WeatherDecision {
  readonly weather: WeatherType
  readonly precipIntensity: number   // 0.0-1.0（降水の相対強度）
  readonly cloudDensity: number      // 0.0-1.0（雲の相対密度）
}

/** 気候データと気温から天気を決定する純粋関数 */
function decideWeather(
  kouClimate: KouClimate,
  estimatedTempC: number,
  seed: number           // 決定的乱数シード（日付ベース）
): WeatherDecision
```

#### ハッシュ関数: mulberry32

32bit乗算ベースの決定的PRNG。0.0-1.0の浮動小数点を返す。

```typescript
/** 決定的32bit PRNG。seedから0.0-1.0の値を生成 */
function mulberry32(seed: number): number {
  let t = (seed + 0x6D2B79F5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
```

#### アルゴリズム完全疑似コード

```typescript
function decideWeather(
  kouClimate: KouClimate,
  estimatedTempC: number,
  seed: number
): WeatherDecision {
  const MAX_DAILY_PRECIP_MM = 30  // 豪雨の基準: 30mm/日

  // Step 1: 日単位の決定的乱数（0.0-1.0）
  // seed = mulberry32(year * 366 + dayOfYear) として呼び出し側で生成
  const primaryRand = seed

  // Step 2: 降水判定
  if (primaryRand < kouClimate.precipProbability) {
    // --- 降水あり ---

    // Step 3a: 雪/雨判定
    const weather: WeatherType = estimatedTempC < 2 ? 'snowy' : 'rainy'

    // Step 3b: 降水強度（0.0-1.0）
    const kouDays = 5  // 1候 ≒ 5日
    const dailyPrecipMm = kouClimate.avgPrecipMm / kouDays
    const precipIntensity = Math.max(0, Math.min(1, dailyPrecipMm / MAX_DAILY_PRECIP_MM))

    // Step 3c: 雲密度（降水時は高め）
    const cloudDensity = 0.7 + precipIntensity * 0.3

    return { weather, precipIntensity, cloudDensity }
  }

  // --- 降水なし ---

  // Step 4: 曇り判定（2回目の乱数）
  const secondaryRand = mulberry32(seed * 2654435761)  // 別のseedで2回目

  if (kouClimate.avgHumidity > 70 && secondaryRand < 0.4) {
    // 高湿度 + 40%の確率 → 曇り
    const cloudDensity = 0.3 + kouClimate.avgHumidity / 300
    return { weather: 'cloudy', precipIntensity: 0, cloudDensity }
  }

  // Step 5: 晴れ
  const cloudDensity = kouClimate.avgHumidity / 200  // 湿度50%→0.25, 80%→0.4
  return { weather: 'sunny', precipIntensity: 0, cloudDensity }
}
```

注: `2654435761`はKnuthの乗法ハッシュ定数（黄金比 * 2^32に近い素数）。secondaryRandを独立させるために使用。

#### 手動/auto共存

```
autoWeather=false: WeatherPanelで手動選択。天文計算ベースのテーマ生成は継続（手動天気をテーマ計算に渡す）
autoWeather=true:  decideWeather()で天気を自動決定。WeatherPanelのWeather/Cloud/Time行はグレーアウト
地点設定: autoWeatherの状態に関わらず常に利用可能（environmentシーン内WorldMapModal）
天文計算: autoWeatherの状態に関わらずenvSimServiceが常に稼働し天体位置・候・テーマを生成
```

---

### 5.5g: 雨量連動

降水量に応じてRainEffect/SnowEffectの粒子数を可変にする。

#### 現行の固定値

| エフェクト | 現行粒子数 |
|---|---|
| RainEffect | 650本（固定） |
| SnowEffect | 750個（固定） |

#### 可変化

```typescript
/** 降水強度から粒子数を算出（ドメイン層純粋関数） */
function computeParticleCount(
  weather: 'rainy' | 'snowy',
  precipIntensity: number  // 0.0-1.0
): number {
  const t = Math.max(0, Math.min(1, precipIntensity))
  if (weather === 'rainy') {
    // 雨: 100 〜 1200 の範囲でlerp
    return Math.round(100 + t * 1100)
  }
  // 雪: 100 〜 900 の範囲でlerp
  return Math.round(100 + t * 800)
}
```

| precipIntensity | 雨粒子数 | 雪粒子数 | 体感 |
|---|---|---|---|
| 0.0-0.2 | 100-320 | 100-260 | 小雨/小雪 |
| 0.2-0.5 | 320-650 | 260-500 | 普通の雨/雪 |
| 0.5-0.8 | 650-980 | 500-740 | 強い雨/雪 |
| 0.8-1.0 | 980-1200 | 740-900 | 豪雨/大雪 |

注: 現行のRainEffect固定値650本はprecipIntensity=0.5に相当。SnowEffect固定値750個はprecipIntensity=0.81に相当。

#### cloudDensityの粒子数への反映

autoモード時の`WeatherDecision.cloudDensity`（0.0-1.0連続値）を既存の`CloudDensityLevel`（0-5離散値）に変換:

```typescript
function cloudDensityToLevel(cloudDensity: number): CloudDensityLevel {
  return Math.round(Math.max(0, Math.min(5, cloudDensity * 5))) as CloudDensityLevel
}
```

#### 手動モード時の降水粒子数

手動モード時は現行の固定粒子数を維持（雨650、雪750）。降水量スライダーは追加しない。autoモード時のみprecipIntensityに連動。

---

### 5.5h: 七十二候セレクタ

現在の候をUIから確認・手動選択する機能。候の選択が気候データ・天気決定に連動する。

#### KouSelectorコンポーネント

```typescript
interface KouSelectorProps {
  readonly currentKou: KouDefinition | null  // Auto時の逐次更新値
  readonly autoKou: boolean
  readonly manualKouIndex: number
  readonly onKouChange: (kouIndex: number) => void
  readonly onAutoToggle: (auto: boolean) => void
}

function KouSelector(props: KouSelectorProps): JSX.Element
```

#### 表示位置とスタイル

- ウィンドウ上端中央（`position: fixed; top: 36px; left: 50%; transform: translateX(-50%)`）。ドラッグ領域（32px）の下
- 背景なし（transparent）
- createPortalでdocument.bodyに描画
- `data-testid="kou-selector"/"kou-select"/"kou-auto"`

#### 表示構成（上から順に）

1. `season`ラベル + `#候番号 | 日付範囲`（カレンダー日付範囲形式: `# 1 |  1/ 5 -  1/ 9`）
2. 候の英語名（nameEn）
3. Autoアイコンボタン（時計SVG）+ リストアイコンボタン（リストSVG）— 下に15pxマージン
4. 節気名+フェーズ（和名: `小寒 初候`）— fontSize 22
5. 候名（和名: `芹乃栄`）— fontSize 22
6. 読み仮名（全角カッコ書き: `（せりすなわちさかう）`）
7. 説明文（description）
8. `λ=285°`

#### リストオーバーレイ

リストアイコンクリックでフルスクリーン72候リストを表示（createPortalでdocument.bodyに描画）。

- テーブル形式: #番号、日付範囲、節気、候名。候名列は右端まで伸長（`width: 100%`テーブル）
- テーブルヘッダは固定（`listHeader`）、候リストはスクロール可能（`listContainer`、flex 3:1比率）
- スクロールバー: 幅24px、白半透明サム
- リスト下部に詳細パネル（`listDetailPanel`、`backgroundColor: rgba(0,0,0,0.7)`）:
  - #候番号 | 日付範囲 → solarTermNameEn phaseNameEn → nameEn → 節気+フェーズ和名 → 候名和名 → 読み仮名 → 説明文 → λ=黄経°
  - ホバー行の情報をリアルタイム表示（hoveredIndex優先、fallbackはpreviewIndex→selected）
- 2クリック選択: 1クリック目=プレビュー（行ハイライト）、同じ行2クリック目=確定（autoKou=false、リスト閉じる）
- 初期表示時にcurrentRowをscrollIntoView({ block: 'center' })
- 閉じるボタン: Weather戻るボタンと同位置・同スタイル（bottom:168, left:10, 48x48, overlayBg, blur(8px)）
- `data-testid="kou-list-overlay"/"kou-list-close"`

#### Autoアイコンの色

- inactive（autoKou=false）: `rgba(255, 255, 255, 0.7)` — やや控えめな白
- active（autoKou=true）: `textMuted`（`#aaa`）— 落ち着いたグレー
- hover: `textSecondary`

#### 動作仕様

- **Auto時（`autoKou: true`）**: `currentKou.index`にバインドされ、KouChangedイベントで逐次更新
- **手動時（`autoKou: false`）**: リストから選んだindexを`manualKouIndex`としてWeatherConfigに保存。`EnvironmentSimulationService.setManualKou()`に伝搬
- **リスト手動選択**: 確定時に自動的に`autoKou: false`に切り替わる
- **表示制御**: WorldMapModal表示中のみ非表示。その他は常時表示

#### WeatherConfig拡張

```typescript
export interface WeatherConfig {
  // ...既存フィールド...
  readonly autoKou: boolean            // true=天文計算から自動, false=手動
  readonly manualKouIndex: number      // 0-71, autoKou=false時に使用
}
```

デフォルト値: `autoKou: true`, `manualKouIndex: 0`

#### EnvironmentSimulationService拡張

```typescript
setManualKou(kouIndex: number | null): void
```

- `kouIndex !== null`: `KOU_DEFINITIONS[kouIndex]`を候解決結果として使用。気候データ・天気決定・気温推定がすべて手動候に基づく
- `kouIndex === null`: 太陽黄経による自動候計算に復帰
- 候変更時に`lastWeatherDecisionDayOfYear = -1`で天気再決定を強制
- 天体位置計算（太陽高度・方位）は常に実時刻を使用

#### 候変更イベント

```typescript
interface KouChanged {
  readonly type: 'KouChanged'
  readonly kou: KouDefinition
  readonly previousKou: KouDefinition | null
}
```

EnvironmentSimulationServiceのtick()内で候が変わった時にEventBusへ発行。KouSelectorはEnvironmentContext経由でcurrentKouを購読。

将来的にはキャラクターの特別行動トリガーにも使用可能（例: 桜始開で花見アニメーション）。

#### KouDefinitionの読み仮名フィールド

UI表示で使用する`readingJa`フィールドは5.5dの`KouDefinition`型に定義済み。追加の型変更は不要。

---

### WeatherConfig拡張

```typescript
interface WeatherConfig {
  readonly weather: WeatherType
  readonly timeOfDay: TimeOfDay
  readonly autoWeather: boolean          // true時: 天文計算+気候データで天気自動決定
  readonly autoTimeOfDay: boolean        // true時: 太陽高度角から連続計算
  readonly cloudDensityLevel: CloudDensityLevel  // 手動時のみ使用
  readonly scenePreset: ScenePresetName
  readonly climate?: ClimateConfig         // 追加: 気候設定（座標+プリセット/カスタム）。未設定時はTokyoデフォルト
}
```

デフォルト値: `climate: { mode: 'preset', presetName: 'Tokyo', latitude: 35.6762, longitude: 139.6503, label: 'Tokyo' }`

### 設定永続化

```json
{
  "weather": {
    "weather": "sunny",
    "timeOfDay": "day",
    "autoWeather": false,
    "autoTimeOfDay": false,
    "cloudDensityLevel": 1,
    "scenePreset": "meadow",
    "climate": {
      "mode": "preset",
      "presetName": "Tokyo",
      "latitude": 35.6762,
      "longitude": 139.6503,
      "label": "Tokyo"
    }
  }
}
```

後方互換: climateフィールドが未設定の場合はTokyoデフォルトにフォールバック。

### WeatherPanel UI拡張

既存の4行構成を維持。Climate行はWeatherPanelには追加しない（世界地図モーダルで設定するため）。

```
1. Scene行:    [Meadow] [Seaside] [Park]   ...   [Location]  ← 右端にLocationボタン
2. Weather行:  [Sunny] [Cloudy] [Rainy] [Snowy] [Auto]  ← Autoを有効化
3. Cloud行:    [0][1][2][3][4][5] [Reset]         ← 既存（手動時のみ操作可能）
4. Time行:     [Morning] [Day] [Evening] [Night] [Auto]  ← 既存
```

autoWeather=true 時:
- Weather行、Cloud行、Time行はグレーアウト（自動計算結果を表示のみ）
- Scene行は常に操作可能
- Locationボタン（GlobeIcon）は常に表示（autoWeather非依存）

autoWeather=false 時:
- Weather行、Cloud行、Time行は手動操作可能
- 天文計算ベースのテーマ生成は継続（手動天気をenvSimServiceに渡してテーマ計算）

---

### 5.5i: 世界地図UI

environmentシーンのWeatherPanel Scene行のLocationボタンから世界地図モーダルを表示する。地図上でプリセット都市を選択するか、任意の地点をクリックして緯度経度を設定する。

#### アクセス経路

environmentシーン内のWeatherPanel Scene行右端のLocationボタン（地球アイコン）をクリック→worldMapビューに遷移。

#### 世界地図の実装

**地図データ**: [Natural Earth](https://www.naturalearthdata.com/) 110m解像度の海岸線（パブリックドメイン）
- GeoJSON → SVGパスに事前変換してアプリに同梱
- 等距円筒図法（Equirectangular projection）: 緯度経度がそのままx/yに対応
- SVGファイルサイズ: 海岸線のみで約50KB

**SVG座標系**:

```typescript
// viewBox定義: 左上が(-180, -90)、右下が(180, 90)
// SVGのy軸は下向きなので緯度を反転する
const SVG_VIEWBOX = "-180 -90 360 180"

// 緯度経度 → SVG座標
function geoToSvg(lat: number, lon: number): { x: number; y: number } {
  return { x: lon, y: -lat }
}

// SVG座標 → 緯度経度（クリック位置の逆変換）
function svgToGeo(svgX: number, svgY: number): { latitude: number; longitude: number } {
  return { latitude: -svgY, longitude: svgX }
}
```

**モーダルサイズ**: 幅600px固定、高さはアスペクト比2:1で300px。ウィンドウが小さい場合は`max-width: 90vw`で縮小。

**描画レイヤー構成**（下から順に）:

```tsx
<svg viewBox="-180 -90 360 180" width="600" height="300">
  {/* Layer 1: 背景（海洋色） */}
  <rect x="-180" y="-90" width="360" height="180" fill="#1a3a5c" />

  {/* Layer 2: 大陸の輪郭パス */}
  <path d={coastlineSvgPath} fill="#2a4a2a" stroke="#3a5a3a" strokeWidth="0.5" />

  {/* Layer 3: 夜側オーバーレイ（terminator） */}
  <polygon points={nightPolygonPoints} fill="black" opacity="0.6" />

  {/* Layer 4: 薄明オーバーレイ */}
  <polygon points={twilightPolygonPoints} fill="black" opacity="0.3" />

  {/* Layer 5: プリセット都市ピン */}
  {PRESET_CITIES.map(city => (
    <g key={city.name} onClick={() => selectCity(city)}>
      <circle cx={city.longitude} cy={-city.latitude} r={selected ? 3 : 2}
              fill={selected ? "#ff6644" : "#ffffff"} />
      <text x={city.longitude + 4} y={-city.latitude + 1}
            fontSize="6" fill="#ffffff">{city.name}</text>
    </g>
  ))}

  {/* Layer 6: カスタム選択ピン */}
  {customPin && <circle cx={customPin.lon} cy={-customPin.lat} r="3" fill="#44ff66" />}
</svg>
```

#### 昼夜境界線（terminator）

astronomy-engineで太陽直下点（sub-solar point）を計算し、地図上に昼夜の濃淡を3段階で表現する。

```typescript
/**
 * 太陽直下点を計算する純粋関数（ドメイン層）。
 * 太陽赤緯と時角から算出する。AstronomyPortには依存しない。
 * 呼び出し側がAstronomyAdapterから太陽赤緯を取得して渡す。
 */
function getSubSolarPoint(
  solarDeclination: number,  // 太陽赤緯 (度)
  greenwichHourAngle: number // グリニッジ時角 (度)
): { latitude: number; longitude: number } {
  // 太陽直下点の緯度 = 太陽赤緯
  // 太陽直下点の経度 = -グリニッジ時角（西向きが正の時角を東経に変換）
  return {
    latitude: solarDeclination,
    longitude: -greenwichHourAngle,
  }
}
```

**太陽赤緯とグリニッジ時角の取得方法**:

5.5aの`getSolarDeclinationAndGHA()`（AstronomyAdapter非ポートヘルパー）を使用する。WorldMapModal.tsxから直接呼び出す。

**getTerminatorPoints — terminatorポリゴンの西端・東端を算出**:

```typescript
interface TerminatorResult {
  readonly west: { latitude: number; longitude: number }[]
  readonly east: { latitude: number; longitude: number }[]
}

function getTerminatorPoints(
  subSolarPoint: { latitude: number; longitude: number },
  altitudeThreshold: number,  // 0度 (昼夜境界) or -18度 (薄明境界)
  latitudeSteps: number       // 緯度の分割数（例: 72 → 2.5度刻み）
): TerminatorResult {
  const west: { latitude: number; longitude: number }[] = []
  const east: { latitude: number; longitude: number }[] = []
  const subLat = subSolarPoint.latitude * Math.PI / 180
  const subLon = subSolarPoint.longitude
  const threshold = altitudeThreshold * Math.PI / 180

  for (let i = 0; i <= latitudeSteps; i++) {
    const lat = -90 + (180 * i / latitudeSteps)
    const latRad = lat * Math.PI / 180

    // 球面三角法: 太陽高度角がthresholdに等しくなる時角を求める
    // sin(threshold) = sin(lat)*sin(subLat) + cos(lat)*cos(subLat)*cos(hourAngle)
    // → cos(hourAngle) = (sin(threshold) - sin(lat)*sin(subLat)) / (cos(lat)*cos(subLat))
    const cosLat = Math.cos(latRad)
    const cosSubLat = Math.cos(subLat)

    if (Math.abs(cosLat) < 1e-10 || Math.abs(cosSubLat) < 1e-10) {
      continue // 極点付近はスキップ
    }

    const cosHourAngle =
      (Math.sin(threshold) - Math.sin(latRad) * Math.sin(subLat)) /
      (cosLat * cosSubLat)

    if (cosHourAngle < -1) {
      // 全域昼（白夜に相当）→ この緯度にterminatorなし
      continue
    }
    if (cosHourAngle > 1) {
      // 全域夜（極夜に相当）→ ポリゴンが全経度幅をカバーするよう地図端を追加
      west.push({ latitude: lat, longitude: -180 })
      east.push({ latitude: lat, longitude: 180 })
      continue
    }

    const hourAngleDeg = Math.acos(cosHourAngle) * 180 / Math.PI
    const lonWest = ((subLon - hourAngleDeg) + 540) % 360 - 180
    const lonEast = ((subLon + hourAngleDeg) + 540) % 360 - 180

    west.push({ latitude: lat, longitude: lonWest })
    east.push({ latitude: lat, longitude: lonEast })
  }
  return { west, east }
}
```

**buildTerminatorPolygon — terminatorポイント列 → SVGポリゴン文字列**:

`getTerminatorPoints`の結果を使い、西側を上→下、東側を下→上で閉路を形成する。

```typescript
function buildTerminatorPolygon(
  subSolarPoint: { latitude: number; longitude: number },
  altitudeThreshold: number
): string {
  const { west, east } = getTerminatorPoints(subSolarPoint, altitudeThreshold, 72)

  if (west.length === 0) return ''

  // 夜側ポリゴン: 西端を順方向、東端を逆方向で連結して閉路を形成
  // SVG points形式: "x1,y1 x2,y2 ..."（viewBox="-180 -90 360 180"に対応）
  const allPoints = [
    ...west.map(p => `${p.longitude},${-p.latitude}`),
    ...[...east].reverse().map(p => `${p.longitude},${-p.latitude}`),
  ]
  return allPoints.join(' ')
}
```

**3段階の濃淡**:

| 太陽高度角 | 分類 | SVGオーバーレイ |
|---|---|---|
| > 0度 | 昼 | なし（地図そのまま） |
| -18度 〜 0度 | 薄明 | 半透明ダークオーバーレイ (opacity 0.3) |
| < -18度 | 夜 | 半透明ダークオーバーレイ (opacity 0.6) |

2つのポリゴンを描画:
1. `altitudeThreshold=0` で昼夜境界ポリゴン → `fill="black" opacity="0.3"`（薄明域を含む夜側全体）
2. `altitudeThreshold=-18` で天文薄明境界ポリゴン → `fill="black" opacity="0.3"`（完全夜側のみ、追加で0.3重ねて合計0.6）

**更新頻度**: 60秒間隔で再描画（太陽は1分で約0.25度移動）。地図を開いている間、terminatorがゆっくり移動する演出になる。`useEffect`内で`setInterval(60000)`で更新。

#### プリセット都市

5都市をSVG `<circle>` でプロット。クリックで選択:

```typescript
const PRESET_CITIES = [
  { name: 'Tokyo',     latitude: 35.6762,  longitude: 139.6503 },
  { name: 'Sydney',    latitude: -33.8688, longitude: 151.2093 },
  { name: 'London',    latitude: 51.5074,  longitude: -0.1278  },
  { name: 'Hawaii',    latitude: 21.3069,  longitude: -157.8583 },
  { name: 'Reykjavik', latitude: 64.1466,  longitude: -21.9426 },
] as const
```

選択中の都市はハイライト表示（fillカラー変更+拡大）。

#### カスタム座標選択

プリセット以外の地図上の任意の場所をクリック:
1. クリック位置のSVG座標を等距円筒図法で緯度経度に逆変換
2. カスタムピンを表示
3. ラベルを自動生成: `"Custom (35.7°N, 139.7°E)"`

#### 情報表示

地図の下部に選択中の地点情報を表示:
- 地点名（都市名 or カスタム座標表記）
- 現在の推定気温・湿度・降水量（グリッドデータから補間）
- 現在の太陽高度角（昼/夜の状態）

#### UIフロー

```
[フリーモード画面]
  地球アイコンボタン (左下)
    ↓ クリック
[世界地図モーダル]
  ┌──────────────────────────────────────────┐
  │  ┌────────────────────────────────────┐  │
  │  │ [世界地図SVG]                      │  │
  │  │  ┄┄┄ 昼域 ┄┄┄┄ 薄明域 ┄┄ 夜域 ┄┄ │  │
  │  │  ● Tokyo (選択中)                 │  │
  │  │  ○ Sydney   ○ London             │  │
  │  │  ○ Hawaii   ○ Reykjavik          │  │
  │  │                                    │  │
  │  │  (地図クリックでカスタム座標選択)  │  │
  │  └────────────────────────────────────┘  │
  │                                          │
  │  Location: Tokyo (35.68N, 139.65E)       │
  │  Temp: 18C  Humidity: 65%  Alt: 42deg   │
  │                                          │
  │               [Set]  [Cancel]            │
  └──────────────────────────────────────────┘
```

ドラフトstate方式: 地図内で選択を変えてもSetボタンを押すまで確定しない。Cancelで元の設定に戻る。

#### 設定反映フロー

1. Set押下 → `ClimateConfig`更新 → `WeatherConfigChanged`イベント発行
2. グリッドデータから選択座標の月別気候データを補間取得
3. `interpolateToKouClimate()`で72候分のKouClimateを生成
4. 天気自動決定（5.5f）に新しいKouClimateを反映
5. settings.jsonに永続化

---

### EnvironmentSimulationService設計

天文計算・気候データ・天気決定・テーマ生成を統合するアプリケーション層のオーケストレーター。

#### インターフェース

```typescript
interface EnvironmentSimulationService {
  /** autoモードを開始。ClimateConfigから気候データをロードしてシミュレーション駆動を開始 */
  start(climate: ClimateConfig): void

  /** 地点変更時に気候データを再取得して再計算 */
  onClimateChanged(climate: ClimateConfig): void

  /** フレームごとに呼ばれる。内部で更新頻度を制御 */
  tick(deltaMs: number): void

  /** autoモードを停止 */
  stop(): void

  /** 現在のシミュレーション結果（読み取り専用） */
  readonly currentSolar: SolarPosition | null
  readonly currentLunar: LunarPosition | null
  readonly currentKou: KouDefinition | null
  readonly currentWeather: WeatherDecision | null
  readonly currentEstimatedTempC: number | null
  readonly kouDateRanges: readonly KouDateRange[]
  readonly isRunning: boolean
}

/** 候の日付範囲 */
interface KouDateRange {
  readonly index: number      // 0-71
  readonly startDate: Date
  readonly endDate: Date
}

/** 候日付範囲計算完了イベント */
interface KouDateRangesComputedEvent {
  readonly type: 'KouDateRangesComputed'
  readonly ranges: readonly KouDateRange[]
}

/**
 * computeKouDateRanges(year, astronomyPort) — 年間全72候の開始日を天文計算で一括算出。
 * searchSunLongitude()の連鎖探索（前の候の開始日を次の探索の起点とする）で効率的に計算。
 * start()時に呼び出され、結果をkouDateRangesゲッターで公開し、KouDateRangesComputedEventをEventBusで発行。
 */
```

#### 内部状態

```typescript
// createEnvironmentSimulationService() の内部変数
let cachedSolar: SolarPosition | null = null
let cachedLunar: LunarPosition | null = null
let cachedKouClimates: readonly KouClimate[] = []
let currentWeatherDecision: WeatherDecision | null = null
let currentKou: KouDefinition | null = null
let currentEstimatedTempC: number = 20

let timeSinceLastAstronomyUpdate = 0       // ms
let lastWeatherDecisionDayOfYear = -1       // 天気決定済みの日（日変更検知用）

const ASTRONOMY_UPDATE_INTERVAL_MS = 30_000 // 30秒
```

#### tick()の処理フロー

```typescript
function tick(deltaMs: number): void {
  if (!isRunning) return

  timeSinceLastAstronomyUpdate += deltaMs

  // --- 30秒間隔の天体位置更新 ---
  if (timeSinceLastAstronomyUpdate >= ASTRONOMY_UPDATE_INTERVAL_MS) {
    timeSinceLastAstronomyUpdate = 0
    const now = new Date()
    const { latitude, longitude } = climate

    // Step 1: 天体位置取得 (5.5a)
    cachedSolar = astronomyPort.getSolarPosition(now, latitude, longitude)
    cachedLunar = astronomyPort.getLunarPosition(now, latitude, longitude)

    // Step 2: 候解決 (5.5d)
    const { kou, progress } = kouProgress(cachedSolar.eclipticLon)
    const previousKou = currentKou
    currentKou = kou

    // Step 3: 気温推定 (5.5e)
    const kouClimate = cachedKouClimates[kou.index]
    currentEstimatedTempC = estimateTemperature(kouClimate, now.getHours())

    // Step 4: 天気決定 — 日変更時のみ (5.5f)
    const dayOfYear = getDayOfYear(now)
    if (dayOfYear !== lastWeatherDecisionDayOfYear) {
      lastWeatherDecisionDayOfYear = dayOfYear
      const seed = mulberry32(now.getFullYear() * 366 + dayOfYear)
      currentWeatherDecision = decideWeather(kouClimate, currentEstimatedTempC, seed)
      // 粒子数更新 (5.5g)
      eventBus.emit({ type: 'WeatherDecisionChanged', decision: currentWeatherDecision })
    }

    // Step 5: テーマ生成 (5.5b)
    const themeParams = computeThemeFromCelestial(
      cachedSolar, cachedLunar, currentWeatherDecision!, currentEstimatedTempC, scenePreset
    )

    // Step 6: 光源方向 (5.5c)
    const lightDir = computeLightDirection(cachedSolar, cachedLunar)

    // Step 7: テーマ遷移
    themeTransitionService.transitionTo(
      { ...themeParams, sunPosition: lightDir.position, sunColor: lightDir.color, sunIntensity: lightDir.intensity },
      ASTRONOMY_UPDATE_INTERVAL_MS // 次の更新までの間隔で滑らかに遷移
    )

    // 候変更イベント (5.5h)
    if (previousKou && previousKou.index !== kou.index) {
      eventBus.emit({ type: 'KouChanged', kou, previousKou })
    }
  }
}
```

#### 更新頻度テーブル

| 計算 | 頻度 | トリガー |
|---|---|---|
| 天体位置（太陽+月） | 30秒 | tick()内タイマー |
| 候解決 | 30秒 | 天体位置更新時に同時実行 |
| 気温推定 | 30秒 | 天体位置更新時に同時実行 |
| 天気決定 | 1日1回 | 日付変更検知時 |
| テーマ生成 | 30秒 | 天体位置更新時に同時実行 |
| 光源方向 | 30秒 | 天体位置更新時に同時実行 |
| 粒子数更新 | 天気変更時 | WeatherDecisionChangedイベント |
| 気候データ取得 | 地点変更時 | onClimateChanged()呼び出し |
| 72候分KouClimate生成 | 地点変更時 | onClimateChanged()内 |

#### ライフサイクル

```
create(astronomyPort, climateGridPort, themeTransitionService, eventBus)
  ↓
start(climate)
  1. climateGridPort.getMonthlyClimate(lat, lon) → monthlyData
  2. interpolateToKouClimate(monthlyData) → cachedKouClimates
  3. 初回の天体位置・天気・テーマを即時計算
  4. isRunning = true
  ↓
tick(deltaMs) — 毎フレーム呼び出し（内部で30秒間隔に制御）
  ↓
onClimateChanged(climate) — 地点変更時
  1. 新しいclimateで気候データ再取得
  2. cachedKouClimates再生成
  3. timeSinceLastAstronomyUpdate = ASTRONOMY_UPDATE_INTERVAL_MS（即時再計算を強制）
  ↓
stop()
  isRunning = false, キャッシュクリア
```

#### ThemeTransitionServiceとの協調

- EnvironmentSimulationServiceは30秒ごとに新しいEnvironmentThemeParamsを生成する
- 生成したパラメータを`themeTransitionService.transitionTo(params, 30000)`で渡す
- 30秒間かけて前のパラメータから新しいパラメータへ滑らかに遷移
- ThemeTransitionServiceのtick()は毎フレーム呼ばれ、補間中間値をThree.jsシーンに適用する
- 遷移中に新しいパラメータが来た場合、現在の中間値から新目標へシームレスに再補間（既存機能）

---

### 統合シーケンス

#### 起動シーケンス（autoWeather状態に関わらず共通）

```
1. AppSettingsService.loadFromStorage()
   → WeatherConfig復元（climate含む）
   → WeatherConfigChangedイベント発行

2. WeatherConfigChangedハンドラ:
   a. オーバーライド設定をstart()より前に適用:
      envSimService.setAutoWeather(autoWeather)
      envSimService.setManualTimeOfDay(timeOfDay) — autoWeather=false かつ autoTimeOfDay=false の場合
      envSimService.setManualWeather({...}) — autoWeather=false の場合
   b. envSimService.start(climate, scenePreset)
      → runFullComputation()で正しいオーバーライド付きテーマ生成
      → applyImmediate()で内部状態設定

3. フォールバックブロック（loadFromStorage後に必ず実行）:
   a. 同じオーバーライド設定を再適用
   b. envSimService.start(climate, scenePreset) — 正しいオーバーライドで再計算
   c. applyThemeToScene(themeTransition.currentParams)
      — applyImmediate()は内部状態のみ更新しtick()はnullを返すため、
        シーンへの反映はここで明示的に行う

4. applyWeatherEffects(wc, true) — 雨/雪/雲パーティクル即座適用（autoWeather=false時）
5. 毎フレームのtick()ループ開始
```

envSimServiceは常に稼働し、天文計算ベースのテーマ生成を行う。autoWeatherはenvSimService内部の天気決定（decideWeather）の有効/無効のみを制御する。

**重要**: オーバーライド設定（setAutoWeather/setManualTimeOfDay/setManualWeather）は必ず`start()`より前に呼ぶ。`start()`内の`runFullComputation()`が正しいオーバーライド値を使用するため。

#### tick()データフロー（30秒間隔、autoWeather状態に関わらず実行）

```
1. 天体位置取得        (5.5a) → SolarPosition, LunarPosition
2. 候解決              (5.5d) → KouDefinition, progress
3. 気温推定            (5.5e) → estimatedTempC
4. 天気決定（autoWeather時のみ、日変更時） (5.5f) → WeatherDecision
5. テーマ生成          (5.5b) → EnvironmentThemeParams（effectiveWeather = auto or manual、timeOfDayOverride時は擬似太陽/月位置を使用）
6. 光源方向            (5.5c) → position, color, intensity（timeOfDayOverride時は擬似位置から算出）
7. 粒子数（天気変更時） (5.5g) → particleCount
```

#### 地点変更時

```
1. WorldMapModalでApply → ClimateConfig更新
2. autoWeather状態を変更しない（ロケーション設定とautoWeatherは独立）
3. EnvironmentSimulationService.onClimateChanged(newClimate)
   a. climateGridPort.getMonthlyClimate(lat, lon) → 月別気候データ
   b. interpolateToKouClimate(monthlyData) → 72候分KouClimate再生成
   c. 即時再計算を強制 → テーマ遷移
4. settings.jsonに永続化
```

#### auto↔手動の切替

```
autoWeather=false → true:
  1. envSimService.setAutoWeather(true)
  2. lastWeatherDecisionDayOfYear=-1（天気再決定を強制）
  3. pendingTransitionDurationMs=1500（手動操作時の短い遷移）
  4. timeSinceLastAstronomyUpdate=INTERVAL（即時再計算）
  5. WeatherPanelのCloud行をdisabled（Weather/Time行はクリック可能）

autoWeather=true → false:
  1. envSimService.setAutoWeather(false)
  2. 手動天気（manualWeatherDecision）でテーマ再計算（遷移1.5秒）
  3. envSimServiceは停止しない（天文計算は継続）
  4. WeatherPanelのCloud行disabled解除
```

#### テーマ遷移時間

手動操作と通常の天体更新で異なる遷移時間を使い分ける。`pendingTransitionDurationMs`で次回の`runFullComputation()`が使う遷移時間を制御する。

| トリガー | 遷移時間 | 設定元 |
|---------|---------|--------|
| 通常30秒間隔tick | 30秒 | ASTRONOMY_UPDATE_INTERVAL_MS（デフォルト） |
| setManualTimeOfDay | 1.5秒 | THEME_TRANSITION_DURATION_MANUAL_MS |
| setManualWeather | 1.5秒 | THEME_TRANSITION_DURATION_MANUAL_MS |
| setAutoWeather | 1.5秒 | THEME_TRANSITION_DURATION_MANUAL_MS |
| onClimateChanged | 1.5秒 | THEME_TRANSITION_DURATION_MANUAL_MS |
| onScenePresetChanged | 1.5秒 | THEME_TRANSITION_DURATION_MANUAL_MS |

### 考慮事項

- **計算コスト**: astronomy-engineの太陽・月位置計算は軽量。10-30秒間隔のポーリングで十分な精度
- **天気の安定性**: 日単位の決定的乱数（hash(year, dayOfYear)）により同じ日は同じ天気。アプリ再起動でも変わらない
- **グリッドデータの精度**: 5度解像度は都市レベルの気候差を表現するには粗いが、バーチャルペットの演出目的には十分。将来的に2度解像度（約2.3MB）に上げる選択肢あり
- **グリッドデータの更新**: WorldClimの平年値は30年平均。数年に1回程度の更新で十分。npm scriptで再ダウンロード→再生成
- **オフライン動作**: グリッドデータはアプリに同梱されるため、完全オフラインで動作。外部API不要
- **既存THEME_TABLEとの共存**: envSimServiceが常に稼働し天文計算ベースのテーマを生成。autoWeather=false時は手動天気をenvSimServiceに渡してテーマ計算に使用（THEME_TABLE直接参照は廃止済み）。手動timeOfDay時は擬似太陽/月位置でテーマを生成
- **起動時テーマ適用の注意**: `ThemeTransitionService.applyImmediate()`は内部状態（`current`）を更新するが、`tick()`は`transitionState=null`のため`null`を返す。main.tsのアニメーションループは`tick()≠null`の場合のみ`applyThemeToScene()`を呼ぶため、起動時は`applyThemeToScene(themeTransition.currentParams)`を明示的に呼ぶ必要がある
- **手動timeOfDayの擬似太陽位置**: autoWeather=false かつ autoTimeOfDay=false 時、`setManualTimeOfDay(timeOfDay)`で擬似太陽/月位置を使用してテーマを生成する。擬似値は morning=高度10°/方位90°(東)、day=50°/180°(南)、evening=5°/270°(西)、night=-20°/0°(地平線下)。夜間は半月（illuminationFraction=0.5）の月光も擬似的に表現する。候計算（eclipticLon）には実太陽位置を使用し影響しない
- **autoWeatherとautoTimeOfDayの関係**: autoWeather=true時はWeather/Cloud/Time行すべてをグレーアウト。autoWeather=false時にautoTimeOfDayを個別に設定可能。将来的には`autoEnvironment`に統合する選択肢あり
- **Natural Earth SVGのライセンス**: パブリックドメイン。同梱に制約なし
- **WorldClimのライセンス**: CC BY 4.0。クレジット表記が必要。THIRD_PARTY_LICENSES.txtに追記する
- **極地の天文計算**: 白夜（太陽altitude常に正）や極夜（常に負）が発生する。Reykjavik（北緯64°）では夏至に太陽が沈まず、冬至に最大高度約3°になる。これらのケースではcomputeThemeFromCelestialが自然に対応する（altitudeが常に正なら常に日中パラメータ、常に低角度なら常に薄暗い日中パラメータになる）

---

### エラーハンドリング

#### グリッドデータ読み込み失敗

`ClimateGridAdapter`はビルド時にバンドルされたJSONデータを`createClimateGridAdapter(data)`で受け取る。データは`assets/data/climate-grid.json`にあり、`import`文でJSバンドルに埋め込まれる。データが存在しない場合はビルドエラーになる（ランタイムフォールバックなし）。

グリッド上に該当地点がない場合（海洋上など）は`findNearest()`で最大半径5グリッドの近傍探索を行い、最寄りの陸地データにスナップする。全近傍がnullの場合はbilinear補間内で`?? 15`のフォールバック値が使われる。

#### 海洋座標の選択

WorldClimグリッドは陸地のみ。海洋上の座標が選択された場合:

1. 最寄りの陸地グリッド点を検索（ユークリッド距離で最近傍）
2. その陸地グリッド点のデータを使用
3. UIに注記: `"Using nearest land climate data"`

バーチャルペットの環境演出目的では、海洋上の気温・降水量が厳密に正しい必要はない。最寄り陸地の近似で十分。

#### 無効な緯度経度

```typescript
function sanitizeCoordinates(lat: number, lon: number): { latitude: number; longitude: number } {
  const latitude = Math.max(-90, Math.min(90, lat))
  const longitude = ((lon % 360) + 540) % 360 - 180
  return { latitude, longitude }
}
```

UIの地図クリックでは座標が常に有効範囲内になるが、settings.json手動編集やデータ破損に備える防御的処理。

#### 極地エッジケース

| 状況 | 都市例 | 天文計算の挙動 | 環境パラメータへの影響 |
|---|---|---|---|
| 白夜（太陽が沈まない） | Reykjavik夏至 | altitude常に正（最低約3度） | 夜間パラメータに入らない。24時間薄明〜日中の範囲で変動 |
| 極夜（太陽が昇らない） | Reykjavik冬至 | altitude常に負（最高約-3度） | 常に薄明〜夜間。月光が唯一の変動要因 |
| 低い正午太陽 | Reykjavik冬 | 正午の最大altitude約3度 | exposure/sunIntensityが低い。薄暗い日中 |
| 熱帯（低緯度） | Hawaii | 日の出/日の入が急速（薄明時間が短い） | morningとeveningの遷移が短時間で完了 |

これらはcomputeThemeFromCelestialの連続関数が自然に処理する。特別な分岐は不要。

---

### テストケース

各純粋関数の代表的な入力→期待出力ペア。テスト実装時にパラメタライズドテストとして記述する。

#### computeThemeFromCelestial

| ケース | solar.altitude | lunar | weatherDecision | 期待: exposure | 期待: sunIntensity範囲 | 期待: skyColor傾向 |
|---|---|---|---|---|---|---|
| 正午晴天 | 60度 | below horizon | sunny, precip=0 | 1.1-1.2 | 2.0-2.5 | 青系 |
| 朝方晴天 | 15度 | below horizon | sunny, precip=0 | 0.7-0.9 | 0.5-1.0 | 橙〜青の中間 |
| 真夜中満月 | -30度 | alt=45度, illum=1.0 | sunny, precip=0 | 0.15-0.3 | 0 | 紺系 |
| 真夜中新月 | -30度 | alt=20度, illum=0.0 | sunny, precip=0 | 0.05-0.1 | 0 | 暗紺 |
| 曇り日中 | 45度 | below horizon | cloudy, cloud=0.7 | 0.8-1.0 | 0.8-1.2 | 灰青系 |
| 雨・日中 | 45度 | below horizon | rainy, precip=0.6 | 0.6-0.8 | 0.5-0.8 | 暗灰系 |
| 薄明上端(0度) | 0度 | alt=30度, illum=0.5 | sunny, precip=0 | dayExposure寄り | 0付近 | 橙系(薄明色) |
| 薄明中間(-3度) | -3度 | alt=30度, illum=0.5 | sunny, precip=0 | day/night中間 | 0 | 橙〜紺の中間 |
| 薄明下端(-6度) | -6度 | alt=30度, illum=0.5 | sunny, precip=0 | nightExposure寄り | 0 | 紺寄り |

薄明帯のテスト検証ポイント: altitude=0度の値がaltitude=+1度の値に近く、altitude=-6度の値がaltitude=-7度の値に近いこと（smoothstepの端でほぼフラット）。altitude=-3度付近ではday/nightの中間値になること。

#### resolveKou / kouProgress

| ケース | eclipticLon | 期待: index | 期待: solarTermName | 期待: nameJa |
|---|---|---|---|---|
| 春分初候 | 0.0度 | 15 | 春分 | 雀始巣 |
| 春分初候途中 | 2.5度 | 15 | 春分 | 雀始巣 |
| 春分次候開始 | 5.0度 | 16 | 春分 | 桜始開 |
| 夏至初候 | 90.0度 | 33 | 夏至 | 乃東枯 |
| 小寒初候 | 285.0度 | 0 | 小寒 | 芹乃栄 |
| 冬至末候 | 284.9度 | 71 | 冬至 | 雪下出麦 |

#### decideWeather

| ケース | precipProb | avgHumidity | estimatedTempC | seed判定 | 期待: weather |
|---|---|---|---|---|---|
| 高降水+低温 | 0.7 | 80 | -2 | seed < precipProb | snowy |
| 高降水+高温 | 0.7 | 80 | 15 | seed < precipProb | rainy |
| 低降水+低湿度 | 0.1 | 40 | 20 | seed >= precipProb | sunny |
| 低降水+高湿度(2nd hit) | 0.1 | 75 | 20 | seed >= precipProb, 2nd < 0.4 | cloudy |
| 低降水+高湿度(2nd miss) | 0.1 | 75 | 20 | seed >= precipProb, 2nd >= 0.4 | sunny |

#### estimateTemperature

| ケース | avgTempC | high/low | hourOfDay | 期待: tempC範囲 |
|---|---|---|---|---|
| 14時（最高付近） | 20 | 25/15 | 14 | 24-25 |
| 5時（最低付近） | 20 | 25/15 | 5 | 15-16 |
| 20時（夜間） | 20 | 25/15 | 20 | 17-20 |

#### computeParticleCount

| ケース | weather | precipIntensity | 期待: count範囲 |
|---|---|---|---|
| 小雨 | rainy | 0.1 | 100-200 |
| 普通の雨 | rainy | 0.35 | 300-450 |
| 豪雨 | rainy | 0.9 | 900-1200 |
| 小雪 | snowy | 0.1 | 100-150 |
| 大雪 | snowy | 0.9 | 700-900 |

#### getSubSolarPoint

| ケース | solarDeclination | greenwichHourAngle | 期待: lat | 期待: lon |
|---|---|---|---|---|
| 春分・正午UTC | 0度 | 0度 | 0度 | 0度 |
| 夏至・正午UTC | 23.44度 | 0度 | 23.44度 | 0度 |
| 春分・18時UTC | 0度 | 90度 | 0度 | -90度 |

#### getTerminatorPoints

| ケース | subSolarPoint | altitudeThreshold | 検証 |
|---|---|---|---|
| 春分・正午UTC | (0度, 0度) | 0度 | 昼夜境界が経度+-90度付近を通る |
| 夏至・正午UTC | (23.44度, 0度) | 0度 | 北極圏(>66.5°N)はスキップ(白夜)、南極圏(<-66.5°S)はwest=-180/east=180(極夜) |
| 春分・正午UTC | (0度, 0度) | -18度 | 天文薄明境界が0度境界より約18度外側 |

---

### 既存コードとの接合点

#### WeatherConfig型の拡張

```typescript
// Phase 5.5 拡張: climateをoptionalで追加
interface WeatherConfig {
  readonly weather: WeatherType
  readonly timeOfDay: TimeOfDay
  readonly autoWeather: boolean
  readonly autoTimeOfDay: boolean
  readonly cloudDensityLevel: CloudDensityLevel
  readonly scenePreset: ScenePresetName
  readonly climate?: ClimateConfig  // optional: 未設定時はTokyoデフォルト
}
```

`updateWeatherConfig(partial: Partial<WeatherConfig>)`は既存のPartialパターンで`climate`フィールドを自然に受け入れる。追加の変更は不要。

`createDefaultWeatherConfig()`にデフォルトのclimateを追加:

```typescript
const DEFAULT_CLIMATE: ClimateConfig = {
  mode: 'preset',
  presetName: 'Tokyo',
  latitude: 35.6762,
  longitude: 139.6503,
  label: 'Tokyo',
}

function createDefaultWeatherConfig(): WeatherConfig {
  return {
    weather: 'sunny',
    timeOfDay: 'day',
    autoWeather: false,
    autoTimeOfDay: false,
    cloudDensityLevel: 1,
    scenePreset: 'meadow',
    climate: DEFAULT_CLIMATE,
  }
}
```

#### loadFromStorage() でのclimate復元

既存の`AppSettingsService.loadFromStorage()`（240-256行）のWeatherConfig復元パターンに`climate`を追加する。既存settings.jsonに`climate`キーがない場合はデフォルト（Tokyo）にフォールバック。

```typescript
// 既存パターンに追加する復元コード
const climate = w.climate && typeof w.climate === 'object'
  ? validateClimateConfig(w.climate as Record<string, unknown>)
  : DEFAULT_CLIMATE

currentWeather = {
  weather: w.weather as WeatherConfig['weather'],
  timeOfDay: w.timeOfDay as WeatherConfig['timeOfDay'],
  autoWeather: typeof w.autoWeather === 'boolean' ? w.autoWeather : false,
  autoTimeOfDay: typeof w.autoTimeOfDay === 'boolean' ? w.autoTimeOfDay : true,
  cloudDensityLevel: typeof w.cloudDensityLevel === 'number'
    ? w.cloudDensityLevel as WeatherConfig['cloudDensityLevel']
    : DEFAULT_WEATHER.cloudDensityLevel,
  scenePreset: typeof w.scenePreset === 'string' && validPresets.includes(w.scenePreset)
    ? w.scenePreset as WeatherConfig['scenePreset']
    : 'meadow',
  climate,  // 新フィールド
}
```

#### validateClimateConfig

```typescript
/** ClimateConfigの復元時バリデーション */
function validateClimateConfig(raw: Record<string, unknown>): ClimateConfig {
  const validModes = ['preset', 'custom']
  const mode = typeof raw.mode === 'string' && validModes.includes(raw.mode)
    ? raw.mode as 'preset' | 'custom'
    : 'preset'
  const latitude = typeof raw.latitude === 'number'
    ? Math.max(-90, Math.min(90, raw.latitude))
    : DEFAULT_CLIMATE.latitude
  const longitude = typeof raw.longitude === 'number'
    ? ((raw.longitude % 360) + 540) % 360 - 180  // sanitizeCoordinatesと同じ正規化
    : DEFAULT_CLIMATE.longitude
  const label = typeof raw.label === 'string' ? raw.label : DEFAULT_CLIMATE.label
  const presetName = typeof raw.presetName === 'string' ? raw.presetName : undefined
  return { mode, latitude, longitude, label, presetName }
}
```

#### WeatherEffectインターフェースの拡張

```typescript
// Phase 5.5g 拡張: setParticleCountをoptionalメソッドで追加
interface WeatherEffect {
  update(deltaMs: number): void
  setVisible(visible: boolean): void
  fadeIn(durationMs: number): void
  fadeOut(durationMs: number): void
  dispose(): void
  setParticleCount?(count: number): void  // optional: 後方互換
}
```

呼び出し側で存在チェック:

```typescript
if (effect.setParticleCount) {
  effect.setParticleCount(computeParticleCount(weather, precipIntensity))
}
```

`setParticleCount`の実装方針（`setDrawRange()`方式）:

初期化時に最大粒子数でBufferGeometryを確保し、`setDrawRange()`で描画範囲を制御する。RainEffectのスプラッシュ（既存実装）と同じパターン。BufferGeometry再生成は不要。

```typescript
// RainEffect内部
const PARTICLE_COUNT_MAX = 1200  // 最大粒子数（現行650 → 最大1200）
let currentParticleCount = 650   // 初期値（手動モード互換）

// 初期化時: 最大粒子数でBufferGeometry確保
const rainPositions = new Float32Array(PARTICLE_COUNT_MAX * 2 * 3)
// ... 初期配置は currentParticleCount 分だけ

setParticleCount(count: number): void {
  const clamped = Math.max(0, Math.min(count, PARTICLE_COUNT_MAX))
  if (Math.abs(clamped - currentParticleCount) < currentParticleCount * 0.1) return  // 10%未満は無視
  currentParticleCount = clamped
  rainGeo.setDrawRange(0, currentParticleCount * 2)  // LineSegmentsは頂点数=粒子数*2
}

// update()内: currentParticleCount までのみ更新（CPU負荷削減）
for (let i = 0; i < currentParticleCount; i++) { ... }
```

SnowEffectも同様（`PARTICLE_COUNT_MAX = 900`、`setDrawRange(0, currentParticleCount)`）。

VRAM増加量: 雨(1200-650)*6floats*4bytes=13.2KB、雪(900-750)*3floats*4bytes=1.8KB。合計15KB未満で許容範囲。

#### WeatherPanel autoWeather=true時のグレーアウト

```typescript
const isAutoMode = weatherConfig.autoWeather

// Weather行・Cloud行・Time行のボタン
<button
  style={{
    pointerEvents: isAutoMode ? 'none' : 'auto',
    opacity: isAutoMode ? 0.4 : 1.0,
  }}
>
```

autoWeather=true時の表示挙動:
- Weather行/Time行: 常に操作可能。操作するとautoWeatherが自動的にfalseに切り替わる
- Cloud行: disabled（autoWeather時は雲量も自動決定）。autoWeather解除後に操作可能
- Autoボタンは天気アイコン（Sunny/Cloudy/Rainy/Snowy）と排他選択。Autoクリック→autoWeather=true、Weather/Time行のボタンクリック→autoWeather=false
- autoWeather=true時はAutoのみがactive。Weather/Cloud/Time行のボタンはactive表示されない
- Scene行は常に操作可能（autoモードでもscenePresetは手動選択、autoWeatherに影響しない）
- Locationボタン（GlobeIcon）はWeatherPanel Scene行の右端に配置（`marginLeft: 'auto'`で右寄せ）。クリックでenvironmentシーン内のworldMapビューに遷移し、WorldMapのcloseでweatherビューに復帰

---

### ライセンスとアセット

#### WorldClim クレジット表記

`THIRD_PARTY_LICENSES.txt`に追記:

```
WorldClim 2.1 - Global Climate Data
License: Creative Commons Attribution 4.0 International (CC BY 4.0)
URL: https://www.worldclim.org/
Citation: Fick, S.E. and R.J. Hijmans, 2017. WorldClim 2: new 1km
          spatial resolution climate surfaces for global land areas.
          International Journal of Climatology 37 (12): 4302-4315.
Usage: Downsampled to 5-degree resolution grid for virtual pet
       environment simulation. Bundled as assets/climate/grid-data.json.
```

#### Natural Earth SVGの前処理

2つの方法がある。方法Bを推奨（ogr2ogr/GDAL不要）。

**方法A: Shapefile経由（ogr2ogr必要）**

```bash
# 1. Natural Earth 110m海岸線データをダウンロード
curl -O https://naciscdn.org/naturalearth/110m/physical/ne_110m_coastline.zip
unzip ne_110m_coastline.zip -d ne_coastline

# 2. ogr2ogrでShapefile→GeoJSONに変換（GDALが必要: apt install gdal-bin）
ogr2ogr -f GeoJSON coastline.geojson ne_coastline/ne_110m_coastline.shp

# 3. Node.jsスクリプトでGeoJSON→SVGパスに変換
npx tsx scripts/convert-coastline-to-svg.ts
```

**方法B: GeoJSON直接ダウンロード（推奨）**

Natural Earthは[GitHub](https://github.com/nvkelso/natural-earth-vector)でGeoJSON形式も配布している。ogr2ogrなしで変換可能。

```bash
# 1. GeoJSONを直接ダウンロード
curl -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_coastline.geojson

# 2. Node.jsスクリプトでGeoJSON→SVGパスに変換
npx tsx scripts/convert-coastline-to-svg.ts
```

変換スクリプト（`scripts/convert-coastline-to-svg.ts`）の処理:
1. GeoJSONのFeature.geometry.coordinates[]を読み込み
2. 各LineString座標列をSVG `<path d="M x y L x y ...">` に変換
3. 座標変換: `x = lon`, `y = -lat`（viewBox="-180 -90 360 180" に合わせる）
4. パス文字列をSVGテンプレートに埋め込み
5. `assets/map/coastline.svg`に出力

npm script登録:
```json
{
  "scripts": {
    "map:convert": "tsx scripts/convert-coastline-to-svg.ts"
  }
}
```

Natural Earthデータはパブリックドメイン。クレジット表記は不要だが、感謝としてTHIRD_PARTY_LICENSES.txtに記載:

```
Natural Earth - Free vector and raster map data
License: Public Domain
URL: https://www.naturalearthdata.com/
Usage: 110m coastline data used for world map UI (assets/map/coastline.svg).
```

#### アセット配置パス

```
assets/                          (private submodule)
  climate/
    grid-data.json               (WorldClim 5度グリッド, ~300KB)
  map/
    coastline.svg                (Natural Earth 110m海岸線, ~50KB)
```

ビルド時にVite publicDirとして`/climate/grid-data.json`、`/map/coastline.svg`でアクセス可能。
