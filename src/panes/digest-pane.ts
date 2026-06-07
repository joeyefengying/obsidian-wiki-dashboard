import type WikiDashboardPlugin from "../../main";

export async function renderDigestPane(container: HTMLElement, plugin: WikiDashboardPlugin) {
    container.empty();

    // ── 区块标题 ──
    const section = container.createDiv({ cls: "wd-section" });
    const sectionHeader = section.createDiv({ cls: "wd-section-header" });
    sectionHeader.createSpan({ text: "快速消化", cls: "wd-section-title" });
    sectionHeader.createSpan({ text: "URL / 文件路径 → Claude Code", cls: "wd-section-hint" });

    const body = section.createDiv({ cls: "wd-section-body" });

    // ── 输入行 ──
    const inputRow = body.createDiv({ cls: "wd-digest-input-row" });
    const input = inputRow.createEl("input", {
        type: "text",
        placeholder: "粘贴 URL 或文件路径…",
        cls: "wd-digest-input",
    });

    // ── 按钮行 ──
    const btnRow = body.createDiv({ cls: "wd-digest-btns" });

    const digestBtn = createBtn(btnRow, "消化外链", true);
    const localBtn = createBtn(btnRow, "原地消化", false);
    const aiNewsBtn = createBtn(btnRow, "AI 资讯", false);
    const executeBtn = createBtn(btnRow, "▶ 直接执行", true);

    // ── 消化外链 ──
    digestBtn.addEventListener("click", () => {
        const val = input.value.trim();
        if (!val) { toast(body, "请先输入 URL", "warn"); return; }
        copy(`/llm-wiki 消化 ${val}`, body, "已复制消化命令");
    });

    // ── 原地消化 ──
    localBtn.addEventListener("click", () => {
        const val = input.value.trim();
        if (!val) { toast(body, "请先输入文件路径", "warn"); return; }
        copy(`/llm-wiki 原地消化 ${val}`, body, "已复制原地消化命令");
    });

    // ── AI 资讯 ──
    aiNewsBtn.addEventListener("click", () => {
        copy("看一下今天 AI 圈有什么", body, "已复制 AI 资讯命令");
    });

    // ── 直接执行 ──
    executeBtn.addEventListener("click", async () => {
        const val = input.value.trim();
        if (!val) { toast(body, "请先输入 URL", "warn"); return; }
        
        const cmd = `claude --prompt "/llm-wiki 消化 ${val}"`;
        toast(body, `尝试执行: ${cmd}`, "info");

        try {
            // 通过 clipboard + 通知的方式 — 最跨平台的执行方案
            const copied = await navigator.clipboard.writeText(cmd);
            toast(body, "命令已复制。请切换到 Claude Code 终端粘贴执行", "ok");
        } catch {
            // fallback: 如果连 clipboard 都不行（极小概率）
            toast(body, "请手动复制命令", "warn");
        }
    });

    // ── 回车触发 ──
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") digestBtn.click();
    });

    // ── 提示 ──
    const hint = body.createDiv({ cls: "wd-digest-hint" });
    hint.createSpan({ text: "公众号 · 推文 · 网页文章 · 本地 .md · PDF" });
}

// ── 工具函数 ──

function createBtn(parent: HTMLElement, text: string, primary: boolean): HTMLButtonElement {
    const btn = parent.createEl("button", {
        text,
        cls: `wd-btn ${primary ? "wd-btn-fill" : "wd-btn-ghost"}`,
    });
    return btn;
}

function copy(text: string, container: HTMLElement, msg: string) {
    navigator.clipboard.writeText(text).then(() => {
        toast(container, msg, "ok");
    }).catch(() => {
        toast(container, "复制失败", "err");
    });
}

function toast(container: HTMLElement, msg: string, kind: "ok" | "warn" | "err" | "info") {
    const existing = container.querySelector(".wd-toast");
    if (existing) existing.remove();

    const t = container.createDiv({ cls: `wd-toast wd-toast-${kind}` });
    t.setText(msg);
    setTimeout(() => {
        t.classList.add("wd-toast-out");
        setTimeout(() => t.remove(), 300);
    }, 2200);
}
