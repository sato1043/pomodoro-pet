/**
 * エクスポート/インポート用のデータ型とバリデーション
 */

export interface ExportData {
  readonly version: string
  readonly exportedAt: string
  readonly settings: Record<string, unknown>
  readonly statistics: Record<string, unknown>
  readonly emotionHistory: Record<string, unknown>
}

export interface ValidationResult {
  readonly valid: boolean
  readonly error?: string
}

/**
 * メジャーバージョンが一致すれば互換性ありと判定する
 */
function isVersionCompatible(exportedVersion: string, currentVersion: string): boolean {
  const exportedMajor = parseInt(exportedVersion.split('.')[0], 10)
  const currentMajor = parseInt(currentVersion.split('.')[0], 10)
  if (isNaN(exportedMajor) || isNaN(currentMajor)) return false
  return exportedMajor === currentMajor
}

function isNonNullObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * エクスポートデータのバリデーション
 *
 * @param data - パース済みJSON
 * @param currentVersion - 現在のアプリバージョン（互換性チェック用）
 */
export function validateExportData(data: unknown, currentVersion: string): ValidationResult {
  if (!isNonNullObject(data)) {
    return { valid: false, error: 'Invalid format: not a JSON object' }
  }

  if (typeof data.version !== 'string' || data.version.trim() === '') {
    return { valid: false, error: 'Missing or invalid "version" field' }
  }

  if (!isVersionCompatible(data.version, currentVersion)) {
    return {
      valid: false,
      error: `Incompatible version: exported from v${data.version}, current is v${currentVersion}`,
    }
  }

  if (typeof data.exportedAt !== 'string' || data.exportedAt.trim() === '') {
    return { valid: false, error: 'Missing or invalid "exportedAt" field' }
  }

  if (!isNonNullObject(data.settings)) {
    return { valid: false, error: 'Missing or invalid "settings" field' }
  }

  if (!isNonNullObject(data.statistics)) {
    return { valid: false, error: 'Missing or invalid "statistics" field' }
  }

  if (!isNonNullObject(data.emotionHistory)) {
    return { valid: false, error: 'Missing or invalid "emotionHistory" field' }
  }

  return { valid: true }
}
