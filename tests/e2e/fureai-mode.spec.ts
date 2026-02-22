import { test, expect } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  await closeApp(app)
})

test('fureai-entryクリックでoverlay-fureaiが表示される', async () => {
  const { page } = app

  await page.locator('[data-testid="fureai-entry"]').click()

  // blackout遷移（約700ms）を考慮
  await expect(page.locator('[data-testid="overlay-fureai"]')).toBeVisible({ timeout: 5_000 })
})

test('overlay-fureaiにPomodoro Petテキストが含まれる', async () => {
  const { page } = app

  // 前テストでfureaiモードに遷移済み
  const fureaiOverlay = page.locator('[data-testid="overlay-fureai"]')
  await expect(fureaiOverlay.getByText('Pomodoro Pet', { exact: false })).toBeVisible()
})

test('ふれあいモード中にfreeモードのボタンが非表示でfureai-exitが表示', async () => {
  const { page } = app

  // fureaiモード中
  await expect(page.locator('[data-testid="fureai-exit"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).not.toBeVisible()
  await expect(page.locator('[data-testid="settings-toggle"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="stats-toggle"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="weather-toggle"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="fureai-entry"]')).not.toBeVisible()
})

test('fureai-exitクリックでoverlay-freeが再表示される', async () => {
  const { page } = app

  await page.locator('[data-testid="fureai-exit"]').click()

  // blackout遷移を考慮
  await expect(page.locator('[data-testid="overlay-free"]')).toBeVisible({ timeout: 5_000 })
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})
