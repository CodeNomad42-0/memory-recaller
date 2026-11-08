<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ value: number; size?: number; stroke?: number; label?: string }>(),
  { size: 52, stroke: 5, label: '' }
)

const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const safeValue = computed(() => Math.min(1, Math.max(0, Number.isFinite(props.value) ? props.value : 0)))
const dashOffset = computed(() => circumference.value * (1 - safeValue.value))
const center = computed(() => props.size / 2)
</script>

<template>
  <div class="ring" :style="{ width: `${props.size}px`, height: `${props.size}px` }">
    <svg :width="props.size" :height="props.size" :viewBox="`0 0 ${props.size} ${props.size}`">
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        stroke="var(--surface-soft)"
        :stroke-width="props.stroke"
      />
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        stroke="var(--accent)"
        :stroke-width="props.stroke"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        :transform="`rotate(-90 ${center} ${center})`"
        class="ring-value"
      />
    </svg>
    <span class="ring-label">{{ props.label || `${Math.round(safeValue * 100)}%` }}</span>
  </div>
</template>

<style scoped>
.ring {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.ring svg {
  position: absolute;
  inset: 0;
}

.ring-value {
  transition: stroke-dashoffset 0.5s ease;
}

.ring-label {
  position: relative;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
}
</style>
