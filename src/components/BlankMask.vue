<script setup lang="ts">
const props = defineProps<{
  answer: string
  hint?: string
  revealed: boolean
  selfEval: 'wrong' | null
  locked: boolean
  showHint: boolean
}>()

const emit = defineEmits<{
  reveal: []
  markWrong: []
}>()
</script>

<template>
  <span class="blank-wrap">
    <button
      v-if="!props.revealed"
      type="button"
      class="blank-mask"
      :disabled="props.locked"
      :title="props.showHint && props.hint ? props.hint : '点击揭示答案'"
      @click="emit('reveal')"
    >
      <span class="blank-dots">•••</span>
    </button>

    <span v-else class="blank-answer">
      <span class="answer-text">{{ props.answer }}</span>
      <button
        v-if="!props.locked"
        type="button"
        class="eval"
        :class="{ 'is-chosen': props.selfEval === 'wrong' }"
        :title="props.selfEval === 'wrong' ? '再点一次可取消标记' : '标记为没记住'"
        @click="emit('markWrong')"
      >
        没记住
      </button>
      <span v-else-if="props.selfEval === 'wrong'" class="eval-tag">✗</span>
    </span>
  </span>
</template>

<style scoped>
.blank-wrap {
  display: inline;
}

.blank-mask {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4.2em;
  height: 1.9em;
  margin: 0 0.15em;
  padding: 0 0.5em;
  vertical-align: baseline;
  border-radius: 8px;
  background: #f0f8f5;
  border-bottom: 2px solid #bfe4d7;
  color: #9fbfb4;
  font-size: 0.86em;
  letter-spacing: 0.08em;
  transition: background 0.18s ease, transform 0.12s ease;
}

@supports (background: color-mix(in srgb, red 10%, white)) {
  .blank-mask {
    background: color-mix(in srgb, var(--accent) 6%, #ffffff);
    border-bottom-color: color-mix(in srgb, var(--accent) 40%, #ffffff);
  }
}

.blank-mask:hover:not(:disabled) {
  transform: translateY(-1px);
}

.blank-mask:disabled {
  cursor: default;
}

.blank-answer {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0.15em;
  padding: 0 0.45em;
  border-radius: 8px;
  background: #eef9f4;
  color: var(--accent-deep);
  font-weight: 600;
  font-size: 0.94em;
  animation: reveal 0.18s ease;
}

@supports (background: color-mix(in srgb, red 10%, white)) {
  .blank-answer {
    background: color-mix(in srgb, var(--accent) 10%, #ffffff);
    color: color-mix(in srgb, var(--accent) 75%, #12211c);
  }
}

.answer-text {
  white-space: nowrap;
}

.eval {
  height: 22px;
  padding: 0 8px;
  border-radius: var(--radius-pill);
  background: #fcecec;
  color: var(--err-text);
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  transition: box-shadow 0.16s ease, background 0.16s ease;
}

@supports (background: color-mix(in srgb, red 10%, white)) {
  .eval {
    background: color-mix(in srgb, var(--err) 12%, #ffffff);
  }
}

.eval.is-chosen {
  background: #f8dcdc;
  box-shadow: inset 0 0 0 1.5px currentColor;
}

@supports (background: color-mix(in srgb, red 10%, white)) {
  .eval.is-chosen {
    background: color-mix(in srgb, var(--err) 26%, #ffffff);
  }
}

.eval-tag {
  font-size: 12px;
  font-weight: 700;
  color: var(--err-text);
}

@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
