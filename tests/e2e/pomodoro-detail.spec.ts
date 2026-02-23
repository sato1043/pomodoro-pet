import { test, expect, type Page } from '@playwright/test'
import { join } from 'path'
import { readFileSync } from 'fs'
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

test('サイクル進捗ドットが表示される', async () => {
  const { page } = app

  // ポモドーロ開始
  await page.getByRole('button', { name: 'Start Pomodoro' }).click()
  await expect(page.getByText('WORK')).toBeVisible({ timeout: 5_000 })

  // phase-dots内にドットが4個ある（Sets=2: work, break, work, long-break）
  const dots = page.locator('[data-testid="phase-dots"] > span')
  await expect(dots).toHaveCount(4)

  // Stopで戻す
  await page.getByTestId('pomodoro-stop').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 5_000 })
})

test('work中にインタラクションロックされている', async () => {
  const { page } = app

  // ポモドーロ開始
  await page.getByRole('button', { name: 'Start Pomodoro' }).click()
  await expect(page.getByText('WORK')).toBeVisible({ timeout: 5_000 })

  // デバッグインジケーターでinteractionLocked=trueを確認
  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    return el?.dataset.interactionLocked === 'true'
  }, { timeout: 3_000 })

  const state = await getDebugState(page)
  expect(state.interactionLocked).toBe('true')

  // Stopで戻す
  await page.getByTestId('pomodoro-stop').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 5_000 })
})

test('全フェーズ遷移の順序確認', async () => {
  const { page } = app

  // ポモドーロ開始
  await page.getByRole('button', { name: 'Start Pomodoro' }).click()
  await expect(page.getByText('WORK')).toBeVisible({ timeout: 5_000 })

  // 1. march-cycle（work Set1）
  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    return el?.dataset.presetName === 'march-cycle'
  }, { timeout: 5_000 })

  // 2. rest-cycle（break Set1） — work(3s)後
  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    return el?.dataset.presetName === 'rest-cycle'
  }, { timeout: 10_000 })

  // 3. march-cycle（work Set2） — break(2s)後
  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    return el?.dataset.presetName === 'march-cycle'
  }, { timeout: 10_000 })

  // 4. celebrate（congrats） — work(3s)後
  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    return el?.dataset.presetName === 'celebrate'
  }, { timeout: 10_000 })

  // 5. joyful-rest（long-break） — congrats(5s)後
  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    return el?.dataset.presetName === 'joyful-rest'
  }, { timeout: 15_000 })

  // 6. autonomous（free復帰） — long-break(3s)後
  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    return el?.dataset.presetName === 'autonomous'
  }, { timeout: 15_000 })

  // freeモードに復帰
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 5_000 })
})

test('ポモドーロ完走後に統計パネルに値が表示される', async () => {
  const { page } = app

  // 前テストで1サイクル完走済み

  // 統計パネルを開く
  await page.locator('[data-testid="stats-toggle"]').click()
  await expect(page.getByText('Statistics')).toBeVisible({ timeout: 3_000 })

  // Today列のwork回数が0より大きい（テキストに数値が含まれる）
  // SummaryCardに「Today」ラベルがある
  await expect(page.getByText('Today')).toBeVisible()

  // workの値が表示されている（「work」または「works」テキスト）
  await expect(page.getByText(/works?/).first()).toBeVisible()

  // 閉じる
  await page.locator('[data-testid="stats-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 3_000 })
})

test('ポモドーロ完走後にaffinity値がsettings.jsonに存在する', async () => {
  // userDataパスをメインプロセスから取得
  const userDataPath = await app.electronApp.evaluate(({ app: electronApp }) =>
    electronApp.getPath('userData')
  )

  // テストプロセスのNode.jsでsettings.jsonを読み込む
  const settingsPath = join(userDataPath, 'settings.json')
  const savedSettings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
  expect(savedSettings.emotion).toBeDefined()
  expect(savedSettings.emotion.affinity).toBeDefined()
})

test('work中にfatigueが0より大きい', async () => {
  const { page } = app

  // 新たにポモドーロ開始してwork中のfatigueを検証
  await page.getByRole('button', { name: 'Start Pomodoro' }).click()
  await expect(page.getByText('WORK')).toBeVisible({ timeout: 5_000 })

  // work中にfatigueが微小に増加する（rate: +0.0000001/ms）
  // 1秒後に確認（fatigue ≈ 0.0001）
  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    if (!el) return false
    const emotion = JSON.parse(el.dataset.emotion || '{}')
    return emotion.fatigue > 0
  }, { timeout: 5_000 })

  const emotion = await getDebugEmotion(page)
  expect(emotion.fatigue).toBeGreaterThan(0)

  // Stopで戻す
  await page.getByTestId('pomodoro-stop').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 5_000 })
})

test('バックグラウンドタイマーが継続する', async () => {
  const { page } = app

  // ポモドーロ開始
  await page.getByRole('button', { name: 'Start Pomodoro' }).click()
  await expect(page.getByTestId('pomodoro-timer')).toBeVisible({ timeout: 5_000 })

  // タイマー値を記録
  const timeBefore = await page.getByTestId('pomodoro-timer').textContent()

  // blurイベントでバックグラウンド化
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))

  // 2秒待機
  await page.waitForTimeout(2000)

  // focusイベントでフォアグラウンド復帰
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))

  // 少し待ってから確認（UI更新のため）
  await page.waitForTimeout(500)

  // タイマー値が進んでいる
  const timeAfter = await page.getByTestId('pomodoro-timer').textContent()
  expect(timeAfter).not.toBe(timeBefore)

  // Stopで戻す
  await page.getByTestId('pomodoro-stop').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 5_000 })
})
