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
  const titleByText = app.page.locator('[data-testid="overlay-free"]').getByText('Pomodoro Pet', { exact: false }).first()
  await expect(titleByText).toBeVisible()
})

test('「Start Pomodoro」ボタンが存在する', async () => {
  const startBtn = app.page.getByRole('button', { name: 'Start Pomodoro' })
  await expect(startBtn).toBeVisible()
})
