import { TFile, Vault } from "obsidian";

/**
 * 获取 vault 中 wiki 目录下的文件统计
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
    
    let entities = 0;
    let topics = 0;
    let sources = 0;
    let synthesis = 0;

    for (const file of files) {
        if (file.path.startsWith("wiki/entities/")) entities++;
        else if (file.path.startsWith("wiki/topics/")) topics++;
        else if (file.path.startsWith("wiki/sources/")) sources++;
        else if (file.path.startsWith("wiki/synthesis/")) synthesis++;
    }

    // 读取最后消化时间（从 log.md）
    let lastDigest = "未知";
    const logFile = vault.getAbstractFileByPath("log.md");
    if (logFile && logFile instanceof TFile) {
        try {
            const content = await vault.read(logFile);
            const lines = content.trim().split("\n");
            // 最后一行有效数据行
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i];
                if (line.startsWith("|") && line.includes("|") && !line.includes("---")) {
                    const cols = line.split("|").map(s => s.trim()).filter(Boolean);
                    if (cols.length >= 1) {
                        lastDigest = cols[0];
                        break;
                    }
                }
            }
        } catch {
            // ignore
        }
    }

    return {
        entities,
        topics,
        sources,
        synthesis,
        totalFiles: files.length,
        lastDigest,
    };
}

/**
 * 获取最近修改的文件列表
 */
export function getRecentFiles(vault: Vault, limit: number = 10): Array<{ path: string; name: string; mtime: number; folder: string }> {
    const files = vault.getFiles()
        .filter(f => f.path.endsWith(".md"))
        .sort((a, b) => b.stat.mtime - a.stat.mtime)
        .slice(0, limit);

    return files.map(f => {
        const parts = f.path.split("/");
        const folder = parts.length > 1 ? parts.slice(0, -1).join(" / ") : "根目录";
        return {
            path: f.path,
            name: f.basename,
            mtime: f.stat.mtime,
            folder,
        };
    });
}

/**
 * 获取今日创建的笔记数
 */
export function getTodayCreated(vault: Vault): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();

    return vault.getFiles()
        .filter(f => f.stat.ctime >= todayTs)
        .length;
}

/**
 * 获取今日修改的笔记数
 */
export function getTodayModified(vault: Vault): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();

    return vault.getFiles()
        .filter(f => f.stat.mtime >= todayTs)
        .length;
}

/**
 * 格式化时间差
 */
export function formatTimeAgo(mtime: number): string {
    const now = Date.now();
    const diff = now - mtime;
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

/**
 * 获取周期笔记路径
 */
export function getPeriodicNotePaths(): { today: string; week: string; month: string } {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");

    // 周期笔记目录
    const today = `周期笔记/${y}-${m}-${d}.md`;

    // 获取本周一
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const wm = String(monday.getMonth() + 1).padStart(2, "0");
    const wd = String(monday.getDate()).padStart(2, "0");
    const week = `周期笔记/${y}-W${getWeekNumber(now)}.md`;

    const month = `周期笔记/${y}-${m}.md`;

    return { today, week, month };
}

function getWeekNumber(d: Date): number {
    const start = new Date(d.getFullYear(), 0, 1);
    const diff = d.getTime() - start.getTime();
    const oneWeek = 604800000;
    return Math.ceil((diff / oneWeek + start.getDay() + 1) / 7);
}
