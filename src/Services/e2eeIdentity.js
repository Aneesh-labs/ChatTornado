/**
 * ChatTornado Zero-Knowledge ECDH (P-256) Identity, Key Derivation & Safety Numbers
 *
 * Security Properties:
 * - Each device generates a persistent ECDH P-256 keypair inside IndexedDB (private key never leaves device).
 * - Only canonical public JWKs ({ kty: "EC", crv: "P-256", x, y }) are registered on the server.
 * - Shared AES-256-GCM keys are derived locally via ECDH + HKDF(SHA-256) using a domain/transfer salt.
 * - Deterministic 60-digit Signal-style Safety Numbers allow human verification against MITM / key changes.
 */

import {
    saveDeviceIdentityKey,
    getDeviceIdentityKey,
    saveTrustedPeer,
    getTrustedPeer,
    deleteTrustedPeer,
} from "./db";

export const E2EE_MSG_PREFIX = "🔐 E2EE_V1:";
const E2EE_CHAT_PREF_PREFIX = "chattornado_e2ee_chat_";
const HKDF_INFO_TEXT = "ChatTornado-ZeroKnowledge-ECDH-AES256GCM-v1";

function getSubtle() {
    const c = (typeof globalThis !== "undefined" && globalThis.crypto) || (typeof window !== "undefined" && window.crypto);
    if (!c || !c.subtle) {
        throw new Error("Web Crypto API (crypto.subtle) is unavailable in this environment.");
    }
    return { cryptoObj: c, subtle: c.subtle };
}

/**
 * Canonicalize an EC P-256 public JWK so hashing and serialization are identical across devices.
 */
export function canonicalizePublicJwk(input) {
    if (!input) return null;
    const obj = typeof input === "string" ? JSON.parse(input) : input;
    if (!obj || obj.kty !== "EC" || obj.crv !== "P-256" || !obj.x || !obj.y) {
        return null;
    }
    return {
        crv: "P-256",
        kty: "EC",
        x: String(obj.x),
        y: String(obj.y),
    };
}

export function serializeCanonicalPublicJwk(input) {
    const c = canonicalizePublicJwk(input);
    return c ? JSON.stringify(c) : null;
}

/**
 * Generate or load this device's persistent ECDH P-256 identity keypair for the given userId.
 * Returns { userId, privateKey, publicKey, publicJwk, publicJwkStr, fingerprint }.
 */
export async function ensureIdentityKeypair(userId) {
    if (!userId) return null;
    const uid = String(userId);

    // 1. Check IndexedDB
    const existing = await getDeviceIdentityKey(uid);
    if (existing?.privateKey && existing?.publicJwk) {
        const canonical = canonicalizePublicJwk(existing.publicJwk);
        if (canonical) {
            const fingerprint = existing.fingerprint || (await computeKeyFingerprint(canonical));
            return {
                userId: uid,
                privateKey: existing.privateKey,
                publicKey: existing.publicKey || null,
                publicJwk: canonical,
                publicJwkStr: JSON.stringify(canonical),
                fingerprint,
            };
        }
    }

    // 2. Generate fresh ECDH P-256 keypair (non-extractable private key)
    const { subtle } = getSubtle();
    const keyPair = await subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        false, // privateKey cannot be exported
        ["deriveBits", "deriveKey"]
    );

    const exportedPub = await subtle.exportKey("jwk", keyPair.publicKey);
    const canonical = canonicalizePublicJwk(exportedPub);
    const publicJwkStr = JSON.stringify(canonical);
    const fingerprint = await computeKeyFingerprint(canonical);

    await saveDeviceIdentityKey(uid, {
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        publicJwk: canonical,
        fingerprint,
    });

    return {
        userId: uid,
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        publicJwk: canonical,
        publicJwkStr,
        fingerprint,
    };
}

export async function importPeerPublicKey(peerPubJwk) {
    const canonical = canonicalizePublicJwk(peerPubJwk);
    if (!canonical) {
        throw new Error("Invalid peer ECDH P-256 public key.");
    }
    const { subtle } = getSubtle();
    return await subtle.importKey(
        "jwk",
        canonical,
        { name: "ECDH", namedCurve: "P-256" },
        false,
        []
    );
}

/**
 * Derive a deterministic 256-bit AES-GCM CryptoKey using ECDH + HKDF(SHA-256).
 * Neither server nor network ever observes this key.
 */
