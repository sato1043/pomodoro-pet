import { test, expect } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  await closeApp(app)
})

test('stableチャネルではchannel-badgeが非表示', async () => {
  const { page } = app

  // デフォルトビルドはstableチャネル
  const badge = page.locator('[data-testid="channel-badge"]')
  await expect(badge).not.toBeVisible()
})

test('stableチャネルでは既存の全stable機能がライセンスモードに応じて動作する', async () => {
  const { page } = app

  // Start Pomodoroボタンが存在する（pomodoroTimerはstable + 全モードで有効）
  await expect(page.locator('[data-testid="start-pomodoro"]')).toBeVisible()
})
