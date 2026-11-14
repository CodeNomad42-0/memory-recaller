import { buildQueue, updateWeight, MAX_WEIGHT, isDue } from '../src/core/queue.ts'

const DAY_MS = 86_400_000
const now = Date.now()
const PAST = now - DAY_MS
const FUTURE = now + 7 * DAY_MS
const SESSIONS = 400
const LIMIT = 20
const TOTAL = 30
const NORMAL_COUNT = TOTAL - 1

// 断言 2 的阈值：会话内不重复 + 每题最多命中一次，q0 每局必中(1.0)，
// 普通题上限 19/29≈0.655，故理论最大比值仅 29/19≈1.53，这里取 1.4。
const RATIO_THRESHOLD = 1.4

let failed = 0

function check(name, ok, detail) {
  if (ok) {
    console.log(`PASS ${name} ${detail}`)
  } else {
    failed += 1
    console.log(`FAIL ${name} ${detail}`)
  }
}

function blank(dueAt) {
  return { right: 0, wrong: 0, streak: 0, lastResult: 'wrong', ease: 2.5, interval: 0, dueAt }
}

function makeRecord({ wrongCount, mastery, weight, dueAt }) {
  return {
    lastSeenAt: now,
    wrongCount,
    mastery,
    starred: false,
    weight,
    blanks: [blank(dueAt)]
  }
}

const questions = Array.from({ length: TOTAL }, (_, index) => ({
  id: `q${index}`,
  chapter: 'c1',
  stem: 'x{{y}}'
}))

const records = {}
for (const question of questions) {
  const weak = question.id === 'q0'
  records[question.id] = makeRecord({
    wrongCount: weak ? 2 : 0,
    mastery: weak ? 0.1 : 1,
    weight: weak ? 3 : 1,
    dueAt: weak ? PAST : FUTURE
  })
}

// 断言 1：权重更新规则
const baseRecord = makeRecord({ wrongCount: 0, mastery: 1, weight: 1, dueAt: FUTURE })
check('1a 答错 weight 1 → 1.6', updateWeight(baseRecord, false, 0) === 1.6, `→ ${updateWeight(baseRecord, false, 0)}`)

let wrongRecord = { ...baseRecord }
for (let index = 0; index < 5; index += 1) {
  wrongRecord = { ...wrongRecord, weight: updateWeight(wrongRecord, false, 0) }
}
check('1b 连错 5 次封顶 MAX_WEIGHT', wrongRecord.weight === MAX_WEIGHT, `→ ${wrongRecord.weight}（上限 ${MAX_WEIGHT}）`)

const decayed = updateWeight({ ...baseRecord, weight: 0.1 }, true, 0)
check('1c 答对衰减不低于 0.3', decayed >= 0.3, `→ ${decayed.toFixed(2)}`)
check(
  '1d 答对按 0.7 衰减',
  Math.abs(updateWeight({ ...baseRecord, weight: 2 }, true, 0) - 1.4) < 1e-9,
  `→ ${updateWeight({ ...baseRecord, weight: 2 }, true, 0).toFixed(2)}`
)

// 断言 3 顺带统计
let lengthOk = true
let uniqueOk = true
let weakHits = 0
let normalHits = 0

for (let session = 0; session < SESSIONS; session += 1) {
  const queue = buildQueue({ questions, records, scope: 'all', limit: LIMIT })
  if (queue.length !== LIMIT) lengthOk = false
  const ids = queue.map((question) => question.id)
  if (new Set(ids).size !== ids.length) uniqueOk = false
  if (ids.includes('q0')) weakHits += 1
  normalHits += ids.filter((id) => id !== 'q0').length
}

const weakRate = weakHits / SESSIONS
const normalRate = normalHits / SESSIONS / NORMAL_COUNT

// 断言 2：薄弱题命中率显著高于普通题
check(
  '2 薄弱题命中率优势',
  weakRate > normalRate * RATIO_THRESHOLD,
  `weakRate=${weakRate.toFixed(3)} normalRate=${normalRate.toFixed(3)} 比值=${(weakRate / normalRate).toFixed(2)} > ${RATIO_THRESHOLD}`
)

// 断言 3：队列长度与去重
check('3a 每次队列长度正确', lengthOk, `→ ${LIMIT}`)
check('3b 会话内无重复', uniqueOk, `→ ${SESSIONS} 次会话`)

// 断言 4：scope='due' 只返回到期题
const dueQueue = buildQueue({ questions, records, scope: 'due', limit: LIMIT, now })
const dueIds = dueQueue.map((question) => question.id)
check(
  '4 due 范围只含到期题',
  dueIds.length === 1 && dueIds[0] === 'q0' && dueQueue.every((question) => isDue(records[question.id], now)),
  `→ [${dueIds.join(', ')}]`
)

if (failed > 0) {
  console.log(`\n共 ${failed} 项断言失败`)
  process.exit(1)
}

console.log(`\n全部通过：${SESSIONS} 次会话，weakRate=${weakRate.toFixed(3)}，normalRate=${normalRate.toFixed(3)}`)
