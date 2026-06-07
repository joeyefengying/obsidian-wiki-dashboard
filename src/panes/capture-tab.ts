import type WikiDashboardPlugin from "../../main";
import { TFile } from "obsidian";
import { getDailyPath, ensureDailyFile, appendToDailySection } from "../utils/vault-utils";

/**
 * 速记 Tab — 快速捕获想法，追加到日报「日常记录」区域
 */
export async function renderCaptureTab(container: HTMLElement, plugin: WikiDashboardPlugin) {
    const vault = plugin.app.vault;
    const now = new Date();
    const dailyPath = getDailyPath(now);
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // ── 快捷前缀 ──
    const quickRow = container.createDiv({ cls: "wd-capture-quick" });
    const quickItems = [
        { label: "💡 想法", prefix: "" },
        { label: "✅ 待办", prefix: "- [ ] " },
        { label: "📌 重点", prefix: "> [!important]\n> " },
        { label: "🔗 链接", prefix: "- [ ] 阅读：" },
    ];

    let activePrefix = "";
    let inputEl: HTMLTextAreaElement;

    for (const qi of quickItems) {
        const btn = quickRow.createEl("button", { text: qi.label, cls: "wd-btn-sm wd-btn-cmd" });
        btn.addEventListener("click", () => {
            activePrefix = qi.prefix;
            quickRow.querySelectorAll(".wd-btn-sm").forEach(b => b.classList.remove("is-active"));
            btn.classList.add("is-active");
            inputEl.focus();
        });
    }

    // ── 输入区 ──
    const inputSection = container.createDiv({ cls: "wd-section" });
    inputSection.createDiv({ text: "快速记录", cls: "wd-section-title" });
    const inputBody = inputSection.createDiv({ cls: "wd-section-body" });

    inputEl = inputBody.createEl("textarea", {
        placeholder: "写下任何想法，Ctrl+Enter 保存到日报「日常记录」…",
        cls: "wd-capture-input",
        attr: { rows: "8" },
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

        if (activePrefix) content = activePrefix + content;
        const tags = tagInput.value.trim();
        if (tags) {
            const tagStr = tags.split(/[,，]/).map(t => t.trim()).filter(Boolean).map(t => `#${t}`).join(" ");
            content += ` ${tagStr}`;
        }
        content = `\n> ${now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}\n${content}`;

        const file = await ensureDailyFile(vault, dailyPath);
        await appendToDailySection(vault, file, "日常记录", content);

        inputEl.value = "";
        tagInput.value = "";
        activePrefix = "";
        quickRow.querySelectorAll(".wd-btn-sm").forEach(b => b.classList.remove("is-active"));
        showSaveToast(container);
    };

    saveBtn.addEventListener("click", doSave);
    inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            doSave();
        }
    });

    // ── 今日日报预览 ──
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

function showSaveToast(container: HTMLElement) {
    const existing = container.querySelector(".wd-toast");
    if (existing) existing.remove();
    const t = container.createDiv({ cls: "wd-toast wd-toast-ok" });
    t.setText("已保存到日报");
    setTimeout(() => { t.classList.add("wd-toast-out"); setTimeout(() => t.remove(), 300); }, 1800);
}
