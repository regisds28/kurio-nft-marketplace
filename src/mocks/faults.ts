import { commit, getDb, getScenario } from './db'
import { hashString, mulberry32 } from './prng'
import { globToRegExp, type FaultRule, type HttpMethod } from './scenarios'

const routeCounters = new Map<string, number>()

interface QueuedDelay {
  method?: HttpMethod
  pattern: RegExp
  ms: number
  remaining: number
}
const delayQueue: QueuedDelay[] = []

export function queueDelay(input: { method?: HttpMethod; path: string; ms: number; times?: number }): void {
  delayQueue.push({ method: input.method, pattern: globToRegExp(input.path), ms: input.ms, remaining: input.times ?? 1 })
}

export function clearQueuedDelays(): void {
  delayQueue.length = 0
  routeCounters.clear()
}

export function latencyFor(method: string, pathname: string): number {
  const { latency } = getScenario()
  const key = `${method} ${pathname}`
  const count = (routeCounters.get(key) ?? 0) + 1
  routeCounters.set(key, count)

  let ms = 0
  if (latency.mode === 'range') {
    const rng = mulberry32(latency.seed + hashString(key) + count)
    ms = Math.round(latency.minMs + rng() * (latency.maxMs - latency.minMs))
  } else if (latency.mode === 'alternate') {
    ms = count % 2 === 1 ? latency.maxMs : latency.minMs
  }

  for (const queued of delayQueue) {
    if (queued.remaining <= 0) continue
    if (queued.method && queued.method !== method) continue
    if (!queued.pattern.test(pathname)) continue
    queued.remaining -= 1
    ms += queued.ms
    break
  }
  return ms
}

export function matchFault(method: string, pathname: string, hasAuthorization: boolean): FaultRule | null {
  const { rules } = getScenario()
  const db = getDb()
  for (const rule of rules) {
    if (rule.method && rule.method !== method) continue
    if (!globToRegExp(rule.path).test(pathname)) continue
    if (rule.authOnly && !hasAuthorization) continue

    const count = (db.faultCounters[rule.id] ?? 0) + 1
    db.faultCounters[rule.id] = count
    commit()
    const skip = rule.skip ?? 0
    if (count <= skip) continue
    if (rule.times !== undefined && count > skip + rule.times) continue
    return rule
  }
  return null
}
