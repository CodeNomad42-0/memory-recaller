<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import QuestionCard from '../components/QuestionCard.vue'
import { loadSubjectBank, loadSubjectIndex } from '../core/data'
import { isAnswerCorrect } from '../core/normalize'
import { parseQuestion } from '../core/parser'
import { buildQueue } from '../core/queue'
import type {
  AnswerMode,
  BlankOutcome,
  Question,
  QuestionSnapshot,
  QuizPhase,
  QuizScope,
  Segment,
  SegmentBlank
} from '../core/types'
import { useProgressStore } from '../stores/progress'
import { useSessionStore } from '../stores/session'

const route = useRoute()
const router = useRouter()
const progress = useProgressStore()
const session = useSessionStore()

const subjectId = computed(() => String(route.params.subjectId ?? ''))
const subjectName = ref('')
const accent = ref('#5DBFA0')
const queue = ref<Question[]>([])
const index = ref(0)
const segments = ref<Segment[]>([])
const segmentsError = ref('')
const loading = ref(true)
const error = ref('')
const mode = ref<AnswerMode>('input')
const focusIndex = ref(0)
const showHint = computed(() => progress.settings.showHint)

const state = reactive({
  inputs: [] as string[],
  revealed: [] as boolean[],
  selfEval: [] as ('wrong' | null)[],
  phase: 'answering' as QuizPhase,
  outcomes: [] as BlankOutcome[]
})

const stats = reactive({ correct: 0, total: 0, newWrong: 0 })
const snapshots = new Map<string, QuestionSnapshot>()

const blankSegments = computed(() =>
  segments.value.filter((segment): segment is SegmentBlank => segment.type === 'blank')
)

const current = computed(() => queue.value[index.value])
const isLast = computed(() => index.value >= queue.value.length - 1)

const markedWrongCount = computed(() => {
  if (mode.value !== 'reveal') return 0
  return blankSegments.value.filter((segment) => state.selfEval[segment.index] === 'wrong').length
})

function resetState(question: Question, blankCount: number): void {
  const snapshot = snapshots.get(question.id)
  if (snapshot) {
    state.inputs = [...snapshot.inputs]
    state.revealed = [...snapshot.revealed]
    state.selfEval = [...snapshot.selfEval]
    state.phase = snapshot.phase
    state.outcomes = [...snapshot.outcomes]
    return
  }
  state.inputs = Array.from({ length: blankCount }, () => '')
  state.revealed = Array.from({ length: blankCount }, () => false)
  state.selfEval = Array.from({ length: blankCount }, () => null)
  state.phase = 'answering'
  state.outcomes = []
}

function loadQuestion(target: number): void {
  const question = queue.value[target]
  if (!question) return
  saveSnapshot()
  index.value = target
  const parsed = parseQuestion(question)
  segments.value = parsed ?? []
  segmentsError.value = parsed ? '' : '本题格式有误，已跳过'
  resetState(question, parsed ? parsed.filter((segment) => segment.type === 'blank').length : 0)
  focusIndex.value = 0
}

function saveSnapshot(): void {
  const question = current.value
  if (!question || state.phase === 'skipped') return
  snapshots.set(question.id, {
    inputs: [...state.inputs],
    revealed: [...state.revealed],
    selfEval: [...state.selfEval],
    phase: state.phase,
    outcomes: [...state.outcomes]
  })
}

function reveal(blankIndex: number): void {
  if (state.phase !== 'answering') return
  state.revealed[blankIndex] = true
}

function toggleWrong(blankIndex: number): void {
  if (state.phase !== 'answering') return
  state.revealed[blankIndex] = true
  state.selfEval[blankIndex] = state.selfEval[blankIndex] === 'wrong' ? null : 'wrong'
}

function updateInput(blankIndex: number, value: string): void {
  state.inputs[blankIndex] = value
}

function handleEnter(blankIndex: number): void {
  if (blankIndex < blankSegments.value.length - 1) {
    focusIndex.value = blankIndex + 1
    return
  }
  submit()
}

