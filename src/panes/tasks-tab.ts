import type WikiDashboardPlugin from "../../main";
import { TFile } from "obsidian";
import { getDailyPath, ensureDailyFile, appendToDailySection } from "../utils/vault-utils";

/**
 * 任务 Tab — LifeOS 日报集成
 * 日报路径：周期笔记/{year}/Daily/{MM}/{YYYY-MM-DD}.md
 * 任务追加到「日常记录」区域
 */
export async function renderTasksTab(container: HTMLElement, plugin: WikiDashboardPlugin) {
    const vault = plugin.app.vault;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const dailyPath = getDailyPath(now);

    // ── 日报标题 ──
    const dailyHeader = container.createDiv({ cls: "wd-section wd-task-add-section" });
    const dhRow = dailyHeader.createDiv({ cls: "wd-task-header-row" });
    dhRow.createDiv({ text: "📋 日报", cls: "wd-section-title" });
    dhRow.createSpan({ text: todayStr, cls: "wd-date" });
    const openDailyBtn = dhRow.createEl("button", { text: "打开源文件 ↗", cls: "wd-btn-sm wd-btn-cmd" });
    openDailyBtn.addEventListener("click", () => {
        plugin.app.workspace.openLinkText(dailyPath, "", false);
    });

    // ── 快速添加 ──
    const addRow = dailyHeader.createDiv({ cls: "wd-task-add-row" });
    const addInput = addRow.createEl("input", {
        type: "text",
        placeholder: "添加任务到日常记录…",
        cls: "wd-digest-input wd-task-add-input",
    });

    const prioSelect = addRow.createEl("select", { cls: "wd-task-target-select" });
    prioSelect.createEl("option", { text: "无优先级", value: "" });
    prioSelect.createEl("option", { text: "⏫ 高", value: "⏫" });
    prioSelect.createEl("option", { text: "🔼 中", value: "🔼" });
    prioSelect.createEl("option", { text: "🔽 低", value: "🔽" });

    const dueInput = addRow.createEl("input", {
        type: "date",
        cls: "wd-task-due-input",
        value: todayStr,
    });

    const onAdd = async () => {
        const text = addInput.value.trim();
        if (!text) return;
        addInput.value = "";
        addInput.placeholder = "已添加！继续…";

        let line = `- [ ] ${text}`;
        const prio = prioSelect.value;
        if (prio) line += ` ${prio}`;
        const due = dueInput.value;
        if (due) line += ` 📅 ${due}`;

        // 确保日报存在
        const file = await ensureDailyFile(vault, dailyPath);
        // 追加到「日常记录」区域
        await appendToDailySection(vault, file, "日常记录", line);

        setTimeout(() => {
            addInput.placeholder = "添加任务到日常记录…";
            container.empty();
            renderTasksTab(container, plugin);
        }, 400);
    };

    addInput.addEventListener("keydown", (e) => { if (e.key === "Enter") onAdd(); });
    addRow.createEl("button", { text: "添加", cls: "wd-btn wd-btn-fill" }).addEventListener("click", onAdd);

    // ── 日报任务列表 ──
    const todaySection = container.createDiv({ cls: "wd-section" });
    const todayBody = todaySection.createDiv({ cls: "wd-section-body" });

    let dailyFile = vault.getAbstractFileByPath(dailyPath);
    if (!(dailyFile instanceof TFile)) {
        dailyFile = await ensureDailyFile(vault, dailyPath);
    }

    const tasks = await extractAllTasks(vault, dailyFile);

    if (tasks.length === 0) {
        todayBody.createDiv({ text: "日报暂无任务", cls: "wd-empty" });
    } else {
        const doneCount = tasks.filter(t => t.done).length;
        const total = tasks.length;

        const barRow = todayBody.createDiv({ cls: "wd-task-bar-row" });
        const bar = barRow.createDiv({ cls: "wd-task-bar" });
        bar.createDiv({ cls: "wd-task-bar-fill", attr: { style: `width:${Math.round((doneCount / total) * 100)}%` } });
        barRow.createDiv({ text: `${doneCount}/${total}`, cls: "wd-task-bar-num" });

        const list = todayBody.createDiv({ cls: "wd-task-list" });
        for (const task of tasks) {
            const item = list.createDiv({ cls: `wd-task-item${task.done ? " is-done" : ""}` });
            const check = item.createSpan({ cls: `wd-task-check${task.done ? " is-checked" : ""}` });
            check.setText(task.done ? "✓" : "○");

            const contentSpan = item.createSpan({ cls: "wd-task-content" });
            contentSpan.createSpan({ text: task.text, cls: "wd-task-text" });
            if (task.priority) contentSpan.createSpan({ text: task.priority, cls: "wd-task-meta" });
            if (task.due) contentSpan.createSpan({ text: `📅 ${task.due}`, cls: "wd-task-meta" });

            item.addEventListener("click", async () => {
                if (!(dailyFile instanceof TFile)) return;
                const content = await vault.read(dailyFile);
                const toggled = task.done
                    ? task.raw.replace(/- \[x\]/, "- [ ]")
                    : task.raw.replace(/- \[ \]/, "- [x]");
                await vault.modify(dailyFile, content.replace(task.raw, toggled));
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
        for (const t of openTasks) allOpen.push({ ...t, file: file.path });
        if (allOpen.length >= 40) break;
    }

    if (allOpen.length === 0) {
        allBody.createDiv({ text: "🎉 所有任务已完成", cls: "wd-empty" });
    } else {
        const list = allBody.createDiv({ cls: "wd-task-list" });
        for (const task of allOpen.slice(0, 30)) {
            const item = list.createDiv({ cls: "wd-task-item" });
            item.createSpan({ text: "○", cls: "wd-task-check" });
            const cs = item.createSpan({ cls: "wd-task-content" });
            cs.createSpan({ text: task.text, cls: "wd-task-text" });
            if (task.priority) cs.createSpan({ text: task.priority, cls: "wd-task-meta" });
            if (task.due) cs.createSpan({ text: `📅 ${task.due}`, cls: "wd-task-meta" });
            const fname = task.file.replace(/\.md$/, "").split("/").pop() || task.file;
            item.createSpan({ text: fname, cls: "wd-task-file-ref" });
            item.addEventListener("click", () => plugin.app.workspace.openLinkText(task.file, "", false));
        }
    }
}

// ── 解析 ──

interface ParsedTask { text: string; done: boolean; priority: string; due: string; raw: string; }

async function extractAllTasks(vault: import("obsidian").Vault, file: TFile | null): Promise<ParsedTask[]> {
    if (!(file instanceof TFile)) return [];
    return parseTaskLines(await vault.read(file));
}

async function extractOpenTasks(vault: import("obsidian").Vault, file: TFile) {
    const all = parseTaskLines(await vault.read(file));
    return all.filter(t => !t.done).map(t => ({ text: t.text, priority: t.priority, due: t.due }));
}

function parseTaskLines(content: string): ParsedTask[] {
    return content.split("\n").map(line => {
        const m = line.match(/^\s*- \[(.)\] (.+)$/);
        if (!m) return null;
        const done = m[1] !== " ";
        let rest = m[2].trim();
        let priority = "";
        const pm = rest.match(/^(⏫|🔼|🔽)\s*/);
        if (pm) { priority = pm[1]; rest = rest.slice(pm[0].length); }
        let due = "";
        const dm = rest.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
        if (dm) { due = dm[1]; rest = rest.replace(dm[0], "").trim(); }
        return { text: rest.trim(), done, priority, due, raw: line };
    }).filter(Boolean) as ParsedTask[];
}
