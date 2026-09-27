/**
 * Speech Service (Text-to-Speech Engine)
 * High-clarity natural voice speech synthesis with smart message filtering.
 */

class SpeechService {
    constructor() {
        this.synth = typeof window !== "undefined" ? window.speechSynthesis : null;
        this.activeUtterance = null;
        this.activeMessageId = null;
        this.cachedVoice = null;
        this.listeners = new Set();

        if (this.synth && typeof window !== "undefined") {
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => {
                    this.cachedVoice = this.pickBestVoice();
                };
            }
        }
    }

    /**
     * Pick the highest quality natural/neural voice available in the browser.
     */
    pickBestVoice() {
        if (!this.synth) return null;
        const voices = this.synth.getVoices();
        if (!voices || voices.length === 0) return null;

        // Prioritize natural / neural / enhanced high-clarity voices
        const naturalEnglish = voices.find(
            (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("Natural") ||
                    v.name.includes("Neural") ||
                    v.name.includes("Enhanced") ||
                    v.name.includes("Online (Natural)"))
        );
        if (naturalEnglish) return naturalEnglish;

        // Google / Apple / Microsoft standard English voices
        const highQualityEnglish = voices.find(
            (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("Google") ||
                    v.name.includes("Samantha") ||
                    v.name.includes("Jenny") ||
                    v.name.includes("Guy") ||
                    v.name.includes("Aria"))
        );
        if (highQualityEnglish) return highQualityEnglish;

        // Any English voice
        const anyEnglish = voices.find((v) => v.lang.startsWith("en"));
        if (anyEnglish) return anyEnglish;

        // Default voice
        return voices.find((v) => v.default) || voices[0];
    }

    /**
     * Clean and prepare message text for natural conversational speech.
     */
    prepareTextForSpeech(rawText) {
        if (!rawText || typeof rawText !== "string") return "";

        let text = rawText;

        // Decode HTML entities
        text = text
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#96;/g, "`")
            .replace(/&#x5C;/g, "\\");

        // Handle P2P media and special message formats
        if (text.startsWith("⚡ P2P_MEDIA")) {
            return "Peer-to-peer media attachment received.";
        }
        if (text.startsWith("🎤 Voice Message")) {
            return "Voice message recording.";
        }

        // Handle image attachments / uploads
        text = text.replace(/\/uploads\/[^\s<>"']+/gi, " [Image attachment] ");
        text = text.replace(/data:image\/[a-zA-Z0-9+]+;base64,[^\s<>"']+/gi, " [Image attachment] ");

        // Replace raw URLs with "link"
        text = text.replace(/https?:\/\/[^\s<>"']+/gi, " link ");

        // Code blocks: convert ```python code``` to "Code snippet: code"
        text = text.replace(/```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/g, " Code snippet: $1. ");
        // Inline code: `foo()` to "foo"
        text = text.replace(/`([^`]+)`/g, " $1 ");

        // Markdown headings (# Header -> Header)
        text = text.replace(/^#{1,6}\s+(.*)$/gm, "$1. ");

        // Markdown bold / italics (**bold**, *italic*, __bold__, _italic_)
        text = text.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1");

        // Markdown blockquotes (> quote)
        text = text.replace(/^>\s+(.*)$/gm, "$1. ");

        // Markdown lists (- item or * item or 1. item)
        text = text.replace(/^[\s*-]+(.*)$/gm, "$1. ");

        // Clean repeated punctuation
        text = text.replace(/[!?.]{2,}/g, ".");

        // Normalize whitespace
        text = text.replace(/\s+/g, " ").trim();

        return text;
    }

    /**
     * Subscribe to speech state changes
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify(activeId) {
        this.activeMessageId = activeId;
        this.listeners.forEach((listener) => {
            try {
                listener(activeId);
            } catch (err) {
                console.error("Error in speech listener:", err);
            }
        });
        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("speech_state_change", { detail: { activeId } })
            );
        }
    }

    /**
     * Stop any active speech synthesis immediately
     */
    stopSpeaking() {
        if (!this.synth) return;
        try {
            this.synth.cancel();
        } catch (e) {
            console.error("Error canceling speech synthesis:", e);
        }
        this.activeUtterance = null;
        this.notify(null);
    }

    /**
     * Read a message out loud with natural voice pacing and smart text preparation
     */
    speakMessage(messageId, rawText) {
        if (!this.synth) {
            console.warn("Speech Synthesis is not supported in this environment.");
            return;
        }

        // If this message is already speaking, clicking/tapping again toggles it OFF (stop)
        if (this.activeMessageId === messageId) {
            this.stopSpeaking();
            return;
        }

        // Cancel previous speech if another message was being read
        this.stopSpeaking();

        const cleanText = this.prepareTextForSpeech(rawText);
        if (!cleanText) {
            return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voice = this.cachedVoice || this.pickBestVoice();
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang || "en-US";
        }

        // Tune rate and pitch for optimal human clarity and warmth
        utterance.rate = 0.98; // Natural conversational tempo
        utterance.pitch = 1.02; // Warm, clear articulation

        utterance.onstart = () => {
            this.activeUtterance = utterance;
            this.notify(messageId);
        };

        utterance.onend = () => {
            if (this.activeMessageId === messageId) {
                this.activeUtterance = null;
                this.notify(null);
            }
        };

        utterance.onerror = (e) => {
            console.error("SpeechSynthesis error:", e);
            if (this.activeMessageId === messageId) {
                this.activeUtterance = null;
                this.notify(null);
            }
        };

        this.activeUtterance = utterance;
        this.synth.speak(utterance);
    }

    getActiveMessageId() {
        return this.activeMessageId;
    }

    isSpeaking(messageId) {
        return this.activeMessageId === messageId;
    }
}

export const speechService = new SpeechService();
