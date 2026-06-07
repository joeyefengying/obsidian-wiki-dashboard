import { ItemView, WorkspaceLeaf } from "obsidian";
import type WikiDashboardPlugin from "../main";
import { renderOverviewTab } from "./panes/overview-tab";
import { renderTasksTab } from "./panes/tasks-tab";
import { renderCaptureTab } from "./panes/capture-tab";
import { renderProjectsTab } from "./panes/projects-tab";

export const VIEW_TYPE_WIKI_DASHBOARD = "wiki-dashboard-view";

type TabId = "overview" | "tasks" | "capture" | "projects";

const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: "overview", label: "概览", icon: "grid" },
    { id: "tasks", label: "任务", icon: "check" },
    { id: "capture", label: "速记", icon: "pen" },
    { id: "projects", label: "项目", icon: "folder" },
];

export class WikiDashboardView extends ItemView {
    plugin: WikiDashboardPlugin;
    private refreshTimer: number | null = null;
    private activeTab: TabId = "overview";
    private contentEl!: HTMLElement;
    private navEl!: HTMLElement;

    constructor(leaf: WorkspaceLeaf, plugin: WikiDashboardPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string { return VIEW_TYPE_WIKI_DASHBOARD; }
    getDisplayText(): string { return "仪表盘"; }
    getIcon(): string { return "wiki-dashboard"; }

    async onOpen() {
        this.contentEl = this.containerEl.children[1] as HTMLElement;
        this.contentEl.empty();
        this.contentEl.classList.add("wd-root");
        await this.build();

        this.refreshTimer = window.setInterval(() => {
            this.contentEl.empty();
            this.build();
        }, 60_000);
    }

    async onClose() {
        if (this.refreshTimer !== null) {
            window.clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    // ── 构建主框架 ──────────────────────────────

    async build() {
        const root = this.contentEl;

        // ── HEADER ──
        const now = new Date();
        const dateStr = now.toLocaleDateString("zh-CN", {
            year: "numeric", month: "long", day: "numeric", weekday: "long",
        });

        const header = root.createDiv({ cls: "wd-header" });
        const headerLeft = header.createDiv({ cls: "wd-header-left" });
        headerLeft.createEl("h1", { text: "仪表盘", cls: "wd-title" });
        headerLeft.createEl("span", { text: dateStr, cls: "wd-date" });

        const headerRight = header.createDiv({ cls: "wd-header-right" });
        const refreshBtn = headerRight.createEl("button", { cls: "wd-btn-icon", attr: { "aria-label": "刷新" } });
        refreshBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
        refreshBtn.addEventListener("click", () => { root.empty(); this.build(); });

        const closeBtn = headerRight.createEl("button", { cls: "wd-btn-icon", attr: { "aria-label": "关闭" } });
        closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        closeBtn.addEventListener("click", () => { this.leaf.detach(); });

        // ── TAB 导航 ──
        this.navEl = root.createDiv({ cls: "wd-nav" });
        for (const tab of TABS) {
            const btn = this.navEl.createEl("button", {
                text: tab.label,
                cls: `wd-nav-btn${tab.id === this.activeTab ? " is-active" : ""}`,
            });
            btn.addEventListener("click", () => this.switchTab(tab.id));
        }

        // ── 内容区 ──
        const tabBody = root.createDiv({ cls: "wd-tab-body" });
        await this.renderTab(tabBody, this.activeTab);

        // ── FOOTER ──
        const footer = root.createDiv({ cls: "wd-footer" });
        footer.createSpan({ text: "Wiki Dashboard", cls: "wd-footer-brand" });
        footer.createSpan({ text: "v1.2", cls: "wd-footer-version" });
    }

    // ── 切换 Tab ────────────────────────────────

    async switchTab(id: TabId) {
        this.activeTab = id;
        this.contentEl.empty();
        await this.build();
    }

    async renderTab(container: HTMLElement, id: TabId) {
        switch (id) {
            case "overview":
                await renderOverviewTab(container, this.plugin);
                break;
            case "tasks":
                await renderTasksTab(container, this.plugin);
                break;
            case "capture":
                await renderCaptureTab(container, this.plugin);
                break;
            case "projects":
                await renderProjectsTab(container, this.plugin);
                break;
        }
    }

    // ── 暴露给子面板的快捷重建 ──────────────────

    rebuildActiveTab() {
        this.contentEl.empty();
        this.build();
    }
}
