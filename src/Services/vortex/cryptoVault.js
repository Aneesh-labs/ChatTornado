/**
 * cryptoVault.js
 * VORTEX Zero-Knowledge Client-Side Cryptographic Engine.
 * 
 * Cryptographic specification:
 * - Key Derivation: PBKDF2-HMAC-SHA256 (100,000 iterations)
 * - Authenticated Encryption: AES-256-GCM (12-byte cryptographically secure random IV)
 * - Zero plaintext memory ever transmitted or stored on backend.
 */

// Helper: Uint8Array <-> Base64
export function bufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export function base64ToBuffer(base64) {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

export function generateRandomSalt(length = 16) {
    const salt = new Uint8Array(length);
    window.crypto.getRandomValues(salt);
    return bufferToBase64(salt);
}

/**
 * Derives a 256-bit AES-GCM key from user password/passphrase using PBKDF2.
 */
export async function deriveVaultKey(passphrase, saltBase64) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(passphrase),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    const saltBuffer = base64ToBuffer(saltBase64);
    const derivedKey = await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: saltBuffer,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );

    return derivedKey;
}

/**
 * Encrypts a single memory chunk using AES-GCM with a fresh 12-byte IV.
 */
export async function encryptMemoryRecord(dataObject, cryptoKey, saltBase64) {
    const enc = new TextEncoder();
    const encodedData = enc.encode(JSON.stringify(dataObject));
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        cryptoKey,
        encodedData
    );

    return {
        encrypted_payload: bufferToBase64(encryptedBuffer),
        iv: bufferToBase64(iv),
        salt: saltBase64
    };
}

/**
 * Decrypts an encrypted memory record using AES-GCM.
 */
export async function decryptMemoryRecord(encryptedRecord, cryptoKey) {
    try {
        const encryptedBuffer = base64ToBuffer(encryptedRecord.encrypted_payload);
        const ivBuffer = base64ToBuffer(encryptedRecord.iv);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: ivBuffer
            },
            cryptoKey,
            encryptedBuffer
        );

        const dec = new TextDecoder();
        const jsonString = dec.decode(decryptedBuffer);
        return JSON.parse(jsonString);
    } catch (err) {
        throw new Error("Vault decryption failed: Invalid key or corrupted record.");
    }
}
