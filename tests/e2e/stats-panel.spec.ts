import { test, expect } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  await closeApp(app)
})

test('StatsButtonクリックでパネルが開きstats-closeが表示される', async () => {
  const { page } = app

  await page.locator('[data-testid="stats-toggle"]').click()

  await expect(page.locator('[data-testid="stats-close"]')).toBeVisible()
})

test('Statistics見出しが表示される', async () => {
  const { page } = app

  // 前テストでパネルが開いたまま
  await expect(page.getByText('Statistics')).toBeVisible()

  // 後片付け: 閉じる
  await page.locator('[data-testid="stats-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('stats-closeクリックでoverlay-free再表示とStart Pomodoro復帰', async () => {
  const { page } = app

  // 開く
  await page.locator('[data-testid="stats-toggle"]').click()
  await expect(page.locator('[data-testid="stats-close"]')).toBeVisible()

  // 閉じる
  await page.locator('[data-testid="stats-close"]').click()

  await expect(page.locator('[data-testid="overlay-free"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('統計パネル表示中に他ボタンが非表示', async () => {
  const { page } = app

  await page.locator('[data-testid="stats-toggle"]').click()
  await expect(page.locator('[data-testid="stats-close"]')).toBeVisible()

  // 他ボタンが非表示
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).not.toBeVisible()
  await expect(page.locator('[data-testid="settings-toggle"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="fureai-entry"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="weather-toggle"]')).not.toBeVisible()

  // 後片付け: 閉じる
  await page.locator('[data-testid="stats-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})
