<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  total: number
  accuracy: number
  durationMs: number
}>()

const visible = computed(() => props.total >= 20)

const accuracyText = computed(() => `${Math.round(props.accuracy * 100)}%`)

const durationText = computed(() => {
  const seconds = Math.max(1, Math.round(props.durationMs / 1000))
  if (seconds < 60) return `${seconds} 秒`
  return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`
})

const confetti = [
  { left: '6%', delay: '0s', duration: '1.9s', color: '#5dbfa0', width: '5px', height: '8px' },
  { left: '18%', delay: '0.25s', duration: '2.1s', color: '#f0c56b', width: '6px', height: '6px' },
  { left: '30%', delay: '0.1s', duration: '1.7s', color: '#8fd8bf', width: '4px', height: '7px' },
  { left: '44%', delay: '0.35s', duration: '2.2s', color: '#7fb8d8', width: '5px', height: '5px' },
  { left: '58%', delay: '0.05s', duration: '1.8s', color: '#b7d98f', width: '6px', height: '8px' },
  { left: '70%', delay: '0.3s', duration: '2s', color: '#e7a1a1', width: '4px', height: '6px' },
  { left: '82%', delay: '0.15s', duration: '1.9s', color: '#5dbfa0', width: '5px', height: '7px' },
  { left: '93%', delay: '0.4s', duration: '2.1s', color: '#f0c56b', width: '6px', height: '6px' }
]
</script>

<template>
  <section v-if="visible" class="achievement">
    <div class="ach-card">
      <div class="confetti" aria-hidden="true">
        <span
          v-for="(piece, index) in confetti"
          :key="index"
          class="confetti-piece"
          :style="{
            left: piece.left,
            width: piece.width,
            height: piece.height,
            background: piece.color,
            animationDelay: piece.delay,
            animationDuration: piece.duration
          }"
        />
      </div>

      <div class="ach-body">
        <div class="badge">
          <span class="badge-ring" aria-hidden="true" />
          <span class="badge-pulse" aria-hidden="true" />
          <AppIcon name="trophy" :size="32" />
        </div>
        <div class="ach-copy">
          <p class="ach-title">20 题打卡达成</p>
          <p class="ach-sub">连续完成 20 题记忆，今天的状态不错</p>
        </div>
      </div>

      <div class="ach-stats">
        <span class="stat">{{ total }} 题</span>
        <span class="stat">{{ accuracyText }} 正确率</span>
        <span class="stat">用时 {{ durationText }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.achievement {
  margin-bottom: 16px;
  animation: panel-in 0.5s ease-out both;
}

.ach-card {
  position: relative;
  overflow: hidden;
  padding: 22px 24px;
  border-radius: var(--radius-card);
  border: 1px solid color-mix(in srgb, var(--accent) 24%, #ffffff);
  background:
    radial-gradient(
      120% 140% at 0% 0%,
      color-mix(in srgb, var(--accent) 18%, #ffffff) 0%,
      color-mix(in srgb, var(--accent) 6%, #ffffff) 46%,
      var(--surface) 100%
    );
  box-shadow: var(--shadow-card);
}

.confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.confetti-piece {
  position: absolute;
  top: -12px;
  border-radius: 2px;
  opacity: 0;
  animation-name: confetti-fall;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  animation-iteration-count: 1;
}

.ach-body {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.badge {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  color: var(--accent-deep);
  background: color-mix(in srgb, var(--accent) 16%, #ffffff);
  border: 1px solid color-mix(in srgb, var(--accent) 34%, #ffffff);
  animation: badge-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
}

.badge-ring {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--accent) 26%, #ffffff);
}

.badge-pulse {
  position: absolute;
  inset: -1px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--accent) 42%, #ffffff);
  opacity: 0;
  animation: halo-pulse 1.4s ease-out 0.35s 2 both;
}

.ach-copy {
  min-width: 0;
}

.ach-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--accent-deep);
}

.ach-sub {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-sub);
}

.ach-stats {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.stat {
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 600;
  color: color-mix(in srgb, var(--accent) 62%, #12211c);
  background: color-mix(in srgb, var(--surface) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, #ffffff);
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes badge-pop {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }
  60% {
    opacity: 1;
    transform: scale(1.06);
  }
  82% {
    transform: scale(0.98);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes halo-pulse {
  0% {
    opacity: 0.6;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.55);
  }
}

@keyframes confetti-fall {
  0% {
    opacity: 0.95;
    transform: translate3d(0, -14px, 0) rotate(0deg);
  }
  70% {
    opacity: 0.85;
  }
  100% {
    opacity: 0;
    transform: translate3d(14px, 200px, 0) rotate(240deg);
  }
}

@media (max-width: 480px) {
  .ach-card {
    padding: 18px 16px;
  }

  .ach-body {
    gap: 12px;
  }

  .badge {
    width: 62px;
    height: 62px;
  }

  .ach-title {
    font-size: 15px;
  }

  .ach-sub {
    font-size: 12px;
  }

  .ach-stats {
    gap: 6px;
    margin-top: 14px;
  }

  .stat {
    padding: 4px 9px;
    font-size: 11px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .achievement,
  .badge,
  .badge-pulse,
  .confetti-piece {
    animation: none;
    transition: none;
  }

  .confetti {
    display: none;
  }

  .badge-pulse {
    opacity: 0.35;
    transform: scale(1.2);
  }
}
</style>
