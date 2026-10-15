import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { toApiError } from '@/api/errors'

export function applyServerErrors<T extends FieldValues>(form: UseFormReturn<T>, error: unknown): string | null {
  const err = toApiError(error)
  let general: string | null = null
  const entries = Object.entries(err.fields)
  for (const [name, message] of entries) {
    if (name === '_form') general = message
    else if (name in form.getValues()) form.setError(name as Path<T>, { type: 'server', message })
    else general = message
  }
  if (!entries.length) general = err.message
  return general
}
