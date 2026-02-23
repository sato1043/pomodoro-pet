import { test, expect } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  await closeApp(app)
})

test('時刻表示がAM/PM形式で存在する', async () => {
  const { page } = app

  // OverlayFree内にAMまたはPMを含む時刻テキストが表示されている
  const overlay = page.locator('[data-testid="overlay-free"]')
  const ampmText = overlay.getByText(/[AP]M/)
  await expect(ampmText.first()).toBeVisible()
})

test('タイムラインバーにW/Bセグメントが表示される', async () => {
  const { page } = app

  const overlay = page.locator('[data-testid="overlay-free"]')

  // workセグメント「W」が存在する
  await expect(overlay.getByText('W', { exact: true }).first()).toBeVisible()

  // breakセグメント「B」が存在する
  await expect(overlay.getByText('B', { exact: true }).first()).toBeVisible()
})

test('タイムライン設定サマリーが表示される', async () => {
  const { page } = app

  const overlay = page.locator('[data-testid="overlay-free"]')

  // 「× N Sets =」形式の設定テキストが存在する
  await expect(overlay.getByText(/Sets\s*=/)).toBeVisible()
})

test('タイムラインに終了時刻が表示される', async () => {
  const { page } = app

  const overlay = page.locator('[data-testid="overlay-free"]')

  // AM/PMを含む時刻が複数表示される（現在時刻 + セット終了時刻）
  const ampmElements = overlay.getByText(/[AP]M/)
  const count = await ampmElements.count()
  expect(count).toBeGreaterThanOrEqual(2)
})
