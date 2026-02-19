import { _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { resolve } from 'path'

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
  await page.waitForSelector('#timer-overlay', { timeout: 15_000 })

  return { electronApp, page }
}

export async function closeApp(ctx: AppContext): Promise<void> {
  await ctx.electronApp.close()
}
