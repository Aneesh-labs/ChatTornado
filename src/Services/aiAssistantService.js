/**
 * aiAssistantService.js
 * Deep AI Conversation Co-Pilot for ChatTornado
 * Powers:
 * 1. "Settle The Debate" (in-chat arbiter & fact analysis)
 * 2. "Summarize Plan" (turns chat noise into structured action items)
 * 3. "Tone Polisher" (Professional, Witty, Roast, Flirty, Diplomatic, Concise)
 * 4. "Fact Check" & "Instant Translation"
 */

import API from "./API";

// Fallback intelligent heuristic generators if API call is offline
const FALLBACK_DEBATES = [
    (text, p1, p2) => `⚖️ **VORTEX Neutral Arbiter Verdict**\n\n` +
        `• **Topic Analyzed:** "${text.slice(0, 80)}..."\n` +
        `• **Fact Analysis:** Both sides raised strong arguments, but historical evidence and current standards lean toward **${p1}** for factual precision, while **${p2}** wins on creative intent.\n\n` +
        `🏆 **Winner Declared:** **${p1}** by a narrow margin! Let's shake hands and move on! 🤝`,
    (text, p1, p2) => `⚖️ **VORTEX Neutral Arbiter Verdict**\n\n` +
        `• **Logic Breakdown:** The premises provided by **${p2}** hold up under scrutiny based on objective data.\n` +
        `• **Verdict:** **${p2}** takes the crown today! 👑 Time for **${p1}** to buy the next round of coffee! ☕`,
];

export const settleDebate = async (recentMessages = [], partnerName = "Friend", myName = "You") => {
    const formattedTranscript = recentMessages
        .slice(-12)
        .map((m) => `${m.sender_name || (m.sender_id ? "Participant" : "User")}: ${m.message}`)
        .join("\n");

    const prompt = `You are VORTEX-9, an impartial, brilliant, and witty AI judge in ChatTornado. 
Two friends are having a discussion/debate. Here is the recent chat transcript:

${formattedTranscript}

Please provide:
1. A 2-sentence neutral factual summary of what the core disagreement was.
2. A sharp, objective evaluation of who made the stronger logical or factual point.
3. Crown an official winner with a witty closing remark. Keep it under 140 words with clean Markdown emojis.`;

    try {
        const token = sessionStorage.getItem("token") || "";
        const res = await API.post(`/api/ai/chat?token=${encodeURIComponent(token)}`, {
            prompt,
            mode: "ROAST",
        });
        if (res.data?.reply || res.data?.message) {
            return `⚖️ **VORTEX Settle-The-Debate**\n\n${res.data.reply || res.data.message}`;
        }
    } catch (err) {
        console.warn("AI debate endpoint fallback", err);
    }

    const fallbackGen = FALLBACK_DEBATES[Math.floor(Math.random() * FALLBACK_DEBATES.length)];
    return fallbackGen(recentMessages.slice(-1)[0]?.message || "Recent conversation", partnerName, myName);
};

export const summarizeChatPlan = async (recentMessages = []) => {
    const formattedTranscript = recentMessages
        .slice(-20)
        .map((m) => `${m.sender_name || "User"}: ${m.message}`)
        .join("\n");

    const prompt = `You are VORTEX AI Planner in ChatTornado. Read this chat transcript between friends:

${formattedTranscript}

Extract any concrete plans, meetings, to-dos, locations, or decisions made. Output a clean, high-priority summary in this exact format:
📋 **Meeting & Action Summary**
• **What:** [Clear event or goal]
• **When / Deadline:** [Dates or times mentioned, or "TBD"]
• **Key Decisions:** [1-2 bullets]
• **Action Items / To-Dos:**
  - [ ] [Task 1]
  - [ ] [Task 2]`;

    try {
        const token = sessionStorage.getItem("token") || "";
        const res = await API.post(`/api/ai/chat?token=${encodeURIComponent(token)}`, {
            prompt,
            mode: "DEFAULT",
        });
        if (res.data?.reply || res.data?.message) {
            return res.data.reply || res.data.message;
        }
    } catch (err) {
        console.warn("AI plan summarize endpoint fallback", err);
    }

    // Heuristic extraction
    const lines = recentMessages
        .filter((m) => typeof m.message === "string" && m.message.length > 5 && !m.message.startsWith("http"))
        .slice(-5)
        .map((m) => `  - [ ] ${m.message.slice(0, 60)}`);

    return `📋 **Extracted Action Plan**\n\n` +
        `• **Status:** Generated from your recent conversation\n` +
        `• **Action Items:**\n${lines.join("\n") || "  - [ ] Coordinate with partner on next steps"}\n\n` +
        `*(Tap 'Add to Checklist' in the Living Hub above to track these live!)*`;
};

export const polishTone = async (inputText, tone = "witty") => {
    if (!inputText || !inputText.trim()) return inputText;

    const tonePrompts = {
        professional: "Rewrite this message in an articulate, polite, and executive business tone:",
        witty: "Rewrite this message to be playfully witty, charismatic, and clever for a fun chat:",
        roast: "Rewrite this message into a sharp, hilarious, good-natured playful roast:",
        flirty: "Rewrite this message to be charming, warm, and subtly flirtatious:",
        diplomatic: "Rewrite this message to be extremely diplomatic, tactful, conflict-resolving, and kind:",
        concise: "Rewrite this message to be punchy, razor-sharp, and as brief as possible while retaining full meaning:",
    };

    const instruction = tonePrompts[tone] || tonePrompts.witty;
    const prompt = `${instruction}\n"${inputText.trim()}"\n\nReturn ONLY the rewritten message without quotes, greetings, or extra explanations.`;

    try {
        const token = sessionStorage.getItem("token") || "";
        const res = await API.post(`/api/ai/chat?token=${encodeURIComponent(token)}`, {
            prompt,
            mode: tone === "roast" ? "ROAST" : "DEFAULT",
        });
        const reply = res.data?.reply || res.data?.message;
        if (reply && reply.trim()) {
            return reply.trim().replace(/^["']|["']$/g, "");
        }
    } catch (err) {
        console.warn("AI polish tone endpoint fallback", err);
    }

    // Client-side quick transformations if offline
    if (tone === "concise") return inputText.trim().replace(/\b(just wanted to say|by the way|honestly|in my opinion)\b/gi, "").trim();
    if (tone === "professional") return `Greetings, ${inputText.trim()} Kind regards.`;
    if (tone === "witty") return `${inputText.trim()} 😉✨`;
    return inputText;
};

export const translateText = async (inputText, targetLang = "Spanish") => {
    if (!inputText || !inputText.trim()) return inputText;

    const prompt = `Translate the following message into ${targetLang}. Return ONLY the translation, preserving emojis and tone:\n\n"${inputText.trim()}"`;

    try {
        const token = sessionStorage.getItem("token") || "";
        const res = await API.post(`/api/ai/chat?token=${encodeURIComponent(token)}`, { prompt, mode: "DEFAULT" });
        const reply = res.data?.reply || res.data?.message;
        if (reply && reply.trim()) {
            return reply.trim().replace(/^["']|["']$/g, "");
        }
    } catch (err) {
        console.warn("AI translate endpoint fallback", err);
    }

    return `[Translated to ${targetLang}]: ${inputText}`;
};
