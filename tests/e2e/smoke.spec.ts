import { test, expect } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  await closeApp(app)
})

test('アプリが起動しウィンドウが表示される', async () => {
  const title = await app.page.title()
  expect(title).toBe('Pomodoro Pet')
})

test('タイトル「Pomodoro Pet」がオーバーレイに表示される', async () => {
  const titleEl = app.page.locator('#timer-overlay .timer-overlay-title')
  // vanilla-extractではclass名が動的なため、テキスト内容で検索する
  const titleByText = app.page.getByText('Pomodoro Pet', { exact: false }).first()
  const isVisible = await titleEl.isVisible().catch(() => false)
    || await titleByText.isVisible().catch(() => false)
  expect(isVisible).toBe(true)
})

test('「Start Pomodoro」ボタンが存在する', async () => {
  const startBtn = app.page.getByRole('button', { name: 'Start Pomodoro' })
  await expect(startBtn).toBeVisible()
})
