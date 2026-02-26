import { test, expect } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { resolve } from 'path'

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

test('ライセンス関連APIがレンダラーで利用可能', async () => {
  const { electronApp, page } = await launchFresh()

  const hasCheckLicenseStatus = await page.evaluate(() => {
    return typeof (window as any).electronAPI.checkLicenseStatus === 'function'
  })
  expect(hasCheckLicenseStatus).toBe(true)

  const hasRegisterLicense = await page.evaluate(() => {
    return typeof (window as any).electronAPI.registerLicense === 'function'
  })
  expect(hasRegisterLicense).toBe(true)

  const hasOpenExternal = await page.evaluate(() => {
    return typeof (window as any).electronAPI.openExternal === 'function'
  })
  expect(hasOpenExternal).toBe(true)

  const hasOnLicenseChanged = await page.evaluate(() => {
    return typeof (window as any).electronAPI.onLicenseChanged === 'function'
  })
  expect(hasOnLicenseChanged).toBe(true)

  await electronApp.close()
})

test('アップデート関連APIがレンダラーで利用可能', async () => {
  const { electronApp, page } = await launchFresh()

  const hasCheckForUpdate = await page.evaluate(() => {
    return typeof (window as any).electronAPI.checkForUpdate === 'function'
  })
  expect(hasCheckForUpdate).toBe(true)

  const hasDownloadUpdate = await page.evaluate(() => {
    return typeof (window as any).electronAPI.downloadUpdate === 'function'
  })
  expect(hasDownloadUpdate).toBe(true)

  const hasInstallUpdate = await page.evaluate(() => {
    return typeof (window as any).electronAPI.installUpdate === 'function'
  })
  expect(hasInstallUpdate).toBe(true)

  const hasOnUpdateStatus = await page.evaluate(() => {
    return typeof (window as any).electronAPI.onUpdateStatus === 'function'
  })
  expect(hasOnUpdateStatus).toBe(true)

  await electronApp.close()
})

test('設定パネルにRegisterリンクが表示される', async () => {
  const { electronApp, page } = await launchFresh()

  // 設定パネルを展開
  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  // Registerリンクが存在する
  const registerLink = page.locator('[data-testid="register-link"]')
  await expect(registerLink).toBeVisible()

  // テキストが「Register」または「Registered (...)」
  const text = await registerLink.textContent()
  expect(text).toBeTruthy()
  expect(text!.includes('Register')).toBe(true)

  await electronApp.close()
})

test('Registerリンクをクリックすると登録パネルが表示される', async () => {
  const { electronApp, page } = await launchFresh()

  // 設定パネルを展開
  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  // Registerリンクをクリック
  await page.locator('[data-testid="register-link"]').click()

  // RegistrationContentが表示される（Aboutと同じインラインパネル）
  const panel = page.locator('[data-testid="registration-content"]')
  await expect(panel).toBeVisible()

  // 入力欄とRegisterボタンが存在する
  await expect(page.locator('[data-testid="registration-input"]')).toBeVisible()
  await expect(page.locator('[data-testid="registration-submit"]')).toBeVisible()

  // CloseButton（戻るボタン）が表示される（SetButtonではない）
  await expect(page.locator('[data-testid="doc-close-button"]')).toBeVisible()
  await expect(page.locator('[data-testid="set-button"]')).not.toBeVisible()

  await electronApp.close()
})

test('CloseButtonで登録パネルから設定パネルに戻る', async () => {
  const { electronApp, page } = await launchFresh()

  // 設定パネルを展開 → Registerリンク → 登録パネル表示
  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()
  await page.locator('[data-testid="register-link"]').click()
  await expect(page.locator('[data-testid="registration-content"]')).toBeVisible()

  // CloseButtonをクリック
  await page.locator('[data-testid="doc-close-button"]').click()

  // 設定パネルに戻る（SetButtonが復帰）
  await expect(page.locator('[data-testid="registration-content"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  await electronApp.close()
})

test('空のキーでRegisterボタンを押すとエラーが表示される', async () => {
  const { electronApp, page } = await launchFresh()

  // 設定パネルを展開 → Registerリンク → 登録パネル表示
  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()
  await page.locator('[data-testid="register-link"]').click()
  await expect(page.locator('[data-testid="registration-content"]')).toBeVisible()

  // 空のままRegisterをクリック
  await page.locator('[data-testid="registration-submit"]').click()

  // エラーメッセージが表示される
  const errorText = page.locator('[data-testid="registration-content"]').getByText('Please enter a download key')
  await expect(errorText).toBeVisible()

  // パネルは閉じない
  await expect(page.locator('[data-testid="registration-content"]')).toBeVisible()

  await electronApp.close()
})

test('登録パネルのキー入力欄にテキストを入力できる', async () => {
  const { electronApp, page } = await launchFresh()

  // 設定パネルを展開 → Registerリンク → 登録パネル表示
  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()
  await page.locator('[data-testid="register-link"]').click()
  await expect(page.locator('[data-testid="registration-content"]')).toBeVisible()

  // テキスト入力
  const input = page.locator('[data-testid="registration-input"]')
  await input.fill('test-download-key-12345')
  await expect(input).toHaveValue('test-download-key-12345')

  await electronApp.close()
})

// deviceIdの自動生成はHEARTBEAT_URL設定済み環境のresolveLicense内でのみ動作する。
// E2Eテスト環境ではHEARTBEAT_URLが未設定のためresolveLicenseがスキップされ、deviceId生成テストは不可。
// パッケージ済みアプリでの手動テストで検証する。

test('loadRegistrationGuide APIがレンダラーで利用可能', async () => {
  const { electronApp, page } = await launchFresh()

  const hasLoadRegistrationGuide = await page.evaluate(() => {
    return typeof (window as any).electronAPI.loadRegistrationGuide === 'function'
  })
  expect(hasLoadRegistrationGuide).toBe(true)

  // 実際にロードできることを確認
  const guideText = await page.evaluate(() => {
    return (window as any).electronAPI.loadRegistrationGuide()
  })
  expect(typeof guideText).toBe('string')
  expect(guideText.length).toBeGreaterThan(0)
  expect(guideText).toContain('REGISTRATION GUIDE')

  await electronApp.close()
})
