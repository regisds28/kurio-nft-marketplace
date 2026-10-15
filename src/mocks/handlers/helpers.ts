import type { ZodType } from 'zod'
import { fieldsFromZod, validationFail } from '../http-fail'

export function parseBody<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) validationFail(fieldsFromZod(result.error.issues))
  return result.data
}

export function csv(value: string | null): string[] {
  return value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []
}

export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(binary)
}
