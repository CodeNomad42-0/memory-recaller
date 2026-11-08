<script setup lang="ts">
import { computed } from 'vue'
import BlankInput from './BlankInput.vue'
import BlankMask from './BlankMask.vue'
import type { AnswerMode, BlankOutcome, QuizPhase, Segment } from '../core/types'

const props = defineProps<{
  segments: Segment[]
  mode: AnswerMode
  phase: QuizPhase
  inputs: string[]
  revealed: boolean[]
  selfEval: ('wrong' | null)[]
  outcomes: BlankOutcome[]
  showHint: boolean
  focusIndex: number
  explain?: string
}>()

const emit = defineEmits<{
  reveal: [index: number]
  markWrong: [index: number]
  'update:input': [index: number, value: string]
  enter: [index: number]
}>()

const locked = computed(() => props.phase !== 'answering')

const wrongBlanks = computed(() => {
  if (props.phase !== 'submitted') return []
  return props.segments
    .filter((segment): segment is Extract<Segment, { type: 'blank' }> => segment.type === 'blank')
    .filter((segment) => props.outcomes[segment.index]?.correct === false)
    .map((segment) => ({
      index: segment.index,
      answer: segment.answers[0] ?? ''
    }))
})

const hints = computed(() =>
  props.segments
    .filter((segment): segment is Extract<Segment, { type: 'blank' }> => segment.type === 'blank')
    .filter((segment) => Boolean(segment.hint))
    .map((segment) => ({ index: segment.index, hint: segment.hint as string }))
)

function stateOf(index: number): 'idle' | 'correct' | 'wrong' {
  if (props.phase !== 'submitted') return 'idle'
  return props.outcomes[index]?.correct ? 'correct' : 'wrong'
}
</script>

<template>
  <div class="question-card card">
    <p class="stem">
      <template v-for="(segment, order) in props.segments" :key="order">
        <span v-if="segment.type === 'text'">{{ segment.text }}</span>
        <BlankMask
          v-else-if="props.mode === 'reveal'"
          :answer="segment.answers[0] ?? ''"
          :hint="segment.hint"
          :revealed="props.revealed[segment.index] === true"
          :self-eval="props.selfEval[segment.index] ?? null"
          :locked="locked"
          :show-hint="props.showHint"
          @reveal="emit('reveal', segment.index)"
          @mark-wrong="emit('markWrong', segment.index)"
        />
        <BlankInput
          v-else
          :value="props.inputs[segment.index] ?? ''"
          :hint="segment.hint"
          :state="stateOf(segment.index)"
          :disabled="locked"
          :answer="segment.answers[0] ?? ''"
          :show-hint="props.showHint"
          :autofocus="props.focusIndex === segment.index && !locked"
          :placeholder="`第 ${segment.index + 1} 空`"
          @update:value="(value) => emit('update:input', segment.index, value)"
          @enter="emit('enter', segment.index)"
        />
      </template>
    </p>

    <div v-if="props.phase === 'submitted' && wrongBlanks.length > 0" class="feedback">
      <p v-for="item in wrongBlanks" :key="item.index" class="feedback-line">
        第 {{ item.index + 1 }} 空正确答案：<strong>{{ item.answer }}</strong>
      </p>
      <p v-if="props.explain" class="explain">{{ props.explain }}</p>
    </div>

    <div v-else-if="props.phase === 'submitted'" class="feedback feedback-ok">
      <p class="feedback-line">全部答对，继续保持。</p>
      <p v-if="props.explain" class="explain">{{ props.explain }}</p>
    </div>

    <div v-if="props.showHint && props.mode === 'input' && !locked && hints.length > 0" class="hint-row">
      <span v-for="item in hints" :key="item.index" class="chip">
        第 {{ item.index + 1 }} 空提示：{{ item.hint }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.question-card {
  padding: 34px 30px;
  min-height: 240px;
}

.stem {
  font-size: 22px;
  line-height: 2.1;
  letter-spacing: 0.01em;
  word-break: break-word;
}

.feedback {
  margin-top: 26px;
  padding: 16px 18px;
  border-radius: 14px;
  background: #fdf0f0;
}

@supports (background: color-mix(in srgb, red 10%, white)) {
  .feedback {
    background: color-mix(in srgb, var(--err) 9%, #ffffff);
  }
  .feedback-ok {
    background: color-mix(in srgb, var(--ok) 9%, #ffffff);
  }
}

.feedback-ok {
  background: #eef9f2;
}

.feedback-line {
  font-size: 14px;
  color: var(--err-text);
}

.feedback-ok .feedback-line {
  color: var(--ok-text);
}

.explain {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-sub);
}

.hint-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 22px;
}

@media (max-width: 600px) {
  .question-card {
    padding: 24px 20px;
  }
  .stem {
    font-size: 19px;
    line-height: 2;
  }
}
</style>
