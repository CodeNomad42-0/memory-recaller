import type { BlankRecord } from './types'

export const DEFAULT_EASE = 2.5
export const MIN_EASE = 1.3
const DAY_MS = 86_400_000

export function createBlankRecord(now = Date.now()): BlankRecord {
  return {
    right: 0,
    wrong: 0,
    streak: 0,
    lastResult: 'right',
    ease: DEFAULT_EASE,
    interval: 0,
    dueAt: now
  }
}

/** 对间隔施加 ±5%（至少 ±1 天）抖动，避免同批题目集中到期。 */
export function fuzzInterval(intervalDays: number): number {
  if (intervalDays <= 1) return intervalDays
  const fuzz = Math.max(1, Math.round(intervalDays * 0.05))
  const delta = Math.floor(Math.random() * (2 * fuzz + 1)) - fuzz
  return Math.max(1, intervalDays + delta)
}

export function reviewBlank(
  record: BlankRecord | undefined,
  correct: boolean,
  now = Date.now()
): BlankRecord {
  const next: BlankRecord = record ? { ...record } : createBlankRecord(now)

  if (correct) {
    next.right += 1
    next.streak += 1
    next.lastResult = 'right'
    const base = next.interval <= 0 ? 1 : next.interval === 1 ? 3 : Math.round(next.interval * next.ease)
    next.interval = fuzzInterval(base)
    next.dueAt = now + next.interval * DAY_MS
  } else {
    next.wrong += 1
    next.streak = 0
    next.lastResult = 'wrong'
    next.ease = Math.max(MIN_EASE, Number((next.ease - 0.2).toFixed(2)))
    next.interval = 0
    next.dueAt = now
  }

  return next
}

export function blankMastery(record: BlankRecord | undefined): number {
  if (!record || record.right + record.wrong === 0) return 1
  return record.right / (record.right + record.wrong)
}
