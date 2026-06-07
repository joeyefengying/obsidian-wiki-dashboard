import type WikiDashboardPlugin from "../../main";
import { TFile } from "obsidian";

/**
 * 任务 Tab — 可添加、可勾选、可查看未完成任务
 */
export async function renderTasksTab(container: HTMLElement, plugin: WikiDashboardPlugin) {
    const vault = plugin.app.vault;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const dailyPath = `周期笔记/${y}-${m}-${d}.md`;

    // ── 第 1 行：快速添加 ──
    const addSection = container.createDiv({ cls: "wd-section wd-task-add-section" });
    addSection.createDiv({ text: "添加任务", cls: "wd-section-title" });

    const addRow = addSection.createDiv({ cls: "wd-task-add-row" });
    const addInput = addRow.createEl("input", {
        type: "text",
        placeholder: "输入任务内容，回车添加…",
        cls: "wd-digest-input wd-task-add-input",
    });

    // 目标文件选择
    const targetSelect = addRow.createEl("select", { cls: "wd-task-target-select" });
    targetSelect.createEl("option", { text: "今日日记" });
    targetSelect.createEl("option", { text: "inbox" });

    // 添加逻辑
    const doAdd = async () => {
        const text = addInput.value.trim();
        if (!text) return;

        addInput.value = "";
        addInput.placeholder = "已添加！继续输入…";

        const target = targetSelect.value;
        let filePath = dailyPath;
        if (target === "inbox") filePath = "inbox.md";

        const file = vault.getAbstractFileByPath(filePath);
        const line = `- [ ] ${text}\n`;

        if (file instanceof TFile) {
            // 追加到已有文件末尾
            await vault.append(file, line);
        } else {
            // 创建新文件
            const todayStr = `${y}-${m}-${d}`;
            const header = filePath === "inbox.md"
                ? `# 收集箱\n\n`
                : `# ${todayStr}\n\n`;
            await vault.create(filePath, header + line);
        }

        // 延迟后刷新
        setTimeout(() => {
            addInput.placeholder = "输入任务内容，回车添加…";
            container.empty();
            renderTasksTab(container, plugin);
        }, 400);
    };

    addInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") doAdd();
    });

    const addBtn = addRow.createEl("button", { text: "添加", cls: "wd-btn wd-btn-fill" });
    addBtn.addEventListener("click", doAdd);

    // ── 第 2 行：今日任务 ──
    const todaySection = container.createDiv({ cls: "wd-section" });
    todaySection.createDiv({ text: "今日任务", cls: "wd-section-title" });
    const todayBody = todaySection.createDiv({ cls: "wd-section-body" });

    const dailyFile = vault.getAbstractFileByPath(dailyPath);
    const todayTasks = await extractTasks(vault, dailyFile);

    if (todayTasks.length === 0) {
        todayBody.createDiv({ text: "今天还没有任务", cls: "wd-empty" });
    } else {
        const doneCount = todayTasks.filter(t => t.done).length;
        const total = todayTasks.length;

        // 进度条
        const barRow = todayBody.createDiv({ cls: "wd-task-bar-row" });
        const bar = barRow.createDiv({ cls: "wd-task-bar" });
        bar.createDiv({ cls: "wd-task-bar-fill", attr: { style: `width:${Math.round((doneCount / total) * 100)}%` } });
        barRow.createDiv({ text: `${doneCount}/${total}`, cls: "wd-task-bar-num" });

        // 任务列表
        const list = todayBody.createDiv({ cls: "wd-task-list" });
        for (const task of todayTasks) {
            const item = list.createDiv({ cls: `wd-task-item${task.done ? " is-done" : ""}` });

            // 可点击勾选框
            const check = item.createSpan({ cls: `wd-task-check${task.done ? " is-checked" : ""}` });
            check.setText(task.done ? "✓" : "○");

            item.createSpan({ text: task.text, cls: "wd-task-text" });

            // 点击勾选/取消勾选
            item.addEventListener("click", async () => {
                if (!(dailyFile instanceof TFile)) return;
                const content = await vault.read(dailyFile);
                const lines = content.split("\n");
                const target = task.done
                    ? `- [x] ${task.text}`
                    : `- [ ] ${task.text}`;
                const replacement = task.done
                    ? `- [ ] ${task.text}`
                    : `- [x] ${task.text}`;

                const newContent = content.replace(target, replacement);
                await vault.modify(dailyFile, newContent);

                // 刷新任务列表
                container.empty();
                await renderTasksTab(container, plugin);
            });

            // 文件路径提示
            if (task.file && task.file !== dailyPath) {
                item.createSpan({ text: task.file, cls: "wd-task-file-ref" });
            }
        }
    }

    // ── 第 3 行：所有未完成任务 ──
    const allSection = container.createDiv({ cls: "wd-section" });
    allSection.createDiv({ text: "全部未完成", cls: "wd-section-title" });
    const allBody = allSection.createDiv({ cls: "wd-section-body" });

    // 跨文件搜索未完成任务
    const allFiles = vault.getMarkdownFiles().filter(f => !f.path.startsWith(".obsidian/"));
    const allOpen: Array<{ text: string; file: string; line: number }> = [];

    for (const file of allFiles.slice(0, 200)) {
        // 限制扫描文件数，避免性能问题
        const tasks = await extractOpenTasksFromFile(vault, file);
        for (const t of tasks) {
            allOpen.push({ ...t, file: file.path });
        }
        if (allOpen.length >= 30) break; // 最多显示 30 条
    }

    if (allOpen.length === 0) {
        allBody.createDiv({ text: "🎉 所有任务已完成", cls: "wd-empty" });
    } else {
        const list = allBody.createDiv({ cls: "wd-task-list" });
        for (const task of allOpen.slice(0, 20)) {
            const item = list.createDiv({ cls: "wd-task-item" });
            item.createSpan({ text: "○", cls: "wd-task-check" });
            item.createSpan({ text: task.text, cls: "wd-task-text" });

            // 显示所属文件
            const fname = task.file.replace(/\.md$/, "").split("/").pop() || task.file;
            item.createSpan({ text: fname, cls: "wd-task-file-ref" });

            // 点击打开对应文件
            item.addEventListener("click", () => {
                plugin.app.workspace.openLinkText(task.file, "", false);
            });
        }
    }
}

// ── 工具函数 ──

async function extractTasks(vault: import("obsidian").Vault, file: import("obsidian").TAbstractFile | null) {
    if (!(file instanceof TFile)) return [];
    const content = await vault.read(file);
    return parseTaskLines(content);
}

async function extractOpenTasksFromFile(vault: import("obsidian").Vault, file: TFile) {
    const content = await vault.read(file);
    const lines = content.split("\n");
    const tasks: Array<{ text: string; line: number }> = [];
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^\s*- \[ \] (.+)$/);
        if (m) tasks.push({ text: m[1].trim(), line: i + 1 });
    }
    return tasks;
}

function parseTaskLines(content: string) {
    return content.split("\n")
        .map(line => {
            const m = line.match(/^\s*- \[(.)\] (.+)$/);
            return m ? { text: m[2].trim(), done: m[1] !== " ", line: 0, file: "" } : null;
        })
        .filter(Boolean) as Array<{ text: string; done: boolean; line: number; file: string }>;
}
