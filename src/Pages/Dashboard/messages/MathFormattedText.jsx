import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { motion, AnimatePresence } from "framer-motion";
import ArtifactSandboxModal, { buildSandboxHtml } from "./ArtifactSandboxModal";
import API from "../../../Services/API.js";

/**
 * Escape HTML special characters
 */
const escapeHtml = (str) => {
    if (!str || typeof str !== "string") return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

/**
 * Resolves relative /uploads/... paths to the absolute backend API URL
 */
const resolveMediaUrl = (url) => {
    if (!url || typeof url !== "string") return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
        return url;
    }
    if (url.startsWith("/uploads/")) {
        const apiBase = API?.defaults?.baseURL ? API.defaults.baseURL.replace(/\/+$/, "") : "";
        return `${apiBase}${url}`;
    }
    return url;
};

/**
 * Downloads a file or image from a URL
 */
const triggerDownload = async (url, filename) => {
    try {
        if (!url) return;
        const resolved = resolveMediaUrl(url);
        if (resolved.startsWith("data:")) {
            const link = document.createElement("a");
            link.href = resolved;
            link.download = filename || `vortex_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }
        const resp = await fetch(resolved, { mode: "cors" });
        if (!resp.ok) throw new Error("Fetch failed");
        const blob = await resp.blob();
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objUrl;
        a.download = filename || resolved.split("/").pop()?.split("?")[0] || `download_${Date.now()}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);
    } catch {
        window.open(resolveMediaUrl(url), "_blank");
    }
};

/**
 * Protects LaTeX math before markdown parsing
 */
const protectMath = (text) => {
    if (!text || typeof text !== "string") return { processed: "", mathMap: {} };

    const mathMap = {};
    let counter = 0;

    // 1. Auto-convert standalone image URLs on their own lines into markdown images
    let processed = text.replace(
        /(?:^|\n)(https?:\/\/[^\s<>"']+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s<>"']*)?|\/uploads\/[^\s<>"']+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s<>"']*)?)(?=$|\n)/gi,
        (match, url) => `\n![Image](${url.trim()})\n`
    );

    // 2. Block math patterns: $$...$$, \[...\], \begin{...}...\end{...}
    const blockMathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\begin\{(equation|align|gather|matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|cases)\*?\}[\s\S]*?\\end\{\2\*?\})/g;

    processed = processed.replace(blockMathRegex, (match) => {
        const token = `@@KATEX_BLOCK_${counter++}@@`;
        let mathContent = match;
        if (match.startsWith("$$") && match.endsWith("$$")) {
            mathContent = match.slice(2, -2).trim();
        } else if (match.startsWith("\\[") && match.endsWith("\\]")) {
            mathContent = match.slice(2, -2).trim();
        }
        mathMap[token] = { raw: mathContent, displayMode: true };
        return token;
    });

    // 3. Inline math patterns: \(...\), $...$
    const inlineParenRegex = /\\\([\s\S]*?\\\)/g;
    processed = processed.replace(inlineParenRegex, (match) => {
        const token = `@@KATEX_INLINE_${counter++}@@`;
        const mathContent = match.slice(2, -2).trim();
        mathMap[token] = { raw: mathContent, displayMode: false };
        return token;
    });

    const inlineDollarRegex = /(?<!\\|\w|\$)\$(?!\s)([^\$\n]+?)(?<!\s)\$(?!\w|\$)/g;
    processed = processed.replace(inlineDollarRegex, (match, formula) => {
        const token = `@@KATEX_INLINE_${counter++}@@`;
        mathMap[token] = { raw: formula.trim(), displayMode: false };
        return token;
    });

    return { processed, mathMap };
};

/**
 * Restores KaTeX formulas from saved tokens
 */
const restoreMath = (html, mathMap) => {
    let result = html;
    for (const [token, item] of Object.entries(mathMap)) {
        try {
            const katexHtml = katex.renderToString(item.raw, {
                displayMode: item.displayMode,
                throwOnError: false,
            });
            if (item.displayMode) {
                result = result.replace(
                    token,
                    `<div class="katex-block-wrapper my-2.5 overflow-x-auto py-1 text-center max-w-full select-text">${katexHtml}</div>`
                );
            } else {
                result = result.replace(
                    token,
                    `<span class="katex-inline-wrapper px-0.5 align-baseline select-text">${katexHtml}</span>`
                );
            }
        } catch {
            result = result.replace(
                token,
                `<span class="text-amber-400 font-mono text-xs">${escapeHtml(item.raw)}</span>`
            );
        }
    }
    return result;
};

