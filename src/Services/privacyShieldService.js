/**
 * privacyShieldService.js
 * Manages Anti-Snoop Privacy Shield state and optional blurring.
 * Default auto-blur is strictly FALSE so mobile phones and users are NEVER unexpectedly obscured.
 */

const SHIELD_ACTIVE_KEY = "vortex_snoop_shield_active";
const SHIELD_AUTO_BLUR_KEY = "vortex_snoop_auto_blur";

export const getShieldActive = () => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SHIELD_ACTIVE_KEY) === "true";
};

export const setShieldActive = (active) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SHIELD_ACTIVE_KEY, active ? "true" : "false");
    window.dispatchEvent(
        new CustomEvent("vortex_shield_changed", {
            detail: { active: Boolean(active) },
        })
    );
};

export const toggleShieldActive = () => {
    const next = !getShieldActive();
    setShieldActive(next);
    return next;
};

export const getAutoBlurOnInactive = () => {
    if (typeof window === "undefined") return false;
    const val = localStorage.getItem(SHIELD_AUTO_BLUR_KEY);
    // Explicitly defaults to false to prevent accidental obscuring on mobile & desktop
    return val === "true";
};

export const setAutoBlurOnInactive = (enabled) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SHIELD_AUTO_BLUR_KEY, enabled ? "true" : "false");
    window.dispatchEvent(
        new CustomEvent("vortex_shield_autoblur_changed", {
            detail: { enabled: Boolean(enabled) },
        })
    );
};
