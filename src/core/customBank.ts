import type { Chapter, QuestionBank, SubjectMeta } from './types'
import { parseStem } from './parser'

export const CUSTOM_FILE_PREFIX = 'custom:'
export const CUSTOM_BANK_STORAGE_KEY = 'recaller:banks:v1'

const DEFAULT_CHAPTER_NAME = '默认章节'

export interface CustomBank {
  id: string
  name: string
  desc: string
  icon: string
  accent: string
  createdAt: number
  bank: QuestionBank
}

export interface CustomBankParseError {
  line: number
  message: string
}

export type CustomBankParseResult =
  | { ok: true; name: string; desc: string; bank: QuestionBank }
  | { ok: false; errors: CustomBankParseError[] }

const SUBJECT_PATTERN = /^#\s*学科\s*[:：]\s*(.*)$/
const DESC_PATTERN = /^#\s*描述\s*[:：]\s*(.*)$/
const CHAPTER_PATTERN = /^##\s*章节\s*[:：]\s*(.*)$/
const DIRECTIVE_PATTERN = /^#/

function createBankId(): string {
  return `custom-${Date.now().toString(36)}`
}

function nextBankId(existing: CustomBank[]): string {
  const used = new Set(existing.map((item) => item.id))
  let stamp = Date.now()
  while (used.has(`custom-${stamp.toString(36)}`)) stamp += 1
  return `custom-${stamp.toString(36)}`
}

/** 解析固定文本格式，收集全部错误并按行号返回。 */
export function parseBankText(text: string): CustomBankParseResult {
  const bankId = createBankId()
  const errors: CustomBankParseError[] = []
  const chapters: Chapter[] = []
  const questions: QuestionBank['questions'] = []
  const seenStems = new Set<string>()

  let subjectName = ''
  let desc = ''
  let currentChapter: string | null = null
  let subjectDeclared = false

  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)

  function ensureDefaultChapter(): string {
    const existing = chapters.find((chapter) => chapter.name === DEFAULT_CHAPTER_NAME)
    if (existing) return existing.id
    const chapter = { id: `c${chapters.length + 1}`, name: DEFAULT_CHAPTER_NAME }
    chapters.push(chapter)
    return chapter.id
  }

  lines.forEach((raw, index) => {
    const line = index + 1
    if (raw.trim() === '') return

    const subjectMatch = raw.match(SUBJECT_PATTERN)
    if (subjectMatch) {
      const value = (subjectMatch[1] ?? '').trim()
      if (!value) {
        errors.push({ line, message: '学科标题为空' })
      } else if (subjectDeclared) {
        errors.push({ line, message: '学科标题重复' })
      } else {
        subjectDeclared = true
        subjectName = value
      }
      return
    }

    const descMatch = raw.match(DESC_PATTERN)
    if (descMatch) {
      desc = (descMatch[1] ?? '').trim()
      return
    }

    const chapterMatch = raw.match(CHAPTER_PATTERN)
    if (chapterMatch) {
      const value = (chapterMatch[1] ?? '').trim()
      if (!value) {
        errors.push({ line, message: '章节名称为空' })
      } else {
        const existing = chapters.find((chapter) => chapter.name === value)
        if (existing) {
          currentChapter = existing.id
        } else {
          const chapter = { id: `c${chapters.length + 1}`, name: value }
          chapters.push(chapter)
          currentChapter = chapter.id
        }
      }
      return
    }

    if (DIRECTIVE_PATTERN.test(raw)) {
      errors.push({ line, message: '未知的指令行' })
      return
    }

    const stem = raw.trim()
    if (!stem.includes('{{')) {
      errors.push({ line, message: '题目缺少 {{挖空}} 标记' })
      return
    }

    try {
      parseStem(stem)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      errors.push({ line, message: `挖空格式有误：${reason}` })
      return
    }

    if (seenStems.has(stem)) {
      errors.push({ line, message: '题目重复' })
      return
    }
    seenStems.add(stem)

    const chapterId = currentChapter ?? ensureDefaultChapter()
    currentChapter = chapterId
    questions.push({
      id: `${bankId}-q${questions.length + 1}`,
      chapter: chapterId,
      stem
    })
  })

  if (!subjectName) {
    errors.push({ line: 1, message: '缺少 # 学科: 标题' })
  }
  if (questions.length === 0) {
    errors.push({ line: 1, message: '没有可导入的题目' })
  }

  if (errors.length > 0) {
    errors.sort((a, b) => a.line - b.line)
    return { ok: false, errors }
  }

  return {
    ok: true,
    name: subjectName,
    desc,
    bank: {
      schemaVersion: 1,
      subject: bankId,
      chapters,
      questions
    }
  }
}

function isCustomBank(value: unknown): value is CustomBank {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<CustomBank>
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.createdAt === 'number' &&
    !!record.bank &&
    Array.isArray(record.bank.chapters) &&
    Array.isArray(record.bank.questions)
  )
}

function readAllBanks(): CustomBank[] {
  try {
    const raw = localStorage.getItem(CUSTOM_BANK_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isCustomBank) : []
  } catch {
    return []
  }
}

function writeAllBanks(banks: CustomBank[]): void {
  localStorage.setItem(CUSTOM_BANK_STORAGE_KEY, JSON.stringify(banks))
}

export function listCustomBanks(): CustomBank[] {
  return readAllBanks()
}

export function saveCustomBank(name: string, desc: string, bank: QuestionBank): CustomBank {
  const banks = readAllBanks()
  const id = nextBankId(banks)
  const record: CustomBank = {
    id,
    name: name.trim() || '未命名题库',
    desc: desc.trim(),
    icon: 'star',
    accent: '#7C8CF8',
    createdAt: Date.now(),
    bank: {
      schemaVersion: 1,
      subject: id,
      chapters: bank.chapters.map((chapter) => ({ ...chapter })),
      questions: bank.questions.map((question, index) => ({
        ...question,
        id: `${id}-q${index + 1}`
      }))
    }
  }
  banks.push(record)
  writeAllBanks(banks)
  return record
}

export function deleteCustomBank(id: string): void {
  writeAllBanks(readAllBanks().filter((item) => item.id !== id))
}

export function loadCustomBank(id: string): QuestionBank | null {
  return readAllBanks().find((item) => item.id === id)?.bank ?? null
}

export function customSubjectMeta(record: CustomBank): SubjectMeta {
  return {
    id: record.id,
    name: record.name,
    desc: record.desc,
    icon: record.icon,
    accent: record.accent,
    file: `${CUSTOM_FILE_PREFIX}${record.id}`,
    questionCount: record.bank.questions.length
  }
}
