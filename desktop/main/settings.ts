import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { randomUUID } from 'crypto'

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function getStatisticsPath(): string {
  return join(app.getPath('userData'), 'statistics.json')
}

function getEmotionHistoryPath(): string {
  return join(app.getPath('userData'), 'emotion-history.json')
}

export function loadSettings(): Record<string, unknown> | null {
  try {
    const data = readFileSync(getSettingsPath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

export function saveSettings(settings: Record<string, unknown>): void {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

export function loadStatistics(): Record<string, unknown> | null {
  try {
    const data = readFileSync(getStatisticsPath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

export function saveStatistics(data: Record<string, unknown>): void {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  writeFileSync(getStatisticsPath(), JSON.stringify(data, null, 2), 'utf-8')
}

export function loadEmotionHistory(): Record<string, unknown> | null {
  try {
    const data = readFileSync(getEmotionHistoryPath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

export function saveEmotionHistory(data: Record<string, unknown>): void {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  writeFileSync(getEmotionHistoryPath(), JSON.stringify(data, null, 2), 'utf-8')
}

export function getOrCreateDeviceId(): string {
  const settings = loadSettings()
  if (settings && typeof settings.deviceId === 'string') {
    return settings.deviceId
  }
  const deviceId = randomUUID()
  const updated = settings ? { ...settings, deviceId } : { deviceId }
  saveSettings(updated)
  return deviceId
}
