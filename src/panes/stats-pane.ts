import type WikiDashboardPlugin from "../../main";
import { getWikiStats } from "../utils/vault-utils";

export async function renderStatsHero(container: HTMLElement, plugin: WikiDashboardPlugin) {
    const vault = plugin.app.vault;
    const stats = await getWikiStats(vault);

    container.empty();

    // 四个超大统计数字 — 杂志封面风格
    const statItems = [
        { label: "实体", value: stats.entities, desc: "人物 / 概念 / 工具" },
        { label: "主题", value: stats.topics, desc: "知识领域" },
        { label: "素材", value: stats.sources, desc: "原始文章摘要" },
        { label: "综合分析", value: stats.synthesis, desc: "深度报告" },
    ];

    for (const item of statItems) {
        const stat = container.createDiv({ cls: "wd-hero-stat" });
        stat.createDiv({ text: item.label, cls: "wd-hero-stat-label" });
        stat.createDiv({ text: String(item.value), cls: "wd-hero-stat-number" });
        stat.createDiv({ text: item.desc, cls: "wd-hero-stat-desc" });
    }
}
