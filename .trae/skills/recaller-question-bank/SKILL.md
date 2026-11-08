---
name: "recaller-question-bank"
description: "Specifies the Recaller question-bank JSON format and editing rules. Invoke when adding subjects, writing or editing files under public/data, or validating question banks with npm run lint:data."
---

# Recaller 题库 JSON 规范

用于在 `public/data/` 下新增或维护题库。数据在运行时通过 `fetch` 加载，改 JSON 即可生效，无需改动源码。

## 目录约定

```
public/data/
├── index.json        # 学科索引，必须存在
├── biology.json      # 学科题库，文件名与 index.json 的 file 字段一致
├── chemistry.json
└── history.json
```

## 1. 学科索引 `public/data/index.json`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `schemaVersion` | number | 是 | 当前固定为 `1` |
| `subjects` | array | 是 | 学科列表，不能为空 |
| `subjects[].id` | string | 是 | 学科唯一标识，作为进度存储的 key，全库不可重复 |
| `subjects[].name` | string | 是 | 首页卡片标题 |
| `subjects[].desc` | string | 是 | 一行副标题 |
| `subjects[].icon` | string | 是 | `dna` / `flask` / `scroll`，其他值回退为圆形占位图标 |
| `subjects[].accent` | string | 是 | 主题色，十六进制，如 `#5DBFA0` |
| `subjects[].file` | string | 是 | 题库文件名，位于 `public/data/` 下 |
| `subjects[].questionCount` | number | 是 | 声明题量，应与题库 `questions.length` 一致（不一致时 `lint:data` 给警告） |

```json
{
  "schemaVersion": 1,
  "subjects": [
    {
      "id": "biology",
      "name": "生物",
      "desc": "高中生物必修一 · 细胞与分子",
      "icon": "dna",
      "accent": "#5DBFA0",
      "file": "biology.json",
      "questionCount": 8
    }
  ]
}
```

## 2. 学科题库 `public/data/<file>`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `schemaVersion` | number | 是 | 固定为 `1` |
| `subject` | string | 是 | 与索引中的学科 `id` 一致 |
| `chapters` | array | 是 | `{ "id": string, "name": string }`，`id` 供题目 `chapter` 引用 |
| `questions` | array | 是 | 题目列表，不能为空 |
| `questions[].id` | string | 是 | 题目唯一标识，同一文件内不可重复；建议 `学科缩写-章节-序号` |
| `questions[].chapter` | string | 是 | 引用 `chapters[].id` |
| `questions[].difficulty` | number | 否 | `1`~`3`，仅展示用 |
| `questions[].stem` | string | 是 | 一句话题干，必须含至少一个 `{{挖空}}` |
| `questions[].blanks` | array | 否 | 按出现顺序为每个空提供 `{ "hint": string }` |
| `questions[].explain` | string | 否 | 解析，答错时展示 |

```json
{
  "schemaVersion": 1,
  "subject": "biology",
  "chapters": [{ "id": "ch1", "name": "第一章 走进细胞" }],
  "questions": [
    {
      "id": "bio-ch1-001",
      "chapter": "ch1",
      "difficulty": 1,
      "stem": "细胞是生物体结构和{{功能}}的基本单位，细胞学说主要由{{施莱登|施莱登和施旺}}与{{施旺}}建立。",
      "blanks": [{ "hint": "两个字" }, { "hint": "人名" }, { "hint": "人名" }],
      "explain": "细胞学说主要建立者是施莱登和施旺。"
    }
  ]
}
```

## 3. 挖空语法

| 写法 | 含义 |
|---|---|
| `{{功能}}` | 单一标准答案 |
| `{{施莱登\|施莱登和施旺}}` | 多候选答案，任一匹配即判对 |
| `{{功能~两个字}}` | `~` 之后为该空提示；优先级高于 `blanks[i].hint` |
| `\{\{` / `\}\}` | 输出字面量 `{{` / `}}`，不产生空位 |

规则：

- 一题支持 1~N 个空，按出现顺序从左到右编号
- 答案中不要写 `{`、`}`；`|` 与 `~` 为保留分隔符
- `blanks` 数量应与挖空数量一致，不一致时 `lint:data` 会警告
- 判分前会归一化：去首尾空格 → 全角转半角 → 中文标点转英文 → 去除所有空白 → 英文小写

## 4. 新增学科步骤

1. 在 `public/data/` 新建 `<file>.json`，按上面的题库结构填写
2. 在 `index.json` 的 `subjects` 追加一项，`file` 指向新文件
3. 运行校验与构建：

```bash
npm run lint:data
npm run build
```

`lint:data` 会检查：JSON 可解析、id 唯一性、`stem` 是否存在挖空、标记是否闭合、每个空是否有答案、`questionCount` 是否与实际题量一致。

## 5. 常见错误

| 现象 | 原因 | 处理 |
|---|---|---|
| 控制台 `[recaller] 题目 xxx 解析失败：挖空标记未闭合` | `{{` 或 `}}` 缺失/嵌套 | 修正标记，需要字面量时写 `\{\{` |
| 该空永远判错 | 答案为空，或只写了提示没写答案 | `~` 前必须有答案 |
| 提示不显示 | 写在了 `~` 之后但位置颠倒 | 正确写法 `{{答案~提示}}` |
| 首页看不到新学科 | 未在 `index.json` 注册 | 追加 `subjects` 项 |
| 题量角标不对 | `questionCount` 未同步 | 改成实际题数 |
