import { test, expect } from '@playwright/test'
import { launchApp, closeApp, setLicenseMode, cleanEmotionHistory, type AppContext } from './helpers/launch'

// VITE_DEBUG_TIMER=3/2/3/2 でビルド済み前提
// work=3秒, break=2秒, long-break=3秒, sets=2

let app: AppContext

test.beforeAll(async () => {
  await cleanEmotionHistory()
  app = await launchApp()
  await setLicenseMode(app, 'registered')
})

test.afterAll(async () => {
  await closeApp(app)
})

/** 統計パネルを開く */
async function openStats(): Promise<void> {
  await app.page.locator('[data-testid="stats-toggle"]').click()
  await expect(app.page.locator('[data-testid="stats-close"]')).toBeVisible()
}

/** 統計パネルを閉じる */
async function closeStats(): Promise<void> {
  await app.page.locator('[data-testid="stats-close"]').click()
  await expect(app.page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
}

test('統計パネル内に Emotion Trends セクションが表示される', async () => {
  const { page } = app

  await openStats()

  await expect(page.locator('[data-testid="emotion-trend"]')).toBeVisible()
  await expect(page.getByText('Emotion Trends')).toBeVisible()
})

test('期間ボタン（7d/30d/All）が表示される', async () => {
  const { page } = app

  // 前テストで統計パネルが開いたまま
  await expect(page.locator('[data-testid="emotion-trend-period-7d"]')).toBeVisible()
  await expect(page.locator('[data-testid="emotion-trend-period-30d"]')).toBeVisible()
  await expect(page.locator('[data-testid="emotion-trend-period-all"]')).toBeVisible()
})

test('データなし時に No emotion data yet が表示される', async () => {
  const { page } = app

  // cleanEmotionHistory() 済みなのでデータなし
  await expect(page.locator('[data-testid="emotion-trend-no-data"]')).toBeVisible()
  await expect(page.locator('[data-testid="emotion-trend-no-data"]')).toHaveText('No emotion data yet')

  // SVGは表示されない
  await expect(page.locator('[data-testid="emotion-trend-svg"]')).not.toBeVisible()

  await closeStats()
})

test('ポモドーロ完了後に感情推移グラフ（SVG）が表示される', async () => {
  const { page } = app

  // 全サイクル完走: work(3s)→break(2s)→work(3s)→long-break(3s)→congrats
  await page.getByRole('button', { name: 'Start Pomodoro' }).click()
  await expect(page.getByText('WORK')).toBeVisible({ timeout: 5_000 })
  await expect(page.getByText('Congratulations!')).toBeVisible({ timeout: 25_000 })
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 15_000 })

  // 保存の非同期処理を待つ
  await page.waitForTimeout(500)

  // 統計パネルを開いてSVGが描画されていることを確認
  await openStats()

  await expect(page.locator('[data-testid="emotion-trend-svg"]')).toBeVisible()
  await expect(page.locator('[data-testid="emotion-trend-no-data"]')).not.toBeVisible()
})

test('期間ボタンのクリックで表示が切り替わる', async () => {
  const { page } = app

  // 前テストで統計パネルが開いたまま & データあり

  // 30dに切替
  await page.locator('[data-testid="emotion-trend-period-30d"]').click()
  // SVGが引き続き表示される
  await expect(page.locator('[data-testid="emotion-trend-svg"]')).toBeVisible()

  // Allに切替
  await page.locator('[data-testid="emotion-trend-period-all"]').click()
  await expect(page.locator('[data-testid="emotion-trend-svg"]')).toBeVisible()

  // 7dに戻す
  await page.locator('[data-testid="emotion-trend-period-7d"]').click()
  await expect(page.locator('[data-testid="emotion-trend-svg"]')).toBeVisible()

  await closeStats()
})

// expired モードのテストは不要:
// stats と emotionAccumulation は同一の権限パターン（registered=o, trial=o, expired=x）
// expired では stats パネル自体が開けないため、emotion-trend の非表示を単独検証できない
// stats の expired 制限は button-visibility.spec.ts / trial-restriction.spec.ts でカバーされている
