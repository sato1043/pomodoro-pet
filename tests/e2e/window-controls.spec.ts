import { test, expect } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  // closeテストでウィンドウが閉じる可能性があるため安全にクリーンアップ
  try { await closeApp(app) } catch { /* already closed */ }
})

test('カスタムタイトルバーのMinimizeボタンが存在する', async () => {
  const minimizeBtn = app.page.locator('[aria-label="Minimize"]')
  await expect(minimizeBtn).toBeVisible()
})

test('カスタムタイトルバーのCloseボタンが存在する', async () => {
  const closeBtn = app.page.locator('[aria-label="Close"]')
  await expect(closeBtn).toBeVisible()
})

test('electronAPIにwindowMinimize/windowCloseが公開されている', async () => {
  const hasMinimize = await app.page.evaluate(() => {
    return typeof (window as any).electronAPI.windowMinimize === 'function'
  })
  expect(hasMinimize).toBe(true)

  const hasClose = await app.page.evaluate(() => {
    return typeof (window as any).electronAPI.windowClose === 'function'
  })
  expect(hasClose).toBe(true)
})

test('Minimizeボタンクリック後もアプリは動作を継続する', async () => {
  const minimizeBtn = app.page.locator('[aria-label="Minimize"]')
  await minimizeBtn.click()

  // minimize IPC呼び出し後にウィンドウが閉じていないことを確認
  // xvfb環境ではウィンドウマネージャーがないためisMinimized()がtrueにならないことがある
  await app.page.waitForTimeout(500)
  const windowExists = await app.electronApp.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    return win != null && !win.isDestroyed()
  })
  expect(windowExists).toBe(true)

  // UIが引き続き操作可能であることを確認
  await app.electronApp.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) win.restore()
  })
  await app.page.waitForTimeout(300)
  const overlayVisible = await app.page.locator('[data-testid="overlay-free"]').isVisible()
  expect(overlayVisible).toBe(true)
})

test('OSネイティブのタイトルバーが非表示（frame: false）', async () => {
  // BrowserWindowの設定を確認
  // frame が false の場合、Electron は OS ネイティブフレームを描画しない
  // ウィンドウの contentSize と size の差分で間接的に判定可能だが、
  // 最も確実なのはメインプロセス側で直接確認する方法
  const hasNoFrame = await app.electronApp.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return false
    // frame: false の場合、contentBounds === bounds（フレームがない）
    const bounds = win.getBounds()
    const contentBounds = win.getContentBounds()
    return bounds.width === contentBounds.width && bounds.height === contentBounds.height
  })
  expect(hasNoFrame).toBe(true)
})
