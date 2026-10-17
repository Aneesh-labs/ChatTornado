/**
 * 24-Hour Bubble Notes & Profile Songs Service
 * Manages ephemeral status notes with mood emojis, audio tracks, and auto 24h expiration.
 */

const NOTES_STORAGE_KEY = "chattornado_bubble_notes_v1";
const NOTE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 Hours

// Default initial demo notes to make the app feel alive and social on first load
const SAMPLE_NOTES = [
    {
        id: "sample-note-1",
        userId: "bot-tornado-ai",
        username: "Tornado AI",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=VORTEX9&backgroundColor=0d1024",
        text: "Analyzing neural chat patterns 🌪️",
        emoji: "⚡",
        songTitle: "Midnight City",
        songArtist: "M83",
        createdAt: Date.now() - 3600000,
        expiresAt: Date.now() + (23 * 3600000)
    },
    {
        id: "sample-note-2",
        userId: "alex-sample",
        username: "Alex",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=b6e3f4",
        text: "Coding all night, send coffee ☕",
        emoji: "😴",
        songTitle: "Starboy",
        songArtist: "The Weeknd",
        createdAt: Date.now() - 7200000,
        expiresAt: Date.now() + (22 * 3600000)
    },
    {
        id: "sample-note-3",
        userId: "sarah-sample",
        username: "Sarah",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=ffdfbf",
        text: "Off to Tokyo tomorrow! ✈️🍣",
        emoji: "🎌",
        songTitle: "Levitating",
        songArtist: "Dua Lipa",
        createdAt: Date.now() - 10800000,
        expiresAt: Date.now() + (20 * 3600000)
    }
];

export function getActiveNotes() {
    try {
        const raw = localStorage.getItem(NOTES_STORAGE_KEY);
        let list = raw ? JSON.parse(raw) : null;
        if (!list || !Array.isArray(list) || list.length === 0) {
            list = SAMPLE_NOTES;
            localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(list));
        }

        const now = Date.now();
        // Filter out expired notes and ensure avatars are populated
        const active = list
            .filter(n => n.expiresAt && n.expiresAt > now)
            .map(n => {
                const sample = SAMPLE_NOTES.find(s => s.id === n.id);
                if (sample && !n.avatar) {
                    return { ...n, avatar: sample.avatar };
                }
                return n;
            });
        if (active.length !== list.length) {
            localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(active));
        }
        return active;
    } catch (e) {
        console.warn("Failed to get notes", e);
        return SAMPLE_NOTES;
    }
}

export function saveUserNote({ userId, username, avatar, text, emoji, songTitle, songArtist, songUrl }) {
    if (!userId || !text) return null;
    const notes = getActiveNotes();
    const now = Date.now();

    // Remove previous note from this user
    const filtered = notes.filter(n => String(n.userId) !== String(userId));

    const newNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId: String(userId),
        username: username || "Me",
        avatar: avatar || null,
        text: text.slice(0, 60),
        emoji: emoji || "💭",
        songTitle: songTitle ? songTitle.slice(0, 40) : "",
        songArtist: songArtist ? songArtist.slice(0, 40) : "",
        songUrl: songUrl || "",
        createdAt: now,
        expiresAt: now + NOTE_MAX_AGE_MS
    };

    filtered.unshift(newNote);
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent("chattornado_notes_updated", { detail: filtered }));
    return newNote;
}

export function deleteUserNote(userId) {
    if (!userId) return;
    const notes = getActiveNotes();
    const filtered = notes.filter(n => String(n.userId) !== String(userId));
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent("chattornado_notes_updated", { detail: filtered }));
}
