/**
 * privacyShieldService.js
 * Manages Anti-Snoop Privacy Shield state and automatic blurring when the window or tab is unfocused.
 */

const SHIELD_ACTIVE_KEY = "vortex_snoop_shield_active";
const SHIELD_AUTO_BLUR_KEY = "vortex_snoop_auto_blur";

export const getShieldActive = () => {
    return localStorage.getItem(SHIELD_ACTIVE_KEY) === "true";
};

export const setShieldActive = (active) => {
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
    const val = localStorage.getItem(SHIELD_AUTO_BLUR_KEY);
    return val === null ? true : val === "true"; // Default to true for high privacy
};

export const setAutoBlurOnInactive = (enabled) => {
    localStorage.setItem(SHIELD_AUTO_BLUR_KEY, enabled ? "true" : "false");
    window.dispatchEvent(
        new CustomEvent("vortex_shield_autoblur_changed", {
            detail: { enabled: Boolean(enabled) },
        })
    );
};
