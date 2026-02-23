import { test, expect } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  await closeApp(app)
})

test('設定パネルに4つの法的文書リンクが表示される', async () => {
  const { page } = app

  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  await expect(page.locator('[data-testid="about-link"]')).toBeVisible()
  await expect(page.locator('[data-testid="eula-link"]')).toBeVisible()
  await expect(page.locator('[data-testid="privacy-link"]')).toBeVisible()
  await expect(page.locator('[data-testid="licenses-link"]')).toBeVisible()

  await page.locator('[data-testid="settings-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('EULAパネルの表示とCloseボタンで設定に戻る', async () => {
  const { page } = app

  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  await page.locator('[data-testid="eula-link"]').click()
  await expect(page.locator('[data-testid="legal-doc-content"]')).toBeVisible()
  await expect(page.locator('[data-testid="legal-doc-content"]')).toContainText('EULA')

  // Setボタン非表示、Closeボタン表示
  await expect(page.locator('[data-testid="set-button"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="doc-close-button"]')).toBeVisible()

  // Closeで設定パネルに戻る
  await page.locator('[data-testid="doc-close-button"]').click()
  await expect(page.locator('[data-testid="legal-doc-content"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  await page.locator('[data-testid="settings-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('Privacy Policyパネルの表示とCloseボタンで設定に戻る', async () => {
  const { page } = app

  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  await page.locator('[data-testid="privacy-link"]').click()
  await expect(page.locator('[data-testid="legal-doc-content"]')).toBeVisible()
  await expect(page.locator('[data-testid="legal-doc-content"]')).toContainText('Privacy Policy')

  await expect(page.locator('[data-testid="set-button"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="doc-close-button"]')).toBeVisible()

  await page.locator('[data-testid="doc-close-button"]').click()
  await expect(page.locator('[data-testid="legal-doc-content"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  await page.locator('[data-testid="settings-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('Third-partyパネルの表示とCloseボタンで設定に戻る', async () => {
  const { page } = app

  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  await page.locator('[data-testid="licenses-link"]').click()
  await expect(page.locator('[data-testid="legal-doc-content"]')).toBeVisible()
  await expect(page.locator('[data-testid="legal-doc-content"]')).toContainText('Third-party Licenses')

  await expect(page.locator('[data-testid="set-button"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="doc-close-button"]')).toBeVisible()

  await page.locator('[data-testid="doc-close-button"]').click()
  await expect(page.locator('[data-testid="legal-doc-content"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  await page.locator('[data-testid="settings-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('AboutにPolyFormライセンス本文が表示される', async () => {
  const { page } = app

  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  await page.locator('[data-testid="about-link"]').click()
  await expect(page.locator('[data-testid="about-content"]')).toBeVisible()
  await expect(page.locator('[data-testid="about-content"]')).toContainText('PolyForm Noncommercial')

  await page.locator('[data-testid="doc-close-button"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  await page.locator('[data-testid="settings-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('←ボタンでドキュメントパネルからfreeモードに戻る', async () => {
  const { page } = app

  // 設定パネルを展開してEULAを開く
  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  await page.locator('[data-testid="eula-link"]').click()
  await expect(page.locator('[data-testid="legal-doc-content"]')).toBeVisible()

  // ←ボタン（settings-close）でfreeモードに戻る
  await page.locator('[data-testid="settings-close"]').click()

  // freeモードに戻る（Start Pomodoroが見える、ドキュメントパネルは非表示）
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
  await expect(page.locator('[data-testid="legal-doc-content"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="set-button"]')).not.toBeVisible()
})
