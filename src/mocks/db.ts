import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/api/contracts'
import { safeJsonParse, safeStorage } from '@/lib/utils'
import { createSeedState, SCHEMA_VERSION } from './seed'
import { parseScenarioIds, resolveScenario, type ScenarioConfig } from './scenarios'
import type { DbState } from './types'

const DB_KEY = 'kurio.mock.db'
const SCENARIO_KEY = 'kurio.mock.scenario'

let state: DbState | null = null
let scenarioIds: string[] = ['default']
let scenario: ScenarioConfig = resolveScenario(scenarioIds)
let persistScheduled = false

type BusEvents = {
  'nft.updated': NftUpdatedEvent
  'order.updated': OrderUpdatedEvent
}

type BusListener<K extends keyof BusEvents> = (event: BusEvents[K]) => void
const busListeners: { [K in keyof BusEvents]: Set<BusListener<K>> } = {
  'nft.updated': new Set(),
  'order.updated': new Set(),
}

export const mockBus = {
  on<K extends keyof BusEvents>(type: K, listener: BusListener<K>): () => void {
    busListeners[type].add(listener)
    return () => busListeners[type].delete(listener)
  },
  emit<K extends keyof BusEvents>(type: K, event: BusEvents[K]): void {
    for (const l of [...busListeners[type]]) (l as BusListener<K>)(event)
  },
}

function persistNow(): void {
  persistScheduled = false
  if (!state) return
  safeStorage.set(DB_KEY, JSON.stringify(state))
}

export function commit(): void {
  if (persistScheduled) return
  persistScheduled = true
  queueMicrotask(persistNow)
}

export function initDb(options: { scenario?: string | null; fallbackScenario?: string | null } = {}): void {
  const stored = safeJsonParse<DbState>(safeStorage.get(DB_KEY))
  state = stored && stored.schema === SCHEMA_VERSION ? stored : createSeedState()
  const storedScenario = safeStorage.get(SCENARIO_KEY)
  scenarioIds = parseScenarioIds(options.scenario ?? storedScenario ?? options.fallbackScenario)
  scenario = resolveScenario(scenarioIds)
  safeStorage.set(SCENARIO_KEY, scenarioIds.join(','))
  commit()
}

export function getDb(): DbState {
  if (!state) initDb()
  return state!
}

export function resetDb(nextScenario?: string | null): void {
  state = createSeedState()
  scenarioIds = parseScenarioIds(nextScenario ?? 'default')
  scenario = resolveScenario(scenarioIds)
  safeStorage.set(SCENARIO_KEY, scenarioIds.join(','))
  persistNow()
}

export function getScenario(): ScenarioConfig {
  return scenario
}

export function getScenarioIds(): string[] {
  return [...scenarioIds]
}

export function setScenario(input: string | string[]): string[] {
  scenarioIds = parseScenarioIds(Array.isArray(input) ? input.join(',') : input)
  scenario = resolveScenario(scenarioIds)
  safeStorage.set(SCENARIO_KEY, scenarioIds.join(','))
  getDb().faultCounters = {}
  commit()
  return [...scenarioIds]
}

export function nextId(prefix: string): string {
  const db = getDb()
  db.seq += 1
  return `${prefix}_${db.seq.toString(36)}`
}

export function nextEventId(): string {
  const db = getDb()
  db.eventSeq += 1
  return `evt_${db.eventSeq.toString(36).padStart(4, '0')}`
}

export function nowIso(): string {
  return new Date().toISOString()
}
