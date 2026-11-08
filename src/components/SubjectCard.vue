<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import ProgressRing from './ProgressRing.vue'
import type { SubjectMeta } from '../core/types'

const props = defineProps<{
  subject: SubjectMeta
  dueCount: number
  mastery: number
}>()
</script>

<template>
  <RouterLink
    class="subject-card card"
    :to="{ name: 'quiz', params: { subjectId: props.subject.id } }"
    :style="{ '--accent': props.subject.accent }"
  >
    <div class="subject-top">
      <span class="subject-icon">
        <AppIcon :name="props.subject.icon" :size="24" />
      </span>
      <ProgressRing :value="props.mastery" :size="46" :stroke="4" />
    </div>

    <div class="subject-body">
      <h3 class="subject-name">{{ props.subject.name }}</h3>
      <p class="subject-desc">{{ props.subject.desc }}</p>
    </div>

    <div class="subject-foot">
      <span class="chip">{{ props.subject.questionCount }} 题</span>
      <span v-if="props.dueCount > 0" class="chip chip-due">今日待复习 {{ props.dueCount }}</span>
      <span v-else class="chip chip-idle">暂无待复习</span>
    </div>
  </RouterLink>
</template>

<style scoped>
.subject-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 172px;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.subject-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-float);
}

.subject-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.subject-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-pill);
  color: var(--accent);
  background: #eef9f5;
}

@supports (background: color-mix(in srgb, red 10%, white)) {
  .subject-icon {
    background: color-mix(in srgb, var(--accent) 14%, #ffffff);
  }
}

.subject-name {
  font-size: 19px;
  font-weight: 650;
}

.subject-desc {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-sub);
}

.subject-body {
  flex: 1;
}

.subject-foot {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip-due {
  background: #fdf3e7;
  color: #b2772f;
}

@supports (background: color-mix(in srgb, red 10%, white)) {
  .chip-due {
    background: color-mix(in srgb, #e0a458 18%, #ffffff);
    color: #a56d24;
  }
}

.chip-idle {
  background: var(--surface-soft);
}
</style>
