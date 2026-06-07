import type WikiDashboardPlugin from "../../main";
import { TFile, TFolder } from "obsidian";

const ACTIVE_DIR = "PARA 管理/1. 项目";
const ARCHIVE_DIR = "PARA 管理/4. 存档";

interface TreeNode {
    name: string;
    path: string;
    children: TreeNode[];
    fileCount: number;
    taskCount: number;
    depth: number;
}

// 展开状态缓存
const expandedNodes = new Set<string>();

/**
 * 项目 Tab — 树形视图，支持多级子项目
 */
export async function renderProjectsTab(container: HTMLElement, plugin: WikiDashboardPlugin) {
    const vault = plugin.app.vault;
    const root = vault.getAbstractFileByPath(ACTIVE_DIR);

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
        const sourceDir = vault.getAbstractFileByPath(raw);
        let name: string;
        let readme: string;
        if (sourceDir && (sourceDir as any).children) {
            name = (sourceDir as any).name || raw.split("/").pop()!;
            readme = await genReadme(vault, raw, name);
        } else {
            name = raw;
            readme = `# ${name}\n\n## 目标\n\n\n\n## 任务\n\n\`\`\`tasks\nnot done\ndescription includes ${name}\n\`\`\`\n\n## 记录\n`;
        }
        try {
            await vault.create(`${ACTIVE_DIR}/${name}/README.md`, readme);
            createInput.value = "";
            container.empty(); await renderProjectsTab(container, plugin);
        } catch (e: any) {
            toast(container, `创建失败：${e?.message || e}`, "err");
        }
    });
    createInput.addEventListener("keydown", (e) => { if (e.key === "Enter") createBtn.click(); });

    // ── 树形项目列表 ──
    const treeSection = container.createDiv({ cls: "wd-section" });
    treeSection.createDiv({ text: "项目树", cls: "wd-section-title" });
    const treeBody = treeSection.createDiv({ cls: "wd-section-body" });

    if (!root || !(root as any).children) {
        treeBody.createDiv({ text: "暂无项目", cls: "wd-empty" });
        return;
    }

    const tree = await buildTree(vault, root as any, 0);
    if (tree.length === 0) {
        treeBody.createDiv({ text: "暂无项目", cls: "wd-empty" });
    } else {
        const treeEl = treeBody.createDiv({ cls: "wd-tree" });
        await renderTreeNodes(treeEl, tree, vault, plugin, container);
    }

    // ── 已归档 ──
    const archiveDir = vault.getAbstractFileByPath(ARCHIVE_DIR);
    if (archiveDir && (archiveDir as any).children) {
        const archSection = container.createDiv({ cls: "wd-section" });
        archSection.createDiv({ text: "已归档", cls: "wd-section-title" });
        const archBody = archSection.createDiv({ cls: "wd-section-body" });
        const archTree = await buildTree(vault, archiveDir as any, 0, true);
        if (archTree.length === 0) {
            archBody.createDiv({ text: "暂无归档", cls: "wd-empty" });
        } else {
            const archEl = archBody.createDiv({ cls: "wd-tree" });
            await renderTreeNodes(archEl, archTree, vault, plugin, container, true);
        }
    }
}

// ── 构建树 ──

async function buildTree(vault: import("obsidian").Vault, folder: any, depth: number, archived = false): Promise<TreeNode[]> {
    if (!folder || !folder.children) return [];
    const nodes: TreeNode[] = [];
    for (const child of folder.children) {
        if (child.children === undefined) continue; // 跳过文件
        const subDirs = (child.children as any[]).filter((c: any) => c.children !== undefined);
        const allFiles = vault.getFiles().filter(f => f.path.startsWith(child.path + "/"));
        nodes.push({
            name: child.name,
            path: child.path,
            children: subDirs.length > 0 ? await buildTree(vault, child, depth + 1, archived) : [],
            fileCount: allFiles.length,
            taskCount: 0, // 异步加载
            depth,
        });
    }
    return nodes.sort((a, b) => a.name.localeCompare(b.name));
}

// ── 递归渲染树节点 ──

