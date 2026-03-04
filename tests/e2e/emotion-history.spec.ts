import { test, expect } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { resolve, join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { launchApp, closeApp, setLicenseMode, cleanEmotionHistory, type AppContext } from './helpers/launch'

const PROJECT_ROOT = resolve(__dirname, '../..')

async function launchFresh(): Promise<{ electronApp: ElectronApplication; page: Page }> {
  const electronApp = await electron.launch({
    args: [resolve(PROJECT_ROOT, 'out/main/index.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  })
  const page = await electronApp.firstWindow()
  await page.waitForSelector('[data-testid="overlay-free"]', { timeout: 15_000 })
  return { electronApp, page }
}

// VITE_DEBUG_TIMER=3/2/3/2 でビルド済み前提
// work=3秒, break=2秒, long-break=3秒, sets=2

let app: AppContext

test.beforeAll(async () => {
  await cleanEmotionHistory()
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

test('初期感情状態がデバッグインジケーターに反映される', async () => {
  const { page } = app

  // デバッグインジケーターの存在を確認
  await expect(page.locator('#debug-animation-state')).toBeAttached()

  const emotion = await getDebugEmotion(page)
  // satisfaction は 0〜1 の範囲
  expect(emotion.satisfaction).toBeGreaterThanOrEqual(0)
  expect(emotion.satisfaction).toBeLessThanOrEqual(1)
  // fatigue は 0〜1 の範囲
  expect(emotion.fatigue).toBeGreaterThanOrEqual(0)
  expect(emotion.fatigue).toBeLessThanOrEqual(1)
  // affinity は 0〜1 の範囲
  expect(emotion.affinity).toBeGreaterThanOrEqual(0)
  expect(emotion.affinity).toBeLessThanOrEqual(1)
})

test('ポモドーロ完了後に感情パラメータが変化する', async () => {
  const { page } = app

  // 初期感情を記録
  const beforeEmotion = await getDebugEmotion(page)

  // ポモドーロ開始
  await page.getByRole('button', { name: 'Start Pomodoro' }).click()
  await expect(page.getByText('WORK')).toBeVisible({ timeout: 5_000 })

  // 全サイクル完走を待つ（PomodoroCompletedは全サイクル完走時に発火）
  // sets=2: work(3s)→break(2s)→work(3s)→long-break(3s)→congrats
  await expect(page.getByText('Congratulations!')).toBeVisible({ timeout: 25_000 })
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 15_000 })

  // PomodoroCompleted: satisfaction +0.20
  const afterEmotion = await getDebugEmotion(page)
  expect(afterEmotion.satisfaction).toBeGreaterThan(beforeEmotion.satisfaction)
})

// --- 以下は launchFresh() による独立起動テスト ---

test('emotionHistory IPC APIがレンダラーで利用可能', async () => {
  const { electronApp, page } = await launchFresh()

  const hasLoad = await page.evaluate(() =>
    typeof (window as any).electronAPI.loadEmotionHistory === 'function'
  )
  expect(hasLoad).toBe(true)

  const hasSave = await page.evaluate(() =>
    typeof (window as any).electronAPI.saveEmotionHistory === 'function'
  )
  expect(hasSave).toBe(true)

  await electronApp.close()
})

test('ポモドーロ完了後にemotion-history.jsonが生成される', async () => {
  const { electronApp, page } = await launchFresh()

  // registered モードに切り替え
  await electronApp.evaluate(({ BrowserWindow }, m) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      win.webContents.send('license:changed', { mode: m })
    }
  }, 'registered')
  await page.waitForTimeout(300)

  const userDataPath = await electronApp.evaluate(({ app }) => app.getPath('userData'))

  // 全サイクル完走を待つ（PomodoroCompletedは全サイクル完走時に発火）
  await page.getByRole('button', { name: 'Start Pomodoro' }).click()
  await expect(page.getByText('WORK')).toBeVisible({ timeout: 5_000 })
  await expect(page.getByText('Congratulations!')).toBeVisible({ timeout: 25_000 })
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 15_000 })

  // 保存の非同期処理を待つ
  await page.waitForTimeout(500)

  // emotion-history.json が生成されていること
  const historyPath = join(userDataPath, 'emotion-history.json')
  expect(existsSync(historyPath)).toBe(true)

  const history = JSON.parse(readFileSync(historyPath, 'utf-8'))

  // lastSession が存在し、有効な値を持つ
  expect(history.lastSession).toBeDefined()
  expect(history.lastSession.satisfaction).toBeGreaterThanOrEqual(0)
  expect(history.lastSession.satisfaction).toBeLessThanOrEqual(1)
  expect(history.lastSession.timestamp).toBeGreaterThan(0)

  // daily に今日の日付のエントリが存在する
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  expect(history.daily[today]).toBeDefined()
  expect(history.daily[today].events.pomodoroCompleted).toBeGreaterThanOrEqual(1)

  // streakDays が 1 以上
  expect(history.streakDays).toBeGreaterThanOrEqual(1)

  await electronApp.close()
})

test('アプリ再起動後に感情パラメータが復元される', async () => {
  // 1回目: 全サイクル完走で感情を変化させる
  const { electronApp: app1, page: page1 } = await launchFresh()

  await app1.evaluate(({ BrowserWindow }, m) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      win.webContents.send('license:changed', { mode: m })
    }
  }, 'registered')
  await page1.waitForTimeout(300)

  // 全サイクル完走（PomodoroCompleted発火 → saveCurrentState呼び出し）
  await page1.getByRole('button', { name: 'Start Pomodoro' }).click()
  await expect(page1.getByText('WORK')).toBeVisible({ timeout: 5_000 })
  await expect(page1.getByText('Congratulations!')).toBeVisible({ timeout: 25_000 })
  await expect(page1.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 15_000 })

  // PomodoroCompleted後の感情を記録
  const emotionAfterPomo = await getDebugEmotion(page1)
  await page1.waitForTimeout(500)

  await app1.close()

  // 2回目: 再起動して感情パラメータが復元されていることを確認
  const { electronApp: app2, page: page2 } = await launchFresh()

  await app2.evaluate(({ BrowserWindow }, m) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      win.webContents.send('license:changed', { mode: m })
    }
  }, 'registered')
  await page2.waitForTimeout(500)

  const restoredEmotion = await getDebugEmotion(page2)

  // 復元された satisfaction がデフォルト値(0.5)ではなく、ポモドーロ完了後の値に近い
  // クロスセッション効果（5分未満なので delta=0）により、ほぼ同一値で復元される
  expect(restoredEmotion.satisfaction).toBeCloseTo(emotionAfterPomo.satisfaction, 1)
  // affinity もデフォルト(0)ではなく復元されている
  expect(restoredEmotion.affinity).toBeCloseTo(emotionAfterPomo.affinity, 1)

  await app2.close()
})
