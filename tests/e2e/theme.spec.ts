import { test, expect } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  await closeApp(app)
})

test('テーマ切替でcolorSchemeが即座に反映される', async () => {
  const { page } = app

  // 展開
  const toggleBtn = page.locator('button').filter({ has: page.locator('svg') }).first()
  await toggleBtn.click()
  await expect(page.getByRole('button', { name: 'Set' })).toBeVisible()

  // Lightをクリック → colorSchemeがlightになる
  await page.getByRole('button', { name: 'Light' }).click()
  const lightScheme = await page.evaluate(() =>
    getComputedStyle(document.documentElement).colorScheme
  )
  expect(lightScheme).toBe('light')

  // Darkをクリック → colorSchemeがdarkになる
  await page.getByRole('button', { name: 'Dark' }).click()
  const darkScheme = await page.evaluate(() =>
    getComputedStyle(document.documentElement).colorScheme
  )
  expect(darkScheme).toBe('dark')

  // Systemに戻してSetで確定（後片付け）
  await page.getByRole('button', { name: 'System' }).click()
  await page.getByRole('button', { name: 'Set' }).click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('テーマ変更をSetを押さずに閉じるとスナップショットから復元される', async () => {
  const { page } = app

  // 初期のcolorSchemeを取得
  const initialScheme = await page.evaluate(() =>
    getComputedStyle(document.documentElement).colorScheme
  )

  // 展開
  const toggleBtn = page.locator('button').filter({ has: page.locator('svg') }).first()
  await toggleBtn.click()
  await expect(page.getByRole('button', { name: 'Set' })).toBeVisible()

  // テーマを変更（初期がdarkならLight、それ以外ならDark）
  const targetTheme = initialScheme === 'dark' ? 'Light' : 'Dark'
  const targetScheme = initialScheme === 'dark' ? 'light' : 'dark'
  await page.getByRole('button', { name: targetTheme }).click()

  // 変更が即座に反映されていることを確認
  const changedScheme = await page.evaluate(() =>
    getComputedStyle(document.documentElement).colorScheme
  )
  expect(changedScheme).toBe(targetScheme)

  // Setを押さずに閉じる
  await toggleBtn.click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()

  // テーマが復元されていることを確認
  const restoredScheme = await page.evaluate(() =>
    getComputedStyle(document.documentElement).colorScheme
  )
  expect(restoredScheme).toBe(initialScheme)
})
