import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'Kurio#2026'
export const VALID_CPF = '52998224725'

export async function boot(page: Page, scenario = 'fast', path = '/') {
  const sep = path.includes('?') ? '&' : '?'
  await page.goto(`${path}${sep}scenario=${encodeURIComponent(scenario)}`)
  await page.waitForFunction(() => Boolean(window.__KURIO_MOCK__))
}

export async function login(page: Page, email = 'nova@kurio.test', redirect?: string) {
  await page.goto(redirect ? `/entrar?redirect=${encodeURIComponent(redirect)}` : '/entrar')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await page.getByTestId('submit-login').click()
  await expect(page.getByTestId('submit-login')).toBeHidden()
  if (redirect) await expect(page).toHaveURL(new RegExp(redirect.replace(/[/]/g, '\\/') + '$'))
  await page.waitForFunction(() => Boolean(localStorage.getItem('kurio.auth')))
}

export async function realtimeConnected(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-realtime', 'connected', { timeout: 15_000 })
}

export const mock = {
  nftId: (page: Page, name: string) => page.evaluate((n) => window.__KURIO_MOCK__!.nft.find(n), name),
  update: (page: Page, input: { id: string; priceEth?: string; editions?: Record<string, number>; reason?: 'price_changed' | 'availability_changed' | 'sold_out' | 'restocked' }) =>
    page.evaluate((i) => window.__KURIO_MOCK__!.nft.update(i), input),
  orders: (page: Page) => page.evaluate(() => window.__KURIO_MOCK__!.orders.list()),
}

export async function reachReview(page: Page) {
  await page.goto('/pagamento')
  await page.getByLabel('CPF').fill(VALID_CPF)
  if (await page.getByTestId('connect-wallet').isVisible()) await page.getByTestId('connect-wallet').click()
  await expect(page.getByTestId('disconnect-wallet')).toBeVisible()
  await page.getByTestId('review-order').click()
  await expect(page.getByTestId('review')).toBeVisible()
}
