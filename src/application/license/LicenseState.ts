/**
 * ライセンス状態の型定義と判定ロジック（純粋関数）
 *
 * ドメイン層ではなくアプリケーション層に配置する理由:
 * - 外部サービス（ハートビートAPI、JWT）の概念を含むため
 * - ビジネスロジックだが外部依存の型を参照する
 */

// --- 型定義 ---

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
  | 'weatherSettings'
  | 'soundSettings'
  | 'backgroundNotify'
  | 'emotionAccumulation'
  | 'autoUpdate'

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

/**
 * 機能利用可否を判定する純粋関数
 *
 * 機能制限表:
 * | 機能               | registered | trial | expired | restricted |
 * |--------------------|-----------|-------|---------|------------|
 * | pomodoroTimer      | o         | o     | o       | o          |
 * | timerSettings      | o         | o     | x       | x          |
 * | character          | o         | o     | o       | o          |
 * | stats              | o         | o     | x       | x          |
 * | fureai             | o         | o     | x       | x          |
 * | weatherSettings    | o         | o     | x       | x          |
 * | soundSettings      | o         | o     | x       | x          |
 * | backgroundNotify   | o         | o     | x       | x          |
 * | emotionAccumulation| o         | o     | x       | x          |
 * | autoUpdate         | o         | o     | x       | x          |
 */
export function isFeatureEnabled(mode: LicenseMode, feature: FeatureName): boolean {
  // registered と trial は全機能利用可能
  if (mode === 'registered' || mode === 'trial') return true

  // expired と restricted は基本機能のみ
  const alwaysEnabled: ReadonlySet<FeatureName> = new Set([
    'pomodoroTimer',
    'character',
  ])
  return alwaysEnabled.has(feature)
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
