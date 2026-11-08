# Recaller

一句话多填空的知识点主动回忆工具。纯静态 SPA，可直接托管在 GitHub Pages。

## 功能

- 首页学科卡片，**一次点击**直接进入做题
- 两种作答模式：遮罩揭示（自评）与手动输入（自动校对）
- 题干支持 `{{答案}}` 挖空，1~N 个空
- 输入答案自动归一化：忽略空格、全角半角、中英文标点、英文大小写
- 按「题 → 空」记录正确率，错题本、掌握度与 SM-2 到期复习
- 加权随机抽题：错题权重回弹、久未复习权重回升、混入新题
- 进度存 localStorage，可导出 / 导入 JSON 备份

## 开发

```bash
npm install
npm run dev          # 本地开发
npm run build        # 类型检查 + 构建到 dist/
npm run build:single # 打包成单个自包含 HTML（dist-single/index.html）
npm run preview      # 预览构建产物
npm run lint:data    # 校验 public/data 下的题库 JSON
```

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

## 数据与隐私

学习进度只写入当前浏览器的 `localStorage`（键 `recaller:progress:v1`），不上传任何服务器。换设备前请在设置页导出 JSON 备份。
