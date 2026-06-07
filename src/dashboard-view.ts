import { ItemView, WorkspaceLeaf } from "obsidian";
import type WikiDashboardPlugin from "../main";
import { renderStatsHero } from "./panes/stats-pane";
import { renderDigestPane } from "./panes/digest-pane";
import { renderActivityPane } from "./panes/activity-pane";
import { renderShortcutsPane } from "./panes/shortcuts-pane";
import { renderTasksPane } from "./panes/tasks-pane";

export const VIEW_TYPE_WIKI_DASHBOARD = "wiki-dashboard-view";

export class WikiDashboardView extends ItemView {
    plugin: WikiDashboardPlugin;
    private refreshTimer: number | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: WikiDashboardPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string { return VIEW_TYPE_WIKI_DASHBOARD; }
    getDisplayText(): string { return "仪表盘"; }
    getIcon(): string { return "wiki-dashboard"; }

    async onOpen() {
        const contentEl = this.containerEl.children[1] as HTMLElement;
        contentEl.empty();
        contentEl.classList.add("wd-root");
        await this.build(contentEl);

        // 每 60 秒刷新（全屏视图刷新太快会分散注意力）
        this.refreshTimer = window.setInterval(() => {
            contentEl.empty();
            this.build(contentEl);
        }, 60_000);
    }

    async onClose() {
        if (this.refreshTimer !== null) {
            window.clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    // ── 构建全屏仪表盘 ──────────────────────────────────

    async build(root: HTMLElement) {
        const now = new Date();
        const dateStr = now.toLocaleDateString("zh-CN", {
            year: "numeric", month: "long", day: "numeric", weekday: "long",
        });

        // ── HEADER ──
        const header = root.createDiv({ cls: "wd-header" });
        const headerLeft = header.createDiv({ cls: "wd-header-left" });
        headerLeft.createEl("h1", { text: "仪表盘", cls: "wd-title" });
        headerLeft.createEl("span", { text: dateStr, cls: "wd-date" });

        const headerRight = header.createDiv({ cls: "wd-header-right" });
        const refreshBtn = headerRight.createEl("button", { cls: "wd-btn-icon", attr: { "aria-label": "刷新" } });
        refreshBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
        refreshBtn.addEventListener("click", () => { root.empty(); this.build(root); });

        const closeBtn = headerRight.createEl("button", { cls: "wd-btn-icon", attr: { "aria-label": "关闭" } });
        closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        closeBtn.addEventListener("click", () => { this.leaf.detach(); });

        // ── HERO STATS ──
        const hero = root.createDiv({ cls: "wd-hero" });
        await renderStatsHero(hero, this.plugin);

        // ── 分隔线 ──
        root.createDiv({ cls: "wd-divider" });

        // ── 两栏主体 ──
        const body = root.createDiv({ cls: "wd-body" });
        const colMain = body.createDiv({ cls: "wd-col-main" });
        const colSide = body.createDiv({ cls: "wd-col-side" });

        // 主栏：消化 + 最近动态
        await renderDigestPane(colMain, this.plugin);
        await renderActivityPane(colMain, this.plugin);

        // 侧栏：快捷操作 + 待办
        await renderShortcutsPane(colSide, this.plugin);
        await renderTasksPane(colSide, this.plugin);

        // ── FOOTER ──
        const footer = root.createDiv({ cls: "wd-footer" });
        footer.createSpan({ text: "Wiki Dashboard", cls: "wd-footer-brand" });
        footer.createSpan({ text: "v1.1", cls: "wd-footer-version" });
    }
}
