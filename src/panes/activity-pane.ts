import type WikiDashboardPlugin from "../../main";
import { getRecentFiles, formatTimeAgo } from "../utils/vault-utils";

export async function renderActivityPane(container: HTMLElement, plugin: WikiDashboardPlugin) {
    const vault = plugin.app.vault;
    const recent = getRecentFiles(vault, 10);

    // ── 区块标题 ──
    const section = container.createDiv({ cls: "wd-section" });
    section.createDiv({ text: "最近动态", cls: "wd-section-title" });

    const body = section.createDiv({ cls: "wd-section-body" });

    if (recent.length === 0) {
        body.createDiv({ text: "暂无最近活动", cls: "wd-empty" });
        return;
    }

    const list = body.createDiv({ cls: "wd-activity-list" });

    for (const file of recent) {
        const row = list.createDiv({ cls: "wd-activity-row" });

        // 时间列
        const timeCol = row.createDiv({ cls: "wd-activity-time" });
        timeCol.setText(formatTimeAgo(file.mtime));

        // 内容列
        const contentCol = row.createDiv({ cls: "wd-activity-content" });
        contentCol.createSpan({ text: file.name, cls: "wd-activity-name" });
        contentCol.createSpan({ text: file.folder, cls: "wd-activity-path" });

        // 点击打开
        row.addEventListener("click", () => {
            plugin.app.workspace.openLinkText(file.path, "", false);
        });
        row.setAttribute("title", file.path);
    }
}
