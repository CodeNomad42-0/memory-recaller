<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 22 })

const PATHS: Record<string, string[]> = {
  dna: [
    'M8 3c0 4 8 4 8 9s-8 5-8 9',
    'M16 3c0 4-8 4-8 9s8 5 8 9',
    'M9 7.5h6',
    'M9 16.5h6'
  ],
  flask: ['M9 3h6', 'M10 3v5.2L5.3 17A2 2 0 0 0 7.1 20h9.8a2 2 0 0 0 1.8-3L14 8.2V3', 'M7.6 14.5h8.8'],
  scroll: [
    'M6 4.5A1.5 1.5 0 0 1 7.5 3H18a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 18 21H7.5A1.5 1.5 0 0 1 6 19.5z',
    'M9.5 7.5h6',
    'M9.5 11.5h6',
    'M9.5 15.5h4'
  ],
  chart: ['M4 20h16', 'M7 20v-6', 'M12 20V9', 'M17 20v-9'],
  scale: [
    'M12 4v16',
    'M8 20h8',
    'M6 7h12',
    'M6 7l-3 6h6z',
    'M18 7l-3 6h6z'
  ],
  settings: [
    'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z',
    'M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.09a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z'
  ],
  check: ['M5 12.8l4.2 4.2L19 6.5'],
  cross: ['M6 6l12 12', 'M18 6L6 18'],
  'arrow-left': ['M15 5l-7 7 7 7'],
  'arrow-right': ['M9 5l7 7-7 7'],
  star: ['M12 3.6l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8z'],
  trash: ['M4 7h16', 'M9 7V4.8h6V7', 'M6.5 7l.8 12.2A1.8 1.8 0 0 0 9.1 21h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7', 'M10 11v6', 'M14 11v6'],
  download: ['M12 4v11', 'M8 11.5l4 4 4-4', 'M5 19.5h14'],
  upload: ['M12 20V9', 'M8 12.5l4-4 4 4', 'M5 4.5h14'],
  target: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z', 'M12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z'],
  circle: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z']
}

const pathList = computed(() => PATHS[props.name] ?? PATHS.circle)
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(d, index) in pathList" :key="index" :d="d" />
  </svg>
</template>
