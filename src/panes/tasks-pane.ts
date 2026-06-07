import type WikiDashboardPlugin from "../../main";
import { TFile } from "obsidian";
import { getDailyPath, ensureDailyFile } from "../utils/vault-utils";

export async function renderTasksPane(container: HTMLElement, plugin: WikiDashboardPlugin) {
    container.empty();

    const section = container.createDiv({ cls: "wd-section" });
    section.createDiv({ text: "今日待办", cls: "wd-section-title" });
    const body = section.createDiv({ cls: "wd-section-body" });

    const dailyPath = getDailyPath();
    let dailyFile = plugin.app.vault.getAbstractFileByPath(dailyPath);

    if (!(dailyFile instanceof TFile)) {
        dailyFile = await ensureDailyFile(plugin.app.vault, dailyPath);
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

        const barRow = body.createDiv({ cls: "wd-task-bar-row" });
        const bar = barRow.createDiv({ cls: "wd-task-bar" });
        bar.createDiv({ cls: "wd-task-bar-fill", attr: { style: `width:${Math.round((doneCount / total) * 100)}%` } });
        barRow.createDiv({ text: `${doneCount}/${total}`, cls: "wd-task-bar-num" });

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
        body.createDiv({ text: "无法读取日报", cls: "wd-empty" });
    }
}
