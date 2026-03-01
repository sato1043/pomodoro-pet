import { test, expect } from '@playwright/test'
import { launchApp, closeApp, setLicenseMode, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
  await setLicenseMode(app, 'registered')
})

test.afterAll(async () => {
  await closeApp(app)
})

test('fureai-entryクリックでfureaiモードに遷移する', async () => {
  const { page } = app

  await page.locator('[data-testid="fureai-entry"]').click()

  // blackout遷移（約700ms）を考慮。compact-headerはfureaiモードで表示される
  await expect(page.locator('[data-testid="compact-header"]')).toBeVisible({ timeout: 5_000 })
  await page.waitForSelector('[data-testid="overlay-fureai"]', { state: 'attached', timeout: 5_000 })
})

test('fureaiモードにPomodoro Petテキストが含まれる', async () => {
  const { page } = app

  await expect(page.locator('[data-testid="compact-header"]').getByText('Pomodoro Pet', { exact: false })).toBeVisible()
})

test('ふれあいモード中にfreeモードのボタンが非表示でfureai-exitが表示', async () => {
  const { page } = app

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
