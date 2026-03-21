import { test, expect, type Page } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  await closeApp(app)
})

// --- ヘルパー: environment シーン遷移（blackout考慮） ---

async function enterEnvironment(page: Page): Promise<void> {
  await page.locator('[data-testid="weather-toggle"]').click()
  await expect(page.locator('[data-testid="weather-sunny"]')).toBeVisible({ timeout: 5_000 })
}

async function exitEnvironment(page: Page): Promise<void> {
  await page.locator('[data-testid="environment-exit"]').click()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible({ timeout: 5_000 })
}

// --- WeatherPanel 基本操作 ---

test('WeatherButtonクリックでenvironmentシーンに遷移しパネルが表示される', async () => {
  const { page } = app

  const weatherBtn = page.locator('[data-testid="weather-toggle"]')
  await expect(weatherBtn).toBeVisible()

  await enterEnvironment(page)

  // パネルが表示される（天気ボタンの存在で確認）
  await expect(page.locator('[data-testid="weather-sunny"]')).toBeVisible()

  await exitEnvironment(page)
})

test('Scene行の3プリセットボタンが表示される', async () => {
  const { page } = app

  await enterEnvironment(page)

  await expect(page.locator('[data-testid="scene-meadow"]')).toBeVisible()
  await expect(page.locator('[data-testid="scene-seaside"]')).toBeVisible()
  await expect(page.locator('[data-testid="scene-park"]')).toBeVisible()

  // デフォルトはmeadowがactive
  await expect(page.locator('[data-testid="scene-meadow"]')).toHaveClass(/active/, { timeout: 5_000 })

  await exitEnvironment(page)
})

test('Sceneプリセット切替でactive状態が変化する', async () => {
  const { page } = app

  await enterEnvironment(page)

  // seasideをクリック
  await page.locator('[data-testid="scene-seaside"]').click()
  await expect(page.locator('[data-testid="scene-seaside"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="scene-meadow"]')).not.toHaveClass(/active/)

  // parkをクリック
  await page.locator('[data-testid="scene-park"]').click()
  await expect(page.locator('[data-testid="scene-park"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="scene-seaside"]')).not.toHaveClass(/active/)

  // meadowに戻す
  await page.locator('[data-testid="scene-meadow"]').click()
  await expect(page.locator('[data-testid="scene-meadow"]')).toHaveClass(/active/)

  await exitEnvironment(page)
})

test('Sceneプリセット変更がシーン再遷移後も保持される', async () => {
  const { page } = app

  // パネルを開いてseasideに変更
  await enterEnvironment(page)
  await page.locator('[data-testid="scene-seaside"]').click()
  await expect(page.locator('[data-testid="scene-seaside"]')).toHaveClass(/active/)

  // freeに戻る
  await exitEnvironment(page)

  // 再度environmentに遷移してseasideが保持されていることを確認
  await enterEnvironment(page)
  await expect(page.locator('[data-testid="scene-seaside"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="scene-meadow"]')).not.toHaveClass(/active/)

  // meadowに戻す
  await page.locator('[data-testid="scene-meadow"]').click()
  await exitEnvironment(page)
})

