import { test, expect } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

// VITE_DEBUG_TIMER=3/2/3/2 でビルド済み前提
// work=3秒, break=2秒, long-break=3秒, sets=2

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  await closeApp(app)
})

test('Start Pomodoro → pomodoroモードに遷移', async () => {
  const { page } = app

  await page.getByRole('button', { name: 'Start Pomodoro' }).click()

  // フェーズラベル「WORK」が表示される
  await expect(page.getByText('WORK')).toBeVisible({ timeout: 5_000 })

  // タイマー表示が存在する
  await expect(page.getByTestId('pomodoro-timer')).toBeVisible()

  // Stopで戻す
  await page.getByTestId('pomodoro-stop').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 5_000 })
})

test('Pause → Resume が動作する', async () => {
  const { page } = app

  // ポモドーロ開始
  await page.getByRole('button', { name: 'Start Pomodoro' }).click()
  await expect(page.getByTestId('pomodoro-timer')).toBeVisible({ timeout: 5_000 })

  // Pauseボタンをクリック
  await page.getByTestId('pomodoro-pause').click()

  // 一時停止中の残り時間を記録
  const timeText1 = await page.getByTestId('pomodoro-timer').textContent()

  // 1秒待つ
  await page.waitForTimeout(1000)

  // 時間が変わっていない（一時停止中）
  const timeText2 = await page.getByTestId('pomodoro-timer').textContent()
  expect(timeText2).toBe(timeText1)

  // Resume
  await page.getByTestId('pomodoro-pause').click()

  // 少し待ってから時間が変わっていることを確認
  await page.waitForTimeout(1500)
  const timeText3 = await page.getByTestId('pomodoro-timer').textContent()
  expect(timeText3).not.toBe(timeText2)

  // Stopで戻す
  await page.getByTestId('pomodoro-stop').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 5_000 })
})

test('Stop → freeモードに復帰する', async () => {
  const { page } = app

  // ポモドーロ開始
  await page.getByRole('button', { name: 'Start Pomodoro' }).click()
  await expect(page.getByTestId('pomodoro-timer')).toBeVisible({ timeout: 5_000 })

  // Stopボタンをクリック
  await page.getByTestId('pomodoro-stop').click()

  // freeモードに戻る
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 5_000 })
})

test('タイマー完走 → congratsモード → freeモードへ自動復帰', async () => {
  const { page } = app

  // ポモドーロ開始
  await page.getByRole('button', { name: 'Start Pomodoro' }).click()
  await expect(page.getByText('WORK')).toBeVisible({ timeout: 5_000 })

  // VITE_DEBUG_TIMER=3/2/3/2 の場合:
  // Set1: work(3s) → break(2s) → Set2: work(3s) → long-break(3s) → congrats
  // 合計約 11秒 + congrats数秒
  // 余裕をもって25秒待つ

  // congratsモードの「Congratulations!」を待つ
  await expect(page.getByText('Congratulations!')).toBeVisible({ timeout: 25_000 })

  // congratsからfreeモードへの自動復帰を待つ
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 15_000 })
})
