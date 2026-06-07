import type WikiDashboardPlugin from "../../main";
import { TFile } from "obsidian";

/**
 * 任务 Tab — LifeOS 日报集成
 * 支持 Obsidian Tasks 插件 emoji 格式：📅 日期 / ⏫🔼🔽 优先级 / ✅ 完成
 * 日报 = 每日日记文件
 */
export async function renderTasksTab(container: HTMLElement, plugin: WikiDashboardPlugin) {
    const vault = plugin.app.vault;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const dailyPath = `周期笔记/${y}-${m}-${d}.md`;
    const todayStr = `${y}-${m}-${d}`;

    // ── 日报标题 ──
    const dailyHeader = container.createDiv({ cls: "wd-section wd-task-add-section" });
    const dhRow = dailyHeader.createDiv({ cls: "wd-task-header-row" });
    dhRow.createDiv({ text: "📋 日报", cls: "wd-section-title" });
    dhRow.createSpan({ text: todayStr, cls: "wd-date" });

    // ── 快速添加 ──
    const addRow = dailyHeader.createDiv({ cls: "wd-task-add-row" });
    const addInput = addRow.createEl("input", {
        type: "text",
        placeholder: "添加任务…",
        cls: "wd-digest-input wd-task-add-input",
    });

    // 优先级选择
    const prioSelect = addRow.createEl("select", { cls: "wd-task-target-select" });
    prioSelect.createEl("option", { text: "无优先级", value: "" });
    prioSelect.createEl("option", { text: "⏫ 高", value: "⏫" });
    prioSelect.createEl("option", { text: "🔼 中", value: "🔼" });
    prioSelect.createEl("option", { text: "🔽 低", value: "🔽" });

    // 截止日
    const dueInput = addRow.createEl("input", {
        type: "date",
        cls: "wd-task-due-input",
    });
    dueInput.value = todayStr;

    const onAdd = async () => {
        const text = addInput.value.trim();
        if (!text) return;

        addInput.value = "";
        addInput.placeholder = "已添加！继续…";

        // 构建 emoji 格式的任务行
        let line = `- [ ] ${text}`;
        const prio = prioSelect.value;
        if (prio) line += ` ${prio}`;
        const due = dueInput.value;
        if (due) line += ` 📅 ${due}`;
        line += "\n";

        // 写入日报
        const file = vault.getAbstractFileByPath(dailyPath);
        if (file instanceof TFile) {
            await vault.append(file, line);
        } else {
            await vault.create(dailyPath, `# ${todayStr}\n\n${line}`);
        }

        setTimeout(() => {
            addInput.placeholder = "添加任务…";
            container.empty();
            renderTasksTab(container, plugin);
        }, 400);
    };

    addInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") onAdd();
    });

    const addBtn = addRow.createEl("button", { text: "添加", cls: "wd-btn wd-btn-fill" });
    addBtn.addEventListener("click", onAdd);

    // ── 日报任务列表 ──
    const todaySection = container.createDiv({ cls: "wd-section" });
    const todayBody = todaySection.createDiv({ cls: "wd-section-body" });

    const dailyFile = vault.getAbstractFileByPath(dailyPath);
    const tasks = await extractAllTasks(vault, dailyFile);

    if (tasks.length === 0) {
        todayBody.createDiv({ text: "日报暂无任务", cls: "wd-empty" });
    } else {
        const doneCount = tasks.filter(t => t.done).length;
        const total = tasks.length;

        // 进度条
        const barRow = todayBody.createDiv({ cls: "wd-task-bar-row" });
        const bar = barRow.createDiv({ cls: "wd-task-bar" });
        bar.createDiv({ cls: "wd-task-bar-fill", attr: { style: `width:${Math.round((doneCount / total) * 100)}%` } });
        barRow.createDiv({ text: `${doneCount}/${total}`, cls: "wd-task-bar-num" });

        // 任务列表
        const list = todayBody.createDiv({ cls: "wd-task-list" });
        for (const task of tasks) {
            const item = list.createDiv({ cls: `wd-task-item${task.done ? " is-done" : ""}` });

            const check = item.createSpan({ cls: `wd-task-check${task.done ? " is-checked" : ""}` });
            check.setText(task.done ? "✓" : "○");

            // 任务文本 + 元信息
            const contentSpan = item.createSpan({ cls: "wd-task-content" });
            contentSpan.createSpan({ text: task.text, cls: "wd-task-text" });
            if (task.priority) {
                contentSpan.createSpan({ text: task.priority, cls: "wd-task-meta" });
            }
            if (task.due) {
                contentSpan.createSpan({ text: `📅 ${task.due}`, cls: "wd-task-meta" });
            }

            // 点击切换完成状态
            item.addEventListener("click", async () => {
                if (!(dailyFile instanceof TFile)) return;
                const content = await vault.read(dailyFile);
                const originalLine = task.raw;
                const toggledLine = task.done
                    ? originalLine.replace(/- \[x\]/, "- [ ]")
                    : originalLine.replace(/- \[ \]/, "- [x]");

                const newContent = content.replace(originalLine, toggledLine);
                await vault.modify(dailyFile, newContent);
                container.empty();
                await renderTasksTab(container, plugin);
            });
        }
    }

    // ── 全部未完成任务 ──
    const allSection = container.createDiv({ cls: "wd-section" });
    allSection.createDiv({ text: "全部未完成", cls: "wd-section-title" });
    const allBody = allSection.createDiv({ cls: "wd-section-body" });

    const allFiles = vault.getMarkdownFiles()
        .filter(f => !f.path.startsWith(".obsidian/") && !f.path.startsWith("raw/"));
    const allOpen: Array<{ text: string; file: string; priority: string; due: string }> = [];

    for (const file of allFiles.slice(0, 250)) {
        const openTasks = await extractOpenTasks(vault, file);
        for (const t of openTasks) {
            allOpen.push({ ...t, file: file.path });
        }
        if (allOpen.length >= 40) break;
    }

    if (allOpen.length === 0) {
        allBody.createDiv({ text: "🎉 所有任务已完成", cls: "wd-empty" });
    } else {
        const list = allBody.createDiv({ cls: "wd-task-list" });
        for (const task of allOpen.slice(0, 30)) {
            const item = list.createDiv({ cls: "wd-task-item" });
            item.createSpan({ text: "○", cls: "wd-task-check" });

            const contentSpan = item.createSpan({ cls: "wd-task-content" });
            contentSpan.createSpan({ text: task.text, cls: "wd-task-text" });
            if (task.priority) contentSpan.createSpan({ text: task.priority, cls: "wd-task-meta" });
            if (task.due) contentSpan.createSpan({ text: `📅 ${task.due}`, cls: "wd-task-meta" });

            // 文件来源
            const fname = task.file.replace(/\.md$/, "").split("/").pop() || task.file;
            item.createSpan({ text: fname, cls: "wd-task-file-ref" });

            item.addEventListener("click", () => {
                plugin.app.workspace.openLinkText(task.file, "", false);
            });
        }
    }
}

