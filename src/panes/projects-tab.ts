import type WikiDashboardPlugin from "../../main";
import { TFile, TFolder } from "obsidian";

const ACTIVE_DIR = "PARA 管理/1. 项目";
const ARCHIVE_DIR = "PARA 管理/4. 存档";

interface Project {
    name: string;
    path: string;
    fileCount: number;
    isArchived: boolean;
}

/**
 * 项目 Tab — 查看活跃项目 + 一键归档到存档目录
 */
export async function renderProjectsTab(container: HTMLElement, plugin: WikiDashboardPlugin) {
    const vault = plugin.app.vault;

    // ── 活跃项目 ──
    const activeSection = container.createDiv({ cls: "wd-section" });
    activeSection.createDiv({ text: "活跃项目", cls: "wd-section-title" });
    const activeBody = activeSection.createDiv({ cls: "wd-section-body" });

    const activeProjects = await listProjects(vault, ACTIVE_DIR, false);

    if (activeProjects.length === 0) {
        activeBody.createDiv({ text: "暂无活跃项目", cls: "wd-empty" });
    } else {
        const list = activeBody.createDiv({ cls: "wd-project-list" });
        for (const proj of activeProjects) {
            const row = list.createDiv({ cls: "wd-project-row" });

            // 项目信息
            const info = row.createDiv({ cls: "wd-project-info" });
            info.createSpan({ text: proj.name, cls: "wd-project-name" });
            info.createSpan({ text: `${proj.fileCount} 个文件`, cls: "wd-project-meta" });

            // 打开
            const openBtn = row.createEl("button", { text: "打开", cls: "wd-btn-sm wd-btn-ghost" });
            openBtn.addEventListener("click", () => {
                plugin.app.workspace.openLinkText(proj.path + "/README.md", "", false);
            });

            // 归档按钮
            const archiveBtn = row.createEl("button", { text: "归档", cls: "wd-btn-sm wd-btn-ghost" });
            archiveBtn.addEventListener("click", async () => {
                const ok = confirm(`确认将「${proj.name}」归档到存档目录？\n\n路径：${ARCHIVE_DIR}/${proj.name}/`);
                if (!ok) return;

                try {
                    await moveProject(vault, proj.path, `${ARCHIVE_DIR}/${proj.name}`);
                    showToast(container, `「${proj.name}」已归档`);
                    // 刷新
                    container.empty();
                    await renderProjectsTab(container, plugin);
                } catch (e) {
                    showToast(container, `归档失败：${e}`, "err");
                }
            });

            row.setAttribute("title", proj.path);
        }
    }

    // ── 已归档 ──
    const archiveSection = container.createDiv({ cls: "wd-section" });
    archiveSection.createDiv({ text: "已归档", cls: "wd-section-title" });
    const archiveBody = archiveSection.createDiv({ cls: "wd-section-body" });

    const archivedProjects = await listProjects(vault, ARCHIVE_DIR, true);

    if (archivedProjects.length === 0) {
        archiveBody.createDiv({ text: "暂无归档项目", cls: "wd-empty" });
    } else {
        const list = archiveBody.createDiv({ cls: "wd-project-list" });
        for (const proj of archivedProjects) {
            const row = list.createDiv({ cls: "wd-project-row is-archived" });
            const info = row.createDiv({ cls: "wd-project-info" });
            info.createSpan({ text: proj.name, cls: "wd-project-name" });
            info.createSpan({ text: `${proj.fileCount} 个文件 · 已归档`, cls: "wd-project-meta" });

            const openBtn = row.createEl("button", { text: "打开", cls: "wd-btn-sm wd-btn-ghost" });
            openBtn.addEventListener("click", () => {
                plugin.app.workspace.openLinkText(proj.path + "/README.md", "", false);
            });
        }
    }
}

// ── 工具 ──

async function listProjects(vault: import("obsidian").Vault, dirPath: string, isArchived: boolean): Promise<Project[]> {
    const folder = vault.getAbstractFileByPath(dirPath);
    if (!folder || !(folder as any).children) return [];

    const children = (folder as any).children as Array<TFile | TFolder>;
    const projects: Project[] = [];

    for (const child of children) {
        if ((child as any).children !== undefined) {
            // 是文件夹
            const subDir = child as any;
            const allFiles = vault.getFiles().filter(f => f.path.startsWith(subDir.path + "/"));
            projects.push({
                name: subDir.name,
                path: subDir.path,
                fileCount: allFiles.length,
                isArchived,
            });
        }
    }

    return projects.sort((a, b) => a.name.localeCompare(b.name));
}

async function moveProject(vault: import("obsidian").Vault, fromPath: string, toPath: string) {
    // 先确保目标目录存在（创建占位文件触发目录创建，再删掉）
    const placeholder = toPath + "/.tmp";
    try {
        await vault.create(placeholder, "");
        const pf = vault.getAbstractFileByPath(placeholder);
        if (pf) await vault.delete(pf);
    } catch { /* 目录可能已存在 */ }

    // 获取该目录下所有文件
    const files = vault.getFiles().filter(f => f.path.startsWith(fromPath + "/"));

    // 逐个移动文件
    for (const file of files) {
        const relative = file.path.substring(fromPath.length);
        const newPath = toPath + relative;
        await vault.rename(file, newPath);
    }

    // 清理可能残留的空目录标记
    try {
        const tmp = vault.getAbstractFileByPath(fromPath + "/.tmp");
        if (tmp) await vault.delete(tmp);
    } catch { /* ignore */ }
}

function showToast(container: HTMLElement, msg: string, kind: "ok" | "err" = "ok") {
    const existing = container.querySelector(".wd-toast");
    if (existing) existing.remove();
    const t = container.createDiv({ cls: `wd-toast wd-toast-${kind === "err" ? "err" : "ok"}` });
    t.setText(msg);
    setTimeout(() => { t.classList.add("wd-toast-out"); setTimeout(() => t.remove(), 300); }, 2000);
}
