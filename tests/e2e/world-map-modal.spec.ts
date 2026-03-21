import { test, expect, type Page } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  await closeApp(app)
})

// --- ヘルパー: environment シーン遷移（blackout考慮） ---

async function enterEnvironment(page: Page): Promise<void> {
  await page.locator('[data-testid="weather-toggle"]').click()
  await expect(page.locator('[data-testid="weather-sunny"]')).toBeVisible({ timeout: 5_000 })
}

async function exitEnvironment(page: Page): Promise<void> {
  await page.locator('[data-testid="environment-exit"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 5_000 })
}

async function openWorldMap(page: Page): Promise<void> {
  await page.locator('[data-testid="weather-location"]').click()
  await expect(page.locator('[data-testid="worldmap-presets"]')).toBeVisible()
}

test('environment内のLocationボタンでWorldMapModalが開く', async () => {
  const { page } = app

  await enterEnvironment(page)
  await openWorldMap(page)

  // モーダル要素が表示される
  await expect(page.locator('[data-testid="worldmap-presets"]')).toBeVisible()
  await expect(page.locator('[data-testid="worldmap-coord-info"]')).toBeVisible()
  await expect(page.locator('[data-testid="worldmap-set-location"]')).toBeVisible()
  await expect(page.locator('[data-testid="worldmap-back"]')).toBeVisible()
})

test('戻るボタンでWorldMapが閉じWeatherPanelに復帰する', async () => {
  const { page } = app

  // 前のテストでWorldMapが開いている
  await page.locator('[data-testid="worldmap-back"]').click()

  // WorldMapが閉じる
  await expect(page.locator('[data-testid="worldmap-presets"]')).not.toBeVisible()

  // WeatherPanelに復帰する（environment内部のビュー切替）
  await expect(page.locator('[data-testid="weather-sunny"]')).toBeVisible()

  // 後続テストのためにWorldMapを再度開く
  await openWorldMap(page)
})

test('プリセット都市ボタンで座標情報が更新される', async () => {
  const { page } = app

  // 前のテストでWorldMapが開いている

  // Tokyoプリセットをクリック
  await page.locator('[data-testid="worldmap-preset-tokyo"]').click()

  // 座標が東京付近（35.68°, 139.65°）に更新される
  const coords = page.locator('[data-testid="worldmap-coords"]')
  await expect(coords).toContainText('35.68')
  await expect(coords).toContainText('139.65')
})

test('プリセット都市選択でケッペン気候区分が表示される', async () => {
  const { page } = app

  // 前のテストでTokyo選択済み
  const koppen = page.locator('[data-testid="worldmap-koppen"]')
  await expect(koppen).toBeVisible()

  // コードとラベルが表示される（具体的な分類値はグリッドデータ依存のため存在確認のみ）
  const text = await koppen.textContent()
  expect(text).toBeTruthy()
  expect(text!.length).toBeGreaterThan(2)
})

test('Dubaiプリセットで座標とケッペンが更新される', async () => {
  const { page } = app

  await page.locator('[data-testid="worldmap-preset-dubai"]').click()

  const coords = page.locator('[data-testid="worldmap-coords"]')
  await expect(coords).toContainText('25.20')
  await expect(coords).toContainText('55.27')

  const koppen = page.locator('[data-testid="worldmap-koppen"]')
  await expect(koppen).toBeVisible()
  const text = await koppen.textContent()
  expect(text).toBeTruthy()
})

test('Reykjavikプリセットで高緯度の分類が表示される', async () => {
  const { page } = app

  await page.locator('[data-testid="worldmap-preset-reykjavik"]').click()

  const coords = page.locator('[data-testid="worldmap-coords"]')
  await expect(coords).toContainText('64.15')

  const koppen = page.locator('[data-testid="worldmap-koppen"]')
  await expect(koppen).toBeVisible()
})

test('Set Locationでモーダルが閉じWeatherPanelに復帰する', async () => {
  const { page } = app

  // Tokyoを選択してSet Location
  await page.locator('[data-testid="worldmap-preset-tokyo"]').click()
  await page.locator('[data-testid="worldmap-set-location"]').click()

  // WorldMapが閉じる
  await expect(page.locator('[data-testid="worldmap-presets"]')).not.toBeVisible()

  // WeatherPanelに復帰する（environment内部のビュー切替）
  await expect(page.locator('[data-testid="weather-sunny"]')).toBeVisible()

  // freeに戻る
  await exitEnvironment(page)
})
