<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import type { CustomBank } from '../core/customBank'
import {
  deleteCustomBank,
  listCustomBanks,
  parseBankText,
  saveCustomBank
} from '../core/customBank'
import { invalidateDataCache, loadSubjectBank, loadSubjectIndex } from '../core/data'
import type { ExportMode, ExportSources } from '../core/docxExport'
import {
  buildDocxBlob,
  downloadBlob,
  exportFileName,
  selectQuestions
} from '../core/docxExport'
import { plainStem } from '../core/parser'
import { useProgressStore } from '../stores/progress'
import type { Question, QuestionBank, QuestionRecord, SubjectMeta } from '../core/types'

interface ExportSubject {
  meta: SubjectMeta
  questions: Question[]
}

type StudioTab = 'export' | 'bank'

interface PreviewData {
  name: string
  desc: string
  bank: QuestionBank
}

const route = useRoute()
const router = useRouter()
const progress = useProgressStore()

const text = ref('')
const errors = ref<{ line: number; message: string }[]>([])
const preview = ref<PreviewData | null>(null)
const savedBanks = ref<CustomBank[]>([])
const message = ref('')

const exampleText = [
  '# 学科: 高中化学错题',
  '# 描述: 自建题库（可选）',
  '## 章节: 基础概念',
  '细胞的能量货币是{{ATP}}。',
  '光合作用的场所是{{叶绿体~细胞器}}。'
].join('\n')

const placeholderText = '细胞的能量货币是{{ATP}}。'

const formatRules = [
  '# 学科: 必填且唯一，# 描述: 可选。',
  '## 章节: 可选，可多次出现，其后的题目归入该章节；未声明时使用「默认章节」。',
  '其余非空行都是题目，必须用 {{答案}} 挖空，支持 {{答案1|答案2}} 与 {{答案~提示}}。'
]

const activeTab = computed<StudioTab>(() => (route.query.tab === 'bank' ? 'bank' : 'export'))
const canSubmit = computed(() => text.value.trim().length > 0)
const previewQuestions = computed(() => preview.value?.bank.questions.slice(0, 3) ?? [])

const exportSubjects = ref<ExportSubject[]>([])
const recordsBySubject = ref<Record<string, Record<string, QuestionRecord>>>({})
const exportMode = ref<ExportMode>('all')
const sources = ref<ExportSources>({ weak: true, wrong: true, random: true })
const limit = ref(20)
const exporting = ref(false)
const dataLoading = ref(true)
const dataError = ref('')
const selectedSubjectIds = ref<string[]>([])
const showAnswers = ref(false)

const activeSubjects = computed(() =>
  exportSubjects.value.filter((subject) => selectedSubjectIds.value.includes(subject.meta.id))
)

const selectedQuestionTotal = computed(() =>
  activeSubjects.value.reduce((total, subject) => total + subject.questions.length, 0)
)

const isMultiSubject = computed(() => activeSubjects.value.length > 1)

const normalizedLimit = computed(() => {
  const value = Math.floor(Number(limit.value))
  if (!Number.isFinite(value)) return 20
  return Math.min(200, Math.max(1, value))
})

const sourceLabel = computed(() => {
  const labels: string[] = []
  if (sources.value.weak) labels.push('易错题目')
  if (sources.value.wrong) labels.push('答错题目')
  if (sources.value.random) labels.push('随机抽选')
  return labels.length > 0 ? labels.join(' · ') : '未选择来源'
})

const modeLabel = computed(() =>
  exportMode.value === 'all' ? '全部题库' : `智能筛选（${sourceLabel.value}）`
)

const exportItems = computed(() =>
  selectQuestions({
    subjects: activeSubjects.value,
    recordsBySubject: recordsBySubject.value,
    options: {
      mode: exportMode.value,
      sources: { ...sources.value },
      limit: normalizedLimit.value
    }
  })
)

const exportCount = computed(() => exportItems.value.length)

function switchTab(tab: StudioTab): void {
  void router.replace({ query: { ...route.query, tab } })
}

function flash(content: string): void {
  message.value = content
  window.setTimeout(() => {
    if (message.value === content) message.value = ''
  }, 2400)
}

