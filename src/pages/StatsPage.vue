<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import DailyLineChart from '../components/DailyLineChart.vue'
import { lastNDays, overallMetrics } from '../core/stats'
import { useProgressStore } from '../stores/progress'

const progress = useProgressStore()

const metrics = computed(() => overallMetrics(progress.state))
const trend = computed(() => lastNDays(progress.state, 14))
const dueToday = computed(() => progress.totalDueCount())

function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

const firstSuccessText = computed(() =>
  metrics.value.firstAttempts > 0 ? percent(metrics.value.firstSuccessRate) : '--'
)

const forgettingText = computed(() =>
  metrics.value.reviews > 0 ? percent(metrics.value.forgettingRate) : '--'
)

const firstSuccessNote = computed(() =>
  metrics.value.firstAttempts > 0
    ? `基于 ${metrics.value.firstAttempts} 个知识点`
    : '暂无样本'
)

const forgettingNote = computed(() =>
  metrics.value.reviews > 0 ? `基于 ${metrics.value.reviews} 次复习` : '暂无样本'
)
</script>

<template>
  <main class="page">
    <header class="page-head">
      <div>
        <h1 class="title">学习统计</h1>
        <p class="subtitle">按知识点记录你的记忆变化</p>
      </div>
      <RouterLink class="icon-btn" :to="{ name: 'home' }" title="返回首页">
        <AppIcon name="arrow-left" :size="20" />
      </RouterLink>
    </header>

    <section class="metric-grid">
      <article class="card metric-card">
        <div class="metric-head">
          <span class="metric-icon">
            <AppIcon name="target" :size="18" />
          </span>
          <p class="metric-label">首次记忆成功率</p>
        </div>
        <p class="metric-value accent">{{ firstSuccessText }}</p>
        <p class="metric-note">{{ firstSuccessNote }}</p>
      </article>

      <article class="card metric-card">
        <div class="metric-head">
          <span class="metric-icon">
            <AppIcon name="trend" :size="18" />
          </span>
          <p class="metric-label">遗忘率</p>
        </div>
        <p class="metric-value">{{ forgettingText }}</p>
        <p class="metric-note">{{ forgettingNote }}</p>
      </article>
    </section>

    <section class="mini-grid">
      <div class="card mini-card">
        <p class="mini-value">{{ metrics.todayFirstCorrect }}</p>
        <p class="mini-label">今日首次记忆成功</p>
      </div>
      <div class="card mini-card">
        <p class="mini-value">{{ metrics.todayAttempts }}</p>
        <p class="mini-label">今日作答</p>
      </div>
      <div class="card mini-card">
        <p class="mini-value">{{ dueToday }}</p>
        <p class="mini-label">今日待复习</p>
      </div>
    </section>

    <section class="card chart-card">
      <div class="chart-head">
        <div>
          <h2 class="section-title">每日首次记忆成功</h2>
          <p class="section-sub">最近 14 天</p>
        </div>
        <span class="chip">
          <AppIcon name="trend" :size="15" />
          首次答对
        </span>
      </div>
      <DailyLineChart :points="trend" />
    </section>

    <section class="card note-card">
      <h2 class="section-title">口径说明</h2>
      <ul class="note-list">
        <li>首次记忆成功 = 第一次接触就记住的知识点，只有每道题的首次作答才会计入。</li>
        <li>遗忘率 = 复习时忘掉的比例，复习次数越多，这个数字越能反映真实情况。</li>
        <li>所有数据仅保存在本机浏览器，清理浏览器数据会一并清空。</li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metric-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.metric-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border-radius: var(--radius-pill);
  color: var(--accent-deep);
  background: var(--surface-soft);
}

.metric-label {
  font-size: 13.5px;
  color: var(--text-sub);
}

.metric-value {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.metric-value.accent {
  color: var(--accent-deep);
}

.metric-note {
  font-size: 12.5px;
  color: var(--text-disabled);
}

.mini-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.mini-card {
  padding: 16px 18px;
}

.mini-value {
  font-size: 24px;
  font-weight: 650;
  line-height: 1.2;
}

.mini-label {
  margin-top: 4px;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--text-sub);
  overflow-wrap: anywhere;
}

.chart-card {
  margin-top: 16px;
}

.chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-title {
  font-size: 16px;
  font-weight: 650;
}

.section-sub {
  margin-top: 3px;
  font-size: 12.5px;
  color: var(--text-sub);
}

.note-card {
  margin-top: 16px;
}

.note-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--text-sub);
}

.note-list li {
  position: relative;
  padding-left: 14px;
}

.note-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  width: 5px;
  height: 5px;
  border-radius: var(--radius-pill);
  background: var(--accent);
}

@media (max-width: 480px) {
  .metric-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .metric-value {
    font-size: 34px;
  }
  .mini-grid {
    gap: 10px;
  }
  .mini-card {
    padding: 14px 12px;
  }
  .mini-value {
    font-size: 20px;
  }
  .mini-label {
    font-size: 12px;
  }
}
</style>
