<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import type { AnswerMode } from '../core/types'
import { useProgressStore } from '../stores/progress'

const progress = useProgressStore()
const message = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function flash(text: string): void {
  message.value = text
  window.setTimeout(() => {
    if (message.value === text) message.value = ''
  }, 2400)
}

function setMode(mode: AnswerMode): void {
  progress.updateSettings({ defaultMode: mode })
}

function toggleHint(event: Event): void {
  progress.updateSettings({ showHint: (event.target as HTMLInputElement).checked })
}

function setGoal(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  progress.updateSettings({ dailyGoal: Number.isFinite(value) && value > 0 ? Math.round(value) : 30 })
}

function exportData(): void {
  const blob = new Blob([progress.exportJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  anchor.href = url
  anchor.download = `recaller-progress-${date}.json`
  anchor.click()
  URL.revokeObjectURL(url)
  flash('进度已导出')
}

function pickFile(): void {
  fileInput.value?.click()
}

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    progress.importJson(text)
    flash('进度已导入')
  } catch (error) {
    flash(error instanceof Error ? `导入失败：${error.message}` : '导入失败')
  } finally {
    input.value = ''
  }
}

function clearData(): void {
  if (!window.confirm('确定要清空全部学习进度吗？此操作不可撤销。')) return
  progress.clearAll()
  flash('进度已清空')
}
</script>

<template>
  <main class="page settings-page">
    <header class="page-head">
      <div>
        <h1 class="title">设置</h1>
        <p class="subtitle">进度只保存在当前浏览器，换设备请先导出备份。</p>
      </div>
      <RouterLink class="icon-btn" :to="{ name: 'home' }" title="返回首页">
        <AppIcon name="arrow-left" :size="20" />
      </RouterLink>
    </header>

    <section class="card block">
      <h2 class="block-title">默认作答模式</h2>
      <div class="segmented">
        <button
          type="button"
          :class="{ 'is-active': progress.settings.defaultMode === 'reveal' }"
          @click="setMode('reveal')"
        >
          遮罩模式
        </button>
        <button
          type="button"
          :class="{ 'is-active': progress.settings.defaultMode === 'input' }"
          @click="setMode('input')"
        >
          输入模式
        </button>
      </div>
      <p class="block-desc">
        遮罩模式：点击揭示答案后自评；输入模式：手动输入后自动校对。
      </p>
    </section>

    <section class="card block">
      <div class="spread">
        <div>
          <h2 class="block-title">显示空位提示</h2>
          <p class="block-desc">题干里用 ~ 标注的提示会在输入框下方展示。</p>
        </div>
        <label class="switch">
          <input type="checkbox" :checked="progress.settings.showHint" @change="toggleHint" />
          <span class="switch-track"></span>
        </label>
      </div>
    </section>

    <section class="card block">
      <div class="spread">
        <div>
          <h2 class="block-title">每日练习目标</h2>
          <p class="block-desc">仅作参考，不影响出题队列。</p>
        </div>
        <input
          class="goal-input"
          type="number"
          min="5"
          max="200"
          :value="progress.settings.dailyGoal"
          @change="setGoal"
        />
      </div>
    </section>

    <section class="card block">
      <h2 class="block-title">数据管理</h2>
      <div class="data-actions">
        <button class="btn" type="button" @click="exportData">
          <AppIcon name="download" :size="17" />
          导出进度
        </button>
        <button class="btn" type="button" @click="pickFile">
          <AppIcon name="upload" :size="17" />
          导入进度
        </button>
        <button class="btn btn-danger" type="button" @click="clearData">
          <AppIcon name="trash" :size="17" />
          清空进度
        </button>
      </div>
      <input
        ref="fileInput"
        class="hidden-input"
        type="file"
        accept="application/json,.json"
        @change="onFileChange"
      />
    </section>

    <p v-if="message" class="toast">{{ message }}</p>
  </main>
</template>

<style scoped>
.settings-page {
  max-width: 760px;
}

.block {
  margin-bottom: 14px;
}

.block-title {
  font-size: 16px;
  font-weight: 650;
  margin-bottom: 10px;
}

.block-desc {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-sub);
}

.switch {
  position: relative;
  display: inline-flex;
  flex: none;
  cursor: pointer;
}

.switch input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch-track {
  width: 48px;
  height: 28px;
  border-radius: var(--radius-pill);
  background: var(--surface-soft);
  transition: background 0.2s ease;
}

.switch-track::after {
  content: '';
  display: block;
  width: 22px;
  height: 22px;
  margin: 3px;
  border-radius: var(--radius-pill);
  background: #fff;
  box-shadow: 0 1px 3px rgba(20, 20, 40, 0.18);
  transition: transform 0.2s ease;
}

.switch input:checked + .switch-track {
  background: var(--accent);
}

.switch input:checked + .switch-track::after {
  transform: translateX(20px);
}

.goal-input {
  width: 92px;
  height: 42px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--surface-soft);
  text-align: center;
  font-weight: 600;
  outline: none;
}

.data-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-danger {
  background: #fceeee;
  color: var(--err-text);
}

@supports (background: color-mix(in srgb, red 10%, white)) {
  .btn-danger {
    background: color-mix(in srgb, var(--err) 12%, #ffffff);
    color: var(--err-text);
  }
  .btn-danger:hover:not(:disabled) {
    background: color-mix(in srgb, var(--err) 18%, #ffffff);
  }
}

.hidden-input {
  display: none;
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
}
</style>
