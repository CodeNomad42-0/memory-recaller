# Recaller 记忆巩固 Web 应用 Spec

## Why

用户提供了一份 DeepSeek 分享对话（`https://chat.deepseek.com/share/ydnmkaizxxvqynx8q5`），其中包含两部分内容：
1. 「Recaller」项目计划书：纯静态 SPA、一句话多填空、遮罩揭示 / 手动输入两种作答方式、错题记忆与复习调度、JSON 数据驱动、全圆角纯白视觉。
2. 艾宾浩斯记忆曲线下的抽题算法建议（加权随机 + Leitner 优先级 + SM-2/FSRS 队列 + 抖动）。

目标是把这份对话沉淀为一份可执行的 `agent.md` 计划文档，并按项落地为可直接托管在 GitHub Pages 的可用应用。

## What Changes

- 新增 `agent.md`：爬取内容的结构化归档，含「功能规格逐条展开」与「任务清单与验收标准」两部分（唯一文档类交付物）。
- 按 `agent.md` 计划直接实现可运行的 Recaller 应用并完成部署配置。
- 新建纯静态 SPA 工程（Vite + Vue 3 + TypeScript，Hash 路由）。
- 新增题库数据层：`public/data/index.json` + 按学科分文件，运行时 `fetch` 加载。
- 新增题干解析引擎：`{{答案}}` / `{{答案1|答案2}}` / `{{答案~提示}}` 语法，支持 1~N 个空。
- 新增双模式作答：遮罩揭示（自评）与输入校对（自动判分）。
- 新增答案标准化比对与逐空反馈。
- 新增记忆系统：按「空」记录正确/错误、掌握度、SM-2 调度 + 加权随机抽题 + 间隔抖动，错题本与「今日待复习」。
- 新增视觉规范落地：全圆角、纯白主基调、白底掺主题色的按钮体系。
- 新增 GitHub Actions → GitHub Pages 部署流水线。
- 无 **BREAKING** 变更（全新项目）。

## Impact

- Affected specs: 新建 `add-recaller-memory-app`
- Affected code（全部为新建）:
  - `agent.md`、`README.md`
  - `index.html`、`vite.config.ts`、`package.json`、`tsconfig.json`
  - `src/main.ts`、`src/App.vue`、`src/router/index.ts`
  - `src/pages/{HomePage,QuizPage,ResultPage,WrongBookPage,SettingsPage}.vue`
  - `src/components/{SubjectCard,QuestionCard,BlankMask,BlankInput,ProgressRing,AppIcon}.vue`
  - `src/core/{types,parser,normalize,scheduler,queue,storage}.ts`
  - `src/styles/{tokens,base}.css`
  - `public/data/{index.json,biology.json}`
  - `.github/workflows/deploy.yml`

## ADDED Requirements

### Requirement: agent.md 计划文档

系统 SHALL 提供 `agent.md`，完整归档分享对话中的项目定位、技术栈、功能清单（P0/P1/P2）、数据模型、UI 规范、路由结构、抽题算法结论，并同时包含两部分计划内容：
1. **功能规格逐条展开**：按功能逐条写清交互细节、数据字段、边界情况、异常处理。
2. **任务清单与验收标准**：每项功能一条任务，标注依赖、工作量与验收点，偏工程执行。

#### Scenario: 文档可独立指导开发
- **WHEN** 开发者只阅读 `agent.md`
- **THEN** 能明确技术栈、数据格式、页面路由、每项任务完成标准，无需回看原始对话链接

#### Scenario: 两种计划形式并存
- **WHEN** 阅读 `agent.md`
- **THEN** 前一部分能按功能查到交互与数据字段的逐条规格，后一部分能按任务查到依赖、工作量与验收标准

#### Scenario: 保留算法结论
- **WHEN** 阅读 `agent.md` 的复习调度章节
- **THEN** 能看到「加权随机轮盘赌 + Leitner 优先级 + SM-2 到期队列 + ±5% 抖动」的组合策略及取舍理由

### Requirement: 学科首页一键进入做题

系统 SHALL 在首页以卡片网格展示 `index.json` 中的学科，卡片含圆角图标、学科名、题量、掌握度环、待复习角标；点击卡片直接跳转 `#/quiz/:subjectId`，不经过中间确认页。

#### Scenario: 一次点击开始
- **WHEN** 用户在首页点击任一学科卡片
- **THEN** 立即进入该学科的做题页面并渲染第一题

### Requirement: 一句话多填空渲染

系统 SHALL 解析题干中的挖空标记并渲染为行内控件，支持一题 1~N 个空且不破坏句子阅读流。
解析语法：`{{答案}}` 单答案；`{{答案1|答案2}}` 多候选答案；`{{答案~提示}}` 附带提示；`\{\{` 转义为字面量 `{{`。

#### Scenario: 多空题干
- **WHEN** 题干为 `细胞是生物体结构和{{功能}}的基本单位，由{{施莱登|施莱登和施旺}}提出。`
- **THEN** 页面渲染出 2 个可交互空位，答案与提示按语法解析，句子其余文本保持不变

