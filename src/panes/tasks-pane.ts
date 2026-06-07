import type WikiDashboardPlugin from "../../main";
import { TFile } from "obsidian";

export async function renderTasksPane(container: HTMLElement, plugin: WikiDashboardPlugin) {
    container.empty();

    const section = container.createDiv({ cls: "wd-section" });
    section.createDiv({ text: "今日待办", cls: "wd-section-title" });
    const body = section.createDiv({ cls: "wd-section-body" });

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const dailyPath = `周期笔记/${y}-${m}-${d}.md`;

    const dailyFile = plugin.app.vault.getAbstractFileByPath(dailyPath);

    if (!dailyFile || !(dailyFile instanceof TFile)) {
        const empty = body.createDiv({ cls: "wd-empty" });
        empty.createSpan({ text: "今日日记尚未创建" });
        const btn = body.createEl("button", { text: "创建", cls: "wd-btn wd-btn-fill wd-btn-sm" });
        btn.addEventListener("click", () => {
            plugin.app.workspace.openLinkText(dailyPath, "", true);
        });
        return;
    }

    try {
        const content = await plugin.app.vault.read(dailyFile);
        const lines = content.split("\n");
        const tasks: Array<{ text: string; done: boolean }> = [];

        for (const line of lines) {
            const m = line.match(/^\s*- \[(.)\] (.+)$/);
            if (m) tasks.push({ text: m[2].trim(), done: m[1] !== " " });
        }

        if (tasks.length === 0) {
            body.createDiv({ text: "今日暂无待办", cls: "wd-empty" });
            return;
        }

        const doneCount = tasks.filter(t => t.done).length;
        const total = tasks.length;

        // 进度条
        const barRow = body.createDiv({ cls: "wd-task-bar-row" });
        const bar = barRow.createDiv({ cls: "wd-task-bar" });
        bar.createDiv({ cls: "wd-task-bar-fill", attr: { style: `width:${Math.round((doneCount / total) * 100)}%` } });
        barRow.createDiv({ text: `${doneCount}/${total}`, cls: "wd-task-bar-num" });

        // 任务列表
        const list = body.createDiv({ cls: "wd-task-list" });
        for (const task of tasks.slice(0, 6)) {
            const item = list.createDiv({ cls: `wd-task-item${task.done ? " is-done" : ""}` });
            item.createSpan({ text: task.done ? "✓" : "○", cls: "wd-task-check" });
            item.createSpan({ text: task.text, cls: "wd-task-text" });
            item.addEventListener("click", () => {
                plugin.app.workspace.openLinkText(dailyPath, "", false);
            });
        }
    } catch {
        body.createDiv({ text: "无法读取今日日记", cls: "wd-empty" });
    }
}
