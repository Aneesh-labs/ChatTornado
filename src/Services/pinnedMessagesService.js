/**
 * pinnedMessagesService.js
 * Manages pinned transmissions per conversation in localStorage.
 * Emits 'vortex_pinned_messages_changed' event on updates.
 */

const PINNED_STORAGE_KEY = "vortex_pinned_transmissions";

const getStorage = () => {
    try {
        const raw = localStorage.getItem(PINNED_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const setStorage = (data) => {
    try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(data));
        window.dispatchEvent(
            new CustomEvent("vortex_pinned_messages_changed", {
                detail: { data },
            })
        );
    } catch (e) {
        console.warn("Failed to save pinned messages:", e);
    }
};

export const getPinnedMessages = (conversationId) => {
    if (!conversationId) return [];
    const store = getStorage();
    return Array.isArray(store[String(conversationId)]) ? store[String(conversationId)] : [];
};

export const isMessagePinned = (conversationId, messageId) => {
    if (!conversationId || !messageId) return false;
    const pins = getPinnedMessages(conversationId);
    return pins.some((p) => String(p.id) === String(messageId));
};

export const pinMessage = (conversationId, message) => {
    if (!conversationId || !message || !message.id) return;
    const store = getStorage();
    const key = String(conversationId);
    const existing = Array.isArray(store[key]) ? store[key] : [];

    // Avoid duplicates
    if (existing.some((p) => String(p.id) === String(message.id))) return;

    const pinRecord = {
        id: message.id,
        text: message.message || message.text || "Media transmission",
        senderName: message.sender?.username || "Transmission",
        createdAt: message.created_at || new Date().toISOString(),
        pinnedAt: Date.now(),
    };

    store[key] = [pinRecord, ...existing];
    setStorage(store);
};

export const unpinMessage = (conversationId, messageId) => {
    if (!conversationId || !messageId) return;
    const store = getStorage();
    const key = String(conversationId);
    const existing = Array.isArray(store[key]) ? store[key] : [];

    store[key] = existing.filter((p) => String(p.id) !== String(messageId));
    setStorage(store);
};

export const togglePinMessage = (conversationId, message) => {
    if (!conversationId || !message) return false;
    const msgId = message.id;
    if (isMessagePinned(conversationId, msgId)) {
        unpinMessage(conversationId, msgId);
        return false;
    } else {
        pinMessage(conversationId, message);
        return true;
    }
};
