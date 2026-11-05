/**
 * vaultService.js
 * Dual-PIN Ghost Vault & Decoy Protection
 * Allows users to set a secret vault PIN to hide confidential chats.
 * If someone forces phone unlock, entering a decoy PIN or switching to Decoy mode
 * presents an innocent dummy chat list with zero trace of secret conversations.
 */

const VAULT_PIN_KEY = "vortex_vault_pin";
const DECOY_PIN_KEY = "vortex_decoy_pin";
const VAULT_STATE_KEY = "vortex_vault_unlocked";
const DECOY_MODE_KEY = "vortex_decoy_mode";
const VAULT_CHATS_KEY = "vortex_vault_chat_ids";

export const getVaultPin = () => {
    return localStorage.getItem(VAULT_PIN_KEY) || "1234";
};

export const setVaultPin = (pin) => {
    localStorage.setItem(VAULT_PIN_KEY, pin);
};

export const getDecoyPin = () => {
    return localStorage.getItem(DECOY_PIN_KEY) || "0000";
};

export const setDecoyPin = (pin) => {
    localStorage.setItem(DECOY_PIN_KEY, pin);
};

export const isVaultUnlocked = () => {
    return sessionStorage.getItem(VAULT_STATE_KEY) === "true";
};

export const isDecoyMode = () => {
    return sessionStorage.getItem(DECOY_MODE_KEY) === "true";
};

/**
 * Returns array of chat IDs (as strings) that are locked into the Ghost Vault.
 */
export const getVaultChatIds = () => {
    try {
        const raw = localStorage.getItem(VAULT_CHATS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

/**
 * Checks if a specific chat ID is marked as a secret vault chat.
 */
export const isVaultChat = (chatId) => {
    if (!chatId) return false;
    const ids = getVaultChatIds();
    return ids.includes(String(chatId)) || ids.includes(Number(chatId));
};

/**
 * Toggles vault protection for a specific chat using the user's Secret Vault PIN.
 */
export const toggleVaultChat = (chatId, enteredPin) => {
    if (!chatId) return { success: false, error: "No chat specified" };
    const actualPin = getVaultPin();

    if (String(enteredPin).trim() !== String(actualPin).trim()) {
        return { success: false, error: "Incorrect Secret Vault PIN" };
    }

    let ids = getVaultChatIds().map(String);
    const targetId = String(chatId);
    let isNowVault = false;

    if (ids.includes(targetId)) {
        ids = ids.filter((id) => id !== targetId);
        isNowVault = false;
    } else {
        ids.push(targetId);
        isNowVault = true;
    }

    localStorage.setItem(VAULT_CHATS_KEY, JSON.stringify(ids));
    
    // Broadcast change so UI updates immediately across all components
    window.dispatchEvent(
        new CustomEvent("vortex_vault_chats_changed", {
            detail: { chatIds: ids, changedId: targetId, isVault: isNowVault },
        })
    );

    return { success: true, isVault: isNowVault };
};

export const unlockVault = (enteredPin) => {
    const actualPin = getVaultPin();
    const decoyPin = getDecoyPin();

    if (String(enteredPin).trim() === String(actualPin).trim()) {
        sessionStorage.setItem(VAULT_STATE_KEY, "true");
        sessionStorage.removeItem(DECOY_MODE_KEY);
        window.dispatchEvent(new CustomEvent("vortex_vault_toggled", { detail: { unlocked: true, decoy: false } }));
        window.dispatchEvent(new Event("storage"));
        return { success: true, decoy: false };
    }
    
    // If entered Decoy PIN or default "0000" -> Decoy Mode triggers smoothly with zero suspicion
    if (String(enteredPin).trim() === String(decoyPin).trim() || String(enteredPin).trim() === "0000") {
        sessionStorage.setItem(DECOY_MODE_KEY, "true");
        sessionStorage.removeItem(VAULT_STATE_KEY);
        window.dispatchEvent(new CustomEvent("vortex_vault_toggled", { detail: { unlocked: false, decoy: true } }));
        window.dispatchEvent(new Event("storage"));
        return { success: true, decoy: true };
    }
    
    return { success: false, error: "Incorrect PIN" };
};

export const lockVault = () => {
    sessionStorage.removeItem(VAULT_STATE_KEY);
    sessionStorage.setItem(DECOY_MODE_KEY, "true");
    window.dispatchEvent(new CustomEvent("vortex_vault_toggled", { detail: { unlocked: false, decoy: true } }));
    window.dispatchEvent(new Event("storage"));
};

export const enterDecoyMode = lockVault;