export async function deriveSharedAESKey(myPrivateKey, peerPubJwk, saltContext = "chattornado-default-salt") {
    if (!myPrivateKey || !peerPubJwk) {
        throw new Error("Both local privateKey and peer public JWK are required for ECDH derivation.");
    }
    const { subtle } = getSubtle();
    const peerPubKey = await importPeerPublicKey(peerPubJwk);

    // 1. ECDH shared secret (256 bits)
    const sharedBits = await subtle.deriveBits(
        { name: "ECDH", public: peerPubKey },
        myPrivateKey,
        256
    );

    // 2. Import raw shared bits as HKDF base key
    const hkdfKey = await subtle.importKey(
        "raw",
        sharedBits,
        { name: "HKDF" },
        false,
        ["deriveKey"]
    );

    const enc = new TextEncoder();
    return await subtle.deriveKey(
        {
            name: "HKDF",
            hash: "SHA-256",
            salt: enc.encode(String(saltContext)),
            info: enc.encode(HKDF_INFO_TEXT),
        },
        hkdfKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Compute short 8-hex-char device key fingerprint for subtle badges.
 */
export async function computeKeyFingerprint(pubJwk) {
    const str = serializeCanonicalPublicJwk(pubJwk);
    if (!str) return "";
    const { subtle } = getSubtle();
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(digest))
        .slice(0, 4)
        .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
        .join(":");
}

/**
 * Deterministically compute a Signal-style 60-digit Safety Number (12 groups of 5 digits)
 * between two users. Identical regardless of which user initiates.
 */
export async function computeSafetyNumber(userIdA, pubJwkA, userIdB, pubJwkB) {
    const canA = serializeCanonicalPublicJwk(pubJwkA);
    const canB = serializeCanonicalPublicJwk(pubJwkB);
    if (!canA || !canB) return null;

    const { subtle } = getSubtle();
    const pairA = `${String(userIdA)}:${canA}`;
    const pairB = `${String(userIdB)}:${canB}`;

    // Sort lexicographically so both peers compute exact same hash
    const combined = pairA <= pairB ? `${pairA}|${pairB}` : `${pairB}|${pairA}`;
    let data = new TextEncoder().encode(combined);

    // 64 iterative SHA-256 rounds (fast in WebCrypto, uniform entropy)
    for (let i = 0; i < 64; i++) {
        const buf = await subtle.digest("SHA-256", data);
        data = new Uint8Array(buf);
    }

    // Extract 12 groups of 5 decimal digits (using pairs of bytes mod 100000)
    const groups = [];
    for (let i = 0; i < 12; i++) {
        const b1 = data[(i * 2) % data.length];
        const b2 = data[(i * 2 + 1) % data.length];
        const b3 = data[(i * 2 + 7) % data.length];
        const val = ((b1 << 16) | (b2 << 8) | b3) % 100000;
        groups.push(String(val).padStart(5, "0"));
    }

    const formatted = groups.join(" ");
    const qrPayload = JSON.stringify({
        v: 1,
        app: "ChatTornado",
        ids: [String(userIdA), String(userIdB)].sort(),
        sn: groups.join(""),
    });

    return {
        groups,
        formatted,
        compact: groups.join(""),
        qrPayload,
    };
}

/* ==========================================================================
   OPTIONAL END-TO-END TEXT MESSAGE ENCRYPTION (AES-256-GCM + ECDH P-256)
   ========================================================================== */

export async function encryptMessageE2EE(plaintext, myPrivateKey, peerPubJwk, senderId, receiverId) {
    if (typeof plaintext !== "string" || !plaintext) return plaintext;
    const { cryptoObj, subtle } = getSubtle();
    const pairContext = `msg:${[String(senderId), String(receiverId)].sort().join("-")}`;
    const aesKey = await deriveSharedAESKey(myPrivateKey, peerPubJwk, pairContext);

    const iv = cryptoObj.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const cipherBuf = await subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoded);

    const packed = new Uint8Array(12 + cipherBuf.byteLength);
    packed.set(iv, 0);
    packed.set(new Uint8Array(cipherBuf), 12);

    let binStr = "";
    for (let i = 0; i < packed.length; i++) {
        binStr += String.fromCharCode(packed[i]);
    }
    return `${E2EE_MSG_PREFIX}${btoa(binStr)}`;
}