test('environmentシーンでfreeモードのUIが非表示になる', async () => {
  const { page } = app

  // 初期状態: 各ボタンが見える
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
  await expect(page.locator('[data-testid="stats-toggle"]')).toBeVisible()
  await expect(page.locator('[data-testid="settings-toggle"]')).toBeVisible()
  await expect(page.locator('[data-testid="fureai-entry"]')).toBeVisible()

  // environmentシーンに遷移
  await enterEnvironment(page)

  // freeモードのUIが非表示（別シーンのため）
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).not.toBeVisible()
  await expect(page.locator('[data-testid="stats-toggle"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="settings-toggle"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="fureai-entry"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="weather-toggle"]')).not.toBeVisible()

  // environment-exitが表示
  await expect(page.locator('[data-testid="environment-exit"]')).toBeVisible()

  await exitEnvironment(page)

  // ボタンが復帰
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('environment-exitクリックでfreeモードに復帰する', async () => {
  const { page } = app

  await enterEnvironment(page)
  await expect(page.locator('[data-testid="weather-sunny"]')).toBeVisible()

  await exitEnvironment(page)

  // freeモードに復帰した
  await expect(page.locator('[data-testid="weather-sunny"]')).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})

test('天気タイプの切替でactive状態が変化する', async () => {
  const { page } = app

  await enterEnvironment(page)

  // sunnyに明示的に設定
  await page.locator('[data-testid="weather-sunny"]').click()
  await expect(page.locator('[data-testid="weather-sunny"]')).toHaveClass(/active/)

  // rainyをクリック
  await page.locator('[data-testid="weather-rainy"]').click()
  await expect(page.locator('[data-testid="weather-rainy"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="weather-sunny"]')).not.toHaveClass(/active/)

  // snowyをクリック
  await page.locator('[data-testid="weather-snowy"]').click()
  await expect(page.locator('[data-testid="weather-snowy"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="weather-rainy"]')).not.toHaveClass(/active/)

  // cloudyをクリック
  await page.locator('[data-testid="weather-cloudy"]').click()
  await expect(page.locator('[data-testid="weather-cloudy"]')).toHaveClass(/active/)

  // sunnyに戻す
  await page.locator('[data-testid="weather-sunny"]').click()
  await expect(page.locator('[data-testid="weather-sunny"]')).toHaveClass(/active/)

  await exitEnvironment(page)
})

test('autoWeatherは天気タイプと排他選択で動作する', async () => {
  const { page } = app

  await enterEnvironment(page)
  await expect(page.locator('[data-testid="weather-auto"]')).toBeVisible()

  // Autoボタンはdisabledでないこと
  await expect(page.locator('[data-testid="weather-auto"]')).not.toBeDisabled()

  // 初期状態: autoWeather=false → Autoはnon-active、sunnyがactive
  await page.locator('[data-testid="weather-sunny"]').click()
  await expect(page.locator('[data-testid="weather-auto"]')).not.toHaveClass(/active/)
  await expect(page.locator('[data-testid="weather-sunny"]')).toHaveClass(/active/)

  // Autoクリック → autoWeather=true、Autoがactive、sunnyがnon-active
  await page.locator('[data-testid="weather-auto"]').click()
  await expect(page.locator('[data-testid="weather-auto"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="weather-sunny"]')).not.toHaveClass(/active/)

  // 天気アイコンクリック → autoWeather=false、選択した天気がactive、Autoがnon-active
  await page.locator('[data-testid="weather-rainy"]').click()
  await expect(page.locator('[data-testid="weather-rainy"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="weather-auto"]')).not.toHaveClass(/active/)

  // sunnyに戻す
  await page.locator('[data-testid="weather-sunny"]').click()
  await exitEnvironment(page)
})

test('autoWeather有効時にWeather行の操作でautoが解除され、Cloud行はdisabled', async () => {
  const { page } = app

  await enterEnvironment(page)

  // sunnyに明示的に設定（前テストの状態をクリア）
  await page.locator('[data-testid="weather-sunny"]').click()

  // Autoをオン
  await page.locator('[data-testid="weather-auto"]').click()
  await expect(page.locator('[data-testid="weather-auto"]')).toHaveClass(/active/)

  // Weather/Time行は操作可能（disabledでない）
  await expect(page.locator('[data-testid="weather-sunny"]')).not.toBeDisabled()
  await expect(page.locator('[data-testid="time-morning"]')).not.toBeDisabled()

  // Cloud行はdisabled（autoWeather時は雲量も自動）
  await expect(page.locator('[data-testid="cloud-reset"]')).toBeDisabled()

  // 天気アイコンクリック → autoWeather解除
  await page.locator('[data-testid="weather-rainy"]').click()
  await expect(page.locator('[data-testid="weather-auto"]')).not.toHaveClass(/active/)
  await expect(page.locator('[data-testid="weather-rainy"]')).toHaveClass(/active/)

  // Cloud行のdisabled解除を確認
  await expect(page.locator('[data-testid="cloud-reset"]')).not.toBeDisabled()

  // 再度Autoオン
  await page.locator('[data-testid="weather-auto"]').click()
  await expect(page.locator('[data-testid="weather-auto"]')).toHaveClass(/active/)

  // Time行クリック → autoWeatherは解除されない（独立制御）
  await page.locator('[data-testid="time-morning"]').click()
  await expect(page.locator('[data-testid="weather-auto"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="time-morning"]')).toHaveClass(/active/)

  // sunnyに戻す
  await page.locator('[data-testid="weather-sunny"]').click()
  await exitEnvironment(page)
})

test('WeatherPanel Scene行にLocationボタンが表示される', async () => {
  const { page } = app

  await enterEnvironment(page)

  // Scene行の右端にLocationボタンが存在する
  await expect(page.locator('[data-testid="weather-location"]')).toBeVisible()

  await exitEnvironment(page)
})

test('WeatherPanelのLocationボタンからWorldMapModalを開き戻るとWeatherPanelに復帰する', async () => {
  const { page } = app

  // environmentシーンに遷移
  await enterEnvironment(page)

  // LocationボタンでWorldMapModalを開く
  await page.locator('[data-testid="weather-location"]').click()

  // WeatherPanelが閉じてWorldMapModalが開く
  await expect(page.locator('[data-testid="weather-sunny"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="worldmap-back"]')).toBeVisible()

  // 戻るボタンでWeatherPanelに復帰する（environment内部のビュー切替、blackoutなし）
  await page.locator('[data-testid="worldmap-back"]').click()
  await expect(page.locator('[data-testid="worldmap-back"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="weather-sunny"]')).toBeVisible()

  await exitEnvironment(page)
})

test('時間帯切替でactive状態が変化する', async () => {
  const { page } = app

  await enterEnvironment(page)

  // Morningをクリック
  await page.locator('[data-testid="time-morning"]').click()
  await expect(page.locator('[data-testid="time-morning"]')).toHaveClass(/active/)

  // Nightをクリック
  await page.locator('[data-testid="time-night"]').click()
  await expect(page.locator('[data-testid="time-night"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="time-morning"]')).not.toHaveClass(/active/)

  // Autoをクリック
  await page.locator('[data-testid="time-auto"]').click()
  await expect(page.locator('[data-testid="time-auto"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="time-night"]')).not.toHaveClass(/active/)

  // Dayに戻す
  await page.locator('[data-testid="time-day"]').click()

  await exitEnvironment(page)
})

test('Time手動選択→autoWeather有効化→再度autoWeather解除でTime選択が維持される', async () => {
  const { page } = app

  await enterEnvironment(page)

  // nightを選択（autoWeather=false, autoTimeOfDay=false）
  await page.locator('[data-testid="time-night"]').click()
  await expect(page.locator('[data-testid="time-night"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="weather-auto"]')).not.toHaveClass(/active/)

  // autoWeather有効化
  await page.locator('[data-testid="weather-auto"]').click()
  await expect(page.locator('[data-testid="weather-auto"]')).toHaveClass(/active/)
  // Time行のnightはactive維持（autoWeatherとautoTimeOfDayは独立）
  await expect(page.locator('[data-testid="time-night"]')).toHaveClass(/active/)

  // 天気アイコンでautoWeather解除
  await page.locator('[data-testid="weather-sunny"]').click()
  await expect(page.locator('[data-testid="weather-auto"]')).not.toHaveClass(/active/)
  // nightが引き続きactive
  await expect(page.locator('[data-testid="time-night"]')).toHaveClass(/active/)

  // sunnyに戻す + dayに戻す
  await page.locator('[data-testid="time-day"]').click()
  await exitEnvironment(page)
})

test('autoWeatherとautoTimeOfDayが独立して動作する', async () => {
  const { page } = app

  await enterEnvironment(page)

  // 初期状態: sunny + day（手動）
  await page.locator('[data-testid="weather-sunny"]').click()
  await page.locator('[data-testid="time-day"]').click()

  // autoWeather ON → Time行のactive状態は変わらない
  await page.locator('[data-testid="weather-auto"]').click()
  await expect(page.locator('[data-testid="weather-auto"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="time-day"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="time-auto"]')).not.toHaveClass(/active/)

  // autoWeather ON のまま Time Auto ON → 両方active
  await page.locator('[data-testid="time-auto"]').click()
  await expect(page.locator('[data-testid="weather-auto"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="time-auto"]')).toHaveClass(/active/)

  // autoWeather ON のまま Time手動選択 → autoWeatherは維持
  await page.locator('[data-testid="time-evening"]').click()
  await expect(page.locator('[data-testid="weather-auto"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="time-evening"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="time-auto"]')).not.toHaveClass(/active/)

  // Time Auto ON → autoWeatherは維持
  await page.locator('[data-testid="time-auto"]').click()
  await expect(page.locator('[data-testid="weather-auto"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="time-auto"]')).toHaveClass(/active/)

  // sunnyに戻す + dayに戻す
  await page.locator('[data-testid="weather-sunny"]').click()
  await page.locator('[data-testid="time-day"]').click()
  await exitEnvironment(page)
})

test('天気・時間帯の変更がシーン再遷移後も保持される', async () => {
  const { page } = app

  // sunny+dayに設定
  await enterEnvironment(page)
  await page.locator('[data-testid="weather-sunny"]').click()
  await page.locator('[data-testid="time-day"]').click()
  await exitEnvironment(page)

  // environmentに入って rainy + night に変更
  await enterEnvironment(page)
  await page.locator('[data-testid="weather-rainy"]').click()
  await page.locator('[data-testid="time-night"]').click()
  await exitEnvironment(page)

  // 再度開いてrainy+nightが保持されていることを確認
  await enterEnvironment(page)
  await expect(page.locator('[data-testid="weather-rainy"]')).toHaveClass(/active/)
  await expect(page.locator('[data-testid="time-night"]')).toHaveClass(/active/)

  // sunnyに戻す
  await page.locator('[data-testid="weather-sunny"]').click()
  await page.locator('[data-testid="time-day"]').click()
  await exitEnvironment(page)
})

test('cloud-level-3クリックでlevel 0〜3がonクラス、level 4〜5が非on', async () => {
  const { page } = app

  await enterEnvironment(page)

  // cloud-level-3をクリック
  await page.locator('[data-testid="cloud-level-3"]').click()

  // level 0〜3がonクラスを持つ
  for (const level of [0, 1, 2, 3]) {
    await expect(page.locator(`[data-testid="cloud-level-${level}"]`)).toHaveClass(/on/)
  }
  // level 4〜5がonクラスを持たない
  for (const level of [4, 5]) {
    await expect(page.locator(`[data-testid="cloud-level-${level}"]`)).not.toHaveClass(/on/)
  }

  await exitEnvironment(page)
})

test('cloud-resetクリックでプリセット値にリセットされる', async () => {
  const { page } = app

  await enterEnvironment(page)

  // sunnyに明示的に設定
  await page.locator('[data-testid="weather-sunny"]').click()

  // sunnyのプリセットは cloudDensityLevel=1
  // まずlevel 5に設定
  await page.locator('[data-testid="cloud-level-5"]').click()
  for (const level of [0, 1, 2, 3, 4, 5]) {
    await expect(page.locator(`[data-testid="cloud-level-${level}"]`)).toHaveClass(/on/)
  }

  // リセットクリック
  await page.locator('[data-testid="cloud-reset"]').click()

  // sunnyプリセット（cloudDensityLevel=1）: level 0〜1がon、level 2〜5が非on
  for (const level of [0, 1]) {
    await expect(page.locator(`[data-testid="cloud-level-${level}"]`)).toHaveClass(/on/)
  }
  for (const level of [2, 3, 4, 5]) {
    await expect(page.locator(`[data-testid="cloud-level-${level}"]`)).not.toHaveClass(/on/)
  }

  await exitEnvironment(page)
})

// --- 七十二候セレクタ ---

test('KouSelectorがenvironmentシーンで表示される', async () => {
  const { page } = app

  // freeモードではKouSelectorは非表示
  await expect(page.locator('[data-testid="kou-selector"]')).not.toBeVisible()

  // environmentシーンでKouSelectorが表示される
  await enterEnvironment(page)

  const selector = page.locator('[data-testid="kou-selector"]')
  await expect(selector).toBeVisible()

  const listBtn = page.locator('[data-testid="kou-list-btn"]')
  await expect(listBtn).toBeVisible()

  const autoBtn = page.locator('[data-testid="kou-auto"]')
  await expect(autoBtn).toBeVisible()

  await exitEnvironment(page)
})

test('KouSelector Autoボタンのトグル動作', async () => {
  const { page } = app

  await enterEnvironment(page)

  const autoBtn = page.locator('[data-testid="kou-auto"]')

  // autoKouがtrueであることを保証
  if (!(await autoBtn.evaluate(el => el.classList.contains('active')))) {
    await autoBtn.click()
  }
  await expect(autoBtn).toHaveClass(/active/)

  // Autoをオフ
  await autoBtn.click()
  await expect(autoBtn).not.toHaveClass(/active/)

  // Autoを再度オン
  await autoBtn.click()
  await expect(autoBtn).toHaveClass(/active/)

  await exitEnvironment(page)
})

test('KouSelectorリストから手動選択でAutoが解除される', async () => {
  const { page } = app

  await enterEnvironment(page)

  const autoBtn = page.locator('[data-testid="kou-auto"]')
  const listBtn = page.locator('[data-testid="kou-list-btn"]')

  // Autoをオンにする
  if (!(await autoBtn.evaluate(el => el.classList.contains('active')))) {
    await autoBtn.click()
  }
  await expect(autoBtn).toHaveClass(/active/)

  // リストを開く
  await listBtn.click()
  const overlay = page.locator('[data-testid="kou-list-overlay"]')
  await expect(overlay).toBeVisible()

  // 7行目を1回クリック（プレビュー選択）
  const row = overlay.locator('tbody tr').nth(6)
  await row.click()

  // オーバーレイはまだ表示中（プレビュー状態）
  await expect(overlay).toBeVisible()

  // 同じ行をもう1回クリック（確定）
  await row.click()

  // オーバーレイが閉じる
  await expect(overlay).not.toBeVisible()

  // Autoが解除される
  await expect(autoBtn).not.toHaveClass(/active/)

  // Autoに戻す（後続テスト用）
  await autoBtn.click()

  await exitEnvironment(page)
})

test('KouSelectorリストに日付範囲が表示される', async () => {
  const { page } = app

  await enterEnvironment(page)

  const listBtn = page.locator('[data-testid="kou-list-btn"]')
  await listBtn.click()

  const overlay = page.locator('[data-testid="kou-list-overlay"]')
  await expect(overlay).toBeVisible()

  // 最初の行のテキストに日付フォーマットを含む
  const firstRow = overlay.locator('tbody tr').first()
  const text = await firstRow.textContent()
  expect(text).toMatch(/\d+\/\s*\d+\s*-\s*\d+\/\s*\d+/)

  // 閉じる
  await page.locator('[data-testid="kou-list-close"]').click()

  await exitEnvironment(page)
})
