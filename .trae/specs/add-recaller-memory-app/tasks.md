# Tasks

- [x] Task 1: 生成 `agent.md` 计划文档（「功能规格逐条展开」+「任务清单与验收标准」两部分）
  - [x] SubTask 1.1: 归档分享对话内容（项目定位、目标用户、核心设计原则）
  - [x] SubTask 1.2: 写入功能栈与技术约束（Vite + Vue 3 + TS、Hash 路由、base 路径、localStorage 版本化、运行时 fetch 题库）
  - [x] SubTask 1.3: 写入页面路由与数据模型示例（index.json / 学科题库 / progress）
  - [x] SubTask 1.4: 写入 UI 规范（圆角、纯白、白掺色按钮、学科配色、反馈色）
  - [x] SubTask 1.5: 写入抽题算法策略（加权随机轮盘赌 + Leitner 优先级 + SM-2 到期队列 + ±5% 抖动）与取舍理由
  - [x] SubTask 1.6: 按 F1~F12 逐条展开功能规格：交互步骤、数据字段、边界情况、异常处理
  - [x] SubTask 1.7: 输出任务清单与验收标准表（任务、依赖、工作量、验收点），与 `tasks.md` 保持一致

- [x] Task 2: 搭建工程骨架与部署流水线
  - [x] SubTask 2.1: 初始化 Vite + Vue 3 + TypeScript 工程，配置 `base: process.env.VITE_BASE ?? './'`
  - [x] SubTask 2.2: 配置 Vue Router Hash 模式，落地 `/`、`/quiz/:subjectId`、`/quiz/:subjectId/result`、`/wrong`、`/settings` 五个路由
  - [x] SubTask 2.3: 建立 `src/styles/tokens.css`（颜色、圆角、阴影、主题色变量）与 `base.css`
  - [x] SubTask 2.4: 编写 `.github/workflows/deploy.yml`，实现 push 自动构建并发布 GitHub Pages
  - [x] 验证：首页可访问；任意 Hash 路由刷新不 404；移动端 375px 无横向滚动（响应式样式：卡片网格 minmax(240px,1fr)、页面 16px 内边距、底部栏窄屏纵向排列）

- [x] Task 3: 数据层与持久化
  - [x] SubTask 3.1: 定义 `src/core/types.ts`（Subject、Question、Blank、Progress、Settings）
  - [x] SubTask 3.2: 编写 `public/data/index.json` 与生物/化学/历史三个学科题库（各 8 题，含 1 空、多空、多候选答案、带提示）
  - [x] SubTask 3.3: 实现题库加载（`import.meta.env.BASE_URL` 拼接，按学科懒加载并缓存）
  - [x] SubTask 3.4: 实现 `storage.ts`：`localStorage` 封装、`schemaVersion` 归一化、进度导出/导入/清空
  - [x] 验证：控制台能读到题库；进度写入后刷新仍在（错题本实测可见）；导入导出往返数据一致（脚本实测 true）

- [x] Task 4: 题干解析与空位渲染
  - [x] SubTask 4.1: 实现 `parser.ts`：`{{答案}}`、`{{答案1|答案2}}`、`{{答案~提示}}`、`\{\{` 转义，输出 文本/空位 片段序列
  - [x] SubTask 4.2: 实现 `QuestionCard.vue` 行内渲染文本与空位，保持句子阅读流
  - [x] SubTask 4.3: 实现 `BlankMask.vue`（点击 180ms 淡出揭示 + 自评按钮）与 `BlankInput.vue`（行内输入框、自动宽度、Enter 跳空）
  - [x] SubTask 4.4: 解析失败时输出含题目 id 的错误并跳过该题，不白屏
  - [x] 验证：多空题干渲染正确；点击揭示正常；Enter 可连续跳空（浏览器实测揭示与自评流程）

- [x] Task 5: 作答闭环与判分
  - [x] SubTask 5.1: 实现 `normalize.ts`（去空白、全角转半角、中文标点归一、英文小写、候选匹配）
  - [x] SubTask 5.2: 实现输入模式提交与逐空反馈（对：浅绿 ✓；错：浅红 ✗ + 正确答案 + `explain`）
  - [x] SubTask 5.3: 实现会话状态机（answering → submitted → finished）、进度显示、跳过、上一题回看
  - [x] SubTask 5.4: 实现点击学科直达做题页，默认模式取自设置
  - [x] 验证：` atp ` / `ＡＴＰ` 判对、`细胞模` 判错（脚本实测）；判错显示正确答案与解析（浏览器实测）

- [x] Task 6: 记忆系统与抽题调度
  - [x] SubTask 6.1: 实现 `scheduler.ts` 的 SM-2 简化调度（interval 1→3→×ease，答错重置、ease 下限 1.3、±5% 抖动至少 ±1 天）
  - [x] SubTask 6.2: 实现按空记录与题目派生 `mastery` / `isWeak`
  - [x] SubTask 6.3: 实现 `queue.ts`：加权随机（答对衰减、答错回弹、久未复习回升）+ 优先池轮盘赌 + 新题混入 + 会话内去重
  - [x] SubTask 6.4: 实现「今日待复习」队列（`dueAt <= now`，按逾期降序）与「只练错题」队列
  - [x] 验证：答错题刷新后仍在错题本（浏览器实测）；到期题优先；队列 20 条无重复（脚本实测）

- [x] Task 7: 业务页面
  - [x] SubTask 7.1: `HomePage.vue`：学科卡片网格（图标、题量、掌握度环、待复习角标）+ 错题本/设置入口
  - [x] SubTask 7.2: `ResultPage.vue`：正确率、用时、新增错题数、「再练错题 / 返回首页」
  - [x] SubTask 7.3: `WrongBookPage.vue`：薄弱题列表与「只练错题」入口
  - [x] SubTask 7.4: `SettingsPage.vue`：默认模式、提示开关、每日目标、导入/导出、清空（二次确认）
  - [x] 验证：首页一次点击进入做题（浏览器实测）；错题本可发起专项练习（链接指向 `?scope=wrong`）

- [x] Task 8: 打磨、校验与文档
  - [x] SubTask 8.1: 补齐加载态、空态、键盘操作（Enter 提交 / Tab 跳空 / 空格揭示遮罩按钮）
  - [x] SubTask 8.2: 编写题库格式说明与空模板到 `README.md`
  - [x] SubTask 8.3: 增加 `npm run lint:data` 脚本校验题库 JSON 结构
  - [x] 验证：`npm run lint:data` 通过；`npm run build` 通过；`dist/data` 包含四份题库

# Task Dependencies

- Task 2 依赖 Task 1（计划文档确认技术栈与目录）
- Task 3 依赖 Task 2（工程骨架与样式变量）
- Task 4 依赖 Task 3（题型数据结构）
- Task 5 依赖 Task 4（空位组件与解析结果）
- Task 6 依赖 Task 3 与 Task 5（进度写入时机、判分结果）
- Task 7 依赖 Task 5 与 Task 6（做题闭环 + 队列数据）
- Task 8 依赖 Task 7（全部页面就绪后统一打磨）
