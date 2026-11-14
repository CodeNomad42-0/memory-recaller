<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

interface ChartPoint {
  date: string
  label: string
  firstCorrect: number
}

const props = withDefaults(
  defineProps<{
    points: ChartPoint[]
    accent?: string
  }>(),
  { accent: 'var(--accent)' }
)

const HEIGHT = 220
const PAD = { top: 16, right: 14, bottom: 30, left: 34 }

const wrapEl = ref<HTMLElement | null>(null)
const width = ref(720)
let observer: ResizeObserver | undefined

onMounted(() => {
  const el = wrapEl.value
  if (!el) return
  const sync = (): void => {
    width.value = Math.max(260, el.clientWidth)
  }
  sync()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(sync)
    observer.observe(el)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
})

const isEmpty = computed(() => props.points.every((point) => point.firstCorrect <= 0))

/** 取整成好读的上限：5 / 10 / 20 / 30 … */
function niceMax(value: number): number {
  if (value <= 5) return 5
  if (value <= 10) return 10
  if (value <= 20) return 20
  const step = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / step) * step
}

const maxValue = computed(() =>
  niceMax(props.points.reduce((max, point) => Math.max(max, point.firstCorrect), 0))
)

const innerWidth = computed(() => Math.max(1, width.value - PAD.left - PAD.right))
const innerHeight = HEIGHT - PAD.top - PAD.bottom

const ticks = computed(() => {
  const max = maxValue.value
  const step = max <= 5 ? 1 : max <= 10 ? 2 : max <= 20 ? 5 : Math.ceil(max / 5)
  const list: number[] = []
  for (let value = 0; value <= max; value += step) list.push(value)
  return list
})

function yFor(value: number): number {
  return PAD.top + (1 - value / maxValue.value) * innerHeight
}

const plotted = computed(() =>
  props.points.map((point, index) => {
    const ratio = props.points.length > 1 ? index / (props.points.length - 1) : 0.5
    return {
      ...point,
      index,
      x: PAD.left + ratio * innerWidth.value,
      y: yFor(point.firstCorrect)
    }
  })
)

const linePath = computed(() =>
  plotted.value
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ')
)

const areaPath = computed(() => {
  const list = plotted.value
  if (list.length === 0) return ''
  const base = PAD.top + innerHeight
  const head = `M${list[0].x.toFixed(1)} ${base.toFixed(1)}`
  const body = list.map((point) => `L${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  const tail = `L${list[list.length - 1].x.toFixed(1)} ${base.toFixed(1)} Z`
  return `${head} ${body} ${tail}`
})

const labelIndexes = computed(() => {
  const total = props.points.length
  if (total === 0) return []
  const capacity = Math.max(2, Math.floor(innerWidth.value / 62) + 1)
  const step = Math.max(1, Math.ceil(total / capacity))
  const chosen = new Set<number>()
  for (let index = 0; index < total; index += step) chosen.add(index)
  if (total > 1) {
    chosen.add(total - 1)
    chosen.delete(total - 2)
  }
  return [...chosen].sort((a, b) => a - b)
})

function labelAnchor(index: number): string {
  if (index === props.points.length - 1) return 'end'
  if (index === 0) return 'start'
  return 'middle'
}
</script>

<template>
  <div ref="wrapEl" class="chart-wrap">
    <div v-if="isEmpty" class="chart-empty">还没有统计数据，先完成一轮练习吧</div>

    <svg
      v-else
      class="chart-svg"
      :viewBox="`0 0 ${width} ${HEIGHT}`"
      width="100%"
      :height="HEIGHT"
      role="img"
      aria-label="每日首次记忆成功趋势"
      :style="{ color: props.accent }"
    >
      <defs>
        <linearGradient id="daily-chart-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.22" />
          <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
        </linearGradient>
      </defs>

      <g>
        <line
          v-for="tick in ticks"
          :key="`grid-${tick}`"
          class="grid-line"
          :x1="PAD.left"
          :x2="width - PAD.right"
          :y1="yFor(tick)"
          :y2="yFor(tick)"
        />
      </g>

      <g>
        <text
          v-for="tick in ticks"
          :key="`tick-${tick}`"
          class="axis-text"
          :x="PAD.left - 9"
          :y="yFor(tick)"
          text-anchor="end"
          dominant-baseline="middle"
        >
          {{ tick }}
        </text>
      </g>

      <path :d="areaPath" fill="url(#daily-chart-area)" />
      <path
        :d="linePath"
        class="line"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <g v-for="point in plotted" :key="point.date">
        <title>{{ point.label }}：{{ point.firstCorrect }} 个</title>
        <circle :cx="point.x" :cy="point.y" r="12" fill="transparent" />
        <circle
          v-if="point.index === plotted.length - 1"
          :cx="point.x"
          :cy="point.y"
          r="9"
          fill="currentColor"
          opacity="0.16"
        />
        <circle
          :cx="point.x"
          :cy="point.y"
          :r="point.index === plotted.length - 1 ? 5 : 3.2"
          fill="currentColor"
          stroke="var(--surface)"
          :stroke-width="point.index === plotted.length - 1 ? 2.4 : 1.6"
        />
      </g>

      <g>
        <text
          v-for="index in labelIndexes"
          :key="`label-${index}`"
          class="axis-text"
          :x="plotted[index].x"
          :y="HEIGHT - 8"
          :text-anchor="labelAnchor(index)"
        >
          {{ plotted[index].label }}
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.chart-wrap {
  width: 100%;
}

.chart-svg {
  display: block;
  width: 100%;
  overflow: visible;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 220px;
  padding: 0 20px;
  border-radius: var(--radius-btn);
  background: var(--surface-soft);
  color: var(--text-sub);
  font-size: 14px;
  text-align: center;
}

.grid-line {
  stroke: var(--surface-soft);
  stroke-width: 1;
}

.axis-text {
  fill: var(--text-sub);
  font-size: 11px;
  font-family: var(--font);
}

.line {
  filter: drop-shadow(0 2px 6px rgba(20, 20, 40, 0.08));
}
</style>
