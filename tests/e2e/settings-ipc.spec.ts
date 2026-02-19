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
  await page.waitForSelector('#timer-overlay', { timeout: 15_000 })
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
  const toggleBtn = page.locator('button').filter({ has: page.locator('svg') }).first()
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

test('アプリ再起動後にテーマ設定が復元される', async () => {
  // VITE_DEBUG_TIMER有効時はタイマー設定の復元がスキップされるため、
  // テーマ設定で永続化・復元を検証する

  // 1回目: テーマをDarkに変更して保存
  const { electronApp: app1, page: page1 } = await launchFresh()

  const toggleBtn1 = page1.locator('button').filter({ has: page1.locator('svg') }).first()
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
