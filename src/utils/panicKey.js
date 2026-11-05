/**
 * panicKey.js
 * Emergency Triple-Esc Panic Key Listener
 * 
 * Behavior:
 * Pressing 'Escape' 3 times quickly (within 1.2 seconds):
 * 1. Immediately wipes all session RAM and active tokens (sessionStorage, tokens, admin session).
 * 2. Instantly redirects and replaces browser location with Wikipedia.
 */

import { clearAdminSession } from "./adminSession";

const PANIC_WINDOW_MS = 1200; // 1.2 seconds window for 3 quick Esc presses
let escPressTimestamps = [];

export function triggerPanicEscape() {
    try {
        if (typeof window !== "undefined") {
            // 1. Wipe session RAM
            sessionStorage.clear();
            clearAdminSession();

            // 2. Remove sensitive persisted auth tokens
            localStorage.removeItem("token");
            localStorage.removeItem("vortex_admin_unlocked");
            localStorage.removeItem("vortex_vault_unlocked");
            localStorage.removeItem("tornado_active_account");

            // 3. Immediately replace location with Wikipedia
            window.location.replace("https://en.wikipedia.org/wiki/Main_Page");
        }
    } catch (err) {
        console.error("[PANIC KEY] Error executing emergency wipe:", err);
        if (typeof window !== "undefined") {
            window.location.replace("https://en.wikipedia.org/wiki/Main_Page");
        }
    }
}

export function setupPanicKeyListener() {
    if (typeof window === "undefined") return () => {};

    const handleKeyDown = (e) => {
        if (e.key !== "Escape" && e.code !== "Escape") return;

        // Enabled by default unless explicitly disabled in Settings
        const isEnabled = localStorage.getItem("vortex_panic_key") !== "false";
        if (!isEnabled) return;

        const now = Date.now();
        // Keep presses within the time window
        escPressTimestamps = escPressTimestamps.filter((t) => now - t <= PANIC_WINDOW_MS);
        escPressTimestamps.push(now);

        if (escPressTimestamps.length >= 3) {
            escPressTimestamps = [];
            console.warn("🚨 [PANIC KEY ACTIVATED] 3 quick Esc presses detected. Wiping session and redirecting to Wikipedia...");
            triggerPanicEscape();
        }
    };

    // Use capture: true so Escape is intercepted even if focus is inside inputs, textareas, or open modals
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
        window.removeEventListener("keydown", handleKeyDown, true);
    };
}
