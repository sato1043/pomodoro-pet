/**
 * ライセンス状態の型定義と判定ロジック（純粋関数）
 *
 * ドメイン層ではなくアプリケーション層に配置する理由:
 * - 外部サービス（ハートビートAPI、JWT）の概念を含むため
 * - ビジネスロジックだが外部依存の型を参照する
 */

// --- 型定義 ---

export type ReleaseChannel = 'stable' | 'beta' | 'alpha'

export type LicenseMode = 'registered' | 'trial' | 'expired' | 'restricted'

export interface HeartbeatResponse {
  readonly registered: boolean
  readonly trialValid: boolean
  readonly trialDaysRemaining: number
  readonly jwt?: string
  readonly latestVersion: string
  readonly updateAvailable: boolean
  readonly serverMessage?: string
  readonly forceUpdate?: boolean
}

export interface LicenseContext {
  readonly online: boolean
  readonly heartbeatResponse: HeartbeatResponse | null
  readonly jwt: string | null
  readonly jwtValid: boolean
  readonly jwtDeviceMatch: boolean
  readonly jwtFresh: boolean    // iat が24時間以内
  readonly jwtExpired: boolean  // exp が過去
}

export type FeatureName =
  | 'pomodoroTimer'
  | 'timerSettings'
  | 'character'
  | 'stats'
  | 'fureai'
  | 'gallery'
  | 'weatherSettings'
  | 'soundSettings'
  | 'backgroundNotify'
  | 'emotionAccumulation'
  | 'autoUpdate'
  | 'biorhythm'
  | 'dataExportImport'

// --- 判定ロジック ---

/**
 * ライセンス状態を判定する純粋関数
 *
 * 判定フロー:
 * 1. ハートビートレスポンスがある場合 → レスポンスに基づく判定
 * 2. オフライン + 有効JWT → registered
 * 3. オフライン + JWTなし → restricted
 * 4. JWT が24時間以内で有効 → registered（ハートビート不要）
 */
export function resolveLicenseMode(ctx: LicenseContext): LicenseMode {
  // 有効なJWTが24時間以内かつdeviceId一致 → ハートビートなしでregistered
  if (ctx.jwt && ctx.jwtValid && ctx.jwtDeviceMatch && ctx.jwtFresh && !ctx.jwtExpired) {
    return 'registered'
  }

  // ハートビートレスポンスがある場合
  if (ctx.heartbeatResponse) {
    if (ctx.heartbeatResponse.registered) return 'registered'
    if (ctx.heartbeatResponse.trialValid) return 'trial'
    return 'expired'
  }

  // オフライン判定
  if (!ctx.online) {
    // 有効なJWTがある（署名有効 + deviceId一致） → registered（期限切れでも利用可能）
    if (ctx.jwt && ctx.jwtValid && ctx.jwtDeviceMatch) return 'registered'
    // JWTなし → restricted
    return 'restricted'
  }

  // オンラインだがハートビートなし（エラー等）
  if (ctx.jwt && ctx.jwtValid && ctx.jwtDeviceMatch) return 'registered'
  return 'restricted'
}

// --- リリースチャネル ---

/**
 * チャネル包含レベル: alpha(2) ⊃ beta(1) ⊃ stable(0)
 *
 * alpha チャネルのビルドは beta/stable の全機能を含む。
 * stable チャネルのビルドは stable の機能のみ含む。
 */
const CHANNEL_LEVEL: Readonly<Record<ReleaseChannel, number>> = {
  stable: 0,
  beta: 1,
  alpha: 2,
} as const

/**
 * 各機能が公開されるチャネル
 *
 * 新機能追加時にここに登録する。未登録の機能は stable 扱い。
 * alpha/beta 機能が安定したら stable に昇格させる。
 */
