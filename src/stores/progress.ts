import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { blankMastery, reviewBlank } from '../core/scheduler'
import { isDue, isWeakQuestion, updateWeight } from '../core/queue'
import {
  clearProgressStorage,
  createEmptyProgress,
  exportProgress,
  loadProgress,
  parseImportedProgress,
  saveProgress
} from '../core/storage'
import type {
  BlankOutcome,
  ProgressState,
  Question,
  QuestionRecord,
  UserSettings
} from '../core/types'

const DAY_MS = 86_400_000

export const useProgressStore = defineStore('progress', () => {
  const state = ref<ProgressState>(loadProgress())

  const settings = computed(() => state.value.settings)

  function persist(): void {
    saveProgress(state.value)
  }

  function questionMap(subjectId: string): Record<string, QuestionRecord> {
    return state.value.subjects[subjectId]?.questions ?? {}
  }

  function getRecord(subjectId: string, questionId: string): QuestionRecord | undefined {
    return questionMap(subjectId)[questionId]
  }

  function ensureSubject(subjectId: string): void {
    if (!state.value.subjects[subjectId]) {
      state.value.subjects[subjectId] = { questions: {} }
    }
  }

  /** 写入一次作答结果，返回该题是否「本次新增为薄弱题」。 */
  function applyResult(
    subjectId: string,
    question: Question,
    outcomes: BlankOutcome[],
    now = Date.now()
  ): boolean {
    ensureSubject(subjectId)
    const bucket = state.value.subjects[subjectId].questions
    const previous = bucket[question.id]
    const previousBlanks = previous?.blanks ?? []

    const blanks = outcomes.map((outcome, index) =>
      reviewBlank(previousBlanks[index], outcome.correct, now)
    )

    const mastery =
      blanks.length > 0
        ? blanks.reduce((sum, blank) => sum + blankMastery(blank), 0) / blanks.length
        : 1
    const allCorrect = outcomes.length > 0 && outcomes.every((outcome) => outcome.correct)
    const daysSinceLastReview = previous ? Math.max(0, (now - previous.lastSeenAt) / DAY_MS) : 0
    const wasWeak = previous ? isWeakQuestion(previous) : false

    bucket[question.id] = {
      lastSeenAt: now,
      wrongCount: (previous?.wrongCount ?? 0) + (allCorrect ? 0 : 1),
      mastery,
      starred: previous?.starred ?? false,
      weight: updateWeight(previous, allCorrect, daysSinceLastReview),
      blanks
    }

    persist()
    return !allCorrect && !wasWeak
  }

  function toggleStar(subjectId: string, questionId: string): void {
    const record = getRecord(subjectId, questionId)
    if (!record) return
    record.starred = !record.starred
    persist()
  }

  function updateSettings(patch: Partial<UserSettings>): void {
    state.value.settings = { ...state.value.settings, ...patch }
    persist()
  }

  function clearAll(): void {
    clearProgressStorage()
    state.value = createEmptyProgress()
    persist()
  }

  function exportJson(): string {
    return exportProgress(state.value)
  }

  function importJson(raw: string): void {
    state.value = parseImportedProgress(raw)
    persist()
  }

  function dueCount(subjectId: string, now = Date.now()): number {
    return Object.values(questionMap(subjectId)).filter((record) => isDue(record, now)).length
  }

  function totalDueCount(now = Date.now()): number {
    return Object.keys(state.value.subjects).reduce(
      (sum, subjectId) => sum + dueCount(subjectId, now),
      0
    )
  }

  function subjectMastery(subjectId: string, questions: Question[]): number {
    const map = questionMap(subjectId)
    if (questions.length === 0) return 0
    const total = questions.reduce((sum, question) => {
      const record = map[question.id]
      return sum + (record ? record.mastery : 0)
    }, 0)
    return total / questions.length
  }

  function weakQuestions(subjectId: string, questions: Question[]): Question[] {
    const map = questionMap(subjectId)
    return questions.filter((question) => isWeakQuestion(map[question.id]))
  }

  return {
    state,
    settings,
    questionMap,
    getRecord,
    applyResult,
    toggleStar,
    updateSettings,
    clearAll,
    exportJson,
    importJson,
    dueCount,
    totalDueCount,
    subjectMastery,
    weakQuestions
  }
})
