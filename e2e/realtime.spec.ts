import { expect, test } from '@playwright/test'
import { boot, login, mock, realtimeConnected } from './helpers'

test.describe('tempo real (Socket.IO simulado)', () => {
  test('15 · nft.updated atualiza preço no detalhe e no carrinho; duplicata e versão antiga são ignoradas', async ({ page }) => {
    await boot(page, 'fast', '/nft/nft-001')
    await login(page, 'nova@kurio.test', '/nft/nft-001')
    await realtimeConnected(page)
    const id = (await mock.nftId(page, 'Emerald Ape #042'))!
    await mock.update(page, { id, priceEth: '1.30' })
    await expect(page.getByTestId('nft-price').first()).toContainText('1.3')

    const log = await page.evaluate(() => window.__KURIO_MOCK__!.realtime.log().filter((l) => l.event.type === 'nft.updated'))
    const last = log.at(-1)!.event
    await page.evaluate((eid) => window.__KURIO_MOCK__!.realtime.replay(eid), last.eventId)
    await page.evaluate((e) => window.__KURIO_MOCK__!.realtime.emit({ ...e, eventId: 'evt_old', version: 1, payload: { ...(e as { payload: object }).payload, priceEth: '9.99' } } as never), last)
    await expect(page.getByTestId('nft-price').first()).toContainText('1.3')
    await expect(page.getByTestId('nft-price').first()).not.toContainText('9.99')

    await page.goto('/carrinho')
    await expect(page.getByTestId('cart-unit-price').first()).toContainText('1.3')
  })

  test('16 · queda do socket: reconecta e reconcilia com o REST', async ({ page }) => {
    await boot(page, 'fast', '/nft/nft-001')
    await realtimeConnected(page)
    await page.evaluate(() => window.__KURIO_MOCK__!.realtime.setOffline(true))
    await expect(page.locator('html')).not.toHaveAttribute('data-realtime', 'connected')
    const id = (await mock.nftId(page, 'Emerald Ape #042'))!
    await mock.update(page, { id, priceEth: '1.45' })
    await page.evaluate(() => window.__KURIO_MOCK__!.realtime.setOffline(false))
    await realtimeConnected(page)
    await expect(page.getByTestId('nft-price').first()).toContainText('1.45')
  })

  test('17 · eventos de pedido não vazam para outro usuário', async ({ page, browser }) => {
    await boot(page)
    await login(page, 'nova@kurio.test')
    await realtimeConnected(page)
    const other = await browser.newContext({ baseURL: 'http://localhost:4173' })
    const p2 = await other.newPage()
    await boot(p2)
    await login(p2, 'rafael@kurio.test')
    await realtimeConnected(p2)
    await page.goto('/pagamento')
    await page.getByLabel('CPF').fill('52998224725')
    await page.getByTestId('connect-wallet').click()
    await page.getByTestId('review-order').click()
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-confirmed')).toBeVisible()
    const leaked = await page.evaluate(() =>
      window.__KURIO_MOCK__!.realtime.log().filter((l) => l.event.type === 'order.updated' && l.userId !== (l.event.payload as { ownerId: string }).ownerId),
    )
    expect(leaked).toHaveLength(0)
    await other.close()
  })
})
