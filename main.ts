import { Plugin, addIcon, Notice } from "obsidian";
import { exec } from "child_process";

const DASHBOARD_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`;

export default class WikiDashboardLauncher extends Plugin {
    async onload() {
        addIcon("wiki-dashboard", DASHBOARD_ICON);

        this.addRibbonIcon("wiki-dashboard", "Wiki Dashboard", () => this.launch());

        this.addCommand({
            id: "open-wiki-dashboard",
            name: "打开 Wiki Dashboard",
            callback: () => this.launch(),
        });
    }

    launch() {
        // 尝试启动 Electron 应用
        const appPath = "E:/project/wiki-dashboard-app";
        exec(`start "" "${appPath}"`, { shell: true }, (err) => {
            if (err) {
                // Electron 应用未构建，提示用户手动 npm run dev
                new Notice(
                    "Wiki Dashboard 应用未启动。请在终端运行：\ncd E:/project/wiki-dashboard-app && npm run dev",
                    8000
                );
            }
        });
        // 同时复制路径到剪贴板，方便手动打开
        navigator.clipboard.writeText(appPath);
    }
}
