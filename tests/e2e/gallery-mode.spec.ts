import { test, expect } from '@playwright/test'
import { launchApp, closeApp, type AppContext } from './helpers/launch'

let app: AppContext

test.beforeAll(async () => {
  app = await launchApp()
})

test.afterAll(async () => {
  await closeApp(app)
})

test('gallery-entryクリックでoverlay-galleryが表示される', async () => {
  const { page } = app

  await page.locator('[data-testid="gallery-entry"]').click()

  // blackout遷移（約700ms）を考慮
  await expect(page.locator('[data-testid="overlay-gallery"]')).toBeVisible({ timeout: 5_000 })
})

test('galleryモード中にfreeモードのボタンが非表示でgallery-exitが表示', async () => {
  const { page } = app

  // galleryモード中
  await expect(page.locator('[data-testid="gallery-exit"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).not.toBeVisible()
  await expect(page.locator('[data-testid="settings-toggle"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="stats-toggle"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="weather-toggle"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="fureai-entry"]')).not.toBeVisible()
  await expect(page.locator('[data-testid="gallery-entry"]')).not.toBeVisible()
})

test('CompactHeaderとGalleryTopBarが表示される', async () => {
  const { page } = app

  await expect(page.locator('[data-testid="compact-header"]')).toBeVisible()
  await expect(page.locator('[data-testid="gallery-top-bar"]')).toBeVisible()
})

test('初期モードがClipsでクリップリストが表示される', async () => {
  const { page } = app

  await expect(page.locator('[data-testid="gallery-mode-clips"]')).toBeVisible()
  await expect(page.locator('[data-testid="gallery-item-idle"]')).toBeVisible()
  await expect(page.locator('[data-testid="gallery-item-run"]')).toBeVisible()
})

test('クリップアイテムをクリックするとgallery-infoが更新される', async () => {
  const { page } = app

  await page.locator('[data-testid="gallery-item-walk"]').click()
  const info = page.locator('[data-testid="gallery-info"]')
  await expect(info).toContainText('Walk')
})

test('Clipsモードのgallery-infoにStateが表示されない', async () => {
  const { page } = app

  const info = page.locator('[data-testid="gallery-info"]')
  await expect(info).not.toContainText('State:')
  await expect(info).toContainText('Clip:')
})

test('同じクリップを2回クリックしてもgallery-infoが表示されている', async () => {
  const { page } = app

  await page.locator('[data-testid="gallery-item-idle"]').click()
  await page.locator('[data-testid="gallery-item-idle"]').click()
  const info = page.locator('[data-testid="gallery-info"]')
  await expect(info).toContainText('Idle')
})

test('Statesモードに切り替えると状態リストが表示される', async () => {
  const { page } = app

  await page.locator('[data-testid="gallery-mode-states"]').click()
  await expect(page.locator('[data-testid="gallery-item-happy"]')).toBeVisible()
  await expect(page.locator('[data-testid="gallery-item-feeding"]')).toBeVisible()
})

test('StatesモードのinfoにStateが表示される', async () => {
  const { page } = app

  const info = page.locator('[data-testid="gallery-info"]')
  await expect(info).toContainText('State:')
})

test('Rulesモードに切り替えるとルールリストが表示される', async () => {
  const { page } = app

  await page.locator('[data-testid="gallery-mode-rules"]').click()
  await expect(page.locator('[data-testid="gallery-item-fatigue-march"]')).toBeVisible()
  await expect(page.locator('[data-testid="gallery-item-march-late-run"]')).toBeVisible()
})

test('gallery-exitクリックでoverlay-freeが再表示される', async () => {
  const { page } = app

  await page.locator('[data-testid="gallery-exit"]').click()

  // blackout遷移を考慮
  await expect(page.locator('[data-testid="overlay-free"]')).toBeVisible({ timeout: 5_000 })
  await expect(page.getByRole('button', { name: 'Start Pomodoro' })).toBeVisible()
})
