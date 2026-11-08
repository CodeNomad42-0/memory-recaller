import type { QuestionBank, SubjectIndex } from './types'

const DATA_VERSION = '1'
const indexCache = new Map<string, SubjectIndex>()
const bankCache = new Map<string, QuestionBank>()

function dataUrl(fileName: string): string {
  return `${import.meta.env.BASE_URL}data/${fileName}?v=${DATA_VERSION}`
}

async function fetchJson<T>(fileName: string): Promise<T> {
  const response = await fetch(dataUrl(fileName))
  if (!response.ok) {
    throw new Error(`加载 ${fileName} 失败（HTTP ${response.status}）`)
  }
  return (await response.json()) as T
}

export async function loadSubjectIndex(): Promise<SubjectIndex> {
  const cached = indexCache.get('index')
  if (cached) return cached
  const index = await fetchJson<SubjectIndex>('index.json')
  indexCache.set('index', index)
  return index
}

export async function loadSubjectBank(fileName: string): Promise<QuestionBank> {
  const cached = bankCache.get(fileName)
  if (cached) return cached
  const bank = await fetchJson<QuestionBank>(fileName)
  bankCache.set(fileName, bank)
  return bank
}
