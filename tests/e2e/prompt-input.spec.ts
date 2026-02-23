import { test, expect, type Page } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

// VITE_DEBUG_TIMER=3/2/3/2 でビルド済み前提

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()

  // ふれあいモードに遷移
  await app.page.locator('[data-testid="fureai-entry"]').click()
  await expect(app.page.locator('[data-testid="overlay-fureai"]')).toBeVisible({ timeout: 5_000 })
})

test.afterAll(async () => {
  await closeApp(app)
})

/** #debug-animation-state の全data属性を取得 */
async function getDebugState(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const el = document.getElementById('debug-animation-state')
    if (!el) return {}
    return { ...el.dataset } as Record<string, string>
  })
}

test('プロンプト入力欄が表示される', async () => {
  const { page } = app

  await expect(page.locator('[data-testid="prompt-input"]')).toBeVisible()
})

test('「walk」入力でwander状態に遷移する', async () => {
  const { page } = app

  const input = page.locator('[data-testid="prompt-input"]')
  await input.fill('walk')
  await input.press('Enter')

  // デバッグインジケーターでstate=wanderを確認
  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    return el?.dataset.state === 'wander'
  }, { timeout: 3_000 })

  const state = await getDebugState(page)
  expect(state.state).toBe('wander')
})

test('「座れ」入力でsit状態に遷移する', async () => {
  const { page } = app

  const input = page.locator('[data-testid="prompt-input"]')
  await input.fill('座れ')
  await input.press('Enter')

  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    return el?.dataset.state === 'sit'
  }, { timeout: 3_000 })

  const state = await getDebugState(page)
  expect(state.state).toBe('sit')
})

test('「sleep」入力でsleep状態に遷移する', async () => {
  const { page } = app

  const input = page.locator('[data-testid="prompt-input"]')
  await input.fill('sleep')
  await input.press('Enter')

  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    return el?.dataset.state === 'sleep'
  }, { timeout: 3_000 })

  const state = await getDebugState(page)
  expect(state.state).toBe('sleep')
})

test('空文字入力は無視される', async () => {
  const { page } = app

  // 現在のstateを記録
  const beforeState = await getDebugState(page)

  const input = page.locator('[data-testid="prompt-input"]')
  await input.fill('')
  await input.press('Enter')

  // 少し待って状態が変わっていないことを確認
  await page.waitForTimeout(500)
  const afterState = await getDebugState(page)
  expect(afterState.state).toBe(beforeState.state)
})

test('Sendボタンクリックで送信できる', async () => {
  const { page } = app

  const input = page.locator('[data-testid="prompt-input"]')
  await input.fill('walk')

  // Sendボタンクリック
  await page.locator('[data-testid="prompt-send"]').click()

  // 状態変化を確認
  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    return el?.dataset.state === 'wander'
  }, { timeout: 3_000 })

  // 入力欄がクリアされている
  const value = await input.inputValue()
  expect(value).toBe('')
})