async function renderTreeNodes(
    container: HTMLElement,
    nodes: TreeNode[],
    vault: import("obsidian").Vault,
    plugin: WikiDashboardPlugin,
    rootContainer: HTMLElement,
    archived = false,
) {
    for (const node of nodes) {
        const isExpanded = expandedNodes.has(node.path);
        const hasChildren = node.children.length > 0;

        const row = container.createDiv({ cls: `wd-tree-row${archived ? " is-archived" : ""}` });
        row.style.paddingLeft = `${node.depth * 20}px`;

        // 展开/折叠
        const toggle = row.createSpan({ cls: "wd-tree-toggle" });
        toggle.setText(hasChildren ? (isExpanded ? "▾" : "▸") : "·");
        if (hasChildren) {
            toggle.addEventListener("click", () => {
                if (expandedNodes.has(node.path)) {
                    expandedNodes.delete(node.path);
                } else {
                    expandedNodes.add(node.path);
                }
                rootContainer.empty();
                renderProjectsTab(rootContainer, plugin);
            });
        }

        // 节点信息
        const info = row.createDiv({ cls: "wd-tree-info" });
        const nameEl = info.createSpan({ text: node.name, cls: "wd-tree-name" });
        const metaRow = info.createDiv({ cls: "wd-tree-meta-row" });
        metaRow.createSpan({ text: `${node.fileCount} 文件`, cls: "wd-tree-meta" });

        // 异步加载任务数
        countNodeTasks(vault, node.path).then(n => {
            if (n > 0) metaRow.createSpan({ text: ` · ${n} 待办`, cls: "wd-tree-meta wd-project-task-count" });
        });

        // 操作按钮
        const btns = row.createDiv({ cls: "wd-tree-btns" });

        // 打开 README
        const openBtn = btns.createEl("button", { text: "打开", cls: "wd-btn-sm wd-btn-ghost" });
        openBtn.addEventListener("click", () => {
            plugin.app.workspace.openLinkText(node.path + "/README.md", "", false);
        });

        // 添加子项目
        if (!archived) {
            const addChildBtn = btns.createEl("button", { text: "+子", cls: "wd-btn-sm wd-btn-ghost" });
            addChildBtn.addEventListener("click", async () => {
                const name = prompt("输入子项目名称：", "");
                if (!name) return;
                try {
                    await vault.create(`${node.path}/${name}/README.md`,
                        `# ${name}\n\n## 目标\n\n\n\n## 任务\n\n\`\`\`tasks\nnot done\ndescription includes ${name}\n\`\`\`\n\n## 记录\n`);
                    rootContainer.empty();
                    await renderProjectsTab(rootContainer, plugin);
                } catch (e: any) {
                    toast(rootContainer, `创建失败：${e?.message || e}`, "err");
                }
            });
        }

        // 归档（仅一级项目）
        if (!archived && node.depth === 0) {
            const archiveBtn = btns.createEl("button", { text: "归档", cls: "wd-btn-sm wd-btn-ghost" });
            archiveBtn.addEventListener("click", async () => {
                if (!confirm(`确认将「${node.name}」归档到存档目录？`)) return;
                try {
                    await moveProject(vault, node.path, `${ARCHIVE_DIR}/${node.name}`, plugin);
                    rootContainer.empty();
                    await renderProjectsTab(rootContainer, plugin);
                } catch (e: any) {
                    toast(rootContainer, `归档失败：${e?.message || e}`, "err");
                }
            });
        }

        container.appendChild(row);

        // 递归渲染子节点
        if (hasChildren && isExpanded) {
            await renderTreeNodes(container, node.children, vault, plugin, rootContainer, archived);
        }
    }
}

// ── 工具函数 ──

async function genReadme(vault: import("obsidian").Vault, dirPath: string, name: string): Promise<string> {
    const dir = vault.getAbstractFileByPath(dirPath);
    if (!dir || !(dir as any).children) return `# ${name}\n\n## 目标\n\n## 任务\n\n## 记录\n`;
    const children = (dir as any).children as any[];
    const subDirs = children.filter((c: any) => c.children !== undefined);
    const rootFiles = children.filter((c: any) => !c.children && c.name.endsWith(".md"));
    const allFiles = vault.getFiles().filter(f => f.path.startsWith(dirPath + "/"));
    let md = `# ${name}\n\n> 来源：\`${dirPath}/\`（${allFiles.length} 文件 / ${subDirs.length} 子目录）\n\n## 目标\n\n\n\n`;
    if (subDirs.length > 0) {
        md += `## 子模块\n\n`;
        for (const d of subDirs.slice(0, 12)) {
            md += `- **${d.name}** — ${allFiles.filter(f => f.path.startsWith(d.path + "/")).length} 文件\n`;
        }
        md += `\n`;
    }
    if (rootFiles.length > 0) {
        md += `## 关键文档\n\n`;
        for (const f of rootFiles.slice(0, 10)) md += `- [[${f.path}|${f.name.replace(".md","")}]]\n`;
        md += `\n`;
    }
    md += `## 任务\n\n\`\`\`tasks\nnot done\ndescription includes ${name}\n\`\`\`\n\n## 记录\n`;
    return md;
}

async function countNodeTasks(vault: import("obsidian").Vault, nodePath: string): Promise<number> {
    const nodeName = nodePath.split("/").pop() || "";
    const files = vault.getMarkdownFiles()
        .filter(f => !f.path.startsWith(".obsidian/") && !f.path.startsWith("raw/"))
        .slice(0, 150);
    let count = 0;
    for (const f of files) {
        if (count >= 20) break;
        const content = await vault.read(f);
        const regex = new RegExp(`- \\[ \\].*?\\[\\[${nodeName}\\]\\]|🗂.*?\\[\\[.*?${nodeName}.*?\\]\\]`, "i");
        const matches = content.match(new RegExp(regex.source, "g"));
        if (matches) count += matches.length;
    }
    return count;
}

async function moveProject(vault: import("obsidian").Vault, fromPath: string, toPath: string, plugin: WikiDashboardPlugin) {
    const adapter = getAdapter(plugin);
    if (!await adapter.exists(toPath)) await adapter.mkdir(toPath);
    const files = vault.getFiles().filter(f => f.path.startsWith(fromPath + "/"));
    for (const f of files) {
        await adapter.rename(f.path, toPath + f.path.substring(fromPath.length));
    }
    try { await adapter.rmdir(fromPath); } catch { /* ignore */ }
}

function getAdapter(plugin: WikiDashboardPlugin) {
    return (plugin.app as any).vault.adapter;
}

function toast(container: HTMLElement, msg: string, kind: "ok" | "err" = "ok") {
    const existing = container.querySelector(".wd-toast");
    if (existing) existing.remove();
    const t = container.createDiv({ cls: `wd-toast wd-toast-${kind === "err" ? "err" : "ok"}` });
    t.setText(msg);
    setTimeout(() => { t.classList.add("wd-toast-out"); setTimeout(() => t.remove(), 300); }, 2000);
}
