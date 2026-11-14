<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import AchievementPanel from '../components/AchievementPanel.vue'
import { useSessionStore } from '../stores/session'

const router = useRouter()
const session = useSessionStore()

const result = computed(() => session.result)

const showAchievement = computed(() => (result.value?.total ?? 0) >= 20)

const accuracyText = computed(() =>
  result.value ? `${Math.round(result.value.accuracy * 100)}%` : '0%'
)

const durationText = computed(() => {
  if (!result.value) return '0 秒'
  const seconds = Math.max(1, Math.round(result.value.durationMs / 1000))
  if (seconds < 60) return `${seconds} 秒`
  return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`
})

function practiceWrong(): void {
  if (!result.value) return
  router.push({
    name: 'quiz',
    params: { subjectId: result.value.subjectId },
    query: { scope: 'wrong' }
  })
}
</script>

<template>
  <main class="page result-page">
    <div v-if="!result" class="card empty">
      <p>还没有本次练习的结果。</p>
      <RouterLink class="btn" :to="{ name: 'home' }" style="margin-top: 18px">返回首页</RouterLink>
    </div>

    <template v-else>
      <header class="page-head">
        <div>
          <h1 class="title">练习完成</h1>
          <p class="subtitle">{{ result.subjectName }} · 共 {{ result.total }} 道题</p>
        </div>
      </header>

      <AchievementPanel
        v-if="showAchievement"
        :total="result.total"
        :accuracy="result.accuracy"
        :duration-ms="result.durationMs"
      />

      <section class="card score-card">
        <div class="score-main">
          <p class="score-value">{{ accuracyText }}</p>
          <p class="score-label">本次正确率</p>
        </div>
        <div class="score-grid">
          <div class="score-item">
            <p class="score-num">{{ result.correctBlanks }} / {{ result.totalBlanks }}</p>
            <p class="score-cap">答对空数</p>
          </div>
          <div class="score-item">
            <p class="score-num">{{ durationText }}</p>
            <p class="score-cap">用时</p>
          </div>
          <div class="score-item">
            <p class="score-num">{{ result.newWrongCount }}</p>
            <p class="score-cap">新增错题</p>
          </div>
        </div>
      </section>

      <div class="actions">
        <button class="btn btn-lg" type="button" @click="practiceWrong">
          <AppIcon name="target" :size="18" />
          再练错题
        </button>
        <RouterLink class="btn btn-lg btn-ghost" :to="{ name: 'home' }">返回首页</RouterLink>
      </div>
    </template>
  </main>
</template>

<style scoped>
.result-page {
  max-width: 720px;
}

.score-card {
  padding: 30px;
}

.score-main {
  text-align: center;
  padding-bottom: 22px;
}

.score-value {
  font-size: 54px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--accent-deep);
}

.score-label {
  font-size: 13px;
  color: var(--text-sub);
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid var(--surface-soft);
  text-align: center;
}

.score-num {
  font-size: 19px;
  font-weight: 650;
}

.score-cap {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-sub);
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 22px;
}

@media (max-width: 480px) {
  .actions {
    flex-direction: column;
  }
}
</style>