/**
 * Post-processes HTML from marked: wraps tables, enhances code blocks, images, links
 */
const postProcessHtml = (html) => {
    if (!html) return "";

    // 1. Wrap tables in responsive scroll container with sleek styling
    let res = html.replace(
        /<table>/g,
        '<div class="chat-table-wrapper my-3 overflow-x-auto rounded-xl border border-white/15 bg-white/[0.04] shadow-lg max-w-full"><table class="chat-table min-w-full text-left text-xs sm:text-sm border-collapse divide-y divide-white/10">'
    );
    res = res.replace(/<\/table>/g, "</table></div>");

    // 2. Enhance code blocks with top bar, language badge, runnable sandbox tabs, and copy button
    res = res.replace(
        /<pre><code(?: class="language-([a-zA-Z0-9_\-+]+)")?>([\s\S]*?)<\/code><\/pre>/g,
        (match, lang, code) => {
            const displayLang = (lang || "code").toLowerCase();
            // Decode entities to get raw code for clipboard and runner
            const rawCode = code
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'");
            const encoded = encodeURIComponent(rawCode);

            // Determine if code block is runnable interactive artifact
            const isRunnable = [
                "html", "htm", "svg", "javascript", "js", "web", "jsx"
            ].includes(displayLang) ||
                rawCode.includes("<!DOCTYPE") ||
                rawCode.includes("<html") ||
                rawCode.includes("<svg") ||
                rawCode.includes("<canvas") ||
                rawCode.includes("<button") ||
                (displayLang === "xml" && rawCode.includes("<svg"));

            return `
<div class="chat-code-card my-3 rounded-xl border border-white/10 bg-[#0d1117] shadow-xl overflow-hidden text-xs sm:text-sm font-mono" data-card-code="${encoded}" data-card-lang="${displayLang}">
  <div class="flex items-center justify-between px-3.5 py-1.5 bg-white/[0.05] border-b border-white/10 text-white/70 select-none flex-wrap gap-1.5">
    <div class="flex items-center gap-2">
      <span class="text-[11px] font-bold uppercase tracking-wider text-cyan-400">${displayLang}</span>
      ${isRunnable ? `
      <div class="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-white/10">
        <button type="button" class="chat-code-tab-btn active px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer" data-action="tab-code">
          💻 Code
        </button>
        <button type="button" class="chat-preview-tab-btn px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-400/90 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all cursor-pointer" data-action="tab-preview">
          ▶ Preview
        </button>
      </div>` : ''}
    </div>
    <div class="flex items-center gap-1.5">
      ${isRunnable ? `
      <button type="button" class="chat-fullscreen-btn flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-colors cursor-pointer" data-action="fullscreen" title="Open Fullscreen Artifact Sandbox">
        <svg class="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
        <span>Expand</span>
      </button>` : ''}
      <button type="button" class="chat-copy-code-btn flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer" data-code="${encoded}">
        <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
        <span>Copy code</span>
      </button>
    </div>
  </div>
  <pre class="chat-code-pre p-3.5 overflow-x-auto text-emerald-300 leading-relaxed font-mono"><code>${code}</code></pre>
  ${isRunnable ? `
  <div class="chat-preview-container hidden w-full bg-[#0a0d14] border-t border-white/10 p-2 sm:p-3">
    <div class="w-full h-[320px] rounded-lg overflow-hidden border border-white/10 bg-[#0f172a] relative">
      <iframe class="chat-sandbox-iframe w-full h-full border-0 block" sandbox="allow-scripts allow-modals" loading="lazy"></iframe>
    </div>
  </div>` : ''}
</div>`;
        }
    );

    // 3. Enhance standalone <img> tags into interactive Image Preview Cards
    res = res.replace(/<img\s+([^>]+)>/g, (match, attrs) => {
        const srcMatch = attrs.match(/src="([^"]+)"/);
        const altMatch = attrs.match(/alt="([^"]*)"/);
        const rawSrc = srcMatch ? srcMatch[1] : "";
        const rawAlt = altMatch ? altMatch[1] : "";
        if (!rawSrc) return match;

        const isAi = rawSrc.includes("/uploads/ai/") || (rawAlt && rawAlt.toLowerCase().includes("generated"));
        const resolvedSrc = resolveMediaUrl(rawSrc);
        const cleanPrompt = rawAlt || "";
        const fallbackPollination = isAi
            ? `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt || "ai artwork")}?width=1024&height=1024&nologo=true`
            : "";
        const displayAlt = isAi ? "AI Generated Artwork" : (escapeHtml(cleanPrompt) || "Image");

        return `
<div class="image-preview-card group relative my-3 max-w-lg rounded-2xl overflow-hidden border border-white/15 bg-black/40 shadow-xl">
  <div class="relative cursor-pointer overflow-hidden bg-black/20" data-action="zoom" data-src="${resolvedSrc}" data-alt="${escapeHtml(cleanPrompt)}">
    <img src="${resolvedSrc}" alt="${displayAlt}" data-src="${resolvedSrc}" data-fallback="${fallbackPollination}" data-prompt="${escapeHtml(cleanPrompt)}" loading="lazy" class="w-full max-h-[380px] object-contain rounded-t-xl transition-transform duration-300 group-hover:scale-[1.01]" />
    <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide backdrop-blur-md ${isAi ? 'bg-fuchsia-600/80 text-white border border-fuchsia-400/40 shadow-lg shadow-fuchsia-900/50' : 'bg-cyan-600/80 text-white border border-cyan-400/40 shadow-lg shadow-cyan-900/50'}">
      <span>${isAi ? '🎨 AI Generated' : '🌐 Web Image'}</span>
    </div>
    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 pointer-events-auto">
      <button type="button" class="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md flex items-center gap-1.5 transition-all shadow-lg cursor-pointer" data-action="zoom" data-src="${resolvedSrc}">
        🔍 Zoom
      </button>
      <button type="button" class="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md flex items-center gap-1.5 transition-all shadow-lg cursor-pointer" data-action="download" data-src="${resolvedSrc}">
        ⬇ Download
      </button>
    </div>
  </div>
  ${cleanPrompt ? `<div class="px-3.5 py-2 text-xs text-white/70 bg-white/[0.03] border-t border-white/10 italic flex items-center gap-1.5"><span class="text-white/40">💬</span><span class="truncate" title="${escapeHtml(cleanPrompt)}">${escapeHtml(cleanPrompt)}</span></div>` : ''}
</div>`;
    });

    // 4. Ensure links open safely in new tab with arrow icon
    res = res.replace(
        /<a href="([^"]+)">([\s\S]*?)<\/a>/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors font-medium inline-flex items-center gap-0.5">$2 <span class="text-[10px] opacity-75 font-normal">↗</span></a>'
    );

    return res;
};

