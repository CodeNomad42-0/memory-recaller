<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import SubjectCard from '../components/SubjectCard.vue'
import { loadSubjectBank, loadSubjectIndex } from '../core/data'
import type { Question, SubjectMeta } from '../core/types'
import { useProgressStore } from '../stores/progress'

const progress = useProgressStore()

const subjects = ref<SubjectMeta[]>([])
const banks = ref<Record<string, Question[]>>({})
const loading = ref(true)
const error = ref('')

const totalDue = computed(() => progress.totalDueCount())

const cards = computed(() =>
  subjects.value.map((subject) => ({
    subject,
    dueCount: progress.dueCount(subject.id),
    mastery: progress.subjectMastery(subject.id, banks.value[subject.id] ?? [])
  }))
)

const totalQuestions = computed(() =>
  subjects.value.reduce((sum, subject) => sum + subject.questionCount, 0)
)

onMounted(async () => {
  try {
    const index = await loadSubjectIndex()
    subjects.value = index.subjects
    const loaded = await Promise.all(
      index.subjects.map(async (subject) => {
        const bank = await loadSubjectBank(subject.file)
        return [subject.id, bank.questions] as const
      })
    )
    banks.value = Object.fromEntries(loaded)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '题库加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="page">
    <header class="page-head">
      <div>
        <h1 class="title">Recaller</h1>
        <p class="subtitle">挑一个科目，一句话一个知识点，点开就开始。</p>
      </div>
      <div class="head-actions">
        <span class="chip">
          <AppIcon name="target" :size="15" />
          今日待复习 {{ totalDue }}
        </span>
        <RouterLink class="icon-btn" :to="{ name: 'wrong' }" title="错题本">
          <AppIcon name="chart" :size="20" />
        </RouterLink>
        <RouterLink class="icon-btn" :to="{ name: 'settings' }" title="设置">
          <AppIcon name="settings" :size="20" />
        </RouterLink>
      </div>
    </header>

    <div v-if="loading" class="skeleton-grid">
      <div v-for="item in 3" :key="item" class="skeleton-card"></div>
    </div>

    <div v-else-if="error" class="card empty">
      <p>{{ error }}</p>
      <p class="muted">请检查 public/data 下的题库文件是否存在。</p>
    </div>

    <template v-else>
      <div class="grid-cards">
        <SubjectCard
          v-for="card in cards"
          :key="card.subject.id"
          :subject="card.subject"
          :due-count="card.dueCount"
          :mastery="card.mastery"
        />
      </div>

      <section class="shortcuts">
        <RouterLink class="shortcut card" :to="{ name: 'wrong' }">
          <AppIcon name="chart" :size="20" />
          <div>
            <p class="shortcut-title">错题本</p>
            <p class="shortcut-desc">集中重练所有薄弱题</p>
          </div>
        </RouterLink>
        <RouterLink class="shortcut card" :to="{ name: 'settings' }">
          <AppIcon name="settings" :size="20" />
          <div>
            <p class="shortcut-title">设置</p>
            <p class="shortcut-desc">默认模式、提示与数据备份</p>
          </div>
        </RouterLink>
      </section>

      <p class="foot-note">
        共 {{ subjects.length }} 个学科 · {{ totalQuestions }} 道题 · 进度仅保存在本机浏览器
      </p>
    </template>
  </main>
</template>

<style scoped>
.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.skeleton-card {
  height: 172px;
  border-radius: var(--radius-card);
  background: linear-gradient(100deg, #eef0f4 30%, #f7f8fa 50%, #eef0f4 70%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite linear;
}

@keyframes shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

.shortcuts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.shortcut {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  color: var(--text-sub);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.shortcut:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-float);
}

.shortcut-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.shortcut-desc {
  font-size: 12.5px;
  color: var(--text-sub);
}

.foot-note {
  margin-top: 28px;
  text-align: center;
  font-size: 12.5px;
  color: var(--text-disabled);
}
</style>
