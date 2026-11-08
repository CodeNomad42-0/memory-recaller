import type { Question, QuestionRecord, QuizScope } from './types'

export const PRIORITY_WEIGHT = 1.5
export const FRESH_RATIO = 0.25
const DEFAULT_LIMIT = 20

export function updateWeight(
  record: QuestionRecord | undefined,
  correct: boolean,
  daysSinceLastReview: number
): number {
  const current = record?.weight ?? 1
  if (correct) {
    const boost = Math.min(daysSinceLastReview / 7, 1)
    return Math.max(0.3, current * 0.7) + boost * 0.2
  }
  return 2.0
}

export function isWeakQuestion(record: QuestionRecord | undefined): boolean {
  if (!record) return false
  return record.wrongCount > 0 || record.mastery < 0.5
}

export function isDue(record: QuestionRecord | undefined, now = Date.now()): boolean {
  if (!record) return false
  return record.blanks.some((blank) => blank.dueAt <= now)
}

export function overdueMs(record: QuestionRecord | undefined, now = Date.now()): number {
  if (!record || record.blanks.length === 0) return 0
  const earliest = Math.min(...record.blanks.map((blank) => blank.dueAt))
  return Math.max(0, now - earliest)
}

/** 轮盘赌加权随机。 */
export function weightedRandomPick<T>(items: T[], weightOf: (item: T) => number): T | null {
  if (items.length === 0) return null
  const weights = items.map((item) => Math.max(0.01, weightOf(item)))
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let random = Math.random() * total
  for (let index = 0; index < items.length; index += 1) {
    random -= weights[index]
    if (random <= 0) return items[index]
  }
  return items[items.length - 1] ?? null
}

interface BuildQueueOptions {
  questions: Question[]
  records: Record<string, QuestionRecord>
  scope: QuizScope
  limit?: number
  now?: number
}

/** 生成一次会话的出题队列：优先池加权随机 + 少量新题混入，会话内去重。 */
export function buildQueue({
  questions,
  records,
  scope,
  limit = DEFAULT_LIMIT,
  now = Date.now()
}: BuildQueueOptions): Question[] {
  const usable = questions.filter((question) => question.stem.includes('{{'))

  if (scope === 'due') {
    return usable
      .filter((question) => isDue(records[question.id], now))
      .sort((a, b) => overdueMs(records[b.id], now) - overdueMs(records[a.id], now))
      .slice(0, limit)
  }

  if (scope === 'wrong') {
    return usable
      .filter((question) => isWeakQuestion(records[question.id]))
      .slice(0, limit)
  }

  const queue: Question[] = []
  const remaining = [...usable]

  while (queue.length < limit && remaining.length > 0) {
    const priority = remaining.filter((question) => (records[question.id]?.weight ?? 1) >= PRIORITY_WEIGHT)
    const fresh = remaining.filter((question) => !records[question.id])

    let picked: Question | null
    if (fresh.length > 0 && Math.random() < FRESH_RATIO) {
      picked = weightedRandomPick(fresh, () => 1)
    } else if (priority.length > 0) {
      picked = weightedRandomPick(priority, (question) => records[question.id]?.weight ?? 1)
    } else {
      picked = weightedRandomPick(remaining, () => 1)
    }

    if (!picked) break
    queue.push(picked)
    remaining.splice(remaining.indexOf(picked), 1)
  }

  return queue
}
