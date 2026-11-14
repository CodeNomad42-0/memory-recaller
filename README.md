# Recaller

一句话多填空的知识点主动回忆工具。纯静态 SPA，可直接托管在 GitHub Pages。

## 功能

- 首页学科卡片，**一次点击**直接进入做题
- 两种作答模式：遮罩揭示（自评）与手动输入（自动校对）
- 题干支持 `{{答案}}` 挖空，1~N 个空
- 输入答案自动归一化：忽略空格、全角半角、中英文标点、英文大小写
- 按「题 → 空」记录正确率，错题本、掌握度与 SM-2 到期复习
- 加权随机抽题：错题权重回弹、久未复习权重回升、混入新题
- 答错高频复习：答错或未记住的题立即回到待复习池，权重按次递增（上限 3.0）；全部模式前 3 题优先薄弱与到期题
- 学习统计：首次记忆成功率、遗忘率，以及最近 14 天「每日首次记忆成功」折线图
- 题库工坊：导出 Word 练习卷，或粘贴文本自建题库
- 20 题打卡成就：单次练习达到 20 题时，结果页展示打卡成就
- 进度存 localStorage，可导出 / 导入 JSON 备份

## 开发

```bash
npm install
npm run dev          # 本地开发
npm run build        # 类型检查 + 构建到 dist/
npm run build:single # 打包成单个自包含 HTML（dist-single/index.html）
npm run preview      # 预览构建产物
npm run lint:data    # 校验 public/data 下的题库 JSON
node scripts/verify-scheduler.mjs  # 校验抽题队列与权重调度（直接运行 .ts，需 Node 22.6+）
```

`verify-scheduler.mjs` 会跑数百次模拟会话，断言权重封顶与衰减、薄弱题命中率优势、队列长度与会话内去重、到期范围只含到期题。改动 `src/core/queue.ts` 或调度逻辑后建议执行一次。

单文件产物把 JS、CSS 与全部题库内联进一个 `index.html`，可离线双击打开，不需要本地服务器。

## 部署到 GitHub Pages

仓库 Settings → Pages → Source 选择 **GitHub Actions**，推送到 `main` 即自动部署。
工作流会用 `VITE_BASE=/<仓库名>/` 构建，确保子路径下资源不 404。

## 题库格式

`public/data/index.json`：

```json
{
  "schemaVersion": 1,
  "subjects": [
    {
      "id": "biology",
      "name": "生物",
      "desc": "高中生物必修一",
      "icon": "dna",
      "accent": "#5DBFA0",
      "file": "biology.json",
      "questionCount": 8
    }
  ]
}
```

可用图标 `icon`：`dna`、`flask`、`scroll`。

学科题库 `public/data/biology.json`：

```json
{
  "schemaVersion": 1,
  "subject": "biology",
  "chapters": [{ "id": "ch1", "name": "第一章" }],
  "questions": [
    {
      "id": "bio-ch1-001",
      "chapter": "ch1",
      "difficulty": 1,
      "stem": "细胞是生物体结构和{{功能}}的基本单位。",
      "blanks": [{ "hint": "两个字" }],
      "explain": "细胞是生命活动的基本单位。"
    }
  ]
}
```

### 挖空语法

| 写法 | 含义 |
|---|---|
| `{{功能}}` | 单个标准答案 |
| `{{施莱登\|施莱登和施旺}}` | 多个可接受答案，任一匹配即判对 |
| `{{功能~两个字}}` | 附带提示，`~` 之后为提示 |
| `\{\{` / `\}\}` | 输出字面量 `{{` / `}}` |

`blanks[i].hint` 也会作为第 i 个空的提示；题干内联的 `~提示` 优先级更高。
`blanks` 数量与挖空数量不一致时，`npm run lint:data` 会给出提示。

### 空模板

```json
{
  "schemaVersion": 1,
  "subject": "your-subject",
  "chapters": [{ "id": "ch1", "name": "第一章" }],
  "questions": [
    {
      "id": "sub-ch1-001",
      "chapter": "ch1",
      "difficulty": 1,
      "stem": "在这里写一句话，并用{{答案}}标出要挖空的位置。",
      "blanks": [{ "hint": "可选提示" }],
      "explain": "可选解析，答错时展示。"
    }
  ]
}
```

新增学科：在 `public/data/` 放一个题库文件，并在 `index.json` 的 `subjects` 中登记。修改题库只需提交 JSON，无需改动源码。

### 自建题库（页面内）

首页「题库工坊」→「自建题库」（`#/studio?tab=bank`）可直接粘贴固定文本格式，适合临时错题或个人资料：

```text
# 学科: 高中化学错题
# 描述: 自建题库（可选）
## 章节: 基础概念
细胞的能量货币是{{ATP}}。
光合作用的场所是{{叶绿体~细胞器}}。
```

- `# 学科:` 必填，同一份文本只写一次；`# 描述:` 可选
- `## 章节:` 可选、可多次出现，其后的题目归入该章节；未声明时归入「默认章节」
- 其余每个非空行都是一道题，必须含 `{{答案}}`，同样支持 `{{答案1|答案2}}` 与 `{{答案~提示}}`
- 保存前会在页面内逐行校验（缺少学科、缺少挖空、标记未闭合、题目重复等），不通过时按行号提示
- 自建题库存于浏览器 `localStorage` 的 `recaller:banks:v1`，保存后会作为学科卡片出现在首页；在设置页清空学习进度**不会**删除自建题库，删除请在工坊内操作

### 导出 Word

「题库工坊」→「导出 Word」提供两种抽取模式：

| 模式 | 抽题范围 |
|---|---|
| 全部题库 | 按学科与题目顺序导出全部含挖空的题目 |
| 智能筛选 | 按勾选来源抽题，题量可设 1~200，不足时不重复填充 |

智能筛选的来源可多选：**易错**（答错过或掌握度偏低，按错误次数降序）、**答错**（其余曾答错的题）、**随机**（未作答或掌握良好的普通题随机打乱）。导出的 `.docx` 为 A4、2.54cm 页边距、1.5 倍行距，正文是连续的「综合填空」大题，文档末尾另起一页附参考答案（同一空的候选答案用 ` / ` 连接）。

## 数据与隐私

学习进度只写入当前浏览器的 `localStorage`（键 `recaller:progress:v1`），不上传任何服务器。换设备前请在设置页导出 JSON 备份。
