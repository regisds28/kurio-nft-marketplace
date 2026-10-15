import { z } from 'zod'

export function isValidCpf(value: string): boolean {
  const d = value.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10])
}

export const formatCpf = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export const collectorSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Informe seu nome completo')
    .refine((v) => v.split(/\s+/).length >= 2, 'Informe nome e sobrenome'),
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido'),
  document: z.string().refine(isValidCpf, 'CPF inválido'),
})
export type CollectorValues = z.infer<typeof collectorSchema>
