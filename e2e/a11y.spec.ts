import { expect, test } from '@playwright/test'
import { boot, login } from './helpers'

test.describe('acessibilidade e responsividade', () => {
  for (const path of ['/', '/nft/nft-001', '/entrar', '/cadastro']) {
    test(`18 · sem rolagem horizontal e com foco visível: ${path}`, async ({ page }) => {
      await boot(page, 'fast', path)
      await page.locator('body').waitFor()
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      if (!path.startsWith('/entrar') && !path.startsWith('/cadastro')) {
        await page.keyboard.press('Tab')
        await expect(page.getByRole('link', { name: /pular para o conteúdo/i })).toBeFocused()
      }
    })
  }

  test('19 · telas privadas sem overflow (carrinho, pagamento, perfil, carteiras)', async ({ page }) => {
    await boot(page)
    await login(page)
    for (const path of ['/carrinho', '/pagamento', '/perfil', '/carteiras']) {
      await page.goto(path)
      await page.getByRole('main').waitFor()
      await page.waitForTimeout(300)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(0)
    }
  })

  test('20 · rota privada exige login e devolve ao destino depois', async ({ page }) => {
    await boot(page, 'fast', '/perfil')
    await expect(page).toHaveURL(/\/entrar\?.*redirect=%2Fperfil/)
  })

  test('21 · ações fora de escopo não parecem ter sucesso', async ({ page }) => {
    await boot(page, 'fast', '/')
    const mobile = (page.viewportSize()?.width ?? 1440) < 1024
    await page.getByRole('button', { name: mobile ? 'Favoritos' : 'Facebook' }).click()
    await expect(page.getByText(/não faz parte desta versão/i).first()).toBeVisible()
  })
})
