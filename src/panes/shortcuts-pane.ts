import type WikiDashboardPlugin from "../../main";
import { getPeriodicNotePaths } from "../utils/vault-utils";

export async function renderShortcutsPane(container: HTMLElement, plugin: WikiDashboardPlugin) {
    container.empty();

    const section = container.createDiv({ cls: "wd-section" });
    section.createDiv({ text: "快捷操作", cls: "wd-section-title" });
    const body = section.createDiv({ cls: "wd-section-body" });

    // ── 行内快捷按钮 ──
    const quickRow = body.createDiv({ cls: "wd-shortcut-quick-row" });

    const today = createSmallBtn(quickRow, "📅 今日", () => {
        const p = getPeriodicNotePaths();
        openOrCreate(plugin, p.today);
    });
    const search = createSmallBtn(quickRow, "🔍 搜索", () => {
        // @ts-ignore
        plugin.app.commands.executeCommandById("omnisearch:show-modal");
    });
    const index = createSmallBtn(quickRow, "📑 索引", () => {
        plugin.app.workspace.openLinkText("index.md", "", false);
    });
    const log = createSmallBtn(quickRow, "📜 日志", () => {
        plugin.app.workspace.openLinkText("log.md", "", false);
    });

    // ── 分隔 ──
    body.createDiv({ cls: "wd-shortcut-sep" });

    // ── 知识库维护 ──
    const maintGroup = body.createDiv({ cls: "wd-shortcut-group" });
    maintGroup.createDiv({ text: "知识库维护", cls: "wd-shortcut-label" });
    const maintRow = maintGroup.createDiv({ cls: "wd-shortcut-row" });
    
    createCmdBtn(maintRow, "健康检查", "llm-wiki 健康检查");
    createCmdBtn(maintRow, "深度分析", "llm-wiki 深度分析");
    createCmdBtn(maintRow, "知识图谱", "llm-wiki 知识图谱");

    // ── 工作流 ──
    const wfGroup = body.createDiv({ cls: "wd-shortcut-group" });
    wfGroup.createDiv({ text: "工作流", cls: "wd-shortcut-label" });
    const wfRow = wfGroup.createDiv({ cls: "wd-shortcut-row" });

    createCmdBtn(wfRow, "筛选简历", "筛选简历");
    createCmdBtn(wfRow, "飞书消息", "发送飞书消息");
}

// ── 工具函数 ──

function createSmallBtn(parent: HTMLElement, text: string, onClick: () => void): HTMLButtonElement {
    const btn = parent.createEl("button", { text, cls: "wd-btn-sm" });
    btn.addEventListener("click", onClick);
    return btn;
}

function createCmdBtn(parent: HTMLElement, label: string, cmd: string) {
    const btn = parent.createEl("button", { text: label, cls: "wd-btn-sm wd-btn-cmd" });
    btn.addEventListener("click", () => {
        navigator.clipboard.writeText(`/${cmd}`).catch(() => {});
    });
    return btn;
}

function openOrCreate(plugin: WikiDashboardPlugin, path: string) {
    const file = plugin.app.vault.getAbstractFileByPath(path);
    if (file) {
        plugin.app.workspace.openLinkText(path, "", false);
    } else {
        plugin.app.workspace.openLinkText(path, "", true);
    }
}
