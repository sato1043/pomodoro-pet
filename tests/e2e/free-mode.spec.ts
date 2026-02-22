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

  // settings-toggleクリックで展開
  await page.locator('[data-testid="settings-toggle"]').click()

  // 展開時: 「Set」ボタンが見える、「Start Pomodoro」は消える
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).not.toBeVisible()

  // settings-closeで折りたたむ
  await page.locator('[data-testid="settings-close"]').click()

  // 折りたたみ: 「Start Pomodoro」が復帰
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('Work/Break/LongBreak/Setsのボタン選択', async () => {
  const { page } = app

  // 展開する
  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  // Workの50分ボタンをクリック
  const work50 = page.locator('button[data-cfg="work"]').filter({ hasText: '50' })
  await work50.click()

  // activeクラスが付与されたことを確認
  await expect(work50).toHaveClass(/active/)

  // Setsの3ボタンをクリック
  const sets3 = page.locator('button[data-cfg="sets"]').filter({ hasText: '3' })
  await sets3.click()
  await expect(sets3).toHaveClass(/active/)

  // settings-closeで折りたたむ（Set押さずに閉じるとスナップショット復元される）
  await page.locator('[data-testid="settings-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('Setを押さずに閉じると設定がスナップショットから復元される', async () => {
  const { page } = app

  // 展開して現在のWork activeボタンの値を記録
  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  const initialActiveWork = await page.locator('button[data-cfg="work"].active').textContent()

  // 別の値に変更
  const targetValue = initialActiveWork?.trim() === '50' ? '90' : '50'
  await page.locator('button[data-cfg="work"]').filter({ hasText: targetValue }).click()
  await expect(page.locator('button[data-cfg="work"]').filter({ hasText: targetValue })).toHaveClass(/active/)

  // Setを押さずにsettings-closeで閉じる
  await page.locator('[data-testid="settings-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()

  // 再度開いて値が復元されていることを確認
  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  const restoredActiveWork = await page.locator('button[data-cfg="work"].active').textContent()
  expect(restoredActiveWork?.trim()).toBe(initialActiveWork?.trim())

  // 後片付け: 閉じる
  await page.locator('[data-testid="settings-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('BG Audio/BG Notifyトグルの表示', async () => {
  const { page } = app

  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  // BG Audio/BG Notifyトグルが表示される
  await expect(page.locator('[data-testid="bg-audio-toggle"]')).toBeVisible()
  await expect(page.locator('[data-testid="bg-notify-toggle"]')).toBeVisible()

  // 折りたたむ
  await page.locator('[data-testid="settings-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('BG Audioトグル操作でactive状態が切り替わる', async () => {
  const { page } = app

  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  const bgAudioToggle = page.locator('[data-testid="bg-audio-toggle"]')

  // 現在の状態を取得してトグル動作を検証
  const wasActive = await bgAudioToggle.evaluate(el => el.classList.contains('active'))

  // クリックで反転
  await bgAudioToggle.click()
  if (wasActive) {
    await expect(bgAudioToggle).not.toHaveClass(/active/)
  } else {
    await expect(bgAudioToggle).toHaveClass(/active/)
  }

  // 再クリックで元に戻る
  await bgAudioToggle.click()
  if (wasActive) {
    await expect(bgAudioToggle).toHaveClass(/active/)
  } else {
    await expect(bgAudioToggle).not.toHaveClass(/active/)
  }

  // Setを押さずに閉じるとスナップショット復元
  await page.locator('[data-testid="settings-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('BG設定のスナップショット復元', async () => {
  const { page } = app

  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  const bgNotifyToggle = page.locator('[data-testid="bg-notify-toggle"]')

  // 現在の状態を記録
  const wasActive = await bgNotifyToggle.evaluate(el => el.classList.contains('active'))

  // 反転する
  await bgNotifyToggle.click()
  if (wasActive) {
    await expect(bgNotifyToggle).not.toHaveClass(/active/)
  } else {
    await expect(bgNotifyToggle).toHaveClass(/active/)
  }

  // Setを押さずに閉じる
  await page.locator('[data-testid="settings-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()

  // 再度開くと復元されている（元の状態に戻る）
  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()
  if (wasActive) {
    await expect(bgNotifyToggle).toHaveClass(/active/)
  } else {
    await expect(bgNotifyToggle).not.toHaveClass(/active/)
  }

  // 後片付け: 閉じる
  await page.locator('[data-testid="settings-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('「Set」ボタンで設定確定しパネルが閉じる', async () => {
  const { page } = app

  // 展開
  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  // Break 10を選択
  const break10 = page.locator('button[data-cfg="break"]').filter({ hasText: '10' })
  await break10.click()

  // Setボタンクリック
  await page.locator('[data-testid="set-button"]').click()

  // パネルが閉じる（Start Pomodoroが見える）
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('settings-toggleクリックでset-button表示、settings-closeクリックでStart Pomodoro復帰', async () => {
  const { page } = app

  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).not.toBeVisible()

  await page.locator('[data-testid="settings-close"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('settings-closeクリックでset-buttonが非表示になる', async () => {
  const { page } = app

  await page.locator('[data-testid="settings-toggle"]').click()
  await expect(page.locator('[data-testid="set-button"]')).toBeVisible()

  await page.locator('[data-testid="settings-close"]').click()
  await expect(page.locator('[data-testid="set-button"]')).not.toBeVisible()
})
