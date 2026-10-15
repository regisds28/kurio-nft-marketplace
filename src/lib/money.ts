import Decimal from 'decimal.js'

export type EthString = string

const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN, toExpNeg: -30, toExpPos: 30 })

export const ETH_SCALE = 18

const ETH_PATTERN = /^\d+(\.\d{1,18})?$/

export function isEthString(value: unknown): value is EthString {
  return typeof value === 'string' && ETH_PATTERN.test(value)
}

export function eth(value: EthString | number | Decimal): Decimal {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new RangeError('Valor ETH inválido')
    return new D(value.toString())
  }
  return new D(value)
}

export function normalizeEth(value: EthString | Decimal): EthString {
  return eth(value).toDecimalPlaces(ETH_SCALE, Decimal.ROUND_HALF_EVEN).toFixed()
}

export function addEth(...values: Array<EthString | Decimal>): EthString {
  return normalizeEth(values.reduce<Decimal>((acc, v) => acc.plus(eth(v)), new D(0)))
}

export function subEth(a: EthString, b: EthString): EthString {
  return normalizeEth(eth(a).minus(eth(b)))
}

export function mulEth(value: EthString, quantity: number | string): EthString {
  return normalizeEth(eth(value).times(new D(quantity)))
}

export function percentOfEth(value: EthString, percent: number | string): EthString {
  return normalizeEth(eth(value).times(new D(percent)).div(100).toDecimalPlaces(6, Decimal.ROUND_HALF_EVEN))
}

export function minEth(a: EthString, b: EthString): EthString {
  return normalizeEth(Decimal.min(eth(a), eth(b)))
}

export function compareEth(a: EthString, b: EthString): -1 | 0 | 1 {
  return eth(a).comparedTo(eth(b)) as -1 | 0 | 1
}

export function eqEth(a: EthString, b: EthString): boolean {
  return eth(a).eq(eth(b))
}

export function isZeroEth(a: EthString): boolean {
  return eth(a).isZero()
}

export function formatEth(value: EthString, { minDecimals = 2, suffix = true }: { minDecimals?: number; suffix?: boolean } = {}): string {
  const d = eth(value)
  let out = d.toDecimalPlaces(ETH_SCALE, Decimal.ROUND_HALF_EVEN).toFixed()
  const [intPart = '0', frac = ''] = out.split('.')
  const trimmed = frac.replace(/0+$/, '')
  const padded = trimmed.padEnd(minDecimals, '0')
  out = padded.length > 0 ? `${intPart}.${padded}` : intPart
  return suffix ? `${out} ETH` : out
}

export function formatDiscount(value: EthString): string {
  const d = eth(value)
  if (d.isZero()) return '(-) 00.00'
  return `(-) ${formatEth(value, { suffix: false })}`
}

export function parseEthInput(raw: string): EthString | null {
  const trimmed = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) return null
  return normalizeEth(trimmed)
}
