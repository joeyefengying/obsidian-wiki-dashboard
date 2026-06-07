import type WikiDashboardPlugin from "../../main";
import { TFile } from "obsidian";

/**
 * 速记 Tab — 快速捕获想法，追加到今日日记
 */
export async function renderCaptureTab(container: HTMLElement, plugin: WikiDashboardPlugin) {
    const vault = plugin.app.vault;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const dailyPath = `周期笔记/${y}-${m}-${d}.md`;

    // ── 快捷操作行 ──
    const quickRow = container.createDiv({ cls: "wd-capture-quick" });
    
    const quickItems = [
        { label: "💡 想法", prefix: "" },
        { label: "✅ 待办", prefix: "- [ ] " },
        { label: "📌 重点", prefix: "> [!important]\n> " },
        { label: "🔗 链接", prefix: "- [ ] 阅读：" },
    ];

    let activePrefix = "";

    for (const qi of quickItems) {
        const btn = quickRow.createEl("button", { text: qi.label, cls: "wd-btn-sm wd-btn-cmd" });
        btn.addEventListener("click", () => {
            activePrefix = qi.prefix;
            // 高亮当前选中
            quickRow.querySelectorAll(".wd-btn-sm").forEach(b => b.classList.remove("is-active"));
            btn.classList.add("is-active");
            inputEl.focus();
        });
    }

    // ── 输入区 ──
    const inputSection = container.createDiv({ cls: "wd-section" });
    inputSection.createDiv({ text: "快速记录", cls: "wd-section-title" });

    const inputBody = inputSection.createDiv({ cls: "wd-section-body" });
    const inputEl = inputBody.createEl("textarea", {
        placeholder: "写下任何想法，Ctrl+Enter 保存…\n\n支持多行。可以用 ## 标题、列表、callout 等 Markdown。",
        cls: "wd-capture-input",
        attr: { rows: "8" },
    });

    // 目标选择
    const optionsRow = inputBody.createDiv({ cls: "wd-capture-options" });
    
    const targetSelect = optionsRow.createEl("select", { cls: "wd-task-target-select" });
    targetSelect.createEl("option", { text: "今日日记", value: dailyPath });
    targetSelect.createEl("option", { text: "inbox", value: "inbox.md" });

    // 追加标签
    const tagInput = optionsRow.createEl("input", {
        type: "text",
        placeholder: "标签（可选，逗号分隔）",
        cls: "wd-capture-tag-input",
    });

    // 保存按钮
    const saveBtn = optionsRow.createEl("button", { text: "保存", cls: "wd-btn wd-btn-fill" });

    // ── 保存逻辑 ──
    const doSave = async () => {
        let content = inputEl.value.trim();
        if (!content) return;

        // 添加前缀
        if (activePrefix) {
            content = activePrefix + content;
        }

        // 添加标签
        const tags = tagInput.value.trim();
        if (tags) {
            const tagStr = tags.split(/[,，]/).map(t => t.trim()).filter(Boolean).map(t => `#${t}`).join(" ");
            content += ` ${tagStr}`;
        }

        // 追加到目标文件
        const targetPath = targetSelect.value;
        const file = vault.getAbstractFileByPath(targetPath);

        const timestamp = `\n> ${now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}\n`;
        const entry = `\n${content}${timestamp}\n`;

        if (file instanceof TFile) {
            await vault.append(file, entry);
        } else {
            const header = targetPath === "inbox.md"
                ? `# 收集箱\n\n`
                : `# ${y}-${m}-${d}\n\n`;
            await vault.create(targetPath, header + entry);
        }

        // 清空并显示成功
        inputEl.value = "";
        tagInput.value = "";
        activePrefix = "";
        quickRow.querySelectorAll(".wd-btn-sm").forEach(b => b.classList.remove("is-active"));

        // Toast
        showSaveToast(container, "已保存");
    };

    saveBtn.addEventListener("click", doSave);

    // Ctrl+Enter 保存
    inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            doSave();
        }
    });

    // ── 历史记录 ──
    const historySection = container.createDiv({ cls: "wd-section" });
    historySection.createDiv({ text: "最近记录", cls: "wd-section-title" });
    const historyBody = historySection.createDiv({ cls: "wd-section-body" });

    // 读取今日日记最近内容
    const dailyFile = vault.getAbstractFileByPath(dailyPath);
    if (dailyFile instanceof TFile) {
        try {
            const content = await vault.read(dailyFile);
            const lines = content.split("\n").reverse();
            const snippets: string[] = [];
            let count = 0;

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith(">")) {
                    snippets.push(trimmed);
                    count++;
                    if (count >= 8) break;
                }
            }

            if (snippets.length > 0) {
                const list = historyBody.createDiv({ cls: "wd-capture-history" });
                for (const s of snippets) {
                    const item = list.createDiv({ cls: "wd-capture-history-item" });
                    item.createSpan({ text: s.length > 80 ? s.slice(0, 80) + "…" : s });
                }
            } else {
                historyBody.createDiv({ text: "暂无记录", cls: "wd-empty" });
            }
        } catch {
            historyBody.createDiv({ text: "无法读取日记", cls: "wd-empty" });
        }
    } else {
        historyBody.createDiv({ text: "今日日记尚未创建", cls: "wd-empty" });
    }
}

function showSaveToast(container: HTMLElement, msg: string) {
    const existing = container.querySelector(".wd-toast");
    if (existing) existing.remove();

    const t = container.createDiv({ cls: "wd-toast wd-toast-ok" });
    t.setText(msg);
    setTimeout(() => {
        t.classList.add("wd-toast-out");
        setTimeout(() => t.remove(), 300);
    }, 2000);
}
