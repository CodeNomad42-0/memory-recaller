import type { BlankMeta, Question, Segment } from './types'

const ESC_OPEN = '\u0000OPEN\u0000'
const ESC_CLOSE = '\u0000CLOSE\u0000'

function unescapeText(text: string): string {
  return text.split(ESC_OPEN).join('{{').split(ESC_CLOSE).join('}}')
}

function parseBlank(raw: string): { answers: string[]; hint?: string } {
  const parts = raw.split('~')
  const answerPart = parts[0] ?? ''
  const hint = parts.length > 1 ? parts.slice(1).join('~').trim() : ''
  const answers = answerPart
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
  if (answers.length === 0) {
    throw new Error('挖空答案为空')
  }
  return { answers, hint: hint || undefined }
}

/**
 * 解析题干中的 {{答案}} / {{答案1|答案2}} / {{答案~提示}} 语法。
 * `\{\{` 与 `\}\}` 会还原为字面量 `{{` / `}}`。
 */
export function parseStem(stem: string, blanks: BlankMeta[] = []): Segment[] {
  if (typeof stem !== 'string' || stem.trim() === '') {
    throw new Error('题干为空')
  }

  const source = stem.replace(/\\\{\\\{/g, ESC_OPEN).replace(/\\\}\\\}/g, ESC_CLOSE)
  const segments: Segment[] = []
  const pattern = /\{\{([^{}]*)\}\}/g
  let lastIndex = 0
  let blankIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: source.slice(lastIndex, match.index) })
    }
    const parsed = parseBlank(match[1] ?? '')
    const metaHint = blanks[blankIndex]?.hint
    segments.push({
      type: 'blank',
      index: blankIndex,
      answers: parsed.answers,
      hint: parsed.hint ?? (metaHint || undefined)
    })
    blankIndex += 1
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < source.length) {
    segments.push({ type: 'text', text: source.slice(lastIndex) })
  }

  const residual = source.replace(/\{\{([^{}]*)\}\}/g, '')
  if (residual.includes('{{') || residual.includes('}}')) {
    throw new Error('挖空标记未闭合')
  }
  if (blankIndex === 0) {
    throw new Error('没有挖空标记')
  }

  return segments.map((segment) =>
    segment.type === 'text' ? { type: 'text', text: unescapeText(segment.text) } : segment
  )
}

/** 解析失败时打印可定位日志并返回 null，调用方跳过该题。 */
export function parseQuestion(question: Question): Segment[] | null {
  try {
    return parseStem(question.stem, question.blanks ?? [])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[recaller] 题目 ${question.id} 解析失败：${message}`)
    return null
  }
}

/** 去掉挖空标记，答案并入正文，用于错题本等纯文本预览。 */
export function plainStem(stem: string): string {
  return stem.replace(/\{\{([^{}]*)\}\}/g, (_all, inner: string) => {
    const answerPart = inner.split('~')[0] ?? ''
    return answerPart.split('|')[0]?.trim() ?? ''
  })
}

export function countBlanks(question: Question): number {
  const matches = question.stem.match(/\{\{([^{}]*)\}\}/g)
  return matches ? matches.length : 0
}
