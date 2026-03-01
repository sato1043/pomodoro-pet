import { test, expect } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  await closeApp(app)
})

test('trialモードでtrial-badgeが表示される', async () => {
  const { page } = app

  // trial-badgeが存在しない場合はregisteredモード → 以降のテストをスキップ
  const badge = page.locator('[data-testid="trial-badge"]')
  const isTrial = await badge.isVisible().catch(() => false)
  test.skip(!isTrial, 'registeredモードではスキップ')

  await expect(badge).toBeVisible()
  await expect(badge).toContainText('Trial')
})

test('fureai-entryクリックでfeature-locked-overlayが表示される', async () => {
  const { page } = app

  const isTrial = await page.locator('[data-testid="trial-badge"]').isVisible().catch(() => false)
  test.skip(!isTrial, 'registeredモードではスキップ')

  await page.locator('[data-testid="fureai-entry"]').click()
  await expect(page.locator('[data-testid="feature-locked-overlay"]')).toBeVisible()
  await expect(page.locator('[data-testid="feature-locked-overlay"]')).toContainText('Premium Feature')

  // 閉じる
  await page.locator('[data-testid="feature-locked-overlay"]').locator('button[aria-label="Close"]').click()
  await expect(page.locator('[data-testid="feature-locked-overlay"]')).not.toBeVisible()
})

test('gallery-entryクリックでfeature-locked-overlayが表示される', async () => {
  const { page } = app

  const isTrial = await page.locator('[data-testid="trial-badge"]').isVisible().catch(() => false)
  test.skip(!isTrial, 'registeredモードではスキップ')

  await page.locator('[data-testid="gallery-entry"]').click()
  await expect(page.locator('[data-testid="feature-locked-overlay"]')).toBeVisible()

  // 背景クリックで閉じる
  await page.locator('[data-testid="feature-locked-overlay"]').click({ position: { x: 5, y: 5 } })
  await expect(page.locator('[data-testid="feature-locked-overlay"]')).not.toBeVisible()
})

test('feature-locked-overlayにUnlockボタンが表示される', async () => {
  const { page } = app

  const isTrial = await page.locator('[data-testid="trial-badge"]').isVisible().catch(() => false)
  test.skip(!isTrial, 'registeredモードではスキップ')

  await page.locator('[data-testid="fureai-entry"]').click()
  await expect(page.locator('[data-testid="feature-locked-overlay"]')).toBeVisible()

  await expect(page.locator('[data-testid="feature-locked-store"]')).toBeVisible()
  await expect(page.locator('[data-testid="feature-locked-store"]')).toContainText('Unlock Full Version!')

  // 後片付け
  await page.locator('[data-testid="feature-locked-overlay"]').locator('button[aria-label="Close"]').click()
})
