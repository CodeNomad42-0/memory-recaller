<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  value: string
  hint?: string
  state: 'idle' | 'correct' | 'wrong'
  disabled: boolean
  answer: string
  showHint: boolean
  autofocus: boolean
  placeholder: string
}>()

const emit = defineEmits<{
  'update:value': [value: string]
  enter: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)

const width = computed(() => {
  const length = Math.max(props.value.length, props.placeholder.length, 3)
  return `${Math.min(18, length + 1.5)}ch`
})

function focus(): void {
  nextTick(() => inputRef.value?.focus())
}

onMounted(() => {
  if (props.autofocus) focus()
})

watch(
  () => props.autofocus,
  (value) => {
    if (value) focus()
  }
)

function onInput(event: Event): void {
  emit('update:value', (event.target as HTMLInputElement).value)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    emit('enter')
  }
}
</script>

<template>
  <span class="input-wrap" :class="`is-${props.state}`">
    <input
      ref="inputRef"
      class="blank-input"
      type="text"
      :value="props.value"
      :disabled="props.disabled"
      :placeholder="props.placeholder"
      :title="props.showHint && props.hint ? props.hint : undefined"
      :style="{ width }"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      @input="onInput"
      @keydown="onKeydown"
    />
    <span v-if="props.state !== 'idle'" class="state-icon">
      <AppIcon :name="props.state === 'correct' ? 'check' : 'cross'" :size="15" />
    </span>
    <span v-if="props.state === 'wrong'" class="correct-answer">{{ props.answer }}</span>
  </span>
</template>

<style scoped>
.input-wrap {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0 0.15em;
  padding: 0 0.35em;
  border-radius: var(--radius-pill);
  background: #f4f6f8;
  vertical-align: baseline;
  transition: background 0.18s ease, box-shadow 0.18s ease;
}

.input-wrap:focus-within {
  background: var(--surface);
  box-shadow: var(--focus-ring);
}

.blank-input {
  height: 1.9em;
  padding: 0 0.2em;
  border: none;
  outline: none;
  background: transparent;
  text-align: center;
  font-size: 0.94em;
  font-weight: 600;
  color: var(--text);
}

.blank-input:focus-visible {
  box-shadow: none;
}

.blank-input::placeholder {
  color: var(--text-disabled);
  font-weight: 400;
}

.is-correct {
  background: #eaf8f0;
}

.is-wrong {
  background: #fdeded;
}

@supports (background: color-mix(in srgb, red 10%, white)) {
  .is-correct {
    background: color-mix(in srgb, var(--ok) 12%, #ffffff);
  }
  .is-wrong {
    background: color-mix(in srgb, var(--err) 12%, #ffffff);
  }
}

.state-icon {
  display: inline-flex;
  color: var(--ok-text);
}

.is-wrong .state-icon {
  color: var(--err-text);
}

.correct-answer {
  font-size: 0.8em;
  color: var(--err-text);
  white-space: nowrap;
}
</style>
