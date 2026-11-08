import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { AnswerMode, Question, SessionResult } from '../core/types'

const RESULT_KEY = 'recaller:last-result'

function readStoredResult(): SessionResult | null {
  try {
    const raw = sessionStorage.getItem(RESULT_KEY)
    return raw ? (JSON.parse(raw) as SessionResult) : null
  } catch {
    return null
  }
}

export const useSessionStore = defineStore('session', () => {
  const subjectId = ref('')
  const subjectName = ref('')
  const accent = ref('#5DBFA0')
  const mode = ref<AnswerMode>('input')
  const queue = ref<Question[]>([])
  const index = ref(0)
  const startedAt = ref(0)
  const result = ref<SessionResult | null>(readStoredResult())

  function start(payload: {
    subjectId: string
    subjectName: string
    accent: string
    mode: AnswerMode
    queue: Question[]
  }): void {
    subjectId.value = payload.subjectId
    subjectName.value = payload.subjectName
    accent.value = payload.accent
    mode.value = payload.mode
    queue.value = payload.queue
    index.value = 0
    startedAt.value = Date.now()
  }

  function saveResult(value: SessionResult): void {
    result.value = value
    try {
      sessionStorage.setItem(RESULT_KEY, JSON.stringify(value))
    } catch {
      // 忽略 sessionStorage 不可用的情况
    }
  }

  function reset(): void {
    subjectId.value = ''
    subjectName.value = ''
    queue.value = []
    index.value = 0
    startedAt.value = 0
  }

  return {
    subjectId,
    subjectName,
    accent,
    mode,
    queue,
    index,
    startedAt,
    result,
    start,
    saveResult,
    reset
  }
})
