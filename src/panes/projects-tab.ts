import type WikiDashboardPlugin from "../../main";
import { TFile, TFolder, normalizePath } from "obsidian";

// 绕过 vault API 对含空格中文路径的截断 bug，直接用 adapter
function getAdapter(plugin: WikiDashboardPlugin) {
    return (plugin.app as any).vault.adapter;
}

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

    // ── 创建项目 ──
    const createSection = container.createDiv({ cls: "wd-section wd-task-add-section" });
    const createRow = createSection.createDiv({ cls: "wd-task-add-row" });
    const createInput = createRow.createEl("input", {
        type: "text",
        placeholder: "项目名 或 vault内路径（导入文件夹）…",
        cls: "wd-digest-input wd-task-add-input",
    });
    const createBtn = createRow.createEl("button", { text: "创建", cls: "wd-btn wd-btn-fill" });
    createBtn.addEventListener("click", async () => {
        const raw = createInput.value.trim();
        if (!raw) return;

        // 检查是否是 vault 内已有目录 → 导入模式
        const sourceDir = vault.getAbstractFileByPath(raw);
        let projectName: string;
        let readmeContent: string;

        if (sourceDir && (sourceDir as any).children) {
            // 导入模式：分析文件夹
            projectName = (sourceDir as any).name || raw.split("/").pop()!;
            readmeContent = await generateReadmeFromDir(vault, raw, projectName);
        } else {
            // 普通模式
            projectName = raw;
            readmeContent = `# ${projectName}\n\n## 目标\n\n\n\n## 任务\n\n\`\`\`tasks\nnot done\ndescription includes ${projectName}\n\`\`\`\n\n## 记录\n`;
        }

        const projPath = `${ACTIVE_DIR}/${projectName}`;
        try {
            await vault.create(`${projPath}/README.md`, readmeContent);
            createInput.value = "";
            showToast(container, `项目「${projectName}」已创建`);
            container.empty();
            await renderProjectsTab(container, plugin);
        } catch (e: any) {
            showToast(container, `创建失败：${e?.message || e}`, "err");
        }
    });
    createInput.addEventListener("keydown", (e) => { if (e.key === "Enter") createBtn.click(); });

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

            // 文件数 + 动态任务数
            const metaEl = info.createDiv({ cls: "wd-project-meta-row" });
            metaEl.createSpan({ text: `${proj.fileCount} 个文件`, cls: "wd-project-meta" });

            // 异步加载未完成任务数
            countProjectTasks(vault, proj.path).then(taskCount => {
                if (taskCount > 0) {
                    metaEl.createSpan({ text: ` · ${taskCount} 个待办`, cls: "wd-project-meta wd-project-task-count" });
                }
            });

            // 打开
            const openBtn = row.createEl("button", { text: "打开", cls: "wd-btn-sm wd-btn-ghost" });
            openBtn.addEventListener("click", () => {
                plugin.app.workspace.openLinkText(proj.path + "/README.md", "", false);
            });

            // 添加任务 — 追加到项目 README 的「任务」区域
            const addTaskBtn = row.createEl("button", { text: "+任务", cls: "wd-btn-sm wd-btn-ghost" });
            addTaskBtn.addEventListener("click", async () => {
                const taskInput = row.createEl("input", {
                    type: "text",
                    placeholder: "输入后回车…",
                    cls: "wd-digest-input",
                    attr: { style: "flex:1;min-width:0;padding:4px 6px;font-size:0.75rem;border-bottom:1px solid var(--wd-border)" },
                });
                taskInput.addEventListener("keydown", async (e) => {
                    if (e.key !== "Enter") return;
                    const text = taskInput.value.trim();
                    if (!text) { taskInput.remove(); return; }
                    const readme = vault.getAbstractFileByPath(proj.path + "/README.md");
                    if (readme) {
                        await appendToProjectSection(vault, readme as TFile, "任务", `- [ ] ${text}`);
                    }
                    row.removeChild(taskInput);
                    showToast(container, `已添加任务到「${proj.name}」`);
                });
                taskInput.focus();
            });

            // 归档按钮
            const archiveBtn = row.createEl("button", { text: "归档", cls: "wd-btn-sm wd-btn-ghost" });
            archiveBtn.addEventListener("click", async () => {
                const ok = confirm(`确认将「${proj.name}」归档到存档目录？\n\n路径：${ARCHIVE_DIR}/${proj.name}/`);
                if (!ok) return;

                try {
                    await moveProject(vault, proj.path, `${ARCHIVE_DIR}/${proj.name}`, plugin);
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

async function moveProject(vault: import("obsidian").Vault, fromPath: string, toPath: string, plugin: WikiDashboardPlugin) {
    const adapter = getAdapter(plugin);

    // 1. 确保目标目录存在（adapter 底层操作，不受 vault API 中文空格 bug 影响）
    const exists = await adapter.exists(toPath);
    if (!exists) {
        await adapter.mkdir(toPath);
    }

    // 2. 获取源目录下所有文件
    const allFiles = vault.getFiles().filter(f => f.path.startsWith(fromPath + "/"));

    // 3. 逐个移动（adapter.rename 底层重命名）
    for (const file of allFiles) {
        const relative = file.path.substring(fromPath.length);
        const destPath = toPath + relative;
        try {
            await adapter.rename(file.path, destPath);
        } catch (e: any) {
            throw new Error(`移动 ${file.name} 失败：${e?.message || e}`);
        }
    }

    // 4. 删除空的源目录
    try {
        await adapter.rmdir(fromPath);
    } catch { /* ignore */ }
}

async function countProjectTasks(vault: import("obsidian").Vault, projPath: string): Promise<number> {
    // 取项目名（最后一段路径）
    const projName = projPath.split("/").pop() || "";
    // 扫描最近的 md 文件，搜索关联到该项目的未完成任务
    const files = vault.getMarkdownFiles()
        .filter(f => !f.path.startsWith(".obsidian/") && !f.path.startsWith("raw/"))
        .slice(0, 150);

    let count = 0;
    for (const f of files) {
        if (count >= 20) break;
        const content = await vault.read(f);
        // 匹配 - [ ] ... 🗂 [[...项目名...]] 或包含项目 wikilink
        const regex = new RegExp(`- \\[ \\].*?\\[\\[${projName}\\]\\]|🗂.*?\\[\\[.*?${projName}.*?\\]\\]`, "i");
        const matches = content.match(new RegExp(regex.source, "g"));
        if (matches) count += matches.length;
    }
    return count;
}

async function generateReadmeFromDir(vault: import("obsidian").Vault, dirPath: string, name: string): Promise<string> {
    const dir = vault.getAbstractFileByPath(dirPath);
    if (!dir || !(dir as any).children) return `# ${name}\n\n## 目标\n\n## 任务\n\n## 记录\n`;

    const children = (dir as any).children as Array<any>;
    const subDirs = children.filter((c: any) => c.children !== undefined);
    const rootFiles = children.filter((c: any) => c.children === undefined && c.name.endsWith(".md"));

    // 递归统计所有文件
    const allFiles = vault.getFiles().filter(f => f.path.startsWith(dirPath + "/"));
    const fileCount = allFiles.length;

    let readme = `# ${name}\n\n`;
    readme += `> 来源：\`${dirPath}/\`（${fileCount} 文件 / ${subDirs.length} 子目录）\n\n`;
    readme += `## 目标\n\n\n\n`;

    if (subDirs.length > 0) {
        readme += `## 子模块\n\n`;
        for (const d of subDirs.slice(0, 12)) {
            const subFiles = allFiles.filter(f => f.path.startsWith(d.path + "/"));
            readme += `- **${d.name}** — ${subFiles.length} 文件\n`;
        }
        readme += `\n`;
    }

    if (rootFiles.length > 0) {
        readme += `## 关键文档\n\n`;
        for (const f of rootFiles.slice(0, 10)) {
            const linkName = f.name.replace(/\.md$/, "");
            readme += `- [[${f.path}|${linkName}]]\n`;
        }
        readme += `\n`;
    }

    readme += `## 任务\n\n`;
    readme += "```tasks\nnot done\ndescription includes " + name + "\n```\n\n";
    readme += `## 记录\n`;
    return readme;
}

async function appendToProjectSection(vault: import("obsidian").Vault, file: TFile, sectionName: string, content: string) {
    const text = await vault.read(file);
    const lines = text.split("\n");
    let sectionIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === `## ${sectionName}`) { sectionIdx = i; break; }
    }
    if (sectionIdx === -1) {
        await vault.append(file, `\n## ${sectionName}\n\n${content}\n`);
        return;
    }
    let nextIdx = lines.length;
    for (let i = sectionIdx + 1; i < lines.length; i++) {
        if (lines[i].match(/^## /)) { nextIdx = i; break; }
    }
    let insertIdx = nextIdx - 1;
    while (insertIdx > sectionIdx && lines[insertIdx].trim() === "") insertIdx--;
    insertIdx++;
    lines.splice(insertIdx, 0, content);
    await vault.modify(file, lines.join("\n"));
}

function showToast(container: HTMLElement, msg: string, kind: "ok" | "err" = "ok") {
    const existing = container.querySelector(".wd-toast");
    if (existing) existing.remove();
    const t = container.createDiv({ cls: `wd-toast wd-toast-${kind === "err" ? "err" : "ok"}` });
    t.setText(msg);
    setTimeout(() => { t.classList.add("wd-toast-out"); setTimeout(() => t.remove(), 300); }, 2000);
}
