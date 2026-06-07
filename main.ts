import { Plugin, WorkspaceLeaf, addIcon } from "obsidian";
import { WikiDashboardView, VIEW_TYPE_WIKI_DASHBOARD } from "./src/dashboard-view";

const DASHBOARD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`;

export default class WikiDashboardPlugin extends Plugin {
    async onload() {
        addIcon("wiki-dashboard", DASHBOARD_ICON);

        this.registerView(
            VIEW_TYPE_WIKI_DASHBOARD,
            (leaf: WorkspaceLeaf) => new WikiDashboardView(leaf, this)
        );

        // Ribbon 图标
        this.addRibbonIcon("wiki-dashboard", "Wiki Dashboard", () => {
            this.activateView();
        });

        // 命令面板
        this.addCommand({
            id: "open-wiki-dashboard",
            name: "打开知识库仪表盘",
            callback: () => this.activateView(),
        });

        // 启动时恢复
        this.app.workspace.onLayoutReady(() => {
            this.restoreView();
        });
    }

    async onunload() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_WIKI_DASHBOARD);
    }

    async activateView() {
        const { workspace } = this.app;

        // 优先复用已有 leaf
        const existing = workspace.getLeavesOfType(VIEW_TYPE_WIKI_DASHBOARD);
        if (existing.length > 0) {
            workspace.revealLeaf(existing[0]);
            return;
        }

        // 在主区域打开新 tab（全屏体验）
        const leaf = workspace.getLeaf("tab");
        await leaf.setViewState({
            type: VIEW_TYPE_WIKI_DASHBOARD,
            active: true,
        });
        workspace.revealLeaf(leaf);
    }

    async restoreView() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_WIKI_DASHBOARD);
        if (leaves.length > 0) return;

        // 启动时不自动抢占主区域，只在用户主动打开时才显示
    }
}
