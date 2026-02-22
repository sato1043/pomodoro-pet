import { test, expect } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  await closeApp(app)
})

test('初期状態で全ボタンが表示される', async () => {
  const { page } = app

  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
  await expect(page.locator('[data-testid="stats-toggle"]')).toBeVisible()
  await expect(page.locator('[data-testid="settings-toggle"]')).toBeVisible()
  await expect(page.locator('[data-testid="fureai-entry"]')).toBeVisible()
  await expect(page.locator('[data-testid="weather-toggle"]')).toBeVisible()
})

test('設定展開時にsettings-close+set-buttonが表示され他ボタンが非表示', async () => {
  const { page } = app

  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.getByRole('button', { name: 'Set' })).toBeVisible()

  // settings-closeが表示
  await expect(page.locator('[data-testid="settings-close"]')).toBeVisible()
  // set-buttonが表示
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  // 他ボタンが非表示
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).not.toBeVisible()
  await expect(page.locator('[data-testid="stats-toggle"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="fureai-entry"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="weather-toggle"]')).not.toBeVisible()

  // 後片付け: 閉じる
  await page.locator('[data-testid="settings-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('統計パネル時にstats-closeが表示され他ボタンが非表示', async () => {
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

test('天気パネル時にweather-closeが表示され他ボタンが非表示', async () => {
  const { page } = app

  await page.locator('[data-testid="weather-toggle"]').click()
  await expect(page.locator('[data-testid="weather-sunny"]')).toBeVisible()

  // weather-closeが表示
  await expect(page.locator('[data-testid="weather-close"]')).toBeVisible()

  // 他ボタンが非表示
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).not.toBeVisible()
  await expect(page.locator('[data-testid="stats-toggle"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="settings-toggle"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="fureai-entry"]')).not.toBeVisible()

  // 後片付け: 閉じる
  await page.locator('[data-testid="weather-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('各パネルを順番に開閉すると全ボタンが毎回復帰する', async () => {
  const { page } = app

  const allButtons = async () => {
    await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
    await expect(page.locator('[data-testid="stats-toggle"]')).toBeVisible()
    await expect(page.locator('[data-testid="settings-toggle"]')).toBeVisible()
    await expect(page.locator('[data-testid="fureai-entry"]')).toBeVisible()
    await expect(page.locator('[data-testid="weather-toggle"]')).toBeVisible()
  }

  // 設定パネル
  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="settings-close"]')).toBeVisible()
  await page.locator('[data-testid="settings-close"]').click()
  await allButtons()

  // 統計パネル
  await page.locator('[data-testid="stats-toggle"]').click()
  await expect(page.locator('[data-testid="stats-close"]')).toBeVisible()
  await page.locator('[data-testid="stats-close"]').click()
  await allButtons()

  // 天気パネル
  await page.locator('[data-testid="weather-toggle"]').click()
  await expect(page.locator('[data-testid="weather-sunny"]')).toBeVisible()
  await page.locator('[data-testid="weather-close"]').click()
  await allButtons()
})
