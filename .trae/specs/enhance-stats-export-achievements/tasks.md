# Tasks

- [x] Task 1: 学习统计的数据模型与采集
  - [x] SubTask 1.1: 扩展 `src/core/types.ts`：新增 `DailyStat`（date / attempts / correct / firstAttempts / firstCorrect / reviews / forgotten），`ProgressState.daily: Record<string, DailyStat>`
  - [x] SubTask 1.2: `src/core/storage.ts` 升级 `SCHEMA_VERSION = 2`，`normalizeProgress` 为旧存档补齐 `daily: {}`，保持键名与导入导出格式不变
  - [x] SubTask 1.3: 新增 `src/core/stats.ts`：按本地日期取键、写入当日统计、计算累计首次记忆成功率 / 遗忘率、生成最近 14 天序列
  - [x] SubTask 1.4: `src/stores/progress.ts` 的 `applyResult` 采集统计（依据该空是否首次作答区分首次 / 复习）

- [x] Task 2: 统计页面与每日折线图
  - [x] SubTask 2.1: 新增 `src/components/DailyLineChart.vue`（纯 SVG 折线图，含日期轴、数值点、空状态）
  - [x] SubTask 2.2: 新增 `src/pages/StatsPage.vue`：指标卡（首次记忆成功率、遗忘率、今日首次记忆成功、今日待复习）+ 折线图 + 口径说明
  - [x] SubTask 2.3: 注册 `/stats` 路由，首页新增统计入口

- [x] Task 3: 自建题库
  - [x] SubTask 3.1: 新增 `src/core/customBank.ts`：固定文本格式解析（`# 学科:` / `# 描述:` / `## 章节:` / 题目行），带行号校验，生成 `QuestionBank` 与学科元信息
  - [x] SubTask 3.2: 自建题库读写 `recaller:banks:v1`（列表 / 保存 / 删除），生成 `custom-<id>` 文件名
  - [x] SubTask 3.3: `src/core/data.ts` 合并内置学科与自建学科，`custom:` 前缀从本地读取，创建/删除后失效缓存
  - [x] SubTask 3.4: 新增 `src/pages/StudioPage.vue` 的「自建题库」页签：格式说明、文本域、校验错误列表、实时预览、保存与删除操作

- [x] Task 4: Word 导出
  - [x] SubTask 4.1: 安装 `docx` 依赖，新增 `src/core/docxExport.ts`：按 spec 固定格式生成文档（标题 / 副标题 / 综合大题 / 连续题号 / 下划线空格 / 答案页）
  - [x] SubTask 4.2: 实现选题逻辑：全部题库 / 智能筛选（易错 → 答错 → 随机普通），支持来源开关与目标题量
  - [x] SubTask 4.3: `StudioPage.vue` 的「导出 Word」页签：模式切换、来源勾选、题量设置、导出数量提示、下载 .docx

- [x] Task 5: 抽卡算法优化
  - [x] SubTask 5.1: `src/core/queue.ts`：答错权重按次递增（上限 3.0），全部模式前 3 题优先薄弱/到期题
  - [x] SubTask 5.2: 确认答错/未记住立即进入待背诵池，`due` 范围与首页待复习计数一致
  - [x] SubTask 5.3: 新增 `scripts/verify-scheduler.mjs` 模拟多轮作答，输出薄弱题与普通题命中率对比并断言薄弱题更高

- [x] Task 6: 20 题打卡成就模块
  - [x] SubTask 6.1: 新增 `src/components/AchievementPanel.vue`（徽章、文案、题数/正确率/用时、CSS 动画、`prefers-reduced-motion` 降级）
  - [x] SubTask 6.2: `ResultPage.vue` 在 `result.total >= 20` 时展示成就模块，原有内容与按钮保持不变

- [x] Task 7: UI 与交互打磨
  - [x] SubTask 7.1: `tokens.css` / `base.css` 增补阴影、焦点环、过渡与卡片悬浮态，统一新页面样式
  - [x] SubTask 7.2: `AppIcon.vue` 增补统计、工坊、导出、导入、成就等图标
  - [x] SubTask 7.3: 优化首页入口区、练习页题间切换过渡与进度条、按钮禁用/加载反馈

- [x] Task 8: 验证与交付
  - [x] SubTask 8.1: `npm run lint:data`、`npm run build`、`npm run build:single` 全部通过
  - [x] SubTask 8.2: 浏览器验收：统计指标随答题变化、折线图渲染、自建题库可练习、Word 可下载打开、20 题成就出现
  - [x] SubTask 8.3: 更新 README 与题库规范说明（新增自建题库格式与导出说明）

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 与 Task 2 可并行
- Task 4 依赖 Task 3（需读取自建题库）
- Task 5 独立，可与 Task 1–4 并行
- Task 6 依赖 Task 1（会话结果字段已存在，仅需统计口径确认）
- Task 7 依赖 Task 2、3、4、6 的页面就位
- Task 8 依赖前述全部任务
