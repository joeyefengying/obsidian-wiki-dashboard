import type WikiDashboardPlugin from "../../main";

// 插件能力分类映射（按插件 ID）
const PLUGIN_CATEGORIES: Record<string, { cat: string; desc: string; trigger: string }> = {
    // 核心插件
    "file-explorer":    { cat: "导航", desc: "文件浏览器", trigger: "左侧栏" },
    "global-search":    { cat: "搜索", desc: "全局搜索", trigger: "Ctrl+Shift+F" },
    "switcher":         { cat: "导航", desc: "快速切换笔记", trigger: "Ctrl+O" },
    "graph":            { cat: "可视化", desc: "关系图谱", trigger: "Ctrl+G" },
    "backlink":         { cat: "导航", desc: "反向链接", trigger: "右侧栏" },
    "canvas":           { cat: "可视化", desc: "白板画布", trigger: "命令面板" },
    "outgoing-link":    { cat: "导航", desc: "出链面板", trigger: "右侧栏" },
    "tag-pane":         { cat: "导航", desc: "标签面板", trigger: "右侧栏" },
    "properties":       { cat: "笔记编辑", desc: "属性/YAML 编辑", trigger: "文件顶部" },
    "daily-notes":      { cat: "周期笔记", desc: "日记", trigger: "左侧栏日历图标" },
    "templates":        { cat: "笔记编辑", desc: "模板插入", trigger: "左侧栏" },
    "note-composer":    { cat: "笔记编辑", desc: "笔记合并/拆分", trigger: "命令面板" },
    "command-palette":  { cat: "系统", desc: "命令面板", trigger: "Ctrl+P" },
    "bookmarks":        { cat: "导航", desc: "书签", trigger: "左侧栏" },
    "outline":          { cat: "导航", desc: "大纲/目录", trigger: "右侧栏" },
    "word-count":       { cat: "笔记编辑", desc: "字数统计", trigger: "右下角" },
    "workspaces":       { cat: "系统", desc: "工作区布局", trigger: "左侧栏" },
    "sync":             { cat: "系统", desc: "Obsidian Sync", trigger: "设置" },
    "bases":            { cat: "可视化", desc: "数据库视图", trigger: "右键文件夹" },
    "random-note":      { cat: "导航", desc: "随机笔记", trigger: "命令面板" },
    "file-recovery":    { cat: "系统", desc: "文件恢复/历史", trigger: "命令面板" },

    // 社区插件
    "dataview":                { cat: "查询", desc: "用代码查询笔记生成列表/表格", trigger: "```dataview 代码块" },
    "omnisearch":              { cat: "搜索", desc: "模糊搜索（支持拼音）", trigger: "Ctrl+Shift+F" },
    "templater-obsidian":      { cat: "模板", desc: "高级模板引擎（JS 脚本）", trigger: "Alt+Ctrl+`" },
    "quickadd":                { cat: "自动化", desc: "快速添加/宏/自动化工作流", trigger: "命令面板" },
    "obsidian-tasks-plugin":   { cat: "任务", desc: "任务管理（日期/优先级/查询）", trigger: "```tasks 代码块" },
    "periodic-para":           { cat: "周期笔记", desc: "LifeOS：日记+周记+PARA 项目", trigger: "左侧栏日历" },
    "obsidian-excalidraw-plugin": { cat: "可视化", desc: "手绘风格绘图/图表", trigger: "命令面板" },
    "obsidian-git":            { cat: "系统", desc: "Git 自动备份/同步", trigger: "Ctrl+P → 备份" },
    "obsidian-outliner":       { cat: "笔记编辑", desc: "大纲列表编辑增强", trigger: "编辑器中自动" },
    "editing-toolbar":         { cat: "笔记编辑", desc: "格式工具栏", trigger: "编辑区顶部" },
    "obsidian-icon-folder":    { cat: "美化", desc: "文件夹图标", trigger: "右键文件夹" },
    "obsidian-style-settings": { cat: "美化", desc: "主题样式微调", trigger: "设置 → 样式设置" },
    "tag-wrangler":            { cat: "笔记编辑", desc: "标签批量重命名/管理", trigger: "右键标签" },
    "note-refactor-obsidian":  { cat: "笔记编辑", desc: "笔记拆分/提取", trigger: "选中文本 → 命令" },
    "recent-files-obsidian":   { cat: "导航", desc: "最近文件列表", trigger: "Ctrl+E" },
    "darlal-switcher-plus":    { cat: "搜索", desc: "增强型切换器（标题/标签）", trigger: "Ctrl+O" },
    "folder-note-plugin":      { cat: "笔记编辑", desc: "文件夹笔记（点文件夹打开）", trigger: "点击文件夹" },
    "obsidian-markmind":       { cat: "可视化", desc: "思维导图", trigger: "命令面板" },
    "notebook-navigator":      { cat: "导航", desc: "笔记本导航器", trigger: "Ctrl+N" },
    "obsidian-timelines":      { cat: "可视化", desc: "时间线视图", trigger: "```timeline 代码块" },
    "obsidian-admonition":     { cat: "笔记编辑", desc: "Callout 增强", trigger: "```ad- 代码块" },
    "url-into-selection":      { cat: "笔记编辑", desc: "选中文字粘贴 URL 自动转链接", trigger: "Ctrl+V" },
    "highlightr-plugin":       { cat: "笔记编辑", desc: "高亮颜色", trigger: "选中 → 右键" },
    "better-word-count":       { cat: "笔记编辑", desc: "增强字数统计（中文/选区）", trigger: "右下角" },
    "obsidian-pangu":          { cat: "美化", desc: "中英文自动加空格", trigger: "保存时自动" },
    "table-editor-obsidian":   { cat: "笔记编辑", desc: "表格编辑器", trigger: "编辑表格时自动" },
    "table-extended":          { cat: "笔记编辑", desc: "表格增强（公式等）", trigger: "编辑表格时自动" },
    "cm-editor-syntax-highlight-obsidian": { cat: "美化", desc: "编辑区代码语法高亮", trigger: "编辑器中自动" },
    "obsidian-codemirror-options": { cat: "美化", desc: "编辑器选项", trigger: "自动" },
    "obsidian-emoji-toolbar":  { cat: "笔记编辑", desc: "Emoji 选择器", trigger: "编辑器中" },
    "fuzzy-chinese-pinyin":    { cat: "搜索", desc: "拼音搜索文件", trigger: "Ctrl+O 中自动" },
    "obsidian-image-toolkit":  { cat: "美化", desc: "图片查看/缩放", trigger: "点击图片" },
    "image-converter":         { cat: "美化", desc: "图片自动转本地/压缩", trigger: "粘贴图片时" },
    "obsidian-copy-block-link":{ cat: "笔记编辑", desc: "复制块链接", trigger: "右键段落" },
    "remember-cursor-position":{ cat: "笔记编辑", desc: "记住光标位置", trigger: "自动" },
    "better-fn":               { cat: "笔记编辑", desc: "脚注增强", trigger: "编辑器中" },
    "nldates-obsidian":        { cat: "笔记编辑", desc: "自然语言日期", trigger: "@today → 日期" },
    "open-in-terminal":        { cat: "系统", desc: "在终端中打开文件夹", trigger: "右键文件夹" },
    "terminal":                { cat: "系统", desc: "内置终端", trigger: "命令面板" },
    "markdown-prettifier":     { cat: "美化", desc: "Markdown 格式化", trigger: "命令面板" },
    "mrj-text-expand":         { cat: "笔记编辑", desc: "文本展开/搜索替换", trigger: "编辑器中" },
    "obsidian-image-auto-upload-plugin": { cat: "美化", desc: "图片自动上传", trigger: "粘贴图片时" },
    "obsidian42-brat":         { cat: "系统", desc: "Beta 插件安装/更新", trigger: "设置" },
    "discordian-plugin":       { cat: "美化", desc: "Discordian 主题增强", trigger: "自动" },
    "claude-sidebar":          { cat: "AI 助手", desc: "Claude AI 侧边栏", trigger: "命令面板" },
    "claude-code-integration": { cat: "AI 助手", desc: "Claude Code 集成", trigger: "命令面板" },
    "better-search-views":     { cat: "搜索", desc: "增强搜索结果视图", trigger: "搜索时自动" },
    "wiki-dashboard":          { cat: "系统", desc: "知识库仪表盘（本插件）", trigger: "Ctrl+P → 仪表盘" },
};

