import type WikiDashboardPlugin from "../../main";
import { TFile } from "obsidian";
import { getDailyPath, ensureDailyFile } from "../utils/vault-utils";

/**
 * 概览待办面板 — 只显示日报「日常记录」区域的待办，可点击勾选
 */
export async function renderTasksPane(container: HTMLElement, plugin: WikiDashboardPlugin) {
    container.empty();

    const section = container.createDiv({ cls: "wd-section" });
    const titleRow = section.createDiv({ cls: "wd-section-header" });
    titleRow.createSpan({ text: "日报待办", cls: "wd-section-title" });
    const openBtn = titleRow.createEl("button", { text: "↗", cls: "wd-btn-sm", attr: { title: "打开日报源文件" } });
    openBtn.addEventListener("click", () => {
        plugin.app.workspace.openLinkText(dailyPath, "", false);
    });
    const body = section.createDiv({ cls: "wd-section-body" });

    const dailyPath = getDailyPath();
    let dailyFile = plugin.app.vault.getAbstractFileByPath(dailyPath);

    if (!(dailyFile instanceof TFile)) {
        dailyFile = await ensureDailyFile(plugin.app.vault, dailyPath);
    }

    try {
        const content = await plugin.app.vault.read(dailyFile);

        // 只提取「日常记录」区域的待办（排除习惯打卡等）
        const tasks = extractTasksFromSection(content, "日常记录");

        if (tasks.length === 0) {
            body.createDiv({ text: "日常记录暂无待办", cls: "wd-empty" });
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

            // 点击勾选
            item.addEventListener("click", async () => {
                if (!(dailyFile instanceof TFile)) return;
                const current = await plugin.app.vault.read(dailyFile);
                const toggled = task.done
                    ? task.raw.replace(/- \[x\]/, "- [ ]")
                    : task.raw.replace(/- \[ \]/, "- [x]");
                await plugin.app.vault.modify(dailyFile, current.replace(task.raw, toggled));
                container.empty();
                await renderTasksPane(container, plugin);
            });
        }
    } catch {
        body.createDiv({ text: "无法读取日报", cls: "wd-empty" });
    }
}

/**
 * 从指定 section 中提取任务（section = ## 标题）
 */
function extractTasksFromSection(content: string, sectionName: string): Array<{ text: string; done: boolean; raw: string }> {
    const lines = content.split("\n");

    // 定位 section
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === `## ${sectionName}`) { start = i; break; }
    }
    if (start === -1) return [];

    // 找到下一个 ## 标题
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
        if (lines[i].match(/^## /)) { end = i; break; }
    }

    // 提取该区域内的任务
    const tasks: Array<{ text: string; done: boolean; raw: string }> = [];
    for (let i = start + 1; i < end; i++) {
        const m = lines[i].match(/^\s*- \[(.)\] (.+)$/);
        if (m) {
            tasks.push({ text: m[2].trim(), done: m[1] !== " ", raw: lines[i] });
        }
    }
    return tasks;
}
