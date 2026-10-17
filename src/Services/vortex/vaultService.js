/**
 * vaultService.js
 * VORTEX Zero-Knowledge Personal AI Encrypted Memory Vault Service.
 * 
 * Rules:
 * 1. Vault decryption keys remain STRICTLY in ephemeral memory (window variable or closure).
 * 2. Never persist the raw key or raw password to localStorage, sessionStorage, or logs.
 * 3. Syncs ciphertext-only records to backend `/api/vortex/vault`.
 */

import API from "../API";
import {
    generateRandomSalt,
    deriveVaultKey,
    encryptMemoryRecord,
    decryptMemoryRecord
} from "./cryptoVault";

const VAULT_SALT_KEY = "vortex_vault_user_salt";
const VAULT_CACHE_KEY = "vortex_vault_encrypted_cache";

// Ephemeral in-memory key storage (wiped on tab reload/close)
let activeVaultKey = null;
let activeSalt = null;
let decryptedMemoryCache = [];

export const isVaultUnlocked = () => Boolean(activeVaultKey);

export const lockVault = () => {
    activeVaultKey = null;
    decryptedMemoryCache = [];
    window.dispatchEvent(new CustomEvent("vortex_memory_vault_updated", { detail: { unlocked: false } }));
};

export const getStoredSalt = () => {
    let salt = localStorage.getItem(VAULT_SALT_KEY);
    if (!salt) {
        salt = generateRandomSalt(16);
        localStorage.setItem(VAULT_SALT_KEY, salt);
    }
    return salt;
};

/**
 * Unlocks the encrypted vault using the user's password.
 */
export const unlockVault = async (passphrase) => {
    if (!passphrase || passphrase.length < 4) {
        throw new Error("Password must be at least 4 characters.");
    }

    const salt = getStoredSalt();
    const key = await deriveVaultKey(passphrase, salt);

    // Fetch encrypted records from backend
    const token = sessionStorage.getItem("token") || "";
    let encryptedRecords = [];
    try {
        const res = await API.get("/api/vortex/vault", { params: { token } });
        encryptedRecords = res.data?.records || [];
        localStorage.setItem(VAULT_CACHE_KEY, JSON.stringify(encryptedRecords));
    } catch (err) {
        // Fallback to local cache if offline
        const cached = localStorage.getItem(VAULT_CACHE_KEY);
        if (cached) {
            try { encryptedRecords = JSON.parse(cached); } catch { }
        }
    }

    // Attempt decryption of records
    const decrypted = [];
    for (const rec of encryptedRecords) {
        try {
            const data = await decryptMemoryRecord(rec, key);
            decrypted.push({
                id: rec.id,
                category: rec.category,
                version: rec.version,
                created_at: rec.created_at,
                updated_at: rec.updated_at,
                ...data
            });
        } catch (decryptErr) {
            // If any record fails authenticated decryption, password is wrong
            throw new Error("Incorrect vault password or corrupted records.");
        }
    }

    activeVaultKey = key;
    activeSalt = salt;
    decryptedMemoryCache = decrypted;

    window.dispatchEvent(new CustomEvent("vortex_memory_vault_updated", { detail: { unlocked: true, count: decrypted.length } }));
    return decrypted;
};

export const getDecryptedMemories = () => {
    return [...decryptedMemoryCache];
};

/**
 * Adds an independently encrypted memory chunk without decrypting/re-encrypting the rest of the vault.
 */
export const addMemoryRecord = async (text, category = "fact", title = "") => {
    if (!activeVaultKey) {
        throw new Error("Vault is locked. Please unlock your memory vault first.");
    }

    const id = "mem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
    const memoryData = {
        title: title || (text.slice(0, 30) + (text.length > 30 ? "..." : "")),
        text: text.trim(),
        created_at: new Date().toISOString()
    };

    const encrypted = await encryptMemoryRecord(memoryData, activeVaultKey, activeSalt);

    const recordPayload = {
        id,
        category,
        encrypted_payload: encrypted.encrypted_payload,
        iv: encrypted.iv,
        salt: encrypted.salt,
        version: 1
    };

    // Optimistic local cache update
    const memoryObj = {
        id,
        category,
        version: 1,
        created_at: memoryData.created_at,
        updated_at: memoryData.created_at,
        ...memoryData
    };
    decryptedMemoryCache = [memoryObj, ...decryptedMemoryCache];

    // Persist encrypted record to backend
    const token = sessionStorage.getItem("token") || "";
    try {
        await API.post(`/api/vortex/vault/sync?token=${encodeURIComponent(token)}`, {
            records: [recordPayload]
        });
    } catch (err) {
        console.warn("Failed to sync encrypted memory to backend, stored locally", err);
    }

    window.dispatchEvent(new CustomEvent("vortex_memory_vault_updated", { detail: { unlocked: true, count: decryptedMemoryCache.length } }));
    return memoryObj;
};

/**
 * Permanently deletes an encrypted memory record.
 */
export const deleteMemoryRecord = async (recordId) => {
    decryptedMemoryCache = decryptedMemoryCache.filter((m) => m.id !== recordId);

    const token = sessionStorage.getItem("token") || "";
    try {
        await API.delete(`/api/vortex/vault/record/${recordId}?token=${encodeURIComponent(token)}`);
    } catch (err) {
        console.warn("Failed to delete memory record on backend", err);
    }

    window.dispatchEvent(new CustomEvent("vortex_memory_vault_updated", { detail: { unlocked: true, count: decryptedMemoryCache.length } }));
    return true;
};

/**
 * Purges the entire memory vault.
 */
export const purgeMemoryVault = async () => {
    decryptedMemoryCache = [];
    localStorage.removeItem(VAULT_CACHE_KEY);

    const token = sessionStorage.getItem("token") || "";
    try {
        await API.delete(`/api/vortex/vault/purge?token=${encodeURIComponent(token)}`);
    } catch (err) {
        console.warn("Failed to purge backend memory vault", err);
    }

    window.dispatchEvent(new CustomEvent("vortex_memory_vault_updated", { detail: { unlocked: true, count: 0 } }));
    return true;
};

/**
 * Selects minimum relevant memories matching user prompt to ensure data minimization.
 */
export const selectRelevantVaultContext = (userPrompt = "", maxItems = 4) => {
    if (!activeVaultKey || decryptedMemoryCache.length === 0) return "";

    const lower = userPrompt.toLowerCase();
    const scored = decryptedMemoryCache.map((mem) => {
        let score = 0;
        const textLower = (mem.text || "").toLowerCase();
        const titleLower = (mem.title || "").toLowerCase();

        // Exact match keyword scoring
        const words = lower.split(/\s+/).filter((w) => w.length > 3);
        for (const w of words) {
            if (textLower.includes(w)) score += 2;
            if (titleLower.includes(w)) score += 3;
        }

        // Always prioritize user-defined instructions
        if (mem.category === "instruction") score += 5;
        if (mem.category === "preference") score += 2;

        return { mem, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const selected = scored.slice(0, maxItems).map((s) => s.mem);

    if (selected.length === 0) return "";

    const lines = selected.map((m) => `• [${m.category.toUpperCase()}] ${m.text}`);
    return (
        `\n[DECRYPTED ZERO-KNOWLEDGE USER MEMORY CONTEXT]\n` +
        `The following user preferences & facts were decrypted locally from the user's private encrypted vault:\n` +
        lines.join("\n") +
        `\nIncorporate these preferences seamlessly into your response.`
    );
};
