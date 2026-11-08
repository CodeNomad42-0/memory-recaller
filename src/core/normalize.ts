const CJK_PUNCTUATION: Record<string, string> = {
  '，': ',',
  '。': '.',
  '！': '!',
  '？': '?',
  '：': ':',
  '；': ';',
  '（': '(',
  '）': ')',
  '「': '"',
  '」': '"',
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'",
  '、': ','
}

/** 归一化：去首尾空白 → 全角转半角 → 中文标点转英文 → 去空白 → 英文小写。 */
export function normalizeAnswer(input: string): string {
  if (!input) return ''
  let value = input.trim()
  value = value
    .replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
  value = value.replace(/[，。！？：；（）「」“”‘’、]/g, (char) => CJK_PUNCTUATION[char] ?? char)
  value = value.replace(/\s+/g, '')
  return value.toLowerCase()
}

export function isAnswerCorrect(input: string, answers: string[]): boolean {
  const normalized = normalizeAnswer(input)
  if (!normalized) return false
  return answers.some((answer) => normalizeAnswer(answer) === normalized)
}