function submit(): void {
  const question = current.value
  if (!question || state.phase !== 'answering') return

  const outcomes: BlankOutcome[] = blankSegments.value.map((segment) => {
    const input = state.inputs[segment.index] ?? ''
    const correct =
      mode.value === 'input'
        ? isAnswerCorrect(input, segment.answers)
        : state.selfEval[segment.index] !== 'wrong'
    return { correct, input }
  })

  state.outcomes = outcomes
  state.phase = 'submitted'
  state.revealed = blankSegments.value.map(() => true)

  const newlyWeak = progress.applyResult(subjectId.value, question, outcomes)
  if (newlyWeak) stats.newWrong += 1
  stats.total += outcomes.length
  stats.correct += outcomes.filter((outcome) => outcome.correct).length

  saveSnapshot()
}

function next(): void {
  if (isLast.value) {
    finish()
    return
  }
  loadQuestion(index.value + 1)
}

function previous(): void {
  if (index.value === 0) return
  loadQuestion(index.value - 1)
}

function skip(): void {
  const question = current.value
  if (question) {
    snapshots.set(question.id, {
      inputs: [...state.inputs],
      revealed: [...state.revealed],
      selfEval: [...state.selfEval],
      phase: 'skipped',
      outcomes: []
    })
  }
  state.phase = 'skipped'
  if (isLast.value) {
    finish()
    return
  }
  loadQuestion(index.value + 1)
}

function finish(): void {
  const totalBlanks = stats.total
  const result = {
    subjectId: subjectId.value,
    subjectName: subjectName.value,
    total: queue.value.length,
    totalBlanks,
    correctBlanks: stats.correct,
    accuracy: totalBlanks > 0 ? stats.correct / totalBlanks : 0,
    durationMs: Date.now() - (session.startedAt || Date.now()),
    newWrongCount: stats.newWrong,
    finishedAt: Date.now()
  }
  session.saveResult(result)
  router.push({ name: 'result', params: { subjectId: subjectId.value } })
}

function switchMode(nextMode: AnswerMode): void {
  if (mode.value === nextMode) return
  mode.value = nextMode
  focusIndex.value = 0
}

