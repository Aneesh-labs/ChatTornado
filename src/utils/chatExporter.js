/**
 * chatExporter.js
 * Comprehensive conversation and transcript exporter.
 * Generates Markdown, styled printable HTML / PDF, and Plain Text formats.
 */

const formatTimestamp = (dateStr) => {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr);
        return d.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    } catch {
        return dateStr;
    }
};

/**
 * Generates clean GitHub-Flavored Markdown transcript
 */
export const exportToMarkdown = (messages = [], partnerUser = null, options = {}) => {
    const { includeTimestamps = true, includeAiNotes = true } = options;
    const partnerName = partnerUser?.username || "Chat Room";
    const exportDate = new Date().toLocaleString();

    let md = `# 🌪️ ChatTornado Conversation Transcript\n\n`;
    md += `> **Conversation Partner:** ${partnerName}\n`;
    md += `> **Exported:** ${exportDate}\n`;
    md += `> **Total Messages:** ${messages.length}\n\n`;
    md += `---\n\n`;

    for (const msg of messages) {
        if (!msg) continue;
        const sender = msg.sender?.username || (msg.is_bot ? "VORTEX-9 (AI Core)" : "User");
        const time = includeTimestamps ? ` *(${formatTimestamp(msg.created_at)})*` : "";
        const text = msg.message || "";

        if (!includeAiNotes && (text.startsWith("✨ **AI Session Summary**") || msg._isSummary)) {
            continue;
        }

        md += `### **${sender}**${time}\n\n${text}\n\n---\n\n`;
    }

    return md;
};

/**
 * Generates clean Plain Text transcript
 */
export const exportToPlainText = (messages = [], partnerUser = null, options = {}) => {
    const { includeTimestamps = true } = options;
    const partnerName = partnerUser?.username || "Chat Room";
    const exportDate = new Date().toLocaleString();

    let txt = `========================================================\n`;
    txt += `  CHATTORNADO TRANSCRIPT: ${partnerName.toUpperCase()}\n`;
    txt += `  Export Date: ${exportDate}\n`;
    txt += `  Total Messages: ${messages.length}\n`;
    txt += `========================================================\n\n`;

    for (const msg of messages) {
        if (!msg) continue;
        const sender = msg.sender?.username || (msg.is_bot ? "VORTEX-9" : "User");
        const time = includeTimestamps ? ` [${formatTimestamp(msg.created_at)}]` : "";
        txt += `${sender}${time}:\n${msg.message || ""}\n\n`;
    }

    return txt;
};

/**
 * Generates styled standalone HTML with dark aesthetic and print styles for PDF saving
 */
export const exportToHtml = (messages = [], partnerUser = null, options = {}) => {
    const { includeTimestamps = true } = options;
    const partnerName = partnerUser?.username || "Chat Room";
    const exportDate = new Date().toLocaleString();

    const escape = (str) =>
        (str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    let messagesHtml = "";
    for (const msg of messages) {
        if (!msg) continue;
        const isBot = Boolean(msg.is_bot || msg.sender?.username === "VORTEX-9");
        const sender = msg.sender?.username || (isBot ? "VORTEX-9" : "User");
        const time = includeTimestamps ? formatTimestamp(msg.created_at) : "";
        const raw = escape(msg.message || "");
        // Format line breaks
        const formatted = raw.replace(/\n/g, "<br/>");

        messagesHtml += `
    <div class="message-row ${isBot ? "bot-row" : "user-row"}">
      <div class="message-meta">
        <span class="sender-name">${escape(sender)}</span>
        ${time ? `<span class="timestamp">${time}</span>` : ""}
      </div>
      <div class="message-bubble ${isBot ? "bot-bubble" : "user-bubble"}">
        ${formatted}
      </div>
    </div>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat Transcript - ${escape(partnerName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 20px;
      background: #0b0f19;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
    }
    .container {
      max-width: 820px;
      margin: 0 auto;
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      border-bottom: 1px solid #374151;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      color: #38bdf8;
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .meta-info {
      font-size: 13px;
      color: #94a3b8;
    }
    .message-row {
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
    }
    .message-meta {
      font-size: 12px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sender-name {
      font-weight: 700;
      color: #f1f5f9;
    }
    .bot-row .sender-name {
      color: #22d3ee;
    }
    .timestamp {
      color: #64748b;
      font-size: 11px;
    }
    .message-bubble {
      padding: 14px 18px;
      border-radius: 14px;
      font-size: 14px;
      word-break: break-word;
      background: #1e293b;
      border: 1px solid #334155;
      color: #f8fafc;
    }
    .bot-bubble {
      background: #0f172a;
      border-color: #0284c7;
      border-left-width: 4px;
    }
    @media print {
      body {
        background: #ffffff;
        color: #000000;
        padding: 0;
      }
      .container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .title { color: #0284c7; }
      .message-bubble {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        color: #000000;
      }
      .bot-bubble {
        border-color: #0284c7;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">🌪️ ChatTornado Conversation Transcript</h1>
      <div class="meta-info">
        <strong>Partner:</strong> ${escape(partnerName)} &bull; 
        <strong>Exported:</strong> ${escape(exportDate)} &bull; 
        <strong>Messages:</strong> ${messages.length}
      </div>
    </div>
    <div class="messages">
      ${messagesHtml}
    </div>
  </div>
</body>
</html>`;
};

/**
 * Downloads text or blob file with given name
 */
export const downloadFile = (content, filename, mimeType = "text/plain") => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
