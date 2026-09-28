import React, { useState, useMemo, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, Download, Monitor, Tablet, Smartphone, Code2, Play, Columns, Copy, Check } from "lucide-react";

/**
 * Builds a safe and fully runnable HTML sandbox document
 */
export const buildSandboxHtml = (code, lang = "html") => {
    if (!code) return "";
    const lowerLang = (lang || "").toLowerCase();

    // 1. SVG Graphics
    if (lowerLang === "svg" || code.trim().startsWith("<svg")) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
      color: #f8fafc;
      font-family: system-ui, -apple-system, sans-serif;
    }
    svg {
      max-width: 100%;
      height: auto;
      filter: drop-shadow(0 15px 25px rgba(0,0,0,0.5));
      transition: transform 0.3s ease;
    }
    svg:hover {
      transform: scale(1.02);
    }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
    }

    // 2. JavaScript / Console Scripts
    if (lowerLang === "javascript" || lowerLang === "js") {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JS Sandbox</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      background: #0d1117;
      color: #e6edf3;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.6;
    }
    #app {
      margin-bottom: 16px;
    }
    .console-header {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #79c0ff;
      border-bottom: 1px solid #30363d;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    #console-output {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 12px;
      min-height: 100px;
      max-height: calc(100vh - 120px);
      overflow-y: auto;
    }
    .log-line {
      border-bottom: 1px solid rgba(255,255,255,0.06);
      padding: 4px 0;
      color: #7ee787;
      word-break: break-all;
      white-space: pre-wrap;
    }
    .log-err { color: #f85149; }
    .log-warn { color: #d29922; }
    .log-info { color: #58a6ff; }
  </style>
</head>
<body>
  <div id="app"></div>
  <div id="console-output">
    <div class="console-header">⚡ Console Output</div>
  </div>
  <script>
    const cons = document.getElementById('console-output');
    const append = (msg, cls) => {
      const line = document.createElement('div');
      line.className = 'log-line ' + (cls || '');
      line.textContent = msg;
      cons.appendChild(line);
    };
    const origLog = console.log;
    const origErr = console.error;
    const origWarn = console.warn;
    const origInfo = console.info;

    console.log = (...args) => {
      origLog(...args);
      append(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
    };
    console.error = (...args) => {
      origErr(...args);
      append(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '), 'log-err');
    };
    console.warn = (...args) => {
      origWarn(...args);
      append(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '), 'log-warn');
    };
    console.info = (...args) => {
      origInfo(...args);
      append(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '), 'log-info');
    };

    window.onerror = (msg, url, line) => {
      append('⚠️ Runtime Error (line ' + line + '): ' + msg, 'log-err');
      return false;
    };

    try {
      ${code}
    } catch (err) {
      console.error(err.message || String(err));
    }
  <\/script>
</body>
</html>`;
    }

    // 3. HTML / CSS / Interactive Artifacts
    const hasDocStructure = /<html[\s>]/i.test(code) || /<!doctype/i.test(code);
    if (hasDocStructure) {
        return code;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      background: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
};

const ArtifactSandboxModal = ({ isOpen, onClose, code = "", lang = "html" }) => {
    const [viewMode, setViewMode] = useState("preview"); // 'preview', 'code', 'split'
    const [viewport, setViewport] = useState("desktop"); // 'desktop', 'tablet', 'mobile'
    const [key, setKey] = useState(0); // For forcing iframe re-run
    const [copied, setCopied] = useState(false);
    const iframeRef = useRef(null);

    const safeHtml = useMemo(() => {
        return buildSandboxHtml(code, lang);
    }, [code, lang]);

    const handleReload = () => {
        setKey((prev) => prev + 1);
    };

    const handleCopy = useCallback(() => {
        if (!code) return;
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [code]);

    const handleDownload = useCallback(() => {
        if (!code) return;
        const blob = new Blob([safeHtml], { type: lang === "svg" ? "image/svg+xml" : "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = lang === "svg" ? "svg" : lang === "js" || lang === "javascript" ? "js" : "html";
        a.download = `artifact_${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [code, safeHtml, lang]);

    if (!isOpen) return null;

    const viewportWidthClass = {
        desktop: "w-full max-w-full",
        tablet: "w-[768px] max-w-full mx-auto shadow-2xl border-x border-white/10",
        mobile: "w-[390px] max-w-full mx-auto shadow-2xl border-x border-white/10 rounded-2xl overflow-hidden",
    }[viewport];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[150] flex flex-col bg-black/90 backdrop-blur-xl"
            >
                {/* Top Control Bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e121b] border-b border-white/10 text-white select-none flex-shrink-0 gap-2 flex-wrap">
                    {/* Title & Language */}
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs tracking-wide">
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Artifact Sandbox</span>
                        </div>
                        <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-cyan-300 font-semibold">
                            {lang || "html"}
                        </span>
                    </div>

                    {/* Center: Viewport Switcher & View Modes */}
                    <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
                        {/* Preview / Code / Split tabs */}
                        <button
                            type="button"
                            onClick={() => setViewMode("preview")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                viewMode === "preview"
                                    ? "bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30"
                                    : "text-white/60 hover:text-white"
                            }`}
                            title="Interactive Live Preview"
                        >
                            <Play className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Preview</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("code")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                viewMode === "code"
                                    ? "bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30"
                                    : "text-white/60 hover:text-white"
                            }`}
                            title="Source Code"
                        >
                            <Code2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Code</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("split")}
                            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                viewMode === "split"
                                    ? "bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30"
                                    : "text-white/60 hover:text-white"
                            }`}
                            title="Split View"
                        >
                            <Columns className="w-3.5 h-3.5" />
                            <span>Split</span>
                        </button>

                        <div className="w-px h-4 bg-white/15 mx-1" />

                        {/* Viewport size toggles (for preview) */}
                        <button
                            type="button"
                            onClick={() => setViewport("desktop")}
                            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                viewport === "desktop" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
                            }`}
                            title="Desktop View"
                        >
                            <Monitor className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewport("tablet")}
                            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                viewport === "tablet" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
                            }`}
                            title="Tablet View (768px)"
                        >
                            <Tablet className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewport("mobile")}
                            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                viewport === "mobile" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
                            }`}
                            title="Mobile View (390px)"
                        >
                            <Smartphone className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleReload}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                            title="Re-run / Refresh Sandbox"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                            title="Copy Code"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                            title="Download Standalone HTML File"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 transition-colors ml-1 cursor-pointer"
                            title="Close Sandbox"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden relative flex bg-[#07090e]">
                    {/* Code Pane (shown in 'code' or 'split' mode) */}
                    {(viewMode === "code" || viewMode === "split") && (
                        <div
                            className={`${
                                viewMode === "split" ? "w-1/2 border-r border-white/10" : "w-full"
                            } h-full overflow-auto bg-[#0d1117] p-4 text-xs sm:text-sm font-mono text-emerald-300 select-text custom-scrollbar`}
                        >
                            <pre className="whitespace-pre leading-relaxed">{code}</pre>
                        </div>
                    )}

                    {/* Preview Pane (shown in 'preview' or 'split' mode) */}
                    {(viewMode === "preview" || viewMode === "split") && (
                        <div
                            className={`${
                                viewMode === "split" ? "w-1/2" : "w-full"
                            } h-full flex items-center justify-center p-2 sm:p-4 overflow-auto bg-[#05070a]`}
                        >
                            <div className={`${viewportWidthClass} h-full transition-all duration-300 rounded-xl overflow-hidden bg-white shadow-2xl relative`}>
                                <iframe
                                    key={key}
                                    ref={iframeRef}
                                    title="Artifact Live Sandbox"
                                    sandbox="allow-scripts allow-modals"
                                    srcDoc={safeHtml}
                                    className="w-full h-full border-0 block bg-[#0f172a]"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

ArtifactSandboxModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    code: PropTypes.string,
    lang: PropTypes.string,
};

export default ArtifactSandboxModal;
