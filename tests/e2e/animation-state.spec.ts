import { test, expect, type Page } from '@playwright/test'
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

/** #debug-animation-state の全data属性を取得 */
async function getDebugState(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const el = document.getElementById('debug-animation-state')
    if (!el) return {}
    return { ...el.dataset } as Record<string, string>
  })
}

/** data-emotion をパースして返す */
async function getDebugEmotion(page: Page): Promise<{ satisfaction: number; fatigue: number; affinity: number }> {
  const state = await getDebugState(page)
  return JSON.parse(state.emotion || '{"satisfaction":0,"fatigue":0,"affinity":0}')
}

test('デバッグインジケーターが存在する', async () => {
  const { page } = app
  const el = page.locator('#debug-animation-state')
  // display:none だが DOM には存在する
  await expect(el).toBeAttached()
})

test('freeモード初期状態: idle/autonomous/idle', async () => {
  const { page } = app
  const state = await getDebugState(page)
  expect(state.state).toBe('idle')
  expect(state.presetName).toBe('autonomous')
  expect(state.clipName).toBe('idle')
})

test('感情パラメータ初期値: satisfaction≈0.5, fatigue≈0', async () => {
  const { page } = app
  const emotion = await getDebugEmotion(page)
  // satisfaction: 初期値0.5（自然減衰で微減の可能性あり）
  expect(emotion.satisfaction).toBeGreaterThan(0.45)
  expect(emotion.satisfaction).toBeLessThanOrEqual(0.5)
  // fatigue: 初期値0（非work中はrecovery方向だが0未満にはならない）
  expect(emotion.fatigue).toBe(0)
})

test('Start Pomodoro → march-cycleプリセットに切替', async () => {
  const { page } = app
  await page.getByRole('button', { name: 'Start Pomodoro' }).click()
  await expect(page.getByText('WORK')).toBeVisible({ timeout: 5_000 })

  // march-cycleプリセットに切替、march状態
  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    return el?.dataset.presetName === 'march-cycle'
  }, { timeout: 3_000 })

  const state = await getDebugState(page)
  expect(state.presetName).toBe('march-cycle')
  expect(state.state).toBe('march')
})

test('work中にphaseProgressが0超', async () => {
  const { page } = app
  // 前テストの続きでwork中
  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    return el && parseFloat(el.dataset.phaseProgress || '0') > 0
  }, { timeout: 3_000 })

  const state = await getDebugState(page)
  expect(parseFloat(state.phaseProgress)).toBeGreaterThan(0)
})

test('work→break遷移でrest-cycleプリセットに切替', async () => {
  const { page } = app
  // work=3秒後にbreak遷移 → rest-cycleプリセットへの切替を確認
  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    return el?.dataset.presetName === 'rest-cycle'
  }, { timeout: 10_000 })

  const state = await getDebugState(page)
  expect(state.presetName).toBe('rest-cycle')
})

test('Stop → autonomousプリセットに復帰', async () => {
  const { page } = app
  await page.getByTestId('pomodoro-stop').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 5_000 })

  // autonomousプリセットに復帰
  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    return el?.dataset.presetName === 'autonomous'
  }, { timeout: 3_000 })

  const state = await getDebugState(page)
  expect(state.presetName).toBe('autonomous')
})

test('タイマー完走 → satisfactionが0.5超', async () => {
  const { page } = app

  // 開始前のsatisfactionを記録
  const beforeEmotion = await getDebugEmotion(page)

  // ポモドーロ開始
  await page.getByRole('button', { name: 'Start Pomodoro' }).click()
  await expect(page.getByText('WORK')).toBeVisible({ timeout: 5_000 })

  // 全サイクル完走を待つ
  // Set1: work(3s) → break(2s) → Set2: work(3s) → long-break(3s) → congrats
  await expect(page.getByText('Congratulations!')).toBeVisible({ timeout: 25_000 })

  // congratsからfreeモードへの自動復帰を待つ
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 15_000 })

  // PomodoroCompleted イベントにより satisfaction += 0.20
  const afterEmotion = await getDebugEmotion(page)
  expect(afterEmotion.satisfaction).toBeGreaterThan(0.5)
  expect(afterEmotion.satisfaction).toBeGreaterThan(beforeEmotion.satisfaction)
})
