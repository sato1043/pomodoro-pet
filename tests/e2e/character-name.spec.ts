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

async function setRegistered(electronApp: ElectronApplication, page: Page): Promise<void> {
  await electronApp.evaluate(({ BrowserWindow }, m) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      win.webContents.send('license:changed', { mode: m })
    }
  }, 'registered')
  await page.waitForSelector('[data-testid="trial-badge"]', { state: 'hidden', timeout: 5_000 }).catch(() => {})
  await page.waitForTimeout(300)
}

async function enterFureai(page: Page): Promise<void> {
  await page.locator('[data-testid="fureai-entry"]').click()
  await expect(page.locator('[data-testid="compact-header"]')).toBeVisible({ timeout: 5_000 })
}

test('ふれあいモードで名前UIが表示される', async () => {
  const { electronApp, page } = await launchFresh()
  await setRegistered(electronApp, page)
  await enterFureai(page)

  const editor = page.locator('[data-testid="character-name-editor"]')
  await expect(editor).toBeVisible({ timeout: 5_000 })

  const display = page.locator('[data-testid="character-name-display"]')
  await expect(display).toHaveText('Wildboar')

  await electronApp.close()
})

test('名前のインライン編集ができる', async () => {
  const { electronApp, page } = await launchFresh()
  await setRegistered(electronApp, page)
  await enterFureai(page)

  // 編集ボタンをクリックして編集モードに入る
  await page.locator('[data-testid="character-name-edit-button"]').click()
  const input = page.locator('[data-testid="character-name-input"]')
  await expect(input).toBeVisible()

  // 名前を変更してEnterで確定
  await input.fill('Taro')
  await input.press('Enter')

  // 表示モードに戻り、新しい名前が表示される
  await expect(page.locator('[data-testid="character-name-display"]')).toHaveText('Taro')

  await electronApp.close()
})

test('名前がsettings.jsonに永続化される', async () => {
  const { electronApp, page } = await launchFresh()
  await setRegistered(electronApp, page)
  await enterFureai(page)

  const userDataPath = await electronApp.evaluate(({ app }) => app.getPath('userData'))

  // 名前を変更
  await page.locator('[data-testid="character-name-edit-button"]').click()
  const input = page.locator('[data-testid="character-name-input"]')
  await input.fill('PetName')
  await input.press('Enter')
  await page.waitForTimeout(500)

  // settings.jsonで永続化を確認
  const settingsPath = join(userDataPath, 'settings.json')
  expect(existsSync(settingsPath)).toBe(true)

  const savedSettings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
  expect(savedSettings.character?.name).toBe('PetName')

  await electronApp.close()
})

test('再起動後に名前が復元される', async () => {
  // 1回目: 名前を変更して保存
  const { electronApp: app1, page: page1 } = await launchFresh()
  await setRegistered(app1, page1)
  await enterFureai(page1)

  await page1.locator('[data-testid="character-name-edit-button"]').click()
  const input1 = page1.locator('[data-testid="character-name-input"]')
  await input1.fill('SavedName')
  await input1.press('Enter')
  await page1.waitForTimeout(500)

  await app1.close()

  // 2回目: 再起動して復元を確認
  const { electronApp: app2, page: page2 } = await launchFresh()
  await setRegistered(app2, page2)
  await enterFureai(page2)

  await expect(page2.locator('[data-testid="character-name-display"]')).toHaveText('SavedName')

  await app2.close()
})

test('空文字確定でデフォルト名に復帰する', async () => {
  const { electronApp, page } = await launchFresh()
  await setRegistered(electronApp, page)
  await enterFureai(page)

  // まず名前を変更
  await page.locator('[data-testid="character-name-edit-button"]').click()
  let input = page.locator('[data-testid="character-name-input"]')
  await input.fill('TempName')
  await input.press('Enter')
  await expect(page.locator('[data-testid="character-name-display"]')).toHaveText('TempName')

  // 空文字で確定 → デフォルト名に復帰
  await page.locator('[data-testid="character-name-edit-button"]').click()
  input = page.locator('[data-testid="character-name-input"]')
  await input.fill('')
  await input.press('Enter')

  await expect(page.locator('[data-testid="character-name-display"]')).toHaveText('Wildboar')

  await electronApp.close()
})

test('free/pomodoroモードでは名前UIが非表示', async () => {
  const { electronApp, page } = await launchFresh()

  // freeモードで名前UIが存在しないことを確認
  const editor = page.locator('[data-testid="character-name-editor"]')
  await expect(editor).not.toBeVisible()

  await electronApp.close()
})
