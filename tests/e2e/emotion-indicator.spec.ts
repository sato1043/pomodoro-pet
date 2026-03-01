import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { launchApp, closeApp, setLicenseMode, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
  await setLicenseMode(app, 'registered')
})

test.afterAll(async () => {
  await closeApp(app)
})

/** #debug-animation-state の emotion データをパースして返す */
async function getDebugEmotion(page: Page): Promise<{ satisfaction: number; fatigue: number; affinity: number }> {
  return page.evaluate(() => {
    const el = document.getElementById('debug-animation-state')
    if (!el) return { satisfaction: 0, fatigue: 0, affinity: 0 }
    return JSON.parse(el.dataset.emotion || '{"satisfaction":0,"fatigue":0,"affinity":0}')
  })
}

test('freeモードに感情インジケーターが表示されない', async () => {
  const { page } = app

  await expect(page.locator('[data-testid="emotion-indicator"]')).not.toBeVisible()
})

test('統計パネルを開くと感情インジケーターが表示される', async () => {
  const { page } = app

  await page.locator('[data-testid="stats-toggle"]').click()
  await expect(page.locator('[data-testid="stats-close"]')).toBeVisible()

  // EmotionStateUpdatedイベント受信を待つ（最大2秒）
  await expect(page.locator('[data-testid="emotion-indicator"]')).toBeVisible({ timeout: 2_000 })
})

test('3アイコン（♥ ⚡ ★）が表示される', async () => {
  const { page } = app

  // 前テストでパネルが開いたまま
  await expect(page.locator('[data-testid="emotion-satisfaction"]')).toBeVisible()
  await expect(page.locator('[data-testid="emotion-fatigue"]')).toBeVisible()
  await expect(page.locator('[data-testid="emotion-affinity"]')).toBeVisible()

  await expect(page.locator('[data-testid="emotion-satisfaction"]')).toHaveText('♥')
  await expect(page.locator('[data-testid="emotion-fatigue"]')).toHaveText('⚡')
  await expect(page.locator('[data-testid="emotion-affinity"]')).toHaveText('★')
})

test('opacityがデバッグ感情データと整合する', async () => {
  const { page } = app

  // 前テストでパネルが開いたまま
  const emotion = await getDebugEmotion(page)

  // toOpacity(value) = 0.15 + value * 0.85
  const expectedSatOpacity = 0.15 + emotion.satisfaction * 0.85
  const expectedFatOpacity = 0.15 + emotion.fatigue * 0.85
  const expectedAffOpacity = 0.15 + emotion.affinity * 0.85

  const satOpacity = await page.locator('[data-testid="emotion-satisfaction"]').evaluate(
    el => parseFloat(getComputedStyle(el).opacity)
  )
  const fatOpacity = await page.locator('[data-testid="emotion-fatigue"]').evaluate(
    el => parseFloat(getComputedStyle(el).opacity)
  )
  const affOpacity = await page.locator('[data-testid="emotion-affinity"]').evaluate(
    el => parseFloat(getComputedStyle(el).opacity)
  )

  expect(satOpacity).toBeCloseTo(expectedSatOpacity, 1)
  expect(fatOpacity).toBeCloseTo(expectedFatOpacity, 1)
  expect(affOpacity).toBeCloseTo(expectedAffOpacity, 1)
})

test('統計パネルを閉じるとインジケーターが消える', async () => {
  const { page } = app

  // 前テストでパネルが開いたまま → 閉じる
  await page.locator('[data-testid="stats-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()

  await expect(page.locator('[data-testid="emotion-indicator"]')).not.toBeVisible()
})

test('expired モードでは統計パネル自体が開けない', async () => {
  const { page } = app

  await setLicenseMode(app, 'expired')

  // stats ボタンが非表示（statsフィーチャーが無効）
  await expect(page.locator('[data-testid="stats-toggle"]')).not.toBeVisible()

  // registeredに戻す
  await setLicenseMode(app, 'registered')
})
