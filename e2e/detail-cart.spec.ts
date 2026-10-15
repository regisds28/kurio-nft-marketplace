import { expect, test } from '@playwright/test'
import { boot, login, mock } from './helpers'

test.describe('detalhe e carrinho', () => {
  test('5 · detalhe: acesso direto, 404 e limite de quantidade', async ({ page }) => {
    await boot(page, 'fast', '/nft/nft-001')
    await expect(page.getByTestId('nft-title')).toHaveText('Emerald Ape #042')
    for (let i = 0; i < 15; i++) {
      const plus = page.getByRole('button', { name: 'Aumentar quantidade' })
      if (await plus.isDisabled()) break
      await plus.click()
    }
    await expect(page.locator('[data-testid="quantity"]:visible')).toHaveText('10')
    await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()

    await page.goto('/nft/nao-existe')
    await expect(page.getByRole('heading', { name: /não encontrad/i })).toBeVisible()
  })

  test('6 · carrinho: visitante adiciona, persiste ao refresh e mescla ao entrar', async ({ page }) => {
    await boot(page, 'fast', '/nft/nft-004')
    await page.locator('[data-testid="add-to-cart"]:visible, button[aria-label="Adicionar ao carrinho"]:visible').first().click()
    await expect(page.getByTestId('cart-badge')).toHaveText('1')
    await page.reload()
    await expect(page.getByTestId('cart-badge')).toHaveText('1')

    await login(page, 'nova@kurio.test')
    await page.goto('/carrinho')
    await expect(page.getByTestId('cart-item')).toHaveCount(4)
  })

  test('7 · carrinho: quantidade, cupom e totais vêm da API (decimais exatos)', async ({ page }) => {
    await boot(page)
    await login(page)
    await page.goto('/carrinho')
    await expect(page.getByTestId('summary')).toContainText('26.846')
    await page.getByPlaceholder('Digite o código promocional...').fill('NAOEXISTE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Código promocional inválido.')).toBeVisible()
    await page.getByPlaceholder('Digite o código promocional...').fill('kurio10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByTestId('coupon-applied')).toContainText('KURIO10')
    await expect(page.getByTestId('summary')).toContainText('24.163')
    await page.getByRole('button', { name: /Remover Ivory Baron/ }).click()
    await expect(page.getByTestId('cart-item')).toHaveCount(2)
  })

  test('8 · favoritos por usuário com rollback quando a API falha', async ({ page }) => {
    await boot(page, 'fast', '/nft/nft-004')
    await login(page, 'nova@kurio.test', '/nft/nft-004')
    const fav = page.locator('[data-testid="favorite-button"]:visible, button[aria-label="Favoritar"]:visible, button[aria-label="Remover dos favoritos"]:visible').first()
    await fav.click()
    await expect(fav).toHaveAttribute('aria-pressed', 'true')

    await page.evaluate(() => window.__KURIO_MOCK__!.setScenario('fast,favorites-failure'))
    await fav.click()
    await expect(page.getByRole('status').or(page.getByRole('alert')).first()).toBeVisible()
    await expect(fav).toHaveAttribute('aria-pressed', 'true')

    await page.evaluate(() => window.__KURIO_MOCK__!.setScenario('fast'))
    await page.goto('/perfil')
    await page.getByTestId('account-logout').click()
    await expect(page).toHaveURL(/\/$|\/entrar/)
    await login(page, 'rafael@kurio.test', '/nft/nft-004')
    await expect(page.locator('[data-testid="favorite-button"]:visible, button[aria-label="Favoritar"]:visible, button[aria-label="Remover dos favoritos"]:visible').first()).toHaveAttribute('aria-pressed', 'false')
  })

  test('9 · sessão expirada preserva o contexto e volta para a tela de origem', async ({ page }) => {
    await boot(page)
    await login(page)
    await page.goto('/pagamento')
    await expect(page.getByTestId('checkout-summary')).toBeVisible()
    await page.evaluate(() => window.__KURIO_MOCK__!.expireSession())
    await page.reload()
    await expect(page).toHaveURL(/\/entrar\?.*redirect=%2Fpagamento/)
    await page.getByLabel('E-mail', { exact: true }).fill('nova@kurio.test')
    await page.getByLabel('Senha', { exact: true }).fill('Kurio#2026')
    await page.getByTestId('submit-login').click()
    await expect(page).toHaveURL(/\/pagamento$/)
    await expect(page.getByTestId('checkout-summary')).toBeVisible()
    expect(await mock.nftId(page, 'Emerald Ape #042')).toBeTruthy()
  })
})
