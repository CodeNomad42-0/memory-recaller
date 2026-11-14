import {
  AlignmentType,
  Document,
  PageBreak,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType
} from 'docx'
import { parseStem } from './parser'
import { isWeakQuestion } from './queue'
import type { Question, QuestionRecord, SubjectMeta } from './types'

export type ExportMode = 'all' | 'smart'

export interface ExportSources {
  weak: boolean
  wrong: boolean
  random: boolean
}

export interface ExportQuestionItem {
  subjectId: string
  subjectName: string
  question: Question
}

export interface ExportOptions {
  mode: ExportMode
  sources: ExportSources
  limit: number
}

interface SelectQuestionsInput {
  subjects: { meta: SubjectMeta; questions: Question[] }[]
  recordsBySubject: Record<string, Record<string, QuestionRecord>>
  options: ExportOptions
  random?: () => number
}

const BODY_FONT = { ascii: 'Times New Roman', eastAsia: '宋体', hAnsi: 'Times New Roman' }
const HEADING_FONT = { ascii: 'Times New Roman', eastAsia: '黑体', hAnsi: 'Times New Roman' }
const BLANK_TEXT = '________'
const BLANK_MARK = '{{'
const GRAY = '808080'
const PAGE_WIDTH = 11906
const PAGE_HEIGHT = 16838
const PAGE_MARGIN = 1440

function itemKey(item: ExportQuestionItem): string {
  return `${item.subjectId}:${item.question.id}`
}

function wrongCountOf(
  item: ExportQuestionItem,
  recordsBySubject: Record<string, Record<string, QuestionRecord>>
): number {
  return recordsBySubject[item.subjectId]?.[item.question.id]?.wrongCount ?? 0
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = current
  }
  return result
}

/**
 * 按导出模式选题：
 * - all：按学科顺序与题目顺序返回全部含挖空的题目。
 * - smart：易错（按错误次数降序）→ 其余答错题（降序）→ 普通题随机打乱，去重后截断到 limit。
 */
export function selectQuestions({
  subjects,
  recordsBySubject,
  options,
  random = Math.random
}: SelectQuestionsInput): ExportQuestionItem[] {
  const unique = new Map<string, ExportQuestionItem>()
  subjects.forEach(({ meta, questions }) => {
    questions.forEach((question) => {
      if (!question.stem.includes(BLANK_MARK)) return
      const key = `${meta.id}:${question.id}`
      if (unique.has(key)) return
      unique.set(key, { subjectId: meta.id, subjectName: meta.name, question })
    })
  })

  const all = [...unique.values()]
  if (options.mode === 'all') return all

  const limit = Math.max(0, Math.floor(options.limit))
  if (limit === 0) return []

  const weak: ExportQuestionItem[] = []
  const wrong: ExportQuestionItem[] = []
  const normal: ExportQuestionItem[] = []

  all.forEach((item) => {
    const record = recordsBySubject[item.subjectId]?.[item.question.id]
    if (isWeakQuestion(record)) {
      weak.push(item)
    } else if ((record?.wrongCount ?? 0) > 0) {
      wrong.push(item)
    } else {
      normal.push(item)
    }
  })

  const byWrongCountDesc = (a: ExportQuestionItem, b: ExportQuestionItem): number =>
    wrongCountOf(b, recordsBySubject) - wrongCountOf(a, recordsBySubject)

  const picked: ExportQuestionItem[] = []
  const seen = new Set<string>()

  const push = (items: ExportQuestionItem[]): void => {
    for (const item of items) {
      if (picked.length >= limit) return
      const key = itemKey(item)
      if (seen.has(key)) continue
      seen.add(key)
      picked.push(item)
    }
  }

  if (options.sources.weak) push([...weak].sort(byWrongCountDesc))
  if (options.sources.wrong) push([...wrong].sort(byWrongCountDesc))
  if (options.sources.random) push(shuffle(normal, random))

  return picked
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function subjectScopeOf(items: ExportQuestionItem[]): string {
  const names = [...new Set(items.map((item) => item.subjectName))]
  if (names.length === 0) return '暂无学科'
  if (names.length === 1) return names[0] ?? ''
  return `多学科（${names.length} 个）`
}

function buildRuns(index: number, item: ExportQuestionItem, multiSubject: boolean): TextRun[] {
  const runs: TextRun[] = [new TextRun({ text: `${index + 1}. ` })]
  parseStem(item.question.stem, item.question.blanks ?? []).forEach((segment) => {
    if (segment.type === 'text') {
      runs.push(new TextRun({ text: segment.text }))
    } else {
      runs.push(new TextRun({ text: BLANK_TEXT, underline: { type: UnderlineType.SINGLE } }))
    }
  })
  if (multiSubject) {
    runs.push(new TextRun({ text: `（${item.subjectName}）`, size: 18, color: GRAY }))
  }
  return runs
}

function buildAnswerLine(index: number, item: ExportQuestionItem): string {
  const blanks = parseStem(item.question.stem, item.question.blanks ?? [])
    .filter((segment) => segment.type === 'blank')
    .map((segment) => segment.answers.join(' / '))
  return `${index + 1}. ${blanks.join('；')}`
}

export async function buildDocxBlob(
  items: ExportQuestionItem[],
  meta: { modeLabel: string; generatedAt: number }
): Promise<Blob> {
  const scope = subjectScopeOf(items)
  const subtitle = `${scope} · ${meta.modeLabel} · 生成日期 ${formatDate(meta.generatedAt)} · 共 ${items.length} 题`
  const multiSubject = new Set(items.map((item) => item.subjectId)).size > 1

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({ text: '一句话抠空练习', bold: true, size: 36, font: HEADING_FONT })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: subtitle, size: 21, color: GRAY })]
    }),
    new Paragraph({ children: [] }),
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `一、综合填空（共 ${items.length} 小题）`,
          bold: true,
          size: 28,
          font: HEADING_FONT
        })
      ]
    })
  ]

  items.forEach((item, index) => {
    children.push(
      new Paragraph({
        spacing: { line: 360, after: 120 },
        children: buildRuns(index, item, multiSubject)
      })
    )
  })

  children.push(new Paragraph({ children: [new PageBreak()] }))
  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [new TextRun({ text: '参考答案', bold: true, size: 28, font: HEADING_FONT })]
    })
  )
  items.forEach((item, index) => {
    children.push(
      new Paragraph({
        spacing: { line: 360, after: 120 },
        children: [new TextRun({ text: buildAnswerLine(index, item) })]
      })
    )
  })

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: 24 }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
            margin: {
              top: PAGE_MARGIN,
              right: PAGE_MARGIN,
              bottom: PAGE_MARGIN,
              left: PAGE_MARGIN
            }
          }
        },
        children
      }
    ]
  })

  return Packer.toBlob(doc)
}

export function exportFileName(mode: ExportMode, now = Date.now()): string {
  const date = new Date(now)
  const stamp = `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`
  return `一句话抠空-${mode === 'all' ? '全部' : '智能筛选'}-${stamp}.docx`
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