function refreshSaved(): void {
  savedBanks.value = listCustomBanks()
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function answersOf(stem: string): string {
  const tokens = stem.match(/\{\{([^{}]*)\}\}/g) ?? []
  return tokens
    .map((token) => {
      const inner = token.slice(2, -2)
      const answerPart = inner.split('~')[0] ?? ''
      return answerPart.split('|')[0]?.trim() ?? ''
    })
    .filter(Boolean)
    .join(' / ')
}

function previewStem(stem: string): string {
  return stem.replace(/\\\{\\\{/g, '{{').replace(/\{\{[^{}]*\}\}/g, '________')
}

function previewAnswers(stem: string): string {
  return (stem.match(/\{\{([^{}]*)\}\}/g) ?? [])
    .map((token) => {
      const inner = token.slice(2, -2)
      const answerPart = inner.split('~')[0] ?? ''
      return answerPart
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean)
        .join(' / ')
    })
    .filter(Boolean)
    .join('；')
}

function isSubjectSelected(id: string): boolean {
  return selectedSubjectIds.value.includes(id)
}

function toggleSubject(id: string): void {
  selectedSubjectIds.value = isSubjectSelected(id)
    ? selectedSubjectIds.value.filter((item) => item !== id)
    : [...selectedSubjectIds.value, id]
}

function selectAllSubjects(): void {
  selectedSubjectIds.value = exportSubjects.value.map((subject) => subject.meta.id)
}

function clearSubjects(): void {
  selectedSubjectIds.value = []
}

function validate(): void {
  const result = parseBankText(text.value)
  if (!result.ok) {
    errors.value = result.errors
    preview.value = null
    return
  }
  errors.value = []
  preview.value = { name: result.name, desc: result.desc, bank: result.bank }
}

function save(): void {
  const result = parseBankText(text.value)
  if (!result.ok) {
    errors.value = result.errors
    preview.value = null
    return
  }
  try {
    saveCustomBank(result.name, result.desc, result.bank)
    invalidateDataCache()
    refreshSaved()
    text.value = ''
    preview.value = null
    errors.value = []
    flash('已保存，可回首页开始练习')
  } catch (error) {
    flash(error instanceof Error ? `保存失败：${error.message}` : '保存失败')
  }
}

function remove(item: CustomBank): void {
  if (!window.confirm(`确定删除自建题库「${item.name}」吗？`)) return
  deleteCustomBank(item.id)
  invalidateDataCache()
  refreshSaved()
  flash('题库已删除')
}

function setExportMode(mode: ExportMode): void {
  exportMode.value = mode
}

async function loadExportData(): Promise<void> {
  dataLoading.value = true
  dataError.value = ''
  try {
    const index = await loadSubjectIndex()
    const loaded = await Promise.all(
      index.subjects.map(async (meta) => {
        const bank = await loadSubjectBank(meta.file)
        return { meta, questions: bank.questions } as ExportSubject
      })
    )
    exportSubjects.value = loaded
    selectedSubjectIds.value = loaded.map((subject) => subject.meta.id)
    recordsBySubject.value = Object.fromEntries(
      index.subjects.map((subject) => [subject.id, progress.questionMap(subject.id)])
    )
  } catch (error) {
    dataError.value = error instanceof Error ? error.message : '题库加载失败'
  } finally {
    dataLoading.value = false
  }
}

async function exportWord(): Promise<void> {
  if (selectedSubjectIds.value.length === 0) {
    flash('请至少选择一个题库')
    return
  }
  const items = exportItems.value
  if (items.length === 0) {
    flash('没有符合条件的题目')
    return
  }
  exporting.value = true
  try {
    const blob = await buildDocxBlob(items, {
      modeLabel: modeLabel.value,
      generatedAt: Date.now()
    })
    downloadBlob(blob, exportFileName(exportMode.value))
    flash(`已导出 ${items.length} 题`)
  } catch (error) {
    flash(error instanceof Error ? `导出失败：${error.message}` : '导出失败')
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  refreshSaved()
  void loadExportData()
})
</script>

<template>
  <main class="page studio-page">
    <header class="page-head">
      <div>
        <h1 class="title">题库工坊</h1>
        <p class="subtitle">导出 Word 练习，或用自己的文本新建题库</p>
      </div>
      <RouterLink class="icon-btn" :to="{ name: 'home' }" title="返回首页">
        <AppIcon name="arrow-left" :size="20" />
      </RouterLink>
    </header>

    <div class="segmented tabs">
      <button
        type="button"
        :class="{ 'is-active': activeTab === 'export' }"
        @click="switchTab('export')"
      >
        导出 Word
      </button>
      <button
        type="button"
        :class="{ 'is-active': activeTab === 'bank' }"
        @click="switchTab('bank')"
      >
        自建题库
      </button>
    </div>

    <template v-if="activeTab === 'export'">
      <section class="card block">
        <div class="field">
          <span class="field-label">抽取模式</span>
          <div class="segmented">
            <button
              type="button"
              :class="{ 'is-active': exportMode === 'all' }"
              @click="setExportMode('all')"
            >
              全部题库
            </button>
            <button
              type="button"
              :class="{ 'is-active': exportMode === 'smart' }"
              @click="setExportMode('smart')"
            >
              智能筛选
            </button>
          </div>
        </div>

        <div v-if="exportMode === 'smart'" class="smart-options">
          <label class="check-row">
            <input v-model="sources.weak" type="checkbox" />
            <span class="check-title">易错题目</span>
            <span class="check-desc">薄弱或掌握度偏低</span>
          </label>
          <label class="check-row">
            <input v-model="sources.wrong" type="checkbox" />
            <span class="check-title">过往答错题目</span>
            <span class="check-desc">曾经答错过的题</span>
          </label>
          <label class="check-row">
            <input v-model="sources.random" type="checkbox" />
            <span class="check-title">随机普通抽选</span>
            <span class="check-desc">未作答或掌握良好</span>
          </label>

          <label class="field limit-field">
            <span class="field-label">题量</span>
            <input
              v-model.number="limit"
              class="limit-input"
              type="number"
              min="1"
              max="200"
              :disabled="exporting"
            />
          </label>
        </div>

        <div class="scope-block">
          <div class="scope-head">
            <div>
              <span class="field-label">导出范围</span>
              <p class="scope-hint">
                已选 {{ activeSubjects.length }} 个题库 · 共 {{ selectedQuestionTotal }} 题
              </p>
            </div>
            <div class="scope-actions">
              <button type="button" class="link-btn" @click="selectAllSubjects">全选</button>
              <button type="button" class="link-btn" @click="clearSubjects">清空</button>
            </div>
          </div>
          <div class="scope-grid">
            <label
              v-for="subject in exportSubjects"
              :key="subject.meta.id"
              class="subject-check"
              :class="{ 'is-checked': isSubjectSelected(subject.meta.id) }"
            >
              <input
                type="checkbox"
                :checked="isSubjectSelected(subject.meta.id)"
                @change="toggleSubject(subject.meta.id)"
              />
              <span class="subject-name">{{ subject.meta.name }}</span>
              <span class="subject-count">{{ subject.questions.length }}</span>
            </label>
          </div>
        </div>

        <div class="estimate-row">
          <span class="chip">
            <AppIcon name="layers" :size="14" />
            当前可导出 {{ exportCount }} 题
          </span>
          <span class="estimate-hint">
            {{
              exportMode === 'all'
                ? '按所选题库与题目顺序导出全部题目'
                : `最多 ${normalizedLimit} 题，不足时不重复填充`
            }}
          </span>
        </div>
      </section>

      <section class="card block">
        <div class="preview-head export-head">
          <h2 class="block-title">导出预览</h2>
          <label class="answer-toggle">
            <input v-model="showAnswers" type="checkbox" />
            <span>显示答案</span>
          </label>
        </div>
        <p class="preview-summary">
          共 {{ exportCount }} 个小题，题号与文档一致；文件末尾会另起一页附参考答案。
        </p>
        <div v-if="exportCount > 0" class="export-preview">
          <div
            v-for="(item, index) in exportItems"
            :key="`${item.subjectId}:${item.question.id}`"
            class="export-line"
          >
            <span class="export-no">{{ index + 1 }}.</span>
            <div class="export-body">
              <p class="export-stem">
                {{ previewStem(item.question.stem) }}
                <span v-if="isMultiSubject" class="export-tag">（{{ item.subjectName }}）</span>
              </p>
              <p v-if="showAnswers" class="export-answer">
                答案：{{ previewAnswers(item.question.stem) }}
              </p>
            </div>
          </div>
        </div>
        <div v-else class="empty">
          {{ activeSubjects.length === 0 ? '请先选择至少一个题库' : '当前范围内没有可导出的题目' }}
        </div>

        <div class="actions">
          <button
            class="btn btn-lg"
            type="button"
            :disabled="exporting || dataLoading || !!dataError || exportCount === 0"
            @click="exportWord"
          >
            <AppIcon name="download" :size="18" />
            {{ exporting ? '正在生成…' : '导出 Word 文档' }}
          </button>
        </div>
      </section>

      <section class="card block">
        <h2 class="block-title">导出说明</h2>
        <ul class="rules">
          <li>小题按「1. 题干 ________」连续排版，挖空处保留下划线，可直接在 Word 中书写答案。</li>
          <li>文档末尾另起一页列出「参考答案」，多个空用「；」分隔，同一空的候选答案用「 / 」连接。</li>
          <li>A4 纸张、2.54cm 页边距、1.5 倍行距已预设，Word 打开即可直接打印。</li>
        </ul>
      </section>

      <section v-if="dataError" class="card error-card">
        <h2 class="error-title">题库加载失败</h2>
        <p>{{ dataError }}</p>
      </section>
      <section v-else-if="dataLoading" class="card empty">正在加载题库…</section>
    </template>

    <template v-else>
      <section class="card block">
        <h2 class="block-title">固定格式</h2>
        <pre class="format-code">{{ exampleText }}</pre>
        <ul class="rules">
          <li v-for="rule in formatRules" :key="rule">{{ rule }}</li>
        </ul>
      </section>

      <section class="card block">
        <h2 class="block-title">粘贴题库文本</h2>
        <textarea
          v-model="text"
          class="bank-input"
          rows="10"
          spellcheck="false"
          :placeholder="placeholderText"
        ></textarea>
        <div class="actions">
          <button class="btn btn-ghost" type="button" :disabled="!canSubmit" @click="validate">
            <AppIcon name="check" :size="17" />
            校验并预览
          </button>
          <button class="btn" type="button" :disabled="!canSubmit" @click="save">
            <AppIcon name="plus" :size="17" />
            保存题库
          </button>
        </div>
      </section>

      <section v-if="errors.length > 0" class="card error-card">
        <h2 class="error-title">校验未通过</h2>
        <ul class="error-list">
          <li v-for="(error, index) in errors" :key="index">
            第 {{ error.line }} 行：{{ error.message }}
          </li>
        </ul>
      </section>

      <section v-if="preview" class="card block">
        <div class="preview-head">
          <h2 class="preview-name">{{ preview.name }}</h2>
          <span class="chip">
            <AppIcon name="layers" :size="14" />
            {{ preview.bank.chapters.length }} 章节
          </span>
          <span class="chip">
            <AppIcon name="file-text" :size="14" />
            {{ preview.bank.questions.length }} 题
          </span>
        </div>
        <p class="preview-desc">{{ preview.desc || '未填写描述' }}</p>
        <ul class="preview-list">
          <li v-for="question in previewQuestions" :key="question.id" class="preview-item">
            <p class="preview-stem">{{ plainStem(question.stem) }}</p>
            <p class="preview-answers">答案：{{ answersOf(question.stem) }}</p>
          </li>
        </ul>
      </section>

      <section class="block">
        <h2 class="block-title">已保存题库</h2>
        <div v-if="savedBanks.length === 0" class="card empty">
          还没有自建题库，粘贴文本保存后会显示在这里。
        </div>
        <ul v-else class="bank-list">
          <li v-for="item in savedBanks" :key="item.id" class="card bank-item">
            <span class="bank-icon">
              <AppIcon name="star" :size="18" />
            </span>
            <div class="bank-main">
              <p class="bank-name" :title="item.name">{{ item.name }}</p>
              <div class="bank-meta">
                <span class="chip">{{ item.bank.questions.length }} 题</span>
                <span class="chip">{{ formatDate(item.createdAt) }}</span>
              </div>
            </div>
            <button class="delete-btn" type="button" title="删除题库" @click="remove(item)">
              <AppIcon name="trash" :size="18" />
            </button>
          </li>
        </ul>
      </section>
    </template>

    <p v-if="message" class="toast">{{ message }}</p>
  </main>
</template>

<style scoped>
.studio-page {
  max-width: 860px;
}

.tabs {
  margin-bottom: 18px;
}

.block {
  margin-bottom: 14px;
}

.block-title {
  font-size: 16px;
  font-weight: 650;
  margin-bottom: 10px;
}

.format-code {
  margin: 0;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--surface-soft);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.rules {
  margin-top: 12px;
  padding-left: 18px;
  list-style: disc;
  color: var(--text-sub);
  font-size: 13.5px;
  line-height: 1.8;
}

.bank-input {
  width: 100%;
  min-height: 220px;
  padding: 16px;
  border: none;
  border-radius: 16px;
  background: var(--surface-soft);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13.5px;
  line-height: 1.7;
  resize: vertical;
  outline: none;
}

.bank-input:focus {
  box-shadow: 0 0 0 3px rgba(124, 140, 248, 0.18);
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.error-card {
  margin-bottom: 14px;
  background: #fceeee;
  color: var(--err-text);
}

@supports (background: color-mix(in srgb, red 10%, white)) {
  .error-card {
    background: color-mix(in srgb, var(--err) 10%, #ffffff);
  }
}

.error-title {
  font-size: 15px;
  font-weight: 650;
  margin-bottom: 8px;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13.5px;
  line-height: 1.6;
}

.preview-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.preview-name {
  font-size: 16px;
  font-weight: 650;
}

.preview-desc {
  font-size: 13px;
  color: var(--text-sub);
  margin-bottom: 12px;
  word-break: break-word;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-item {
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--surface-soft);
}

.preview-stem {
  font-size: 14.5px;
  line-height: 1.7;
  word-break: break-word;
}

.preview-answers {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--text-sub);
  word-break: break-word;
}

.bank-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bank-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
}

.bank-icon {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-pill);
  color: #7c8cf8;
  background: #eef0fe;
}

@supports (background: color-mix(in srgb, red 10%, white)) {
  .bank-icon {
    background: color-mix(in srgb, #7c8cf8 14%, #ffffff);
  }
}

.bank-main {
  flex: 1;
  min-width: 0;
}

.bank-name {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bank-meta {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.delete-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-pill);
  color: var(--err-text);
  background: transparent;
  transition: background 0.18s ease;
}

.delete-btn:hover {
  background: rgba(224, 106, 106, 0.12);
}

.field {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-sub);
}

.smart-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--surface-soft);
}

