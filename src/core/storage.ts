import type { DailyStat, ProgressState, UserSettings } from './types'

export const STORAGE_KEY = 'recaller:progress:v1'
export const SCHEMA_VERSION = 2

export function defaultSettings(): UserSettings {
  return {
    defaultMode: 'input',
    showHint: true,
    dailyGoal: 30
  }
}

export function createEmptyProgress(): ProgressState {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: Date.now(),
    settings: defaultSettings(),
    subjects: {},
    daily: {}
  }
}

/** 数字兜底：非数字或负数按 0 处理 */
function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

/** 补齐每日统计，旧存档没有 daily 时按空对象处理 */
function normalizeDaily(raw: unknown): Record<string, DailyStat> {
  const daily: Record<string, DailyStat> = {}
  if (!raw || typeof raw !== 'object') return daily
  for (const [dateKey, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Partial<DailyStat>
    daily[dateKey] = {
      attempts: toCount(item.attempts),
      correct: toCount(item.correct),
      firstAttempts: toCount(item.firstAttempts),
      firstCorrect: toCount(item.firstCorrect),
      reviews: toCount(item.reviews),
      forgotten: toCount(item.forgotten)
    }
  }
  return daily
}

function normalizeProgress(raw: unknown): ProgressState {
  const base = createEmptyProgress()
  if (!raw || typeof raw !== 'object') return base
  const candidate = raw as Partial<ProgressState>
  const settings = { ...base.settings, ...(candidate.settings ?? {}) }
  if (settings.defaultMode !== 'reveal' && settings.defaultMode !== 'input') {
    settings.defaultMode = base.settings.defaultMode
  }
  const subjects =
    candidate.subjects && typeof candidate.subjects === 'object' ? candidate.subjects : {}
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now(),
    settings,
    subjects,
    daily: normalizeDaily(candidate.daily)
  }
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyProgress()
    return normalizeProgress(JSON.parse(raw))
  } catch (error) {
    console.error('[recaller] 读取进度失败，已重置为空进度', error)
    return createEmptyProgress()
  }
}

export function saveProgress(progress: ProgressState): void {
  try {
    progress.updatedAt = Date.now()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (error) {
    console.error('[recaller] 保存进度失败', error)
  }
}

export function clearProgressStorage(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function exportProgress(progress: ProgressState): string {
  return JSON.stringify({ ...progress, updatedAt: Date.now() }, null, 2)
}

export function parseImportedProgress(raw: string): ProgressState {
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || !('subjects' in parsed)) {
    throw new Error('文件不是有效的 Recaller 进度备份')
  }
  return normalizeProgress(parsed)
}
