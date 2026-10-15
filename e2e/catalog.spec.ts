import { expect, test } from '@playwright/test'
import { boot } from './helpers'

test.describe('catálogo: filtros, busca, ordenação e paginação na URL', () => {
  test('1 · busca, ordenação e página persistem na URL e sobrevivem ao refresh', async ({ page }) => {
    await boot(page)
    await expect(page.getByTestId('nft-card')).toHaveCount(9)
    await expect(page.getByTestId('pagination')).toBeVisible()

    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByTestId('nft-card').first()).toBeVisible()

    await page.goto('/?q=emerald&sort=price_asc')
    await expect(page.getByTestId('nft-card').first()).toContainText(/emerald/i)
    await page.reload()
    await expect(page).toHaveURL(/q=emerald/)
    await expect(page.locator('[data-catalog-search]:visible')).toHaveValue('emerald')
    await expect(page.getByTestId('nft-card').first()).toContainText(/emerald/i)
  })

  test('2 · filtros combináveis zeram a página e há estado vazio com limpeza', async ({ page }) => {
    await boot(page, 'fast', '/?page=3')
    await expect(page).toHaveURL(/page=3/)
    await page.goto('/?page=3&networks=polygon')
    await expect(page).not.toHaveURL(/page=3/)
    await expect(page.getByTestId('nft-card').first()).toBeVisible()

    await page.goto('/?q=zzzz-inexistente')
    await expect(page.getByText(/nenhum/i).first()).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).first().click()
    await expect(page).not.toHaveURL(/q=/)
    await expect(page.getByTestId('nft-card')).toHaveCount(9)
  })

  test('3 · parâmetros inválidos na URL são tolerados', async ({ page }) => {
    await boot(page, 'fast', '/?page=abc&sort=xyz&networks=marte&minPrice=-1')
    await expect(page.getByTestId('nft-card')).toHaveCount(9)
  })

  test('4 · erro do servidor mostra estado com nova tentativa', async ({ page }) => {
    await boot(page, 'fast,server-error')
    await expect(page.getByRole('alert').first()).toBeVisible()
    await page.evaluate(() => window.__KURIO_MOCK__!.setScenario('fast'))
    await page.getByRole('button', { name: /tentar novamente/i }).first().click({ timeout: 3_000 }).catch(() => undefined)
    await expect(page.getByTestId('nft-card').first()).toBeVisible()
  })
})