const FEATURE_CHANNEL: Readonly<Record<FeatureName, ReleaseChannel>> = {
  pomodoroTimer: 'stable',
  timerSettings: 'stable',
  character: 'stable',
  stats: 'stable',
  fureai: 'stable',
  gallery: 'stable',
  weatherSettings: 'stable',
  soundSettings: 'stable',
  backgroundNotify: 'stable',
  emotionAccumulation: 'stable',
  autoUpdate: 'stable',
  biorhythm: 'stable',
  dataExportImport: 'stable',
} as const

/**
 * 機能の公開チャネルを取得する
 *
 * UIバッジ表示（Beta/Alpha）の判定に使用する。
 */
export function getFeatureChannel(feature: FeatureName): ReleaseChannel {
  return FEATURE_CHANNEL[feature] ?? 'stable'
}

/**
 * 指定チャネルで機能が利用可能かを判定する
 *
 * alpha(2) >= beta(1) >= stable(0) の包含関係で判定する。
 */
export function isFeatureInChannel(feature: FeatureName, channel: ReleaseChannel): boolean {
  return CHANNEL_LEVEL[channel] >= CHANNEL_LEVEL[FEATURE_CHANNEL[feature] ?? 'stable']
}

/**
 * 現在のチャネルを解決する
 *
 * 環境変数 VITE_RELEASE_CHANNEL（renderer）または __RELEASE_CHANNEL__（main）の値を
 * ReleaseChannel に正規化する。不正値は stable にフォールバック。
 */
export function resolveReleaseChannel(raw: string | undefined): ReleaseChannel {
  if (raw === 'alpha' || raw === 'beta' || raw === 'stable') return raw
  return 'stable'
}

// --- 機能有効化マップ（デフォルト無効） ---

const ALL_FEATURES: readonly FeatureName[] = [
  'pomodoroTimer', 'timerSettings', 'character', 'stats', 'fureai',
  'gallery', 'weatherSettings', 'soundSettings', 'backgroundNotify',
  'emotionAccumulation', 'autoUpdate', 'biorhythm', 'dataExportImport',
] as const

const ENABLED_FEATURES: Readonly<Record<LicenseMode, ReadonlySet<FeatureName>>> = {
  registered: new Set<FeatureName>(ALL_FEATURES),
  trial:      new Set<FeatureName>(ALL_FEATURES.filter(f => f !== 'fureai' && f !== 'gallery' && f !== 'biorhythm' && f !== 'dataExportImport')),
  expired:    new Set<FeatureName>(['pomodoroTimer', 'character']),
  restricted: new Set<FeatureName>(['pomodoroTimer', 'character']),
}

/**
 * 機能利用可否を判定する純粋関数
 *
 * 2軸判定:
 * 1. チャネルフィルタ — 機能が現在のチャネルで公開されているか
 * 2. ライセンス判定 — ENABLED_FEATURESに明示的に列挙された機能のみ有効
 *
 * デフォルト無効方式: 新機能追加時にマップへの追加を忘れると全モードで無効になる（安全側に倒れる）。
 * channel を省略すると stable として判定する（後方互換）。
 */
export function isFeatureEnabled(mode: LicenseMode, feature: FeatureName, channel: ReleaseChannel = 'stable'): boolean {
  if (!isFeatureInChannel(feature, channel)) return false
  return ENABLED_FEATURES[mode]?.has(feature) ?? false
}

/**
 * ハートビートが必要かどうかを判定する純粋関数
 *
 * 不要: JWTあり + 署名有効 + deviceId一致 + iat 24時間以内 + 未期限切れ
 * 必要: それ以外
 */
export function needsHeartbeat(ctx: Pick<LicenseContext, 'jwt' | 'jwtValid' | 'jwtDeviceMatch' | 'jwtFresh' | 'jwtExpired'>): boolean {
  if (ctx.jwt && ctx.jwtValid && ctx.jwtDeviceMatch && ctx.jwtFresh && !ctx.jwtExpired) {
    return false
  }
  return true
}
