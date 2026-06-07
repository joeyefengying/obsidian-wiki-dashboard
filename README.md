# Wiki Dashboard

> Obsidian 插件 — 个人知识库仪表盘。专为 llm-wiki 知识库深度用户设计。

## 功能概览

在 Obsidian 右侧栏提供一个一站式仪表盘，聚合你知识库的核心数据和高频操作入口。

### 5 个面板

| 面板 | 位置 | 功能 |
|------|------|------|
| **知识库概览** | 左上 | 实体/主题/素材/综合分析四维统计 + 今日活动 + 最后消化时间 |
| **快速消化** | 右上 | URL/路径输入框 → 一键复制 `/llm-wiki 消化` 命令到剪贴板 |
| **最近动态** | 左中 | 最近修改的 12 个笔记，显示路径和时间，点击直接打开 |
| **快捷操作** | 右中 | 周期笔记跳转（日/周/月）+ 全局搜索 + 知识库维护命令 + 工作流入口 |
| **今日待办** | 右下 | 读取今日日记中的 `- [ ]` 任务，显示进度条和前 8 条待办 |

## 前提条件

- Obsidian ≥ 1.5.0
- 知识库遵循 llm-wiki 目录结构（`wiki/entities/`、`wiki/topics/`、`log.md`、`周期笔记/`）
- 安装了 Omnisearch 插件（快捷搜索按钮依赖它）

## 安装

### 方式一：手动安装（当前方式）

插件已部署到你的 vault：
```
.obsidian/plugins/wiki-dashboard/
├── main.js
├── manifest.json
└── styles.css
```

在 Obsidian 中启用：
1. 打开 **设置 → 社区插件**
2. 点击 **刷新** 按钮（或重启 Obsidian）
3. 在已安装插件列表中找到 **Wiki Dashboard**
4. 点击 **启用**

### 方式二：BRAT 安装

1. 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件
2. BRAT 设置 → Add Beta Plugin → 输入仓库 URL
3. 启用插件

### 方式三：开发模式

```bash
cd E:\project\obsidian-wiki-dashboard
npm install
npm run build
# 产物自动输出到 main.js，已通过 .obsidian/plugins 加载
```

## 使用方式

### 打开仪表盘

三种方式任选其一：

| 方式 | 操作 |
|------|------|
| Ribbon 图标 | 点击左侧栏的 **田字形** 图标 |
| 命令面板 | `Ctrl+P` → 输入「仪表盘」→ 回车 |
| 自动显示 | 首次启用后右侧栏自动出现，之后保持状态 |

仪表盘每 30 秒自动刷新数据，也可点击右上角 🔄 按钮手动刷新。

### 各面板操作指南

#### 知识库概览

- **无需操作**，启动即显示实时统计
- 统计数字来自 vault 文件系统，每次刷新重新计算
- 「最后消化」从 `log.md` 解析最后一条记录日期

#### 快速消化

最常用的面板。工作流：

```
粘贴 URL → 点击「⚡ 消化」→ 命令已复制到剪贴板
→ 切换到 Claude Code 终端 → Ctrl+V 粘贴 → 回车执行
```

按钮说明：

| 按钮 | 复制到剪贴板的内容 | 用途 |
|------|-------------------|------|
| ⚡ 消化 | `/llm-wiki 消化 <你输入的URL>` | 消化外部文章 |
| 📎 原地消化 | `/llm-wiki 原地消化 <你输入的路径>` | 消化 vault 内已有笔记 |
| 📰 AI 资讯 | `看一下今天 AI 圈有什么` | 触发 AI 资讯日报 |

> 输入框支持回车快捷触发消化。

#### 最近动态

- 显示最近修改的 12 个 Markdown 文件
- 每条显示：图标（自动识别文件类型）+ 文件名 + 所在目录 + 修改时间
- **点击任意条目直接打开该文件**

#### 快捷操作

四组操作的快捷入口：

**📅 周期笔记** — 点击直接打开或创建当天的日记/周记/月记

**🔍 搜索与导航** — 打开 Omnisearch 搜索框 / 跳转到知识库索引 / 操作日志

**🛠 知识库维护** — 复制 Claude Code 命令到剪贴板（健康检查 / 深度分析 / 知识图谱）

**👥 工作流** — 复制命令到剪贴板（筛选简历 / 飞书消息）

#### 今日待办

- 读取 `周期笔记/YYYY-MM-DD.md`（今天的日记）
- 解析其中所有 `- [ ]` 和 `- [x]` 格式的任务
- 显示进度条 + 完成数量
- 已完成任务带删除线
- 点击任意任务跳转到今日日记

> 如果今日日记不存在，会显示「创建今日日记」按钮。

## 开发

```bash
# 安装依赖
npm install

# 开发模式（文件变更自动重新构建）
npm run dev

# 生产构建
npm run build
```

构建产物 `main.js` 会自动部署到 `E:\project\obsidian-wiki\.obsidian\plugins\wiki-dashboard\`。

在 Obsidian 中开发调试：
1. 保持 Obsidian 打开
2. 修改源码后运行 `npm run build`
3. Obsidian 中 `Ctrl+P` → 「重新加载」或使用 Hot Reload 插件

## 文件结构

```
obsidian-wiki-dashboard/
├── main.ts                      # 插件入口：注册视图、Ribbon 图标、命令
├── src/
│   ├── dashboard-view.ts        # 主视图类：ItemView 子类，编排 5 个 pane
│   ├── panes/
│   │   ├── stats-pane.ts        # 知识库统计
│   │   ├── digest-pane.ts       # 快速消化（URL 输入 + 命令复制）
│   │   ├── activity-pane.ts     # 最近动态（文件列表）
│   │   ├── shortcuts-pane.ts    # 快捷操作（按钮组）
│   │   └── tasks-pane.ts        # 今日待办（解析日记中的 task）
│   └── utils/
│       └── vault-utils.ts       # 工具函数：文件统计、时间格式化、周期笔记路径
├── styles.css                   # 全景样式（暗/亮双主题 + 响应式 + 动画）
├── manifest.json                # Obsidian 插件清单
├── package.json                 # npm 配置
├── tsconfig.json                # TypeScript 配置
├── esbuild.config.mjs           # esbuild 构建脚本
└── README.md                    # 本文件
```

## 技术栈

- TypeScript + Obsidian API
- esbuild 打包
- 纯 DOM API 渲染（零运行时依赖）
- CSS 变量适配 Obsidian 主题系统

## License

MIT
