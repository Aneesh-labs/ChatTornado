/**
 * Automated Verification Script for ChatTornado P2P Binary Framing & AES-256-GCM Cryptography
 */

const crypto = require("crypto");

const MAGIC_BYTES = [0x54, 0x4F, 0x52, 0x4E]; // "TORN"
const PROTOCOL_VERSION = 1;
const HEADER_SIZE = 65;

function packFrame(transferId, chunkIndex, totalChunks, iv, payload) {
    const payloadBytes = Buffer.from(payload);
    const frameBuffer = Buffer.alloc(HEADER_SIZE + payloadBytes.length);

    // Magic bytes
    Buffer.from(MAGIC_BYTES).copy(frameBuffer, 0);

    // Version
    frameBuffer.writeUInt8(PROTOCOL_VERSION, 4);

    // Transfer ID (padded to 36 chars)
    const paddedId = (transferId || "").padEnd(36, " ").slice(0, 36);
    frameBuffer.write(paddedId, 5, 36, "utf8");

    // Big Endian uint32
    frameBuffer.writeUInt32BE(chunkIndex, 41);
    frameBuffer.writeUInt32BE(totalChunks, 45);
    frameBuffer.writeUInt32BE(payloadBytes.length, 49);

    // IV (12 bytes)
    Buffer.from(iv).copy(frameBuffer, 53);

    // Payload
    payloadBytes.copy(frameBuffer, HEADER_SIZE);

    return frameBuffer;
}

function unpackFrame(frameBuffer) {
    if (frameBuffer.length < HEADER_SIZE) {
        throw new Error("Frame too short.");
    }

    if (
        frameBuffer[0] !== MAGIC_BYTES[0] ||
        frameBuffer[1] !== MAGIC_BYTES[1] ||
        frameBuffer[2] !== MAGIC_BYTES[2] ||
        frameBuffer[3] !== MAGIC_BYTES[3]
    ) {
        throw new Error("Invalid magic bytes.");
    }

    const version = frameBuffer.readUInt8(4);
    const transferId = frameBuffer.toString("utf8", 5, 41).trim();
    const chunkIndex = frameBuffer.readUInt32BE(41);
    const totalChunks = frameBuffer.readUInt32BE(45);
    const payloadLength = frameBuffer.readUInt32BE(49);
    const iv = frameBuffer.slice(53, 65);
    const payload = frameBuffer.slice(HEADER_SIZE, HEADER_SIZE + payloadLength);

    return { version, transferId, chunkIndex, totalChunks, payloadLength, iv, payload };
}

function runTests() {
    console.log("=== ChatTornado P2P WebRTC Crypto & Framing Test Suite ===\n");

    // 1. Generate sample test file (256 KB)
    const sampleFileSize = 256 * 1024;
    const sampleFileBuffer = crypto.randomBytes(sampleFileSize);
    const originalHash = crypto.createHash("sha256").update(sampleFileBuffer).digest("hex");
    console.log(`[TEST 1] Generated random test payload: ${sampleFileSize} bytes`);
    console.log(`[TEST 1] Expected SHA-256: ${originalHash}`);

    // 2. Generate AES-256-GCM Session Key
    const sessionKey = crypto.randomBytes(32); // 256 bits
    console.log("[TEST 2] Generated ephemeral AES-256-GCM session key.");

    // 3. Chunk into 64 KiB slices and pack frames
    const CHUNK_SIZE = 64 * 1024;
    const totalChunks = Math.ceil(sampleFileSize / CHUNK_SIZE);
    const transferId = "p2p_test_uuid_1234567890abcdef123456";
    const packedFrames = [];

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, sampleFileSize);
        const slice = sampleFileBuffer.slice(start, end);

        // Encrypt slice with unique 12-byte IV
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", sessionKey, iv);
        const encryptedSlice = Buffer.concat([cipher.update(slice), cipher.final(), cipher.getAuthTag()]);

        const frame = packFrame(transferId, i, totalChunks, iv, encryptedSlice);
        packedFrames.push(frame);
    }
    console.log(`[TEST 3] Successfully packed ${packedFrames.length} binary frames with 65-byte headers.`);

    // 4. Simulate receiver unpacking and decrypting
    const reconstructedChunks = [];
    for (let i = 0; i < packedFrames.length; i++) {
        const frame = packedFrames[i];
        const unpacked = unpackFrame(frame);

        if (unpacked.chunkIndex !== i) throw new Error(`Chunk sequence mismatch at ${i}`);
        if (unpacked.transferId !== transferId) throw new Error("Transfer ID mismatch");

        // Decrypt with AES-GCM and verify auth tag (last 16 bytes)
        const iv = unpacked.iv;
        const authTag = unpacked.payload.slice(unpacked.payload.length - 16);
        const cipherText = unpacked.payload.slice(0, unpacked.payload.length - 16);

        const decipher = crypto.createDecipheriv("aes-256-gcm", sessionKey, iv);
        decipher.setAuthTag(authTag);
        const decryptedChunk = Buffer.concat([decipher.update(cipherText), decipher.final()]);
        reconstructedChunks.push(decryptedChunk);
    }
    console.log("[TEST 4] Receiver successfully unpacked and decrypted all chunks.");

    // 5. Reassemble and verify SHA-256
    const finalBuffer = Buffer.concat(reconstructedChunks);
    const computedHash = crypto.createHash("sha256").update(finalBuffer).digest("hex");
    console.log(`[TEST 5] Reconstructed file size: ${finalBuffer.length} bytes`);
    console.log(`[TEST 5] Computed SHA-256: ${computedHash}`);

    if (computedHash !== originalHash) {
        throw new Error("SHA-256 digest validation failed!");
    }
    console.log("[TEST 5] SHA-256 bit-for-bit integrity validation: PASSED ✅\n");

    // 6. Test Tamper Detection
    console.log("[TEST 6] Testing tampering detection on frame bytes...");
    const tamperedFrame = Buffer.from(packedFrames[0]);
    tamperedFrame[70] ^= 0xFF; // Flip a bit in the encrypted payload
    const unpackedTampered = unpackFrame(tamperedFrame);

    let caughtTampering = false;
    try {
        const iv = unpackedTampered.iv;
        const authTag = unpackedTampered.payload.slice(unpackedTampered.payload.length - 16);
        const cipherText = unpackedTampered.payload.slice(0, unpackedTampered.payload.length - 16);
        const decipher = crypto.createDecipheriv("aes-256-gcm", sessionKey, iv);
        decipher.setAuthTag(authTag);
        decipher.update(cipherText);
        decipher.final();
    } catch (err) {
        caughtTampering = true;
        console.log(`[TEST 6] Tampering successfully caught by GCM auth tag check: "${err.message}"`);
    }

    if (!caughtTampering) {
        throw new Error("Tampering was not detected!");
    }
    console.log("[TEST 6] Anti-tamper verification: PASSED ✅\n");

    console.log("=== ALL P2P CRYPTOGRAPHIC TESTS PASSED (6/6) ===");
}

runTests();
