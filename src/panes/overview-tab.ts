import type WikiDashboardPlugin from "../../main";
import { renderStatsHero } from "./stats-pane";
import { renderDigestPane } from "./digest-pane";
import { renderActivityPane } from "./activity-pane";
import { renderShortcutsPane } from "./shortcuts-pane";
import { renderTasksPane } from "./tasks-pane";

/**
 * 概览 Tab — 原有的 Dashboard 全貌
 */
export async function renderOverviewTab(container: HTMLElement, plugin: WikiDashboardPlugin) {
    // Hero 统计区
    const hero = container.createDiv({ cls: "wd-hero" });
    await renderStatsHero(hero, plugin);

    container.createDiv({ cls: "wd-divider" });

    // 两栏主体
    const body = container.createDiv({ cls: "wd-body" });
    const colMain = body.createDiv({ cls: "wd-col-main" });
    const colSide = body.createDiv({ cls: "wd-col-side" });

    await renderDigestPane(colMain, plugin);
    await renderActivityPane(colMain, plugin);
    await renderShortcutsPane(colSide, plugin);
    await renderTasksPane(colSide, plugin);
}
