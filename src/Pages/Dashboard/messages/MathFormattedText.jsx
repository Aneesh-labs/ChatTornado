import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Formats message text to render LaTeX math ($...$ and $$...$$)
 */
const MathFormattedText = React.memo(({ text, className = "" }) => {
    if (!text || typeof text !== "string") return null;

    const hasMath = text.includes("$");

    if (!hasMath) {
        return (
            <span className={`whitespace-pre-wrap break-words ${className}`}>
                {text}
            </span>
        );
    }

    // Split text by $$...$$ (block) and $...$ (inline)
    const mathRegex = /(\$\$[\s\S]*?\$\$|\$(?!\s)[\s\S]*?(?<!\s)\$)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mathRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push({
                type: "text",
                content: text.slice(lastIndex, match.index),
            });
        }

        const raw = match[0];
        if (raw.startsWith("$$") && raw.endsWith("$$")) {
            const math = raw.slice(2, -2).trim();
            try {
                const html = katex.renderToString(math, {
                    displayMode: true,
                    throwOnError: false,
                });
                parts.push({ type: "math-block", html, raw });
            } catch {
                parts.push({ type: "text", content: raw });
            }
        } else if (raw.startsWith("$") && raw.endsWith("$")) {
            const math = raw.slice(1, -1).trim();
            try {
                const html = katex.renderToString(math, {
                    displayMode: false,
                    throwOnError: false,
                });
                parts.push({ type: "math-inline", html, raw });
            } catch {
                parts.push({ type: "text", content: raw });
            }
        }

        lastIndex = match.index + raw.length;
    }

    if (lastIndex < text.length) {
        parts.push({
            type: "text",
            content: text.slice(lastIndex),
        });
    }

    return (
        <span className={`leading-relaxed break-words ${className}`}>
            {parts.map((p, idx) => {
                if (p.type === "math-block") {
                    return (
                        <span
                            key={idx}
                            className="block my-2 overflow-x-auto py-1 text-center select-text max-w-full"
                            dangerouslySetInnerHTML={{ __html: p.html }}
                        />
                    );
                }
                if (p.type === "math-inline") {
                    return (
                        <span
                            key={idx}
                            className="inline-block px-0.5 align-baseline select-text"
                            dangerouslySetInnerHTML={{ __html: p.html }}
                        />
                    );
                }
                return (
                    <span key={idx} className="whitespace-pre-wrap">
                        {p.content}
                    </span>
                );
            })}
        </span>
    );
});

MathFormattedText.displayName = "MathFormattedText";

export default MathFormattedText;
