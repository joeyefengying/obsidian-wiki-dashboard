import type WikiDashboardPlugin from "../../main";
import { TFile } from "obsidian";
import { getDailyPath, ensureDailyFile, appendToDailySection } from "../utils/vault-utils";

/**
 * 速记 Tab — 快速捕获想法，像真实编辑器一样点击按钮即插入模板
 */
export async function renderCaptureTab(container: HTMLElement, plugin: WikiDashboardPlugin) {
    const vault = plugin.app.vault;
    const now = new Date();
    const dailyPath = getDailyPath(now);

    // ── 快捷模板按钮 ──
    const quickHint = container.createDiv({ cls: "wd-capture-quick-hint" });
    quickHint.createSpan({ text: "点击按钮在输入框中插入格式模板：" });

    const quickRow = container.createDiv({ cls: "wd-capture-quick" });
    const quickItems = [
        { label: "💡 想法", template: "", hint: "光标定位到输入框" },
        { label: "✅ 待办", template: "- [ ] ", hint: "插入任务复选框" },
        { label: "📌 重点", template: "> [!important]\n> ", hint: "插入高亮 callout" },
        { label: "🔗 链接", template: "- [ ] 阅读：", hint: "插入待阅链接任务" },
    ];

    let inputEl: HTMLTextAreaElement;

    for (const qi of quickItems) {
        const btn = quickRow.createEl("button", { text: qi.label, cls: "wd-btn-sm wd-btn-ghost" });
        btn.addEventListener("click", () => {
            if (qi.template) {
                insertAtCursor(inputEl, qi.template);
            }
            inputEl.focus();
            showToast(container, `${qi.label}：${qi.hint}`);
        });
    }

    // ── 输入区 ──
    const inputSection = container.createDiv({ cls: "wd-section" });
    inputSection.createDiv({ text: "快速记录", cls: "wd-section-title" });
    const inputBody = inputSection.createDiv({ cls: "wd-section-body" });

    inputEl = inputBody.createEl("textarea", {
        placeholder: "在这里写内容，或点击上方按钮插入格式模板。Ctrl+Enter 保存到日报。",
        cls: "wd-capture-input",
        attr: { rows: "10" },
    });

    const optionsRow = inputBody.createDiv({ cls: "wd-capture-options" });
    const tagInput = optionsRow.createEl("input", {
        type: "text",
        placeholder: "标签（可选，逗号分隔）",
        cls: "wd-capture-tag-input",
    });
    const saveBtn = optionsRow.createEl("button", { text: "保存到日报", cls: "wd-btn wd-btn-fill" });

    const doSave = async () => {
        let content = inputEl.value.trim();
        if (!content) return;

        // 追加标签
        const tags = tagInput.value.trim();
        if (tags) {
            const tagStr = tags.split(/[,，]/).map(t => t.trim()).filter(Boolean).map(t => `#${t}`).join(" ");
            content += ` ${tagStr}`;
        }
        // 加时间戳
        content = `\n> ${now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}\n${content}`;

        const file = await ensureDailyFile(vault, dailyPath);
        await appendToDailySection(vault, file, "日常记录", content);

        inputEl.value = "";
        tagInput.value = "";
        showSaveToast(container);
    };

    saveBtn.addEventListener("click", doSave);
    inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            doSave();
        }
    });

    // ── 日报预览 ──
    const historySection = container.createDiv({ cls: "wd-section" });
    historySection.createDiv({ text: "日报预览", cls: "wd-section-title" });
    const historyBody = historySection.createDiv({ cls: "wd-section-body" });

    const dailyFile = vault.getAbstractFileByPath(dailyPath);
    if (dailyFile instanceof TFile) {
        try {
            const content = await vault.read(dailyFile);
            const lines = content.split("\n").reverse();
            const snippets: string[] = [];
            let count = 0;
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith(">") && !trimmed.startsWith("```") && !trimmed.startsWith("%%")) {
                    snippets.push(trimmed);
                    count++;
                    if (count >= 8) break;
                }
            }
            if (snippets.length > 0) {
                const list = historyBody.createDiv({ cls: "wd-capture-history" });
                for (const s of snippets) {
                    list.createDiv({ cls: "wd-capture-history-item" }).createSpan({ text: s.length > 80 ? s.slice(0, 80) + "…" : s });
                }
            } else {
                historyBody.createDiv({ text: "日报暂无内容", cls: "wd-empty" });
            }
        } catch {
            historyBody.createDiv({ text: "无法读取日报", cls: "wd-empty" });
        }
    } else {
        historyBody.createDiv({ text: "今日日报尚未创建（添加记录时自动创建）", cls: "wd-empty" });
    }
}

// ── 工具 ──

function insertAtCursor(textarea: HTMLTextAreaElement, text: string) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    textarea.value = before + text + after;
    // 光标移到插入内容末尾
    const newPos = start + text.length;
    textarea.selectionStart = textarea.selectionEnd = newPos;
}

function showSaveToast(container: HTMLElement) {
    showToast(container, "已保存到日报");
}

function showToast(container: HTMLElement, msg: string) {
    const existing = container.querySelector(".wd-toast");
    if (existing) existing.remove();
    const t = container.createDiv({ cls: "wd-toast wd-toast-ok" });
    t.setText(msg);
    setTimeout(() => { t.classList.add("wd-toast-out"); setTimeout(() => t.remove(), 300); }, 1800);
}
