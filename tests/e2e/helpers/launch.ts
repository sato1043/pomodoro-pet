import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { resolve, join } from 'path'
import { existsSync, unlinkSync } from 'fs'

const PROJECT_ROOT = resolve(__dirname, '../../..')

export interface AppContext {
  electronApp: ElectronApplication
  page: Page
}

export async function launchApp(): Promise<AppContext> {
  const electronApp = await electron.launch({
    args: [resolve(PROJECT_ROOT, 'out/main/index.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  })

  const page = await electronApp.firstWindow()
  // DOMのReact UIがマウントされるまで待機
  await page.waitForSelector('[data-testid="overlay-free"]', { timeout: 15_000 })

  return { electronApp, page }
}

export async function closeApp(ctx: AppContext): Promise<void> {
  await ctx.electronApp.close()
}

/**
 * レンダラーのライセンスモードを強制切り替えする。
 * メインプロセスから 'license:changed' IPCを送信し、LicenseProviderの状態を更新する。
 */
export async function setLicenseMode(ctx: AppContext, mode: string): Promise<void> {
  await ctx.electronApp.evaluate(({ BrowserWindow }, m) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      win.webContents.send('license:changed', { mode: m })
    }
  }, mode)
  // React再レンダリング完了を待つ: registered なら trial-badge が消える
  if (mode === 'registered') {
    await ctx.page.waitForSelector('[data-testid="trial-badge"]', { state: 'hidden', timeout: 5_000 }).catch(() => {})
  }
  await ctx.page.waitForTimeout(300)
}

/**
 * E2Eテスト前にemotion-history.jsonを削除して感情初期値をデフォルトにリセットする。
 * 一時的にアプリを起動してuserDataパスを取得し、ファイル削除後に閉じる。
 */
export async function cleanEmotionHistory(): Promise<void> {
  const ctx = await launchApp()
  const userDataPath = await ctx.electronApp.evaluate(({ app }) => app.getPath('userData'))
  await closeApp(ctx)
  const historyPath = join(userDataPath, 'emotion-history.json')
  if (existsSync(historyPath)) unlinkSync(historyPath)
}