const CAT_ORDER = ["导航", "搜索", "笔记编辑", "任务", "周期笔记", "模板", "查询", "自动化", "可视化", "AI 助手", "美化", "系统"];

/**
 * 能力 Tab — 已安装插件功能索引
 */
export async function renderCapabilitiesTab(container: HTMLElement, plugin: WikiDashboardPlugin) {
    container.empty();

    // 读取已启用的社区插件
    const communityPlugins: string[] = (plugin.app as any).plugins?.enabledPlugins
        ? Array.from((plugin.app as any).plugins.enabledPlugins?.keys?.() ?? [])
        : [];

    // 读取已启用的核心插件
    const corePlugins: string[] = [];
    const config = (plugin.app as any).internalPlugins?.plugins ?? {};
    for (const [id, p] of Object.entries(config)) {
        if ((p as any)?._enabled) corePlugins.push(id);
    }

    const allEnabled = [...corePlugins, ...communityPlugins];

    // 按分类归组
    const grouped: Record<string, Array<{ id: string; desc: string; trigger: string }>> = {};
    for (const id of allEnabled) {
        const info = PLUGIN_CATEGORIES[id];
        if (!info) continue;
        if (!grouped[info.cat]) grouped[info.cat] = [];
        // 避免重复
        if (!grouped[info.cat].find(x => x.id === id)) {
            grouped[info.cat].push({ id, desc: info.desc, trigger: info.trigger });
        }
    }

    // 按顺序渲染
    let totalShown = 0;
    for (const cat of CAT_ORDER) {
        const items = grouped[cat];
        if (!items || items.length === 0) continue;

        const section = container.createDiv({ cls: "wd-section" });
        section.createDiv({ text: cat, cls: "wd-section-title" });
        const body = section.createDiv({ cls: "wd-section-body" });
        const list = body.createDiv({ cls: "wd-cap-list" });

        for (const item of items) {
            const row = list.createDiv({ cls: "wd-cap-row" });
            row.createSpan({ text: item.desc, cls: "wd-cap-desc" });
            row.createSpan({ text: item.trigger, cls: "wd-cap-trigger" });
            totalShown++;
        }
    }

    // 底部统计
    const footer = container.createDiv({ cls: "wd-section" });
    footer.createDiv({
        text: `共 ${allEnabled.length} 个已启用插件，${totalShown} 条能力已收录`,
        cls: "wd-empty",
    });
}
