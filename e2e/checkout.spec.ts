import { expect, test } from '@playwright/test'
import { boot, login, mock, reachReview } from './helpers'

test.describe('pagamento', () => {
  test('10 · compra confirmada: recibo, carrinho esvaziado e checkout não repetível', async ({ page }) => {
    await boot(page)
    await login(page)
    await reachReview(page)
    await page.getByTestId('confirm-order').click()
    await expect(page).toHaveURL(/\/pedido\//)
    await expect(page.getByTestId('order-confirmed')).toBeVisible()
    await expect(page.getByTestId('receipt')).toContainText('26.846')
    await expect(page.getByTestId('tx-ref')).toContainText('0x')
    const orders = await mock.orders(page)
    expect(orders).toHaveLength(1)
    expect(orders[0]!.status).toBe('confirmed')
    await page.goto('/carrinho')
    await expect(page.getByTestId('cart-item')).toHaveCount(0)
  })

  test('11 · pagamento recusado: pedido declinado, carrinho mantido e nova tentativa possível', async ({ page }) => {
    await boot(page, 'fast,payment-declined')
    await login(page)
    await reachReview(page)
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-declined')).toBeVisible()
    await page.goto('/carrinho')
    await expect(page.getByTestId('cart-item')).toHaveCount(3)

    await page.evaluate(() => window.__KURIO_MOCK__!.setScenario('fast'))
    await reachReview(page)
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-confirmed')).toBeVisible()
  })

  test('12 · carteira recusa a conexão e permite nova tentativa', async ({ page }) => {
    await boot(page, 'fast,wallet-rejected')
    await login(page)
    await page.goto('/pagamento')
    await page.getByLabel('CPF').fill('52998224725')
    await page.getByTestId('connect-wallet').click()
    await expect(page.getByTestId('connection-panel').getByRole('alert')).toBeVisible()
    await page.getByTestId('review-order').click()
    await expect(page.getByTestId('review')).toBeHidden()
    await page.evaluate(() => window.__KURIO_MOCK__!.setScenario('fast'))
    await page.getByTestId('connect-wallet').click()
    await expect(page.getByTestId('disconnect-wallet')).toBeVisible()
  })

  test('13 · timeout na criação: reenvio idempotente gera UM único pedido', async ({ page }) => {
    await boot(page, 'fast,order-timeout')
    await login(page)
    await reachReview(page)
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 30_000 })
    expect(await mock.orders(page)).toHaveLength(1)
  })

  test('14 · preço muda durante o pagamento: exige nova confirmação e cobra o valor novo', async ({ page }) => {
    await boot(page, 'fast,price-change')
    await login(page)
    await reachReview(page)
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('quote-changes')).toBeVisible()
    expect(await mock.orders(page)).toHaveLength(0)
    await page.getByTestId('accept-changes').click()
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-confirmed')).toBeVisible()
    expect(await mock.orders(page)).toHaveLength(1)
  })
})