#### Scenario: 解析异常可定位
- **WHEN** 题库 JSON 中某题 `{{}}` 未闭合或结构非法
- **THEN** 控制台输出包含题目 id 的错误信息，页面不白屏，该题被跳过

### Requirement: 双模式作答

系统 SHALL 提供两种作答模式，默认模式可在设置中配置，做题页可一键切换且不丢失当前作答。
- 遮罩模式：空位为白色圆角遮罩块，点击后 180ms 淡出揭示答案，随后仅出现「没记住」一个按钮；未标记的空默认视为「记住了」。
- 输入模式：空位为行内输入框，自动聚焦第一个空，`Enter` 跳到下一个空，最后一个空提交；提交后空位变只读。

#### Scenario: 遮罩模式自评
- **WHEN** 用户点击遮罩揭示答案并选择「没记住」
- **THEN** 该空记录为错误，并计入错题与调度

#### Scenario: 未标记直接完成自评
- **WHEN** 遮罩模式下用户未标记任何空就点击「完成自评」
- **THEN** 所有空视为「记住了」，全部记为正确

### Requirement: 答案标准化比对

系统 SHALL 在判定前对用户输入与候选答案做归一化：去首尾空白 → 全角转半角 → 中文标点转英文 → 移除全部空白 → 英文小写 → 与候选数组任一完全匹配即判对。

#### Scenario: 格式差异不误判
- **WHEN** 标准答案为 `ATP`，用户输入 ` atp ` 或 `ＡＴＰ`
- **THEN** 判为正确

#### Scenario: 语义错误判错并给答案
- **WHEN** 标准答案为 `细胞膜`，用户输入 `细胞模`
- **THEN** 判为错误，显示 ✗ 与该空正确答案，若题目有 `explain` 则一并展示

### Requirement: 记忆与错题系统

系统 SHALL 以「题 → 空」为粒度持久化学习记录到 `localStorage`（键 `recaller:progress:v1`，含 `schemaVersion`），并实现：
- 每空记录 `right / wrong / streak / lastResult / ease / interval / dueAt`；
- 题目派生 `mastery`（0~1）与 `isWeak`（任一空掌握度 < 0.5）；
- SM-2 简化调度：答对 `interval = 1 → 3 → interval × ease`；答错 `interval = 0`、`ease -= 0.2`（下限 1.3）；间隔施加 ±5%（至少 ±1 天）抖动；
- 抽题采用加权随机：答对权重衰减、答错权重回弹、久未复习权重回升；在优先池内轮盘赌选取，并混入少量新题；
- 同一题在一次会话中默认只出现一次；
- 错题本列出全部 `isWeak` 题，支持「只练错题」；首页显示「今日待复习 N 题」。

#### Scenario: 错题被记住
- **WHEN** 用户答错某题并刷新页面后重新进入该学科
- **THEN** 该题仍出现在错题本中，且复习队列优先安排

#### Scenario: 到期优先
- **WHEN** 部分题 `dueAt <= now`，另一部分未到期
- **THEN** 「今日待复习」队列只包含到期题目，并按逾期时长降序排列

### Requirement: 会话与结算

系统 SHALL 在一次做题会话中显示进度（如 `3/20`），支持跳过与上一题回看（回看不改判分）；会话结束展示正确率、用时、本次新增错题数，并提供「再练错题 / 返回首页」。

#### Scenario: 会话结算
- **WHEN** 用户完成队列中最后一题
- **THEN** 跳转结算页并展示本次正确率与新增错题数

### Requirement: 数据导入导出

系统 SHALL 在设置页提供进度 JSON 的导出与导入、清空进度（二次确认），并保留默认作答模式、提示开关等设置项。

#### Scenario: 迁移后数据一致
- **WHEN** 用户导出进度 → 清空 → 再导入同一文件
- **THEN** 错题、掌握度、调度时间与导出前完全一致

### Requirement: 视觉规范

系统 SHALL 采用全圆角与纯白主基调：页面背景 `#F7F8FA`、卡片 `#FFFFFF` + 轻阴影、无硬边框；卡片圆角 20px、按钮 16px、图标容器与输入框胶囊化 9999px；按钮底色为白色混入 8%~14% 主题色（`color-mix`，并对不支持的浏览器用 `@supports` 回退到等价 `rgba`）。

#### Scenario: 移动端不溢出
- **WHEN** 视口宽度为 375px
- **THEN** 页面无横向滚动，卡片与按钮保持圆角与白掺色效果

### Requirement: 部署与路由

系统 SHALL 使用 Hash 路由以避免 GitHub Pages 的 SPA 回退问题，Vite `base` 配置为 `/<repo-name>/`，题库通过 `import.meta.env.BASE_URL` 拼接相对路径运行时加载，并提供 GitHub Actions 自动构建发布到 GitHub Pages。

#### Scenario: 刷新不 404
- **WHEN** 用户直接访问或刷新 `#/quiz/biology`
- **THEN** 页面正常加载，不出现 404

#### Scenario: 改题库免改代码
- **WHEN** 仅修改 `public/data/biology.json` 并提交
- **THEN** 自动部署后新题库生效，无需改动源码