.check-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  cursor: pointer;
}

.check-row input {
  flex: none;
  width: 17px;
  height: 17px;
  accent-color: var(--accent);
}

.check-title {
  font-weight: 500;
}

.check-desc {
  font-size: 12.5px;
  color: var(--text-sub);
}

.limit-field {
  margin-top: 4px;
}

.limit-input {
  width: 88px;
  height: 38px;
  padding: 0 12px;
  border: none;
  border-radius: 12px;
  background: var(--surface);
  box-shadow: inset 0 0 0 1px rgba(20, 20, 40, 0.08);
  outline: none;
}

.estimate-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.estimate-hint {
  font-size: 12.5px;
  color: var(--text-sub);
}

.scope-block {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(20, 20, 40, 0.06);
}

.scope-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.scope-hint {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--text-sub);
}

.scope-actions {
  flex: none;
  display: flex;
  gap: 6px;
}

.link-btn {
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 12.5px;
  color: var(--accent-deep);
  background: var(--accent-soft);
  transition: background 0.18s ease;
}

.link-btn:hover {
  background: color-mix(in srgb, var(--accent) 20%, #ffffff);
}

.scope-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.subject-check {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 12px;
  background: var(--surface-soft);
  box-shadow: inset 0 0 0 1px rgba(20, 20, 40, 0.06);
  font-size: 13.5px;
  cursor: pointer;
  transition: background 0.18s ease, box-shadow 0.18s ease;
}

.subject-check.is-checked {
  background: color-mix(in srgb, var(--accent) 12%, #ffffff);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, #ffffff);
}

.subject-check input {
  flex: none;
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
}

.subject-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subject-count {
  flex: none;
  font-size: 12px;
  color: var(--text-sub);
}

.export-head {
  justify-content: space-between;
}

.answer-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-sub);
  cursor: pointer;
}

.answer-toggle input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
}

.preview-summary {
  margin-bottom: 12px;
  font-size: 12.5px;
  color: var(--text-sub);
}

.export-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
}

.export-line {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface-soft);
}

.export-no {
  flex: none;
  width: 22px;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.7;
  color: var(--text-sub);
}

.export-body {
  min-width: 0;
}

.export-stem {
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.export-tag {
  font-size: 12px;
  color: var(--text-sub);
}

.export-answer {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--text-sub);
  word-break: break-word;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 32px;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: var(--radius-pill);
  background: rgba(26, 26, 31, 0.88);
  color: #fff;
  font-size: 13px;
  box-shadow: var(--shadow-float);
  max-width: calc(100vw - 40px);
}

@media (max-width: 480px) {
  .tabs {
    display: flex;
    width: 100%;
  }

  .tabs button {
    flex: 1;
    padding: 0 8px;
  }

  .bank-item {
    padding: 14px;
  }
}
</style>
