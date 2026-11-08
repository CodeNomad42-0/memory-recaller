import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dataDir = resolve(process.cwd(), 'public/data')
const errors = []
const warnings = []

function fail(message) {
  errors.push(message)
}

function warn(message) {
  warnings.push(message)
}

function readJson(fileName) {
  const fullPath = resolve(dataDir, fileName)
  try {
    return JSON.parse(readFileSync(fullPath, 'utf8'))
  } catch (error) {
    fail(`${fileName}：JSON 解析失败（${error.message}）`)
    return null
  }
}

function validateQuestion(question, fileName) {
  const label = `${fileName} → ${question.id ?? '(缺少 id)'}`

  if (!question.id) fail(`${label}：缺少 id`)
  if (typeof question.stem !== 'string' || question.stem.trim() === '') {
    fail(`${label}：缺少 stem`)
    return
  }

  const protectedStem = question.stem.replace(/\\\{\\\{/g, '').replace(/\\\}\\\}/g, '')
  const matches = protectedStem.match(/\{\{([^{}]*)\}\}/g) ?? []
  if (matches.length === 0) {
    fail(`${label}：stem 中没有挖空标记 {{}}`)
  }

  const residual = protectedStem.replace(/\{\{([^{}]*)\}\}/g, '')
  if (residual.includes('{{') || residual.includes('}}')) {
    fail(`${label}：挖空标记未闭合或嵌套非法`)
  }

  matches.forEach((token, index) => {
    const inner = token.slice(2, -2)
    const answerPart = inner.split('~')[0] ?? ''
    const answers = answerPart.split('|').map((item) => item.trim()).filter(Boolean)
    if (answers.length === 0) {
      fail(`${label}：第 ${index + 1} 空没有答案`)
    }
  })

  if (question.blanks && question.blanks.length !== matches.length) {
    warn(
      `${label}：blanks 数量（${question.blanks.length}）与挖空数量（${matches.length}）不一致`
    )
  }
}

const index = readJson('index.json')
if (index) {
  if (!Array.isArray(index.subjects) || index.subjects.length === 0) {
    fail('index.json：subjects 不能为空')
  } else {
    const seen = new Set()
    index.subjects.forEach((subject) => {
      if (!subject.id || !subject.file) {
        fail(`index.json：学科 ${subject.name ?? '(未命名)'} 缺少 id 或 file`)
        return
      }
      if (seen.has(subject.id)) fail(`index.json：学科 id 重复 ${subject.id}`)
      seen.add(subject.id)

      const bank = readJson(subject.file)
      if (!bank) return
      const questions = Array.isArray(bank.questions) ? bank.questions : []
      if (questions.length === 0) {
        fail(`${subject.file}：questions 不能为空`)
      }
      if (subject.questionCount !== questions.length) {
        warn(
          `index.json：${subject.name} 声明 ${subject.questionCount} 题，实际 ${questions.length} 题`
        )
      }

      const ids = new Set()
      questions.forEach((question) => {
        if (question.id) {
          if (ids.has(question.id)) fail(`${subject.file}：题目 id 重复 ${question.id}`)
          ids.add(question.id)
        }
        validateQuestion(question, subject.file)
      })
    })
  }
}

warnings.forEach((message) => console.warn(`⚠ ${message}`))
if (errors.length > 0) {
  errors.forEach((message) => console.error(`✗ ${message}`))
  console.error(`\n题库校验失败：${errors.length} 个错误`)
  process.exit(1)
}

console.log(`✓ 题库校验通过（${warnings.length} 条提示）`)