onMounted(async () => {
  const scopeParam = String(route.query.scope ?? 'all')
  const scope: QuizScope = scopeParam === 'wrong' || scopeParam === 'due' ? scopeParam : 'all'
  const modeParam = String(route.query.mode ?? '')

  try {
    const subjectIndex = await loadSubjectIndex()
    const meta = subjectIndex.subjects.find((item) => item.id === subjectId.value)
    if (!meta) {
      error.value = '未找到该学科'
      return
    }
    subjectName.value = meta.name
    accent.value = meta.accent

    const bank = await loadSubjectBank(meta.file)
    const usable = bank.questions.filter((question) => question.stem.includes('{{'))
    if (usable.length === 0) {
      error.value = '该学科暂时没有可练习的题目'
      return
    }

    const records = progress.questionMap(subjectId.value)
    const built = buildQueue({ questions: usable, records, scope })

    if (built.length === 0) {
      error.value =
        scope === 'wrong'
          ? '还没有错题，先去练习一轮吧'
          : scope === 'due'
            ? '今天没有到期的题目，休息一下吧'
            : '暂时没有可练习的题目'
      return
    }

    queue.value = built
    mode.value =
      modeParam === 'reveal' || modeParam === 'input'
        ? modeParam
        : progress.settings.defaultMode

    session.start({
      subjectId: subjectId.value,
      subjectName: meta.name,
      accent: meta.accent,
      mode: mode.value,
      queue: built
    })

    loadQuestion(0)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '题库加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="page quiz-page" :style="{ '--accent': accent }">
    <div v-if="loading" class="card empty">正在准备题目…</div>

    <div v-else-if="error" class="card empty">
      <p>{{ error }}</p>
      <RouterLink class="btn" :to="{ name: 'home' }" style="margin-top: 18px">返回首页</RouterLink>
    </div>

    <template v-else>
      <header class="quiz-head">
        <div class="head-left">
          <RouterLink class="icon-btn" :to="{ name: 'home' }" title="返回首页">
            <AppIcon name="arrow-left" :size="20" />
          </RouterLink>
          <div>
            <p class="quiz-subject">{{ subjectName }}</p>
            <p class="quiz-progress">{{ index + 1 }} / {{ queue.length }}</p>
          </div>
        </div>

        <div class="segmented">
          <button
            type="button"
            :class="{ 'is-active': mode === 'reveal' }"
            @click="switchMode('reveal')"
          >
            遮罩
          </button>
          <button
            type="button"
            :class="{ 'is-active': mode === 'input' }"
            @click="switchMode('input')"
          >
            输入
          </button>
        </div>
      </header>

      <div class="bar">
        <span class="bar-fill" :style="{ width: `${((index + 1) / queue.length) * 100}%` }"></span>
      </div>

      <Transition name="quiz-swap" mode="out-in">
        <QuestionCard
          :key="current?.id"
          :segments="segments"
          :mode="mode"
          :phase="state.phase"
          :inputs="state.inputs"
          :revealed="state.revealed"
          :self-eval="state.selfEval"
          :outcomes="state.outcomes"
          :show-hint="showHint"
          :focus-index="focusIndex"
          :explain="current?.explain"
          @reveal="reveal"
          @mark-wrong="toggleWrong"
          @update:input="updateInput"
          @enter="handleEnter"
        />
      </Transition>

      <p v-if="mode === 'reveal' && state.phase === 'answering'" class="tip tip-ok">
        点击遮罩揭示答案；只有没记住的空才点「没记住」，其余默认算记住。
      </p>
      <p v-else-if="mode === 'reveal' && markedWrongCount > 0" class="tip">
        已标记 {{ markedWrongCount }} 个空为「没记住」。
      </p>

      <footer class="quiz-foot">
        <div class="foot-left">
          <button class="btn btn-ghost" type="button" :disabled="index === 0" @click="previous">
            上一题
          </button>
          <button class="btn btn-ghost" type="button" @click="skip">跳过</button>
        </div>

        <button
          v-if="state.phase === 'answering'"
          class="btn btn-lg"
          type="button"
          @click="submit"
        >
          {{ mode === 'input' ? '提交答案' : '完成自评' }}
        </button>
        <button v-else class="btn btn-lg" type="button" @click="next">
          {{ isLast ? '查看结果' : '下一题' }}
        </button>
      </footer>
    </template>
  </main>
</template>

<style scoped>
.quiz-page {
  max-width: 820px;
}

.quiz-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.head-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quiz-subject {
  font-size: 17px;
  font-weight: 650;
}

.quiz-progress {
  font-size: 13px;
  color: var(--text-sub);
}

.bar {
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--surface-soft);
  overflow: hidden;
  margin-bottom: 20px;
}

@supports (background: color-mix(in srgb, red 10%, white)) {
  .bar {
    background: color-mix(in srgb, var(--accent) 10%, var(--surface-soft));
  }
}

.bar-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
  background: var(--accent);
  background-image: linear-gradient(
    90deg,
    color-mix(in srgb, var(--accent) 45%, #ffffff),
    var(--accent)
  );
  transition: width 0.32s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.quiz-swap-enter-active,
.quiz-swap-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.quiz-swap-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.quiz-swap-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.tip {
  margin-top: 14px;
  font-size: 13px;
  color: #b2772f;
}

.tip-ok {
  color: var(--text-sub);
}

.quiz-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 26px;
}

.foot-left {
  display: flex;
  gap: 6px;
}

@media (max-width: 520px) {
  .quiz-head {
    gap: 10px;
    margin-bottom: 14px;
  }
  .head-left {
    gap: 10px;
  }
  .quiz-subject {
    font-size: 16px;
  }
  .quiz-progress {
    font-size: 12.5px;
  }
  .segmented button {
    height: 32px;
    padding: 0 12px;
    font-size: 13px;
  }
  .bar {
    height: 7px;
    margin-bottom: 16px;
  }
  .quiz-foot {
    flex-direction: column-reverse;
    align-items: stretch;
    gap: 10px;
    margin-top: 20px;
  }
  .foot-left {
    justify-content: space-between;
  }
  .quiz-foot .btn-lg {
    width: 100%;
  }
}
</style>
