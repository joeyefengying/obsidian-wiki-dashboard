import type WikiDashboardPlugin from "../../main";
import { TFile } from "obsidian";
import { getDailyPath, ensureDailyFile, appendToDailySection, getActiveProjects } from "../utils/vault-utils";

// 记住上次选中的项目（跨刷新保持）
let lastSelectedProject = "";

/**
 * 任务 Tab — LifeOS 日报集成
 * 顶部显示活跃项目标签，默认选中上次项目，添加任务自动关联
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

    // ── 活跃项目标签行 ──
    const projects = getActiveProjects(vault);
    let selectedProject = lastSelectedProject;
    // 如果上次选的项目不存在了，默认选第一个
    if (selectedProject && !projects.find(p => p.path === selectedProject)) {
        selectedProject = "";
    }
    if (!selectedProject && projects.length > 0) {
        selectedProject = projects[0].path;
    }

    const projRow = container.createDiv({ cls: "wd-task-projects" });
    const projLabel = projRow.createSpan({ text: "关联项目：", cls: "wd-task-projects-label" });

    const allBtn = projRow.createEl("button", {
        text: "全部",
        cls: `wd-btn-sm wd-btn-ghost${!selectedProject ? " is-active" : ""}`,
    });
    allBtn.addEventListener("click", () => {
        selectedProject = "";
        lastSelectedProject = "";
        container.empty();
        renderTasksTab(container, plugin);
    });

    for (const p of projects) {
        const btn = projRow.createEl("button", {
            text: p.name,
            cls: `wd-btn-sm wd-btn-ghost${selectedProject === p.path ? " is-active" : ""}`,
        });
        btn.addEventListener("click", () => {
            selectedProject = p.path;
            lastSelectedProject = p.path;
            container.empty();
            renderTasksTab(container, plugin);
        });
    }

    // ── 快速添加 ──
    const addRow = container.createDiv({ cls: "wd-task-add-row" });
    const projectHint = selectedProject
        ? `添加任务到「${selectedProject.split("/").pop()}」→ 日常记录…`
        : "添加任务到日常记录…";
    const addInput = addRow.createEl("input", {
        type: "text",
        placeholder: projectHint,
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
        if (prioSelect.value) line += ` ${prioSelect.value}`;
        if (dueInput.value) line += ` 📅 ${dueInput.value}`;
        if (selectedProject) {
            const pname = selectedProject.split("/").pop();
            line += ` 🗂 [[${selectedProject}/README|${pname}]]`;
        }

        const file = await ensureDailyFile(vault, dailyPath);
        await appendToDailySection(vault, file, "日常记录", line);

        setTimeout(() => {
            addInput.placeholder = projectHint;
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
    if (!(dailyFile instanceof TFile)) dailyFile = await ensureDailyFile(vault, dailyPath);

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