export async function decryptMessageE2EE(cipherMessage, myPrivateKey, peerPubJwk, userA, userB) {
    if (typeof cipherMessage !== "string" || !cipherMessage.startsWith(E2EE_MSG_PREFIX)) {
        return { decrypted: false, text: cipherMessage };
    }
    try {
        const b64 = cipherMessage.slice(E2EE_MSG_PREFIX.length).trim();
        const binStr = atob(b64);
        const packed = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
            packed[i] = binStr.charCodeAt(i);
        }
        if (packed.length <= 12) throw new Error("Ciphertext too short");

        const iv = packed.slice(0, 12);
        const ciphertext = packed.slice(12);

        const { subtle } = getSubtle();
        const pairContext = `msg:${[String(userA), String(userB)].sort().join("-")}`;
        const aesKey = await deriveSharedAESKey(myPrivateKey, peerPubJwk, pairContext);
        const plainBuf = await subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ciphertext);

        return {
            decrypted: true,
            text: new TextDecoder().decode(plainBuf),
        };
    } catch (err) {
        return {
            decrypted: false,
            error: err?.message || "Key mismatch or rotated identity key",
            text: cipherMessage,
        };
    }
}

/* ==========================================================================
   TRUST PINNING & PER-CHAT E2EE TOGGLE PREFERENCES
   ========================================================================== */

export function makeTrustPairKey(myUserId, peerUserId) {
    return `${String(myUserId)}::${String(peerUserId)}`;
}

export async function getPeerTrustStatus(myUserId, myPubJwk, peerUserId, peerPubJwk) {
    const canPeer = serializeCanonicalPublicJwk(peerPubJwk);
    const canMy = serializeCanonicalPublicJwk(myPubJwk);
    if (!canPeer || !canMy) {
        return { status: "unavailable", safetyNumber: null, verifiedAt: null };
    }

    const safety = await computeSafetyNumber(myUserId, canMy, peerUserId, canPeer);
    const pinned = await getTrustedPeer(makeTrustPairKey(myUserId, peerUserId));

    if (!pinned) {
        return { status: "unverified", safetyNumber: safety, verifiedAt: null };
    }
    if (pinned.peerPubJwkStr !== canPeer || pinned.safetyCompact !== safety.compact) {
        return {
            status: "key_changed",
            safetyNumber: safety,
            verifiedAt: pinned.verifiedAt || null,
            previousSafetyCompact: pinned.safetyCompact,
        };
    }
    return { status: "verified", safetyNumber: safety, verifiedAt: pinned.verifiedAt || Date.now() };
}

export async function markPeerVerified(myUserId, myPubJwk, peerUserId, peerPubJwk) {
    const canPeer = serializeCanonicalPublicJwk(peerPubJwk);
    const safety = await computeSafetyNumber(myUserId, myPubJwk, peerUserId, canPeer);
    if (!canPeer || !safety) return false;
    return await saveTrustedPeer(makeTrustPairKey(myUserId, peerUserId), {
        peerUserId: String(peerUserId),
        peerPubJwkStr: canPeer,
        safetyCompact: safety.compact,
        verifiedAt: Date.now(),
    });
}

export async function unmarkPeerVerified(myUserId, peerUserId) {
    return await deleteTrustedPeer(makeTrustPairKey(myUserId, peerUserId));
}

export function isE2EETextEnabledForChat(peerUserId) {
    if (!peerUserId || typeof localStorage === "undefined") return false;
    return localStorage.getItem(`${E2EE_CHAT_PREF_PREFIX}${String(peerUserId)}`) === "true";
}

export function setE2EETextEnabledForChat(peerUserId, enabled) {
    if (!peerUserId || typeof localStorage === "undefined") return;
    localStorage.setItem(`${E2EE_CHAT_PREF_PREFIX}${String(peerUserId)}`, enabled ? "true" : "false");
}

/* ==========================================================================
   IN-MEMORY RUNTIME KEY REGISTRY (ZERO PROP-DRILLING FOR MESSAGE BUBBLES)
   ========================================================================== */

let _runtimeIdentity = null;
const _runtimePeerKeys = new Map();
const _runtimeListeners = new Set();

export function setRuntimeIdentity(identity) {
    _runtimeIdentity = identity || null;
    for (const cb of _runtimeListeners) {
        try { cb(); } catch { }
    }
}

export function getRuntimeIdentity() {
    return _runtimeIdentity;
}

export function setRuntimePeerPublicKey(userId, pubJwk) {
    if (!userId || !pubJwk) return;
    const can = canonicalizePublicJwk(pubJwk);
    if (can) {
        _runtimePeerKeys.set(String(userId), can);
        for (const cb of _runtimeListeners) {
            try { cb(); } catch { }
        }
    }
}

export function getRuntimePeerPublicKey(userId) {
    if (!userId) return null;
    return _runtimePeerKeys.get(String(userId)) || null;
}

export function subscribeRuntimeE2EE(cb) {
    _runtimeListeners.add(cb);
    return () => _runtimeListeners.delete(cb);
}
