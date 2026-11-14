import type { DailyStat, ProgressState } from './types'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** 本地时区的日期键，形如 2026-11-14 */
export function localDateKey(ts: number = Date.now()): string {
  const date = new Date(ts)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** 取出某天的统计，不存在则初始化全 0 并写入 state.daily */
export function ensureDaily(state: ProgressState, dateKey = localDateKey()): DailyStat {
  let stat = state.daily[dateKey]
  if (!stat) {
    stat = {
      attempts: 0,
      correct: 0,
      firstAttempts: 0,
      firstCorrect: 0,
      reviews: 0,
      forgotten: 0
    }
    state.daily[dateKey] = stat
  }
  return stat
}

/** 记录一次作答统计：首次接触计入 firstAttempts，否则计入复习 */
export function recordOutcomeStats(
  state: ProgressState,
  input: { firstAttempt: boolean; correct: boolean },
  now: number = Date.now()
): void {
  const stat = ensureDaily(state, localDateKey(now))
  stat.attempts += 1
  if (input.correct) stat.correct += 1
  if (input.firstAttempt) {
    stat.firstAttempts += 1
    if (input.correct) stat.firstCorrect += 1
    return
  }
  stat.reviews += 1
  if (!input.correct) stat.forgotten += 1
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0
}

/** 汇总全部日期与今日的关键指标 */
export function overallMetrics(
  state: ProgressState,
  now: number = Date.now()
): {
  firstAttempts: number
  firstCorrect: number
  firstSuccessRate: number
  reviews: number
  forgotten: number
  forgettingRate: number
  todayFirstCorrect: number
  todayAttempts: number
  todayCorrect: number
} {
  let firstAttempts = 0
  let firstCorrect = 0
  let reviews = 0
  let forgotten = 0
  for (const stat of Object.values(state.daily)) {
    firstAttempts += stat.firstAttempts
    firstCorrect += stat.firstCorrect
    reviews += stat.reviews
    forgotten += stat.forgotten
  }
  const today = state.daily[localDateKey(now)]
  return {
    firstAttempts,
    firstCorrect,
    firstSuccessRate: ratio(firstCorrect, firstAttempts),
    reviews,
    forgotten,
    forgettingRate: ratio(forgotten, reviews),
    todayFirstCorrect: today?.firstCorrect ?? 0,
    todayAttempts: today?.attempts ?? 0,
    todayCorrect: today?.correct ?? 0
  }
}

/** 最近若干天的首次记忆正确数，按时间升序，最后一项是今天 */
export function lastNDays(
  state: ProgressState,
  days = 14,
  now: number = Date.now()
): { date: string; label: string; firstCorrect: number }[] {
  const today = new Date(now)
  const result: { date: string; label: string; firstCorrect: number }[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    const dateKey = localDateKey(day.getTime())
    result.push({
      date: dateKey,
      label: `${day.getMonth() + 1}/${day.getDate()}`,
      firstCorrect: state.daily[dateKey]?.firstCorrect ?? 0
    })
  }
  return result
}
