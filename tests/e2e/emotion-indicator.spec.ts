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

test('ふれあいモードに遷移すると感情インジケーターが即座に表示される', async () => {
  const { page } = app

  await page.locator('[data-testid="fureai-entry"]').click()
  await expect(page.locator('[data-testid="compact-header"]')).toBeVisible({ timeout: 5_000 })

  // プレースホルダー表示: EmotionStateUpdatedイベント受信前でも表示される
  await expect(page.locator('[data-testid="emotion-indicator"]')).toBeVisible({ timeout: 500 })
})

test('3アイコン（♥ ⚡ ★）が表示される', async () => {
  const { page } = app

  // 前テストでふれあいモードに入ったまま
  await expect(page.locator('[data-testid="emotion-satisfaction"]')).toBeVisible()
  await expect(page.locator('[data-testid="emotion-fatigue"]')).toBeVisible()
  await expect(page.locator('[data-testid="emotion-affinity"]')).toBeVisible()

  await expect(page.locator('[data-testid="emotion-satisfaction"]')).toHaveText('♥')
  await expect(page.locator('[data-testid="emotion-fatigue"]')).toHaveText('⚡')
  await expect(page.locator('[data-testid="emotion-affinity"]')).toHaveText('★')
})

test('opacityがデバッグ感情データと整合する', async () => {
  const { page } = app

  // 前テストでふれあいモードに入ったまま
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

test('ふれあいモードを抜けるとインジケーターが消える', async () => {
  const { page } = app

  // 前テストでふれあいモードに入ったまま → freeモードに戻る
  await page.locator('[data-testid="fureai-exit"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 5_000 })

  await expect(page.locator('[data-testid="emotion-indicator"]')).not.toBeVisible()
})

test('expired モードでは感情インジケーターが表示されない', async () => {
  const { page } = app

  await setLicenseMode(app, 'expired')
  await page.waitForTimeout(500)

  // freeモードのまま — 感情インジケーターは表示されない
  await expect(page.locator('[data-testid="emotion-indicator"]')).not.toBeVisible()

  // registeredに戻す
  await setLicenseMode(app, 'registered')
})
