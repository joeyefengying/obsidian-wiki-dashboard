import { TFile, Vault } from "obsidian";

/**
 * 获取今日日报路径（LifeOS 格式）
 */
export function getDailyPath(date?: Date): string {
    const d = date || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `周期笔记/${y}/Daily/${m}/${y}-${m}-${day}.md`;
}

/**
 * 获取本周周报路径
 */
export function getWeeklyPath(date?: Date): string {
    const d = date || new Date();
    const y = d.getFullYear();
    const wn = getWeekNumber(d);
    return `周期笔记/${y}/Weekly/${y}-W${String(wn).padStart(2, "0")}.md`;
}

/**
 * 获取本月月报路径
 */
export function getMonthlyPath(date?: Date): string {
    const d = date || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `周期笔记/${y}/Monthly/${y}-${m}.md`;
}

/**
 * 获取日报模板路径
 */
export function getDailyTemplatePath(): string {
    return "周期笔记/Templates/Daily.md";
}

/**
 * 创建日报（从模板），如果模板不存在则创建简单模板
 */
export async function ensureDailyFile(vault: Vault, path: string): Promise<TFile> {
    const existing = vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) return existing;

    // 尝试读取模板
    const templatePath = getDailyTemplatePath();
    const templateFile = vault.getAbstractFileByPath(templatePath);

    let content: string;
    if (templateFile instanceof TFile) {
        content = await vault.read(templateFile);
        // 清理模板中的 LifeOS 动态语法（保留静态内容，移除 <% ... %> 块）
        content = content.replace(/<%[\s\S]*?%>/g, "").trim();
        // 清理空行
        content = content.replace(/\n{3,}/g, "\n\n");
    } else {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        content = `## 项目列表\n\n## 日常记录\n\n## 习惯打卡\n\n## 今日完成\n`;
    }

    return await vault.create(path, content);
}

/**
 * 追加内容到日报的指定 section（在下一个 ## 标题之前）
 */
export async function appendToDailySection(
    vault: Vault,
    file: TFile,
    sectionName: string,
    content: string
): Promise<void> {
    const text = await vault.read(file);
    const lines = text.split("\n");

    // 找到目标 section
    let sectionIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === `## ${sectionName}`) {
            sectionIdx = i;
            break;
        }
    }

    if (sectionIdx === -1) {
        // section 不存在，追加到文件末尾
        await vault.append(file, `\n${content}\n`);
        return;
    }

    // 找到下一个 ## 标题（或 EOF）
    let nextSectionIdx = lines.length;
    for (let i = sectionIdx + 1; i < lines.length; i++) {
        if (lines[i].match(/^## /)) {
            nextSectionIdx = i;
            break;
        }
    }

    // 在目标 section 和下一个 section 之间插入内容
    // 找到最后一个非空行
    let insertIdx = nextSectionIdx - 1;
    while (insertIdx > sectionIdx && lines[insertIdx].trim() === "") {
        insertIdx--;
    }
    insertIdx++; // 在最后一个非空行后的空行处插入

    lines.splice(insertIdx, 0, content);

    await vault.modify(file, lines.join("\n"));
}

/**
 * 获取 wiki 统计
 */
export async function getWikiStats(vault: Vault): Promise<{
    entities: number;
    topics: number;
    sources: number;
    synthesis: number;
    totalFiles: number;
    lastDigest: string;
}> {
    const files = vault.getFiles();

    let entities = 0, topics = 0, sources = 0, synthesis = 0;

    for (const file of files) {
        if (file.path.startsWith("wiki/entities/")) entities++;
        else if (file.path.startsWith("wiki/topics/")) topics++;
        else if (file.path.startsWith("wiki/sources/")) sources++;
        else if (file.path.startsWith("wiki/synthesis/")) synthesis++;
    }

    let lastDigest = "未知";
    const logFile = vault.getAbstractFileByPath("log.md");
    if (logFile instanceof TFile) {
        try {
            const content = await vault.read(logFile);
            const lines = content.trim().split("\n");
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i];
                if (line.startsWith("|") && line.includes("|") && !line.includes("---")) {
                    const cols = line.split("|").map(s => s.trim()).filter(Boolean);
                    if (cols.length >= 1) { lastDigest = cols[0]; break; }
                }
            }
        } catch { /* ignore */ }
    }

    return { entities, topics, sources, synthesis, totalFiles: files.length, lastDigest };
}

export function getRecentFiles(vault: Vault, limit = 10) {
    return vault.getFiles()
        .filter(f => f.path.endsWith(".md"))
        .sort((a, b) => b.stat.mtime - a.stat.mtime)
        .slice(0, limit)
        .map(f => {
            const parts = f.path.split("/");
            const folder = parts.length > 1 ? parts.slice(0, -1).join(" / ") : "根目录";
            return { path: f.path, name: f.basename, mtime: f.stat.mtime, folder };
        });
}

export function getTodayCreated(vault: Vault): number {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return vault.getFiles().filter(f => f.stat.ctime >= today.getTime()).length;
}

export function getTodayModified(vault: Vault): number {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return vault.getFiles().filter(f => f.stat.mtime >= today.getTime()).length;
}

export function formatTimeAgo(mtime: number): string {
    const diff = Date.now() - mtime;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "刚刚";
    if (mins < 60) return `${mins} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    const date = new Date(mtime);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function getPeriodicNotePaths(): { today: string; week: string; month: string } {
    return {
        today: getDailyPath(),
        week: getWeeklyPath(),
        month: getMonthlyPath(),
    };
}

function getWeekNumber(d: Date): number {
    const start = new Date(d.getFullYear(), 0, 1);
    const diff = d.getTime() - start.getTime();
    return Math.ceil((diff / 604800000 + start.getDay() + 1) / 7);
}