/**
 * Configure marked defaults once
 */
marked.setOptions({
    gfm: true,
    breaks: true,
});

/**
 * Master Rich Content & Math Renderer
 */
const MathFormattedText = React.memo(({ text, className = "", onOpenLightbox }) => {
    const containerRef = useRef(null);
    const [localLightboxImg, setLocalLightboxImg] = useState(null);
    const [sandboxModalData, setSandboxModalData] = useState(null);

    // Compute parsed and sanitized HTML
    const sanitizedHtml = useMemo(() => {
        if (!text || typeof text !== "string") return "";

        // 1. Protect Math & pre-process images
        const { processed, mathMap } = protectMath(text);

        // 2. Parse Markdown with marked
        let rawHtml = "";
        try {
            rawHtml = marked.parse(processed);
        } catch {
            rawHtml = escapeHtml(processed);
        }

        // 3. Post-process tables, code blocks, images, links
        const enrichedHtml = postProcessHtml(rawHtml);

        // 4. Restore Math
        const withMath = restoreMath(enrichedHtml, mathMap);

        // 5. Sanitize with DOMPurify
        const clean = DOMPurify.sanitize(withMath, {
            ADD_ATTR: [
                "target", "rel", "data-action", "data-src", "data-alt", "data-prompt",
                "data-fallback", "data-fallback-applied", "data-code",
                "data-card-code", "data-card-lang", "loading", "align", "sandbox", "srcdoc"
            ],
            ADD_TAGS: ["svg", "path", "button", "table", "thead", "tbody", "tr", "th", "td", "iframe"],
        });

        return clean;
    }, [text]);

    // Resilient fallback handler for broken/ephemeral image loads (capture phase)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleImgError = (e) => {
            const target = e.target;
            if (target && target.tagName === "IMG") {
                const fallback = target.getAttribute("data-fallback");
                if (fallback && !target.dataset.fallbackApplied) {
                    target.dataset.fallbackApplied = "true";
                    target.src = fallback;
                    const parentAction = target.closest("[data-action='zoom']");
                    if (parentAction) {
                        parentAction.setAttribute("data-src", fallback);
                    }
                    const parentCard = target.closest(".image-preview-card");
                    if (parentCard) {
                        const dlBtn = parentCard.querySelector("[data-action='download']");
                        if (dlBtn) dlBtn.setAttribute("data-src", fallback);
                    }
                }
            }
        };

        container.addEventListener("error", handleImgError, true);
        return () => container.removeEventListener("error", handleImgError, true);
    }, [sanitizedHtml]);

    // Handle delegated clicks inside rendered markdown
    const handleContainerClick = useCallback((e) => {
        // 1. Copy code button
        const copyBtn = e.target.closest(".chat-copy-code-btn");
        if (copyBtn) {
            e.stopPropagation();
            const codeEncoded = copyBtn.getAttribute("data-code");
            if (codeEncoded) {
                const rawCode = decodeURIComponent(codeEncoded);
                navigator.clipboard.writeText(rawCode).then(() => {
                    const span = copyBtn.querySelector("span");
                    if (span) {
                        const oldText = span.textContent;
                        span.textContent = "Copied! ✓";
                        copyBtn.classList.add("text-emerald-400");
                        setTimeout(() => {
                            span.textContent = oldText;
                            copyBtn.classList.remove("text-emerald-400");
                        }, 2000);
                    }
                });
            }
            return;
        }

        // 2. Tab Preview Click
        const previewTabBtn = e.target.closest("[data-action='tab-preview']");
        if (previewTabBtn) {
            e.stopPropagation();
            const card = previewTabBtn.closest(".chat-code-card");
            if (card) {
                const pre = card.querySelector(".chat-code-pre");
                const previewContainer = card.querySelector(".chat-preview-container");
                const codeBtn = card.querySelector("[data-action='tab-code']");
                const iframe = card.querySelector(".chat-sandbox-iframe");
                const rawCode = decodeURIComponent(card.getAttribute("data-card-code") || "");
                const lang = card.getAttribute("data-card-lang") || "html";

                if (pre && previewContainer && iframe) {
                    pre.classList.add("hidden");
                    previewContainer.classList.remove("hidden");
                    previewTabBtn.className = "chat-preview-tab-btn active px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer";
                    if (codeBtn) {
                        codeBtn.className = "chat-code-tab-btn px-2 py-0.5 rounded text-[10px] font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer";
                    }
                    if (!iframe.srcdoc || iframe.srcdoc === "about:blank") {
                        iframe.srcdoc = buildSandboxHtml(rawCode, lang);
                    }
                }
            }
            return;
        }

        // 3. Tab Code Click
        const codeTabBtn = e.target.closest("[data-action='tab-code']");
        if (codeTabBtn) {
            e.stopPropagation();
            const card = codeTabBtn.closest(".chat-code-card");
            if (card) {
                const pre = card.querySelector(".chat-code-pre");
                const previewContainer = card.querySelector(".chat-preview-container");
                const previewBtn = card.querySelector("[data-action='tab-preview']");

                if (pre && previewContainer) {
                    previewContainer.classList.add("hidden");
                    pre.classList.remove("hidden");
                    codeTabBtn.className = "chat-code-tab-btn active px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer";
                    if (previewBtn) {
                        previewBtn.className = "chat-preview-tab-btn px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-400/90 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all cursor-pointer";
                    }
                }
            }
            return;
        }

        // 4. Fullscreen Expand Click
        const fullscreenBtn = e.target.closest("[data-action='fullscreen']");
        if (fullscreenBtn) {
            e.stopPropagation();
            const card = fullscreenBtn.closest(".chat-code-card");
            if (card) {
                const rawCode = decodeURIComponent(card.getAttribute("data-card-code") || "");
                const lang = card.getAttribute("data-card-lang") || "html";
                setSandboxModalData({ code: rawCode, lang, isOpen: true });
            }
            return;
        }

        // 5. Zoom / Lightbox image
        const zoomEl = e.target.closest("[data-action='zoom']");
        if (zoomEl) {
            e.stopPropagation();
            const activeImg = zoomEl.querySelector("img") || zoomEl.closest(".image-preview-card")?.querySelector("img");
            const src = activeImg?.src || zoomEl.getAttribute("data-src");
            if (src) {
                if (onOpenLightbox) {
                    onOpenLightbox(src);
                } else {
                    setLocalLightboxImg(src);
                }
            }
            return;
        }

        // 6. Download image
        const dlBtn = e.target.closest("[data-action='download']");
        if (dlBtn) {
            e.stopPropagation();
            const activeImg = dlBtn.closest(".image-preview-card")?.querySelector("img");
            const src = activeImg?.src || dlBtn.getAttribute("data-src");
            if (src) {
                triggerDownload(src);
            }
            return;
        }
    }, [onOpenLightbox]);

    return (
        <>
            <style>{`
                /* Scoped markdown styling for chat bubbles */
                .chat-rich-content {
                    word-break: break-word;
                }
                .chat-rich-content table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .chat-rich-content th {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: #67e8f9;
                    font-weight: 700;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    padding: 0.625rem 0.875rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
                }
                .chat-rich-content td {
                    padding: 0.5rem 0.875rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    color: rgba(255, 255, 255, 0.9);
                }
                .chat-rich-content tr:nth-child(even) {
                    background-color: rgba(255, 255, 255, 0.02);
                }
                .chat-rich-content tr:hover {
                    background-color: rgba(255, 255, 255, 0.05);
                }
                .chat-rich-content ul {
                    list-style-type: disc;
                    padding-left: 1.25rem;
                    margin: 0.5rem 0;
                }
                .chat-rich-content ol {
                    list-style-type: decimal;
                    padding-left: 1.25rem;
                    margin: 0.5rem 0;
                }
                .chat-rich-content li {
                    margin: 0.25rem 0;
                    line-height: 1.6;
                }
                .chat-rich-content h1 {
                    font-size: 1.2rem;
                    font-weight: 800;
                    margin-top: 1rem;
                    margin-bottom: 0.5rem;
                    padding-bottom: 0.25rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
                    color: #ffffff;
                }
                .chat-rich-content h2 {
                    font-size: 1.05rem;
                    font-weight: 700;
                    margin-top: 0.85rem;
                    margin-bottom: 0.4rem;
                    color: rgba(255, 255, 255, 0.95);
                }
                .chat-rich-content h3 {
                    font-size: 0.95rem;
                    font-weight: 600;
                    margin-top: 0.75rem;
                    margin-bottom: 0.3rem;
                    color: rgba(255, 255, 255, 0.9);
                }
                .chat-rich-content blockquote {
                    border-left: 4px solid #22d3ee;
                    padding-left: 0.85rem;
                    margin: 0.65rem 0;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 0 0.5rem 0.5rem 0;
                    font-style: italic;
                    color: rgba(255, 255, 255, 0.85);
                }
                .chat-rich-content code:not(pre code) {
                    background: rgba(255, 255, 255, 0.1);
                    color: #67e8f9;
                    font-family: monospace;
                    font-size: 0.85em;
                    padding: 0.15rem 0.4rem;
                    border-radius: 0.25rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .chat-rich-content pre {
                    white-space: pre;
                    word-break: normal;
                    tab-size: 4;
                    max-width: 100%;
                }
                .chat-rich-content pre code {
                    white-space: pre;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                }
                .chat-rich-content hr {
                    border: 0;
                    border-top: 1px solid rgba(255, 255, 255, 0.15);
                    margin: 1rem 0;
                }
            `}</style>

            <div
                ref={containerRef}
                onClick={handleContainerClick}
                className={`chat-rich-content leading-relaxed break-words ${className}`}
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />

            {/* Local Lightbox fallback if parent didn't provide one */}
            <AnimatePresence>
                {localLightboxImg && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
                        onClick={() => setLocalLightboxImg(null)}
                    >
                        <div className="relative max-h-[90vh] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
                            <img
                                src={localLightboxImg}
                                alt="Zoomed Preview"
                                className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain border border-white/10"
                            />
                            <div className="absolute top-3 right-3 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => triggerDownload(localLightboxImg)}
                                    className="px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md transition-colors cursor-pointer"
                                >
                                    ⬇ Download
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLocalLightboxImg(null)}
                                    className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold backdrop-blur-md transition-colors cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Fullscreen Interactive Artifact Sandbox Modal */}
            <ArtifactSandboxModal
                isOpen={Boolean(sandboxModalData?.isOpen)}
                onClose={() => setSandboxModalData(null)}
                code={sandboxModalData?.code || ""}
                lang={sandboxModalData?.lang || "html"}
            />
        </>
    );
});

MathFormattedText.displayName = "MathFormattedText";

export default MathFormattedText;
