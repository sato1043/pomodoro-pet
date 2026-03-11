import { app, BrowserWindow, dialog } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { loadSettings, saveSettings, loadStatistics, saveStatistics, loadEmotionHistory, saveEmotionHistory } from './settings'

interface ExportImportResult {
  success: boolean
  error?: string
}

function getAppVersion(): string {
  return app.getVersion()
}

function formatDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isNonNullObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isVersionCompatible(exportedVersion: string, currentVersion: string): boolean {
  const exportedMajor = parseInt(exportedVersion.split('.')[0], 10)
  const currentMajor = parseInt(currentVersion.split('.')[0], 10)
  if (isNaN(exportedMajor) || isNaN(currentMajor)) return false
  return exportedMajor === currentMajor
}

function validateExportData(data: unknown, currentVersion: string): { valid: boolean; error?: string } {
  if (!isNonNullObject(data)) {
    return { valid: false, error: 'Invalid format: not a JSON object' }
  }
  if (typeof data.version !== 'string' || data.version.trim() === '') {
    return { valid: false, error: 'Missing or invalid "version" field' }
  }
  if (!isVersionCompatible(data.version, currentVersion)) {
    return { valid: false, error: `Incompatible version: exported from v${data.version}, current is v${currentVersion}` }
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

export async function handleExportData(): Promise<ExportImportResult> {
  const window = BrowserWindow.getFocusedWindow()
  if (!window) return { success: false, error: 'No active window' }

  const defaultFileName = `pomodoro-pet-backup-${formatDate()}.json`

  const result = await dialog.showSaveDialog(window, {
    title: 'Export Data',
    defaultPath: defaultFileName,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })

  if (result.canceled || !result.filePath) {
    return { success: false, error: 'cancelled' }
  }

  try {
    const exportData = {
      version: getAppVersion(),
      exportedAt: new Date().toISOString(),
      settings: loadSettings() ?? {},
      statistics: loadStatistics() ?? {},
      emotionHistory: loadEmotionHistory() ?? {},
    }

    writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8')
    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return { success: false, error: `Export failed: ${message}` }
  }
}

export async function handleImportData(): Promise<ExportImportResult> {
  const window = BrowserWindow.getFocusedWindow()
  if (!window) return { success: false, error: 'No active window' }

  const openResult = await dialog.showOpenDialog(window, {
    title: 'Import Data',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  })

  if (openResult.canceled || openResult.filePaths.length === 0) {
    return { success: false, error: 'cancelled' }
  }

  const filePath = openResult.filePaths[0]

  let parsed: unknown
  try {
    const raw = readFileSync(filePath, 'utf-8')
    parsed = JSON.parse(raw)
  } catch {
    return { success: false, error: 'Failed to read or parse the file' }
  }

  const validation = validateExportData(parsed, getAppVersion())
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const data = parsed as {
    version: string
    settings: Record<string, unknown>
    statistics: Record<string, unknown>
    emotionHistory: Record<string, unknown>
  }

  // インポート確認ダイアログ
  const confirm = dialog.showMessageBoxSync(window, {
    type: 'warning',
    buttons: ['Cancel', 'Import & Restart'],
    defaultId: 0,
    cancelId: 0,
    title: 'Confirm Import',
    message: 'Import data and restart?',
    detail: `This will overwrite your current settings, statistics, and emotion history with data from v${data.version}. The app will restart after import.`,
  })

  if (confirm !== 1) {
    return { success: false, error: 'cancelled' }
  }

  try {
    // deviceId と license 関連フィールドは現在の値を保持する
    const currentSettings = loadSettings() ?? {}
    const mergedSettings = {
      ...data.settings,
      deviceId: currentSettings.deviceId,
      downloadKey: currentSettings.downloadKey,
      jwt: currentSettings.jwt,
    }

    saveSettings(mergedSettings)
    saveStatistics(data.statistics)
    saveEmotionHistory(data.emotionHistory)

    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return { success: false, error: `Import failed: ${message}` }
  }
}
