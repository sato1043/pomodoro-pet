import { test, expect } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  await closeApp(app)
})

test('設定パネルのトグル（開閉）', async () => {
  const { page } = app

  // 初期状態: 折りたたみ（Start Pomodoroが見える）
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()

  // メニューボタンをクリックして展開
  // SVGアイコンのボタン（settingsToggle）を特定
  const toggleBtn = page.locator('button').filter({ has: page.locator('svg') }).first()
  await toggleBtn.click()

  // 展開時: 「Set」ボタンが見える、「Start Pomodoro」は消える
  await expect(page.getByRole('button', { name: 'Set' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).not.toBeVisible()

  // 再度クリックして折りたたむ
  await toggleBtn.click()

  // 折りたたみ: 「Start Pomodoro」が復帰
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('Work/Break/LongBreak/Setsのボタン選択', async () => {
  const { page } = app

  // 展開する
  const toggleBtn = page.locator('button').filter({ has: page.locator('svg') }).first()
  await toggleBtn.click()
  await expect(page.getByRole('button', { name: 'Set' })).toBeVisible()

  // Workの50分ボタンをクリック
  const work50 = page.locator('button[data-cfg="work"]').filter({ hasText: '50' })
  await work50.click()

  // activeクラスが付与されたことを確認
  await expect(work50).toHaveClass(/active/)

  // Setsの3ボタンをクリック
  const sets3 = page.locator('button[data-cfg="sets"]').filter({ hasText: '3' })
  await sets3.click()
  await expect(sets3).toHaveClass(/active/)

  // 折りたたむ（Set押さずに閉じるとスナップショット復元される）
  await toggleBtn.click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('「Set」ボタンで設定確定しパネルが閉じる', async () => {
  const { page } = app

  // 展開
  const toggleBtn = page.locator('button').filter({ has: page.locator('svg') }).first()
  await toggleBtn.click()
  await expect(page.getByRole('button', { name: 'Set' })).toBeVisible()

  // Break 10を選択
  const break10 = page.locator('button[data-cfg="break"]').filter({ hasText: '10' })
  await break10.click()

  // Setボタンクリック
  await page.getByRole('button', { name: 'Set' }).click()

  // パネルが閉じる（Start Pomodoroが見える）
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})
