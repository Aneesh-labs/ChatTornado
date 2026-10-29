/**
 * vaultService.js
 * Dual-PIN Ghost Vault & Decoy Protection
 * Allows users to set a secret vault PIN to hide confidential chats.
 * If someone forces phone unlock, entering a decoy PIN or switching to Decoy mode
 * presents an innocent dummy chat list with zero trace of secret conversations.
 */

const VAULT_PIN_KEY = "vortex_vault_pin";
const VAULT_STATE_KEY = "vortex_vault_unlocked";
const DECOY_MODE_KEY = "vortex_decoy_mode";

export const getVaultPin = () => {
    return localStorage.getItem(VAULT_PIN_KEY) || "1234";
};

export const setVaultPin = (pin) => {
    localStorage.setItem(VAULT_PIN_KEY, pin);
};

export const isVaultUnlocked = () => {
    return sessionStorage.getItem(VAULT_STATE_KEY) === "true";
};

export const unlockVault = (enteredPin) => {
    const actualPin = getVaultPin();
    if (enteredPin === actualPin) {
        sessionStorage.setItem(VAULT_STATE_KEY, "true");
        sessionStorage.removeItem(DECOY_MODE_KEY);
        window.dispatchEvent(new CustomEvent("vortex_vault_toggled", { detail: { unlocked: true, decoy: false } }));
        return { success: true };
    }
    // If entered 0000 or wrong PIN -> Decoy Mode triggers!
    if (enteredPin === "0000") {
        sessionStorage.setItem(DECOY_MODE_KEY, "true");
        sessionStorage.removeItem(VAULT_STATE_KEY);
        window.dispatchEvent(new CustomEvent("vortex_vault_toggled", { detail: { unlocked: false, decoy: true } }));
        return { success: true, decoy: true };
    }
    return { success: false, error: "Incorrect PIN" };
};

export const lockVault = () => {
    sessionStorage.removeItem(VAULT_STATE_KEY);
    sessionStorage.setItem(DECOY_MODE_KEY, "true");
    window.dispatchEvent(new CustomEvent("vortex_vault_toggled", { detail: { unlocked: false, decoy: true } }));
};

export const enterDecoyMode = lockVault;

export const isDecoyMode = () => {
    return sessionStorage.getItem(DECOY_MODE_KEY) === "true";
};
