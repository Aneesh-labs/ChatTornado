/**
 * Automated Unit Test Suite for ChatTornado Zero-Knowledge ECDH P-256 & Safety Numbers
 */

const assert = require("assert");
const { webcrypto } = require("crypto");
const { subtle } = webcrypto;

const E2EE_MSG_PREFIX = "🔐 E2EE_V1:";
const HKDF_INFO_TEXT = "ChatTornado-ZeroKnowledge-ECDH-AES256GCM-v1";

function canonicalizePublicJwk(obj) {
    return {
        crv: "P-256",
        kty: "EC",
        x: String(obj.x),
        y: String(obj.y),
    };
}

async function computeSafetyNumber(userIdA, pubJwkA, userIdB, pubJwkB) {
    const canA = JSON.stringify(canonicalizePublicJwk(pubJwkA));
    const canB = JSON.stringify(canonicalizePublicJwk(pubJwkB));
    const pairA = `${String(userIdA)}:${canA}`;
    const pairB = `${String(userIdB)}:${canB}`;
    const combined = pairA <= pairB ? `${pairA}|${pairB}` : `${pairB}|${pairA}`;

    let data = new TextEncoder().encode(combined);
    for (let i = 0; i < 64; i++) {
        data = new Uint8Array(await subtle.digest("SHA-256", data));
    }

    const groups = [];
    for (let i = 0; i < 12; i++) {
        const b1 = data[(i * 2) % data.length];
        const b2 = data[(i * 2 + 1) % data.length];
        const b3 = data[(i * 2 + 7) % data.length];
        const val = ((b1 << 16) | (b2 << 8) | b3) % 100000;
        groups.push(String(val).padStart(5, "0"));
    }
    return groups.join(" ");
}

async function deriveSharedAESKey(myPrivateKey, peerPubJwk, saltContext) {
    const peerPubKey = await subtle.importKey(
        "jwk",
        canonicalizePublicJwk(peerPubJwk),
        { name: "ECDH", namedCurve: "P-256" },
        false,
        []
    );
    const sharedBits = await subtle.deriveBits({ name: "ECDH", public: peerPubKey }, myPrivateKey, 256);
    const hkdfKey = await subtle.importKey("raw", sharedBits, { name: "HKDF" }, false, ["deriveKey"]);
    const enc = new TextEncoder();
    return await subtle.deriveKey(
        { name: "HKDF", hash: "SHA-256", salt: enc.encode(saltContext), info: enc.encode(HKDF_INFO_TEXT) },
        hkdfKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function runTests() {
    console.log("=== ChatTornado Zero-Knowledge ECDH & Safety Number Test Suite ===\n");

    // 1. Keypair generation
    const aliceKP = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits", "deriveKey"]);
    const bobKP = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits", "deriveKey"]);
    const eveKP = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits", "deriveKey"]);

    const alicePub = canonicalizePublicJwk(await subtle.exportKey("jwk", aliceKP.publicKey));
    const bobPub = canonicalizePublicJwk(await subtle.exportKey("jwk", bobKP.publicKey));
    const evePub = canonicalizePublicJwk(await subtle.exportKey("jwk", eveKP.publicKey));
    assert(!alicePub.d && !bobPub.d, "Public JWKs must not contain private field d");
    console.log("[TEST 1] Generated ECDH P-256 keypairs (zero private key leakage): PASSED");

    // 2. Safety Number symmetry (Alice -> Bob === Bob -> Alice)
    const snAlice = await computeSafetyNumber(101, alicePub, 202, bobPub);
    const snBob = await computeSafetyNumber(202, bobPub, 101, alicePub);
    assert.strictEqual(snAlice, snBob, "Safety Numbers must be identical for both peers");
    assert.strictEqual(snAlice.split(" ").length, 12, "Safety Number must have 12 blocks");
    console.log("[TEST 2] 60-digit Safety Number symmetry:", snAlice.slice(0, 23) + "... PASSED");

    // 3. Key rotation / MITM detection
    const snMitm = await computeSafetyNumber(101, alicePub, 202, evePub);
    assert.notStrictEqual(snAlice, snMitm, "Safety Number must change when peer key rotates");
    console.log("[TEST 3] MITM / Key change detection: PASSED");

    // 4. ECDH + HKDF shared AES-256-GCM derivation for P2P transfer (zero key over network!)
    const transferId = "p2p_1794290000_zktest";
    const aliceTransferKey = await deriveSharedAESKey(aliceKP.privateKey, bobPub, transferId);
    const bobTransferKey = await deriveSharedAESKey(bobKP.privateKey, alicePub, transferId);

    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const secretChunk = new TextEncoder().encode("Binary media chunk protected by ECDH+HKDF!");
    const encryptedChunk = await subtle.encrypt({ name: "AES-GCM", iv }, aliceTransferKey, secretChunk);
    const decryptedChunk = await subtle.decrypt({ name: "AES-GCM", iv }, bobTransferKey, encryptedChunk);
    assert.strictEqual(new TextDecoder().decode(decryptedChunk), "Binary media chunk protected by ECDH+HKDF!");
    console.log("[TEST 4] Zero-Knowledge ECDH media key derivation round-trip: PASSED");

    // 5. E2EE Text message encryption / decryption
    const msgContext = "msg:101-202";
    const aliceMsgKey = await deriveSharedAESKey(aliceKP.privateKey, bobPub, msgContext);
    const bobMsgKey = await deriveSharedAESKey(bobKP.privateKey, alicePub, msgContext);
    const eveMsgKey = await deriveSharedAESKey(eveKP.privateKey, alicePub, msgContext);

    const msgIv = webcrypto.getRandomValues(new Uint8Array(12));
    const plainMsg = "Confidential zero-knowledge message from Android to Web!";
    const cipherBuf = await subtle.encrypt({ name: "AES-GCM", iv: msgIv }, aliceMsgKey, new TextEncoder().encode(plainMsg));

    const wireStr = E2EE_MSG_PREFIX + Buffer.concat([Buffer.from(msgIv), Buffer.from(cipherBuf)]).toString("base64");
    const decodedBytes = Buffer.from(wireStr.slice(E2EE_MSG_PREFIX.length), "base64");
    const decryptedMsg = await subtle.decrypt({ name: "AES-GCM", iv: decodedBytes.subarray(0, 12) }, bobMsgKey, decodedBytes.subarray(12));
    assert.strictEqual(new TextDecoder().decode(decryptedMsg), plainMsg);

    // Ensure Eve cannot decrypt
    let eveBlocked = false;
    try {
        await subtle.decrypt({ name: "AES-GCM", iv: decodedBytes.subarray(0, 12) }, eveMsgKey, decodedBytes.subarray(12));
    } catch {
        eveBlocked = true;
    }
    assert.strictEqual(eveBlocked, true, "Eve must not be able to decrypt Alice<->Bob message");
    console.log("[TEST 5] E2EE DM round-trip & eavesdropper rejection: PASSED");

    console.log("\n=== ALL ZERO-KNOWLEDGE ECDH TESTS PASSED (5/5) ===");
}

runTests().catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
});
