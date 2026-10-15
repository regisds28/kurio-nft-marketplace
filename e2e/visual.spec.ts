import { expect, test, type Page } from '@playwright/test'
import { boot, login, reachReview } from './helpers'

const WIDTHS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
]

for (const vp of WIDTHS) {
  test.describe(`largura ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })
    test.beforeEach(async ({ page }) => {
      await page.clock.install({ time: new Date('2026-10-14T12:00:00-03:00') })
    })

    const settle = async (page: Page) => {
      await page.waitForLoadState('networkidle')
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(300)
    }

    test('início', async ({ page }) => {
      await boot(page)
      await expect(page.getByTestId('nft-card')).toHaveCount(9)
      await settle(page)
      await expect(page).toHaveScreenshot(`inicio-${vp.name}.png`, { fullPage: true })
    })

    test('detalhe', async ({ page }) => {
      await boot(page, 'fast', '/nft/nft-001')
      await expect(page.locator('h1:visible').first()).toBeVisible()
      await settle(page)
      await expect(page).toHaveScreenshot(`detalhe-${vp.name}.png`, { fullPage: true })
    })

    test('carrinho', async ({ page }) => {
      await boot(page)
      await login(page)
      await page.goto('/carrinho')
      await expect(page.getByTestId('cart-item')).toHaveCount(3)
      await settle(page)
      await expect(page).toHaveScreenshot(`carrinho-${vp.name}.png`, { fullPage: true })
    })

    test('pagamento', async ({ page }) => {
      await boot(page)
      await login(page)
      await page.goto('/pagamento')
      await expect(page.getByTestId('checkout-summary')).toBeVisible()
      await settle(page)
      await expect(page).toHaveScreenshot(`pagamento-${vp.name}.png`, { fullPage: true })
    })

    test('pagamento · revisão', async ({ page }) => {
      await boot(page)
      await login(page)
      await reachReview(page)
      await settle(page)
      await expect(page).toHaveScreenshot(`pagamento-revisao-${vp.name}.png`, { fullPage: true })
    })
  })
}
