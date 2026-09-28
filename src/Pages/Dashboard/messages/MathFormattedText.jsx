import React, { useState, useCallback, useMemo, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { motion, AnimatePresence } from "framer-motion";

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
 * Downloads a file or image from a URL
 */
const triggerDownload = async (url, filename) => {
    try {
        if (!url) return;
        if (url.startsWith("data:")) {
            const link = document.createElement("a");
            link.href = url;
            link.download = filename || `vortex_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }
        const resp = await fetch(url, { mode: "cors" });
        if (!resp.ok) throw new Error("Fetch failed");
        const blob = await resp.blob();
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objUrl;
        a.download = filename || url.split("/").pop()?.split("?")[0] || `download_${Date.now()}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);
    } catch {
        window.open(url, "_blank");
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

    // 2. Enhance code blocks with top bar, language badge, and copy button
    res = res.replace(
        /<pre><code(?: class="language-([a-zA-Z0-9_\-+]+)")?>([\s\S]*?)<\/code><\/pre>/g,
        (match, lang, code) => {
            const displayLang = (lang || "code").toLowerCase();
            // Decode entities to get raw code for clipboard
            const rawCode = code
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'");
            const encoded = encodeURIComponent(rawCode);

            return `
<div class="chat-code-card my-3 rounded-xl border border-white/10 bg-[#0d1117] shadow-xl overflow-hidden text-xs sm:text-sm font-mono">
  <div class="flex items-center justify-between px-3.5 py-1.5 bg-white/[0.05] border-b border-white/10 text-white/70 select-none">
    <span class="text-[11px] font-bold uppercase tracking-wider text-cyan-400">${displayLang}</span>
    <button type="button" class="chat-copy-code-btn flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer" data-code="${encoded}">
      <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
      <span>Copy code</span>
    </button>
  </div>
  <pre class="p-3.5 overflow-x-auto text-emerald-300 leading-relaxed font-mono"><code>${code}</code></pre>
</div>`;
        }
    );

    // 3. Enhance standalone <img> tags into interactive Image Preview Cards
    res = res.replace(
        /<img src="([^"]+)" alt="([^"]*)"(?:\s*\/)?>/g,
        (match, src, alt) => {
            const isAi = src.includes("/uploads/ai/") || (alt && alt.toLowerCase().includes("generated"));
            return `
<div class="image-preview-card group relative my-3 max-w-lg rounded-2xl overflow-hidden border border-white/15 bg-black/40 shadow-xl">
  <div class="relative cursor-pointer overflow-hidden bg-black/20" data-action="zoom" data-src="${src}" data-alt="${escapeHtml(alt)}">
    <img src="${src}" alt="${escapeHtml(alt)}" loading="lazy" class="w-full max-h-[380px] object-contain rounded-t-xl transition-transform duration-300 group-hover:scale-[1.01]" />
    <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide backdrop-blur-md ${isAi ? 'bg-fuchsia-600/80 text-white border border-fuchsia-400/40 shadow-lg shadow-fuchsia-900/50' : 'bg-cyan-600/80 text-white border border-cyan-400/40 shadow-lg shadow-cyan-900/50'}">
      <span>${isAi ? '🎨 AI Generated' : '🌐 Web Image'}</span>
    </div>
    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 pointer-events-auto">
      <button type="button" class="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md flex items-center gap-1.5 transition-all shadow-lg cursor-pointer" data-action="zoom" data-src="${src}">
        🔍 Zoom
      </button>
      <button type="button" class="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md flex items-center gap-1.5 transition-all shadow-lg cursor-pointer" data-action="download" data-src="${src}">
        ⬇ Download
      </button>
    </div>
  </div>
  ${alt ? `<div class="px-3.5 py-2 text-xs text-white/70 bg-white/[0.03] border-t border-white/10 italic flex items-center gap-1.5"><span class="text-white/40">💬</span><span class="truncate">${escapeHtml(alt)}</span></div>` : ''}
</div>`;
        }
    );

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
            ADD_ATTR: ["target", "rel", "data-action", "data-src", "data-alt", "data-code", "loading", "align"],
            ADD_TAGS: ["svg", "path", "button", "table", "thead", "tbody", "tr", "th", "td"],
        });

        return clean;
    }, [text]);

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

        // 2. Zoom / Lightbox image
        const zoomEl = e.target.closest("[data-action='zoom']");
        if (zoomEl) {
            e.stopPropagation();
            const src = zoomEl.getAttribute("data-src");
            if (src) {
                if (onOpenLightbox) {
                    onOpenLightbox(src);
                } else {
                    setLocalLightboxImg(src);
                }
            }
            return;
        }

        // 3. Download image
        const dlBtn = e.target.closest("[data-action='download']");
        if (dlBtn) {
            e.stopPropagation();
            const src = dlBtn.getAttribute("data-src");
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
        </>
    );
});

MathFormattedText.displayName = "MathFormattedText";

export default MathFormattedText;
