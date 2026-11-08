<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import ProgressRing from '../components/ProgressRing.vue'
import { loadSubjectBank, loadSubjectIndex } from '../core/data'
import { plainStem } from '../core/parser'
import { isWeakQuestion } from '../core/queue'
import type { Question, SubjectMeta } from '../core/types'
import { useProgressStore } from '../stores/progress'

interface WrongGroup {
  subject: SubjectMeta
  items: { question: Question; wrongCount: number; mastery: number }[]
}

const progress = useProgressStore()
const groups = ref<WrongGroup[]>([])
const loading = ref(true)
const error = ref('')

const totalWrong = computed(() =>
  groups.value.reduce((sum, group) => sum + group.items.length, 0)
)

onMounted(async () => {
  try {
    const index = await loadSubjectIndex()
    const loaded = await Promise.all(
      index.subjects.map(async (subject) => {
        const bank = await loadSubjectBank(subject.file)
        const records = progress.questionMap(subject.id)
        const items = bank.questions
          .filter((question) => isWeakQuestion(records[question.id]))
          .map((question) => {
            const record = records[question.id]
            return {
              question,
              wrongCount: record?.wrongCount ?? 0,
              mastery: record?.mastery ?? 0
            }
          })
          .sort((a, b) => b.wrongCount - a.wrongCount)
        return { subject, items }
      })
    )
    groups.value = loaded.filter((group) => group.items.length > 0)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="page">
    <header class="page-head">
      <div>
        <h1 class="title">错题本</h1>
        <p class="subtitle">共 {{ totalWrong }} 道薄弱题，点进去只练错题。</p>
      </div>
      <RouterLink class="icon-btn" :to="{ name: 'home' }" title="返回首页">
        <AppIcon name="arrow-left" :size="20" />
      </RouterLink>
    </header>

    <div v-if="loading" class="card empty">正在统计错题…</div>
    <div v-else-if="error" class="card empty">{{ error }}</div>
    <div v-else-if="groups.length === 0" class="card empty">
      还没有错题。先去首页挑个学科练一轮吧。
    </div>

    <section v-for="group in groups" :key="group.subject.id" class="group">
      <div class="group-head">
        <div class="row">
          <span class="group-icon" :style="{ '--accent': group.subject.accent }">
            <AppIcon :name="group.subject.icon" :size="18" />
          </span>
          <h2 class="group-title">{{ group.subject.name }}</h2>
          <span class="chip">{{ group.items.length }} 题</span>
        </div>
        <RouterLink
          class="btn"
          :to="{ name: 'quiz', params: { subjectId: group.subject.id }, query: { scope: 'wrong' } }"
        >
          只练错题
        </RouterLink>
      </div>

      <ul class="wrong-list">
        <li v-for="item in group.items" :key="item.question.id" class="card wrong-item">
          <div class="wrong-main">
            <p class="wrong-stem">{{ plainStem(item.question.stem) }}</p>
            <div class="wrong-meta">
              <span class="chip">错 {{ item.wrongCount }} 次</span>
              <span class="chip">掌握度 {{ Math.round(item.mastery * 100) }}%</span>
            </div>
          </div>
          <ProgressRing :value="item.mastery" :size="42" :stroke="4" />
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.group {
  margin-bottom: 28px;
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.group-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-pill);
  color: var(--accent);
  background: #eef9f5;
}

@supports (background: color-mix(in srgb, red 10%, white)) {
  .group-icon {
    background: color-mix(in srgb, var(--accent) 14%, #ffffff);
  }
}

.group-title {
  font-size: 17px;
  font-weight: 650;
}

.wrong-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wrong-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
}

.wrong-main {
  min-width: 0;
}

.wrong-stem {
  font-size: 15px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.wrong-meta {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
</style>
