import { test, expect, type Page } from '@playwright/test'
import { launchApp, closeApp, setLicenseMode, type AppContext } from './helpers/launch'

// VITE_DEBUG_TIMER=3/2/3/2 でビルド済み前提

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  await closeApp(app)
})

interface BiorhythmState {
  activity: number
  sociability: number
  focus: number
}

async function getDebugBiorhythm(page: Page): Promise<BiorhythmState> {
  return page.evaluate(() => {
    const el = document.getElementById('debug-animation-state')
    return JSON.parse(el?.dataset.biorhythm || '{"activity":0,"sociability":0,"focus":0}')
  })
}

test('registeredモードでバイオリズムがNEUTRALでない', async () => {
  const { page } = app
  await setLicenseMode(app, 'registered')

  // バイオリズムtickが実行されるまで待つ
  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    if (!el?.dataset.biorhythm) return false
    const bio = JSON.parse(el.dataset.biorhythm)
    return bio.activity !== 0 || bio.sociability !== 0 || bio.focus !== 0
  }, { timeout: 5_000 })

  const bio = await getDebugBiorhythm(page)
  const hasNonZero = bio.activity !== 0 || bio.sociability !== 0 || bio.focus !== 0
  expect(hasNonZero).toBe(true)
})

test('trialモードでバイオリズムがNEUTRAL近傍', async () => {
  const { page } = app
  await setLicenseMode(app, 'trial')

  // モード切替後にバイオリズムtickを数回待つ
  await page.waitForTimeout(1_000)

  const bio = await getDebugBiorhythm(page)
  expect(Math.abs(bio.activity)).toBeLessThan(0.2)
  expect(Math.abs(bio.sociability)).toBeLessThan(0.2)
  expect(Math.abs(bio.focus)).toBeLessThan(0.2)
})

test('ライセンスモード切替でバイオリズムがON/OFFする', async () => {
  const { page } = app

  // registered → バイオリズム有効
  await setLicenseMode(app, 'registered')
  await page.waitForFunction(() => {
    const el = document.getElementById('debug-animation-state')
    if (!el?.dataset.biorhythm) return false
    const bio = JSON.parse(el.dataset.biorhythm)
    return bio.activity !== 0 || bio.sociability !== 0 || bio.focus !== 0
  }, { timeout: 5_000 })

  const bioRegistered = await getDebugBiorhythm(page)
  const hasNonZero = bioRegistered.activity !== 0 || bioRegistered.sociability !== 0 || bioRegistered.focus !== 0
  expect(hasNonZero).toBe(true)

  // trial → バイオリズム無効（NEUTRAL近傍）
  await setLicenseMode(app, 'trial')
  await page.waitForTimeout(1_000)

  const bioTrial = await getDebugBiorhythm(page)
  expect(Math.abs(bioTrial.activity)).toBeLessThan(0.2)
  expect(Math.abs(bioTrial.sociability)).toBeLessThan(0.2)
  expect(Math.abs(bioTrial.focus)).toBeLessThan(0.2)
})
