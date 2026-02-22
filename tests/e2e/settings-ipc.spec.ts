import { test, expect } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { resolve, join } from 'path'
import { readFileSync, existsSync } from 'fs'

const PROJECT_ROOT = resolve(__dirname, '../..')

async function launchFresh(): Promise<{ electronApp: ElectronApplication; page: Page }> {
  const electronApp = await electron.launch({
    args: [resolve(PROJECT_ROOT, 'out/main/index.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  })
  const page = await electronApp.firstWindow()
  await page.waitForSelector('[data-testid="overlay-free"]', { timeout: 15_000 })
  return { electronApp, page }
}

test('electronAPIがレンダラーで利用可能', async () => {
  const { electronApp, page } = await launchFresh()

  // レンダラー側からwindow.electronAPIの存在を確認
  const hasApi = await page.evaluate(() => {
    return typeof (window as any).electronAPI !== 'undefined'
  })
  expect(hasApi).toBe(true)

  // electronAPI.loadSettingsが関数であることを確認
  const hasLoadSettings = await page.evaluate(() => {
    return typeof (window as any).electronAPI.loadSettings === 'function'
  })
  expect(hasLoadSettings).toBe(true)

  // electronAPI.saveSettingsが関数であることを確認
  const hasSaveSettings = await page.evaluate(() => {
    return typeof (window as any).electronAPI.saveSettings === 'function'
  })
  expect(hasSaveSettings).toBe(true)

  await electronApp.close()
})

test('設定変更がsettings.jsonに永続化される', async () => {
  const { electronApp, page } = await launchFresh()

  // userDataパスをメインプロセスから取得
  const userDataPath = await electronApp.evaluate(({ app }) => app.getPath('userData'))

  // 展開 → Work 50を選択 → Set確定
  const toggleBtn = page.locator('[data-testid="settings-toggle"]')
  await toggleBtn.click()
  await expect(page.getByRole('button', { name: 'Set' })).toBeVisible()

  const work50 = page.locator('button[data-cfg="work"]').filter({ hasText: '50' })
  await work50.click()
  await page.getByRole('button', { name: 'Set' }).click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()

  // 保存の非同期処理を待つ
  await page.waitForTimeout(500)

  // テストプロセスのNode.jsでsettings.jsonを読み込む
  const settingsPath = join(userDataPath, 'settings.json')
  expect(existsSync(settingsPath)).toBe(true)

  const savedSettings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
  expect(savedSettings.timer?.workMinutes).toBe(50)

  await electronApp.close()
})

test('showNotification APIがレンダラーで利用可能', async () => {
  const { electronApp, page } = await launchFresh()

  const hasShowNotification = await page.evaluate(() => {
    return typeof (window as any).electronAPI.showNotification === 'function'
  })
  expect(hasShowNotification).toBe(true)

  await electronApp.close()
})

test('BG設定がsettings.jsonに永続化される', async () => {
  const { electronApp, page } = await launchFresh()

  const userDataPath = await electronApp.evaluate(({ app }) => app.getPath('userData'))

  // 展開
  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  // BG Audio OFF（トグルクリック）
  const bgAudioToggle = page.locator('[data-testid="bg-audio-toggle"]')
  // 前回テストの永続化データでOFFの場合があるので、activeならクリックしてOFF、非activeならクリック2回でOFF
  const isActive = await bgAudioToggle.evaluate(el => el.classList.contains('active'))
  if (isActive) {
    await bgAudioToggle.click()
  } else {
    // 既にOFFなら一度ONにしてからOFF
    await bgAudioToggle.click()
    await bgAudioToggle.click()
  }
  await expect(bgAudioToggle).not.toHaveClass(/active/)

  // Set確定
  await page.locator('[data-testid="set-button"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
  await page.waitForTimeout(500)

  const settingsPath = join(userDataPath, 'settings.json')
  expect(existsSync(settingsPath)).toBe(true)

  const savedSettings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
  expect(savedSettings.background?.backgroundAudio).toBe(false)

  await electronApp.close()
})

test('アプリ再起動後にBG設定が復元される', async () => {
  // 1回目: BG Notify OFFにして保存
  const { electronApp: app1, page: page1 } = await launchFresh()

  await page1.locator('[data-testid="settings-toggle"]').click()
  await expect(page1.locator('[data-testid="set-button"]')).toBeVisible()

  const bgNotifyToggle = page1.locator('[data-testid="bg-notify-toggle"]')
  // 確実にOFFにする
  const isActive = await bgNotifyToggle.evaluate(el => el.classList.contains('active'))
  if (isActive) {
    await bgNotifyToggle.click()
  }
  await expect(bgNotifyToggle).not.toHaveClass(/active/)

  await page1.locator('[data-testid="set-button"]').click()
  await expect(page1.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
  await page1.waitForTimeout(500)

  await app1.close()

  // 2回目: 再起動して設定が復元されているか確認
  const { electronApp: app2, page: page2 } = await launchFresh()

  await page2.locator('[data-testid="settings-toggle"]').click()
  await expect(page2.locator('[data-testid="set-button"]')).toBeVisible()
  await page2.waitForTimeout(500)

  // BG Notifyのトグルがactive無し（OFF）であることを確認
  const bgNotifyToggle2 = page2.locator('[data-testid="bg-notify-toggle"]')
  const classes = await bgNotifyToggle2.getAttribute('class')
  expect(classes).not.toContain('active')

  await app2.close()
})

test('statistics APIがレンダラーで利用可能', async () => {
  const { electronApp, page } = await launchFresh()

  const hasLoadStatistics = await page.evaluate(() => {
    return typeof (window as any).electronAPI.loadStatistics === 'function'
  })
  expect(hasLoadStatistics).toBe(true)

  const hasSaveStatistics = await page.evaluate(() => {
    return typeof (window as any).electronAPI.saveStatistics === 'function'
  })
  expect(hasSaveStatistics).toBe(true)

  await electronApp.close()
})

test('天気設定がsettings.jsonに永続化される', async () => {
  const { electronApp, page } = await launchFresh()

  const userDataPath = await electronApp.evaluate(({ app }) => app.getPath('userData'))

  // Weatherパネルを開く
  await page.locator('[data-testid="weather-toggle"]').click()
  await expect(page.locator('[data-testid="weather-sunny"]')).toBeVisible()

  // rainy + nightに変更
  await page.locator('[data-testid="weather-rainy"]').click()
  await page.locator('[data-testid="time-night"]').click()

  // Setで確定
  await page.locator('[data-testid="set-button"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
  await page.waitForTimeout(500)

  // settings.jsonを確認
  const settingsPath = join(userDataPath, 'settings.json')
  const savedSettings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
  expect(savedSettings.weather?.weather).toBe('rainy')
  expect(savedSettings.weather?.timeOfDay).toBe('night')

  await electronApp.close()
})

test('アプリ再起動後に天気設定が復元される', async () => {
  // 1回目: cloudyに変更して保存
  const { electronApp: app1, page: page1 } = await launchFresh()

  await page1.locator('[data-testid="weather-toggle"]').click()
  await expect(page1.locator('[data-testid="weather-sunny"]')).toBeVisible()

  await page1.locator('[data-testid="weather-cloudy"]').click()
  await page1.locator('[data-testid="time-evening"]').click()

  await page1.locator('[data-testid="set-button"]').click()
  await expect(page1.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
  await page1.waitForTimeout(500)

  await app1.close()

  // 2回目: 再起動して復元を確認
  const { electronApp: app2, page: page2 } = await launchFresh()

  await page2.locator('[data-testid="weather-toggle"]').click()
  await page2.waitForTimeout(500)

  await expect(page2.locator('[data-testid="weather-cloudy"]')).toHaveClass(/active/)
  await expect(page2.locator('[data-testid="time-evening"]')).toHaveClass(/active/)

  // 閉じる
  await page2.locator('[data-testid="weather-close"]').click()

  await app2.close()
})

test('アプリ再起動後にテーマ設定が復元される', async () => {
  // VITE_DEBUG_TIMER有効時はタイマー設定の復元がスキップされるため、
  // テーマ設定で永続化・復元を検証する

  // 1回目: テーマをDarkに変更して保存
  const { electronApp: app1, page: page1 } = await launchFresh()

  const toggleBtn1 = page1.locator('[data-testid="settings-toggle"]')
  await toggleBtn1.click()
  await expect(page1.getByRole('button', { name: 'Set' })).toBeVisible()

  // Darkテーマを選択
  await page1.getByRole('button', { name: 'Dark' }).click()

  // Setで確定
  await page1.getByRole('button', { name: 'Set' }).click()
  await expect(page1.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
  await page1.waitForTimeout(500)

  await app1.close()

  // 2回目: 再起動してテーマが復元されているか確認
  const { electronApp: app2, page: page2 } = await launchFresh()

  // darkテーマが適用されていることをcolorSchemeで確認
  // vanilla-extractのglobalStyleがcolorScheme: 'dark'を設定する
  await page2.waitForTimeout(1000) // テーマ復元の非同期処理を待つ
  const colorScheme = await page2.evaluate(() =>
    getComputedStyle(document.documentElement).colorScheme
  )
  expect(colorScheme).toBe('dark')

  await app2.close()
})
