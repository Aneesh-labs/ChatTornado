/**
 * ChatTornado Streak & Milestone Service
 * Tracks daily messaging habits between users, handles freeze protection,
 * milestone levels, and expiration alerts.
 */

const STORAGE_KEY = "chattornado_streaks_v1";

export const STREAK_TIERS = [
    { min: 100, name: "Mythic Tornado", icon: "🌪️", color: "from-pink-500 to-rose-500", glow: "shadow-pink-500/50", perk: "Mythic Hologram Avatar Border" },
    { min: 30,  name: "Diamond Fire",   icon: "💎", color: "from-purple-500 to-indigo-500", glow: "shadow-purple-500/50", perk: "Exclusive Neon Chat Bubble Theme" },
    { min: 14,  name: "Golden Flame",   icon: "🌟", color: "from-amber-400 to-yellow-500", glow: "shadow-amber-500/50", perk: "VIP Star Badge in Global" },
    { min: 7,   name: "Silver Spark",   icon: "⚡", color: "from-cyan-400 to-blue-500", glow: "shadow-cyan-500/50", perk: "Animated Message Burst Sound" },
    { min: 3,   name: "Bronze Flame",   icon: "🔥", color: "from-orange-500 to-amber-500", glow: "shadow-orange-500/50", perk: "Bronze Fire Badge on Profile" },
    { min: 1,   name: "New Spark",      icon: "🔥", color: "from-orange-400 to-red-400", glow: "shadow-orange-500/30", perk: "Streak Started!" }
];

function getStoredStreaks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.warn("Failed to load streaks from storage", e);
        return {};
    }
}

function saveStoredStreaks(streaks) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(streaks));
        window.dispatchEvent(new CustomEvent("chattornado_streak_updated", { detail: streaks }));
    } catch (e) {
        console.warn("Failed to save streaks to storage", e);
    }
}

/** Format YYYY-MM-DD in local time */
function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/** Calculate difference in calendar days */
function dayDifference(dateStr1, dateStr2) {
    if (!dateStr1 || !dateStr2) return 999;
    const d1 = new Date(dateStr1 + "T00:00:00");
    const d2 = new Date(dateStr2 + "T00:00:00");
    const diffMs = Math.abs(d2.getTime() - d1.getTime());
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Get tier metadata for a given streak count */
export function getStreakTier(count = 0) {
    for (const tier of STREAK_TIERS) {
        if (count >= tier.min) return tier;
    }
    return { min: 0, name: "No Streak", icon: "🔥", color: "from-white/20 to-white/10", glow: "shadow-none", perk: "Send a message to ignite!" };
}

/**
 * Get active streak details for a specific user/conversation
 */
export function getStreak(targetUserId) {
    if (!targetUserId) return null;
    const all = getStoredStreaks();
    const item = all[String(targetUserId)];
    const today = getLocalDateString();

    if (!item || !item.count) {
        return {
            count: 0,
            lastDate: null,
            bestStreak: 0,
            isFrozen: false,
            freezesAvailable: 1,
            isActiveToday: false,
            isExpiringSoon: false,
            hoursRemaining: 24,
            tier: getStreakTier(0)
        };
    }

    const diff = dayDifference(item.lastDate, today);
    let count = item.count;
    let isFrozen = Boolean(item.isFrozen);
    let isActiveToday = diff === 0;

    // Check expiration
    if (diff > 1) {
        if (isFrozen) {
            // Protected by freeze
            isFrozen = false;
            // update stored
            item.isFrozen = false;
            saveStoredStreaks({ ...all, [String(targetUserId)]: item });
        } else {
            // Expired! Reset streak
            count = 0;
        }
    }

    // Hours remaining until midnight of tomorrow
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const hoursRemaining = Math.max(1, Math.round((endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60)));
    const isExpiringSoon = !isActiveToday && hoursRemaining <= 6 && count > 0;

    return {
        count,
        lastDate: item.lastDate,
        bestStreak: Math.max(item.bestStreak || 0, count),
        isFrozen,
        freezesAvailable: item.freezesAvailable !== undefined ? item.freezesAvailable : 1,
        isActiveToday,
        isExpiringSoon,
        hoursRemaining,
        tier: getStreakTier(count)
    };
}

/**
 * Record a sent message to keep or increment streak
 */
export function recordMessageSent(targetUserId) {
    if (!targetUserId) return null;
    const all = getStoredStreaks();
    const id = String(targetUserId);
    const current = all[id] || { count: 0, bestStreak: 0, freezesAvailable: 1 };
    const today = getLocalDateString();

    const diff = current.lastDate ? dayDifference(current.lastDate, today) : 999;
    let newCount = current.count || 0;

    if (diff === 0) {
        // Already recorded today, keep streak active
    } else if (diff === 1) {
        // Consecutive day! Increment streak!
        newCount += 1;
    } else {
        // Skipped days
        if (current.isFrozen) {
            // Protected by freeze, resume count
            newCount += 1;
        } else {
            // Reset to 1 (new streak started today)
            newCount = 1;
        }
    }

    const updated = {
        count: newCount,
        lastDate: today,
        bestStreak: Math.max(current.bestStreak || 0, newCount),
        isFrozen: false,
        freezesAvailable: current.freezesAvailable !== undefined ? current.freezesAvailable : 1,
        updatedAt: Date.now()
    };

    all[id] = updated;
    saveStoredStreaks(all);
    return getStreak(targetUserId);
}

/**
 * Freeze streak for target user to protect for 24 hours
 */
export function freezeStreak(targetUserId) {
    if (!targetUserId) return false;
    const all = getStoredStreaks();
    const id = String(targetUserId);
    const item = all[id];

    if (!item || item.count <= 0) return false;
    if ((item.freezesAvailable || 0) <= 0) return false;

    item.isFrozen = true;
    item.freezesAvailable = Math.max(0, (item.freezesAvailable || 1) - 1);
    all[id] = item;
    saveStoredStreaks(all);
    return true;
}

/**
 * Get all active streaks summary
 */
export function getAllStreaks() {
    return getStoredStreaks();
}
