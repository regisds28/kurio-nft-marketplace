import { describe, expect, it } from 'vitest'
import {
  addEth,
  compareEth,
  formatDiscount,
  formatEth,
  isEthString,
  mulEth,
  normalizeEth,
  parseEthInput,
  percentOfEth,
  subEth,
} from './money'

describe('money (ETH em strings decimais)', () => {
  it('soma sem erro de ponto flutuante', () => {
    expect(addEth('0.1', '0.2')).toBe('0.3')
    expect(addEth('26.83', '0.016')).toBe('26.846')
  })

  it('reproduz os totais do layout do carrinho', () => {
    const subtotal = addEth(mulEth('1.19', 2), mulEth('1.39', 6), mulEth('1.79', 9))
    expect(subtotal).toBe('26.83')
    expect(addEth(subtotal, '0.016')).toBe('26.846')
  })

  it('multiplica por quantidades inteiras mantendo a precisão', () => {
    expect(mulEth('0.000000000000000001', 3)).toBe('0.000000000000000003')
    expect(mulEth('1.39', 6)).toBe('8.34')
  })

  it('calcula percentuais com arredondamento determinístico', () => {
    expect(percentOfEth('26.83', 10)).toBe('2.683')
    expect(percentOfEth('0.333333', 10)).toBe('0.033333')
  })

  it('subtrai e compara', () => {
    expect(subEth('2', '0.016')).toBe('1.984')
    expect(compareEth('1.10', '1.1')).toBe(0)
    expect(compareEth('1.2', '1.19')).toBe(1)
  })

  it('formata como no layout', () => {
    expect(formatEth('1.19')).toBe('1.19 ETH')
    expect(formatEth('1.1')).toBe('1.10 ETH')
    expect(formatEth('26.846')).toBe('26.846 ETH')
    expect(formatEth('0.016')).toBe('0.016 ETH')
    expect(formatEth('3')).toBe('3.00 ETH')
    expect(formatEth('1.19', { suffix: false })).toBe('1.19')
    expect(formatDiscount('0')).toBe('(-) 00.00')
    expect(formatDiscount('2.683')).toBe('(-) 2.683')
  })

  it('valida strings ETH e entradas do usuário', () => {
    expect(isEthString('1.19')).toBe(true)
    expect(isEthString('1,19')).toBe(false)
    expect(isEthString(1.19)).toBe(false)
    expect(parseEthInput('1,5')).toBe('1.5')
    expect(parseEthInput('abc')).toBeNull()
    expect(parseEthInput('1.1234567')).toBeNull()
  })

  it('normaliza zeros à direita', () => {
    expect(normalizeEth('1.500')).toBe('1.5')
    expect(normalizeEth('0.00')).toBe('0')
  })
})
