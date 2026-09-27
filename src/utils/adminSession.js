/**
 * adminSession.js
 * Centralized lifecycle and TTL management for VORTEX-9 Executive Admin Mode.
 * 
 * Guarantees:
 * 1. Admin mode expires immediately upon session logout.
 * 2. Admin mode expires automatically after a max TTL of 45 minutes of inactivity
 *    (preventing accidental retention across 2-3+ hour idle periods or browser refreshes).
 * 3. Requires an active authentication token. If token is missing, admin mode is automatically revoked.
 */

export const ADMIN_STORAGE_KEY = "vortex_admin_unlocked";
export const ADMIN_TIMESTAMP_KEY = "vortex_admin_timestamp";
export const ADMIN_TTL_MS = 45 * 60 * 1000; // 45 minutes max lifetime

/**
 * Checks if admin mode is currently unlocked, active, and within its valid TTL window.
 * If expired or invalid, it automatically purges the keys and returns false.
 */
export function isAdminUnlocked() {
    try {
        if (typeof window === "undefined") return false;

        const token = sessionStorage.getItem("token");
        if (!token || token.trim().length === 0) {
            clearAdminSession();
            return false;
        }

        const isUnlocked = sessionStorage.getItem(ADMIN_STORAGE_KEY);
        if (isUnlocked !== "true") {
            return false;
        }

        const rawTimestamp = sessionStorage.getItem(ADMIN_TIMESTAMP_KEY);
        if (!rawTimestamp) {
            // Unlocked key present without timestamp -> stale session from old version
            clearAdminSession();
            return false;
        }

        const unlockedAt = Number(rawTimestamp);
        if (isNaN(unlockedAt)) {
            clearAdminSession();
            return false;
        }

        const now = Date.now();
        const sessionAge = now - unlockedAt;

        // If session is older than TTL or timestamp is somehow in the future
        if (sessionAge > ADMIN_TTL_MS || sessionAge < 0) {
            console.log(`[ADMIN SESSION] Admin mode expired (${Math.round(sessionAge / 60000)}m old > ${ADMIN_TTL_MS / 60000}m limit). Purging.`);
            clearAdminSession();
            return false;
        }

        return true;
    } catch (err) {
        console.warn("[ADMIN SESSION] Error checking admin status:", err);
        return false;
    }
}

/**
 * Activates admin mode with a fresh timestamp and broadcasts activation event.
 */
export function setAdminUnlockedSession() {
    try {
        if (typeof window === "undefined") return;
        sessionStorage.setItem(ADMIN_STORAGE_KEY, "true");
        sessionStorage.setItem(ADMIN_TIMESTAMP_KEY, Date.now().toString());
        window.dispatchEvent(new CustomEvent("vortex_admin_activated"));
        window.dispatchEvent(new Event("sessionStorageUpdate"));
    } catch (err) {
        console.warn("[ADMIN SESSION] Error setting admin session:", err);
    }
}

/**
 * Revokes admin mode immediately, removes keys, and notifies all listening components.
 */
export function clearAdminSession() {
    try {
        if (typeof window === "undefined") return;
        const wasUnlocked = sessionStorage.getItem(ADMIN_STORAGE_KEY) === "true";
        sessionStorage.removeItem(ADMIN_STORAGE_KEY);
        sessionStorage.removeItem(ADMIN_TIMESTAMP_KEY);
        if (wasUnlocked) {
            window.dispatchEvent(new CustomEvent("vortex_admin_revoked"));
            window.dispatchEvent(new Event("sessionStorageUpdate"));
        }
    } catch (err) {
        console.warn("[ADMIN SESSION] Error clearing admin session:", err);
    }
}

/**
 * Extends the admin session TTL when active commands or operations occur.
 */
export function touchAdminSession() {
    try {
        if (isAdminUnlocked()) {
            sessionStorage.setItem(ADMIN_TIMESTAMP_KEY, Date.now().toString());
        }
    } catch (err) {
        console.warn("[ADMIN SESSION] Error touching admin session:", err);
    }
}
