import { test, expect } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  await closeApp(app)
})

test('WeatherButtonが表示されクリックでパネルが開く', async () => {
  const { page } = app

  const weatherBtn = page.locator('[data-testid="weather-toggle"]')
  await expect(weatherBtn).toBeVisible()

  await weatherBtn.click()

  // パネルが表示される（天気ボタンの存在で確認）
  await expect(page.locator('[data-testid="weather-sunny"]')).toBeVisible()

  // 閉じる
  await page.locator('[data-testid="weather-close"]').click()
})

test('WeatherPanel表示時に他ボタンが非表示になる', async () => {
  const { page } = app

  // 初期状態: 各ボタンが見える
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
  await expect(page.locator('[data-testid="stats-toggle"]')).toBeVisible()
  await expect(page.locator('[data-testid="settings-toggle"]')).toBeVisible()
  await expect(page.locator('[data-testid="fureai-entry"]')).toBeVisible()

  // Weatherパネルを開く
  await page.locator('[data-testid="weather-toggle"]').click()
  await expect(page.locator('[data-testid="weather-sunny"]')).toBeVisible()

  // 他ボタンが非表示
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).not.toBeVisible()
  await expect(page.locator('[data-testid="stats-toggle"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="settings-toggle"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="fureai-entry"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="weather-toggle"]')).not.toBeVisible()

  // 閉じる
  await page.locator('[data-testid="weather-close"]').click()

  // ボタンが復帰
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('WeatherCloseButtonでパネルが閉じる', async () => {
  const { page } = app

  await page.locator('[data-testid="weather-toggle"]').click()
  await expect(page.locator('[data-testid="weather-sunny"]')).toBeVisible()

  await page.locator('[data-testid="weather-close"]').click()

  // パネルが閉じた（天気ボタンが非表示）
  await expect(page.locator('[data-testid="weather-sunny"]')).not.toBeVisible()

  // freeモードのボタンが復帰
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('天気タイプの切替でactive状態が変化する', async () => {
  const { page } = app

  await page.locator('[data-testid="weather-toggle"]').click()
  await expect(page.locator('[data-testid="weather-sunny"]')).toBeVisible()

  // 初期状態: sunnyがactive
  await expect(page.locator('[data-testid="weather-sunny"]')).toHaveClass(/active/)

  // rainyをクリック
  await page.locator('[data-testid="weather-rainy"]').click()
  await expect(page.locator('[data-testid="weather-rainy"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="weather-sunny"]')).not.toHaveClass(/active/)

  // snowyをクリック
  await page.locator('[data-testid="weather-snowy"]').click()
  await expect(page.locator('[data-testid="weather-snowy"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="weather-rainy"]')).not.toHaveClass(/active/)

  // cloudyをクリック
  await page.locator('[data-testid="weather-cloudy"]').click()
  await expect(page.locator('[data-testid="weather-cloudy"]')).toHaveClass(/active/)

  // sunnyに戻す
  await page.locator('[data-testid="weather-sunny"]').click()
  await expect(page.locator('[data-testid="weather-sunny"]')).toHaveClass(/active/)

  // 閉じる（Setを押さずに閉じる=復元）
  await page.locator('[data-testid="weather-close"]').click()
})

test('autoWeatherボタンが非活性（disabled）', async () => {
  const { page } = app

  await page.locator('[data-testid="weather-toggle"]').click()
  await expect(page.locator('[data-testid="weather-auto"]')).toBeVisible()

  // disabled属性を確認
  await expect(page.locator('[data-testid="weather-auto"]')).toBeDisabled()

  await page.locator('[data-testid="weather-close"]').click()
})

test('時間帯切替でactive状態が変化する', async () => {
  const { page } = app

  await page.locator('[data-testid="weather-toggle"]').click()

  // Morningをクリック
  await page.locator('[data-testid="time-morning"]').click()
  await expect(page.locator('[data-testid="time-morning"]')).toHaveClass(/active/)

  // Nightをクリック
  await page.locator('[data-testid="time-night"]').click()
  await expect(page.locator('[data-testid="time-night"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="time-morning"]')).not.toHaveClass(/active/)

  // Autoをクリック
  await page.locator('[data-testid="time-auto"]').click()
  await expect(page.locator('[data-testid="time-auto"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="time-night"]')).not.toHaveClass(/active/)

  // Dayに戻す
  await page.locator('[data-testid="time-day"]').click()

  await page.locator('[data-testid="weather-close"]').click()
})

test('Setを押さずに閉じるとスナップショットから復元される', async () => {
  const { page } = app

  // パネルを開く
  await page.locator('[data-testid="weather-toggle"]').click()

  // 初期: sunny + dayがactive
  await expect(page.locator('[data-testid="weather-sunny"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="time-day"]')).toHaveClass(/active/)

  // rainy + nightに変更
  await page.locator('[data-testid="weather-rainy"]').click()
  await page.locator('[data-testid="time-night"]').click()
  await expect(page.locator('[data-testid="weather-rainy"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="time-night"]')).toHaveClass(/active/)

  // Setを押さずに閉じる
  await page.locator('[data-testid="weather-close"]').click()

  // 再度開いて値が復元されていることを確認
  await page.locator('[data-testid="weather-toggle"]').click()
  await expect(page.locator('[data-testid="weather-sunny"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="time-day"]')).toHaveClass(/active/)

  await page.locator('[data-testid="weather-close"]').click()
})

test('Stats/Weatherパネルの排他表示', async () => {
  const { page } = app

  // Statsパネルを開く
  await page.locator('[data-testid="stats-toggle"]').click()
  await expect(page.locator('[data-testid="stats-close"]')).toBeVisible()

  // Weatherボタンが非表示
  await expect(page.locator('[data-testid="weather-toggle"]')).not.toBeVisible()

  // Statsを閉じる
  await page.locator('[data-testid="stats-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()

  // Weatherパネルを開く
  await page.locator('[data-testid="weather-toggle"]').click()
  await expect(page.locator('[data-testid="weather-sunny"]')).toBeVisible()

  // Statsボタンが非表示
  await expect(page.locator('[data-testid="stats-toggle"]')).not.toBeVisible()

  await page.locator('[data-testid="weather-close"]').click()
})