// ── 解析任务（含 emoji 元数据） ──

interface ParsedTask {
    text: string;
    done: boolean;
    priority: string;
    due: string;
    raw: string;   // 原始行，用于替换
}

async function extractAllTasks(vault: import("obsidian").Vault, file: import("obsidian").TAbstractFile | null): Promise<ParsedTask[]> {
    if (!(file instanceof TFile)) return [];
    const content = await vault.read(file);
    return parseTaskLines(content);
}

async function extractOpenTasks(vault: import("obsidian").Vault, file: TFile): Promise<Array<{ text: string; priority: string; due: string }>> {
    const content = await vault.read(file);
    const all = parseTaskLines(content);
    return all.filter(t => !t.done).map(t => ({ text: t.text, priority: t.priority, due: t.due }));
}

function parseTaskLines(content: string): ParsedTask[] {
    return content.split("\n")
        .map(line => {
            const raw = line;
            const m = line.match(/^\s*- \[(.)\] (.+)$/);
            if (!m) return null;

            const done = m[1] !== " ";
            let rest = m[2].trim();

            // 提取优先级 emoji
            let priority = "";
            const prioMatch = rest.match(/^(⏫|🔼|🔽)\s*/);
            if (prioMatch) {
                priority = prioMatch[1];
                rest = rest.slice(prioMatch[0].length);
            }

            // 提取截止日 📅 YYYY-MM-DD
            let due = "";
            const dueMatch = rest.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
            if (dueMatch) {
                due = dueMatch[1];
                rest = rest.replace(dueMatch[0], "").trim();
            }

            const text = rest.trim();
            return { text, done, priority, due, raw };
        })
        .filter(Boolean) as ParsedTask[];
}
