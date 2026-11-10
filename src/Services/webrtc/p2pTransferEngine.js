/**
 * ChatTornado P2P WebRTC Transfer Engine
 * Production-grade direct device-to-device media transmission over WebRTC DataChannels.
 * 
 * ZERO SERVER MEDIA STORAGE:
 * - The backend only coordinates WebSocket signaling.
 * - All binary media chunks stream strictly peer-to-peer over DTLS-encrypted DataChannels.
 * - Defense-in-depth: AES-256-GCM chunk payload encryption + SHA-256 file integrity check.
 * - Backpressure control: bufferedAmountLowThreshold prevents memory bloat and packet drops.
 */

import { saveLocalMedia, getLocalMedia, saveOutboxTransfer, getOutboxTransfer, deleteOutboxTransfer, updateOutboxStatus } from "../db";
import { deriveSharedAESKey, canonicalizePublicJwk } from "../e2eeIdentity";

export const TRANSFER_STATES = {
    WAITING_FOR_PEER: "WAITING_FOR_PEER",
    WAITING_FOR_ACCEPTANCE: "WAITING_FOR_ACCEPTANCE",
    CONNECTING: "CONNECTING",
    TRANSFERRING: "TRANSFERRING",
    VERIFYING: "VERIFYING",
    COMPLETED: "COMPLETED",
    DECLINED: "DECLINED",
    CANCELLED: "CANCELLED",
    CONNECTION_LOST: "CONNECTION_LOST",
    NAT_TRAVERSAL_FAILED: "NAT_TRAVERSAL_FAILED",
    INTEGRITY_FAILED: "INTEGRITY_FAILED"
};

export const DEFAULT_ICE_SERVERS = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    { urls: ["stun:stun.cloudflare.com:3478"] }
];

export const CHUNK_SIZE = 64 * 1024; // 64 KiB
const BUFFERED_AMOUNT_LOW_THRESHOLD = 256 * 1024; // 256 KiB backpressure limit
const MAGIC_BYTES = [0x54, 0x4F, 0x52, 0x4E]; // "TORN"
const PROTOCOL_VERSION = 1;
const HEADER_SIZE = 65; // 4 magic + 1 ver + 36 uuid + 4 chunkIdx + 4 totalChunks + 4 payloadLen + 12 iv

// Helper: Convert ArrayBuffer to Hex String
function buf2hex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// Helper: Compute SHA-256 of ArrayBuffer or Blob
export async function computeSHA256(blobOrBuffer) {
    let buffer = blobOrBuffer;
    if (blobOrBuffer instanceof Blob || blobOrBuffer instanceof File) {
        buffer = await blobOrBuffer.arrayBuffer();
    }
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return buf2hex(hashBuffer);
}

// Helper: Generate ephemeral AES-256-GCM Key
async function generateAESKey() {
    return await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

// Helper: Export Key as Raw Base64
async function exportKeyBase64(key) {
    const raw = await crypto.subtle.exportKey("raw", key);
    return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

// Helper: Import Key from Base64
async function importKeyBase64(base64Str) {
    const rawStr = atob(base64Str);
    const bytes = new Uint8Array(rawStr.length);
    for (let i = 0; i < rawStr.length; i++) {
        bytes[i] = rawStr.charCodeAt(i);
    }
    return await crypto.subtle.importKey(
        "raw",
        bytes.buffer,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Packs a chunk frame with binary header:
 * [4B MAGIC][1B VER][36B TRANSFER_ID][4B CHUNK_IDX][4B TOTAL_CHUNKS][4B PAYLOAD_LEN][12B IV][PAYLOAD]
 */
function packFrame(transferId, chunkIndex, totalChunks, iv, payload) {
    const payloadBytes = new Uint8Array(payload);
    const frameBuffer = new ArrayBuffer(HEADER_SIZE + payloadBytes.byteLength);
    const view = new DataView(frameBuffer);
    const u8 = new Uint8Array(frameBuffer);

    // Magic bytes "TORN"
    u8.set(MAGIC_BYTES, 0);

    // Version
    u8[4] = PROTOCOL_VERSION;

    // Transfer ID (padded to 36 chars)
    const paddedId = (transferId || "").padEnd(36, " ").slice(0, 36);
    for (let i = 0; i < 36; i++) {
        u8[5 + i] = paddedId.charCodeAt(i);
    }

    // Indices and lengths (Big Endian)
    view.setUint32(41, chunkIndex, false);
    view.setUint32(45, totalChunks, false);
    view.setUint32(49, payloadBytes.byteLength, false);

    // IV (12 bytes)
    u8.set(iv, 53);

    // Payload
    u8.set(payloadBytes, HEADER_SIZE);

    return frameBuffer;
}

/**
 * Unpacks a received binary frame.
 */
function unpackFrame(arrayBuffer) {
    if (arrayBuffer.byteLength < HEADER_SIZE) {
        throw new Error("Frame size smaller than header minimum.");
    }

    const u8 = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);

    // Verify magic bytes
    if (
        u8[0] !== MAGIC_BYTES[0] ||
        u8[1] !== MAGIC_BYTES[1] ||
        u8[2] !== MAGIC_BYTES[2] ||
        u8[3] !== MAGIC_BYTES[3]
    ) {
        throw new Error("Invalid protocol magic bytes.");
    }

    const version = u8[4];
    let transferId = "";
    for (let i = 0; i < 36; i++) {
        transferId += String.fromCharCode(u8[5 + i]);
    }
    transferId = transferId.trim();

    const chunkIndex = view.getUint32(41, false);
    const totalChunks = view.getUint32(45, false);
    const payloadLength = view.getUint32(49, false);

    const iv = u8.slice(53, 65);
    const payload = arrayBuffer.slice(HEADER_SIZE, HEADER_SIZE + payloadLength);

    return {
        version,
        transferId,
        chunkIndex,
        totalChunks,
        payloadLength,
        iv,
        payload
    };
}

class P2PTransferEngine {
    constructor() {
        this.socket = null;
        this.myUserId = null;
        this.peerConnections = new Map(); // peerUserId -> RTCPeerConnection
        this.dataChannels = new Map(); // peerUserId -> RTCDataChannel
        this.activeTransfers = new Map(); // transferId -> TransferSession
        this.listeners = new Set();
        this.iceCandidatesQueue = new Map(); // peerUserId -> [candidates]
        this.localIdentity = null;
        this.peerPubKeys = new Map(); // String(userId) -> canonical public JWK
    }

    setIdentity(identity) {
        this.localIdentity = identity || null;
    }

    setPeerPublicKey(userId, pubJwk) {
        if (!userId || !pubJwk) return;
        try {
            const can = canonicalizePublicJwk(pubJwk);
            if (can) {
                this.peerPubKeys.set(String(userId), can);
            }
        } catch (e) { }
    }

    /**
     * Bind current session socket and authenticated user ID.
     */
    init(socket, myUserId) {
        this.socket = socket;
        this.myUserId = myUserId;
    }

    /**
     * Subscribe to engine events.
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    emit(event, data) {
        for (const listener of this.listeners) {
            try {
                listener(event, data);
            } catch (err) {
                console.error("P2P Engine listener error:", err);
            }
        }
    }

    /**
     * Create or reuse an RTCPeerConnection to the target peer.
     */
    getOrCreatePeerConnection(peerUserId, isInitiator = false) {
        const peerKey = String(peerUserId);
        if (this.peerConnections.has(peerKey)) {
            const pc = this.peerConnections.get(peerKey);
            if (pc.signalingState !== "closed" && pc.connectionState !== "failed") {
                return pc;
            }
            try { pc.close(); } catch (e) {}
        }

        const pc = new RTCPeerConnection({
            iceServers: DEFAULT_ICE_SERVERS,
            iceCandidatePoolSize: 2
        });

        this.peerConnections.set(peerKey, pc);

        pc.onicecandidate = (event) => {
            if (event.candidate && this.socket?.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: "p2p_ice_candidate",
                    receiver_id: peerUserId,
                    candidate: event.candidate
                }));
            }
        };

        pc.onconnectionstatechange = () => {
            console.log(`[P2P Engine] Peer ${peerUserId} connectionState: ${pc.connectionState}`);
            if (pc.connectionState === "failed") {
                this.notifyTransfersForPeer(peerUserId, TRANSFER_STATES.NAT_TRAVERSAL_FAILED, {
                    message: "Direct peer connection failed due to symmetric NAT or firewall restrictions."
                });
            } else if (pc.connectionState === "disconnected") {
                this.notifyTransfersForPeer(peerUserId, TRANSFER_STATES.CONNECTION_LOST, {
                    message: "Peer disconnected during direct transmission."
                });
            }
        };

        if (isInitiator) {
            // Initiator creates the reliable binary DataChannel
            const dc = pc.createDataChannel("chattornado-p2p-media", {
                ordered: true,
                maxRetransmits: 30
            });
            this.setupDataChannel(dc, peerUserId);
        } else {
            // Receiver listens for incoming channel
            pc.ondatachannel = (event) => {
                this.setupDataChannel(event.channel, peerUserId);
            };
        }

        return pc;
    }

    setupDataChannel(dc, peerUserId) {
        const peerKey = String(peerUserId);
        dc.binaryType = "arraybuffer";
        dc.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW_THRESHOLD;

        dc.onopen = () => {
            console.log(`[P2P Engine] DataChannel open with peer ${peerUserId}`);
            this.dataChannels.set(peerKey, dc);
            this.processPendingTransfersForPeer(peerUserId);
        };

        dc.onclose = () => {
            console.log(`[P2P Engine] DataChannel closed with peer ${peerUserId}`);
            this.dataChannels.delete(peerKey);
        };

        dc.onerror = (err) => {
            console.error(`[P2P Engine] DataChannel error with peer ${peerUserId}:`, err);
        };

        dc.onmessage = async (event) => {
            if (event.data instanceof ArrayBuffer) {
                await this.handleIncomingBinaryFrame(event.data, peerUserId);
            }
        };

        this.dataChannels.set(peerKey, dc);
    }

    /**
     * Start a direct P2P file transfer.
     */
    async sendFile(file, recipientId, options = {}) {
        if (!file) throw new Error("No file provided.");
        const transferId = options.transferId || `p2p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Calculate SHA-256 digest
        const sha256 = await computeSHA256(file);

        // Zero-Knowledge ECDH P-256 derived key when peer public key is available; fallback to ephemeral AES key
        const peerPubJwk = canonicalizePublicJwk(options.peerPubKey || this.peerPubKeys.get(String(recipientId)));
        let aesKey = null;
        let keyBase64 = null;
        let keyMode = "ephemeral-aes";
        let senderPubKey = this.localIdentity?.publicJwk || null;

        if (this.localIdentity?.privateKey && peerPubJwk) {
            aesKey = await deriveSharedAESKey(this.localIdentity.privateKey, peerPubJwk, transferId);
            keyMode = "ecdh-p256";
        } else {
            aesKey = await generateAESKey();
            keyBase64 = await exportKeyBase64(aesKey);
        }

        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        const session = {
            transferId,
            role: "sender",
            peerUserId: recipientId,
            file,
            filename: options.filename || file.name || "media",
            mimeType: options.mimeType || file.type || "application/octet-stream",
            fileSize: file.size,
            mediaType: options.mediaType || (file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file"),
            totalChunks,
            chunkSize: CHUNK_SIZE,
            sha256,
            aesKey,
            keyBase64,
            keyMode,
            status: TRANSFER_STATES.WAITING_FOR_ACCEPTANCE,
            bytesSent: 0,
            startTime: Date.now(),
            onProgress: options.onProgress,
            onComplete: options.onComplete,
            onError: options.onError
        };

        this.activeTransfers.set(transferId, session);

        // Save into local Outbox in case recipient is offline or transfer restarts
        await saveOutboxTransfer(transferId, file, {
            filename: session.filename,
            fileSize: session.fileSize,
            mimeType: session.mimeType,
            recipientId,
            senderId: this.myUserId,
            sha256,
            status: session.status
        });

        // Notify UI of initial state
        this.emit("transfer_state", { transferId, state: session.status, session });

        // Send transfer handshake metadata over WebSocket signaling
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: "p2p_transfer_request",
                receiver_id: recipientId,
                transfer_id: transferId,
                filename: session.filename,
                mime_type: session.mimeType,
                media_type: session.mediaType,
                file_size: session.fileSize,
                total_chunks: totalChunks,
                chunk_size: CHUNK_SIZE,
                sha256,
                key_mode: keyMode,
                sender_pub_key: senderPubKey,
                ...(keyMode === "ephemeral-aes" ? { key_base64: keyBase64 } : {})
            }));
        } else {
            session.status = TRANSFER_STATES.WAITING_FOR_PEER;
            this.emit("transfer_state", { transferId, state: session.status, session });
        }

        return session;
    }

    /**
     * Accept an incoming P2P transfer request.
     */
    async acceptTransfer(transferId) {
        const session = this.activeTransfers.get(transferId);
        if (!session || session.role !== "receiver") {
            console.warn(`No receiver session for transfer ${transferId}`);
            return;
        }

        session.status = TRANSFER_STATES.CONNECTING;
        this.emit("transfer_state", { transferId, state: session.status, session });

        // Signal sender that transfer was accepted
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: "p2p_transfer_accept",
                receiver_id: session.peerUserId,
                transfer_id: transferId
            }));
        }

        // Prepare WebRTC peer connection
        const pc = this.getOrCreatePeerConnection(session.peerUserId, false);
        return session;
    }

    /**
     * Decline an incoming P2P transfer request.
     */
    rejectTransfer(transferId) { return this.declineTransfer(transferId); }

    declineTransfer(transferId) {
        const session = this.activeTransfers.get(transferId);
        if (session) {
            session.status = TRANSFER_STATES.DECLINED;
            this.emit("transfer_state", { transferId, state: session.status, session });

            if (this.socket?.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: "p2p_transfer_reject",
                    receiver_id: session.peerUserId,
                    transfer_id: transferId
                }));
            }

            this.cleanupTransfer(transferId);
        }
    }

    /**
     * Cancel an ongoing transfer (sender or receiver).
     */
    cancelTransfer(transferId) {
        const session = this.activeTransfers.get(transferId);
        if (session) {
            session.status = TRANSFER_STATES.CANCELLED;
            this.emit("transfer_state", { transferId, state: session.status, session });

            if (this.socket?.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: "p2p_transfer_cancel",
                    receiver_id: session.peerUserId,
                    transfer_id: transferId
                }));
            }

            deleteOutboxTransfer(transferId).catch(() => {});
            this.cleanupTransfer(transferId);
        }
    }

    /**
     * Handle incoming WebSocket signals for WebRTC handshake and metadata.
     */
    async handleSignal(packet) {
        const { type, sender_id, transfer_id } = packet;

        // 1. Peer sent WebRTC Offer
        if (type === "p2p_offer") {
            const pc = this.getOrCreatePeerConnection(sender_id, false);
            await pc.setRemoteDescription(new RTCSessionDescription(packet.sdp));

            // Flush queued ICE candidates
            const peerKey = String(sender_id);
            if (this.iceCandidatesQueue.has(peerKey)) {
                for (const cand of this.iceCandidatesQueue.get(peerKey)) {
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                }
                this.iceCandidatesQueue.delete(peerKey);
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (this.socket?.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: "p2p_answer",
                    receiver_id: sender_id,
                    sdp: answer
                }));
            }
            return;
        }

        // 2. Peer sent WebRTC Answer
        if (type === "p2p_answer") {
            const peerKey = String(sender_id);
            const pc = this.peerConnections.get(peerKey);
            if (pc && pc.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(new RTCSessionDescription(packet.sdp));
            }
            return;
        }

        // 3. ICE Candidate Exchange
        if (type === "p2p_ice_candidate") {
            const peerKey = String(sender_id);
            const pc = this.peerConnections.get(peerKey);
            if (pc && pc.remoteDescription) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(packet.candidate));
                } catch (e) {
                    console.warn("Error adding ICE candidate:", e);
                }
            } else {
                if (!this.iceCandidatesQueue.has(peerKey)) {
                    this.iceCandidatesQueue.set(peerKey, []);
                }
                this.iceCandidatesQueue.get(peerKey).push(packet.candidate);
            }
            return;
        }

        // 3b. Live Peer ECDH Public Key Announcement
        if (type === "p2p_pubkey_exchange") {
            if (sender_id && packet.public_key) {
                this.setPeerPublicKey(sender_id, packet.public_key);
                this.emit("peer_pubkey_updated", { userId: sender_id, publicKey: packet.public_key });
            }
            return;
        }

        // 4. Incoming Transfer Handshake Request
        if (type === "p2p_transfer_request") {
            if (sender_id && packet.sender_pub_key) {
                this.setPeerPublicKey(sender_id, packet.sender_pub_key);
            }
            let aesKey = null;
            if (packet.key_mode === "ecdh-p256" && packet.sender_pub_key && this.localIdentity?.privateKey) {
                aesKey = await deriveSharedAESKey(this.localIdentity.privateKey, packet.sender_pub_key, transfer_id);
            } else if (packet.key_base64) {
                aesKey = await importKeyBase64(packet.key_base64);
            }

            const session = {
                transferId: transfer_id,
                role: "receiver",
                peerUserId: sender_id,
                filename: packet.filename,
                mimeType: packet.mime_type,
                mediaType: packet.media_type,
                fileSize: packet.file_size,
                totalChunks: packet.total_chunks,
                chunkSize: packet.chunk_size || CHUNK_SIZE,
                sha256: packet.sha256,
                aesKey,
                receivedChunks: new Map(),
                receivedBytes: 0,
                status: TRANSFER_STATES.WAITING_FOR_ACCEPTANCE,
                startTime: Date.now()
            };

            this.activeTransfers.set(transfer_id, session);
            this.emit("incoming_transfer", session);
            this.emit("transfer_state", { transferId: transfer_id, state: session.status, session });
            return;
        }

        // 5. Recipient Accepted Transfer -> Start WebRTC Offer
        if (type === "p2p_transfer_accept") {
            const session = this.activeTransfers.get(transfer_id);
            if (session && session.role === "sender") {
                session.status = TRANSFER_STATES.CONNECTING;
                this.emit("transfer_state", { transferId: transfer_id, state: session.status, session });

                const pc = this.getOrCreatePeerConnection(sender_id, true);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                if (this.socket?.readyState === WebSocket.OPEN) {
                    this.socket.send(JSON.stringify({
                        type: "p2p_offer",
                        receiver_id: sender_id,
                        sdp: offer
                    }));
                }
            }
            return;
        }

        // 6. Recipient Rejected
        if (type === "p2p_transfer_reject") {
            const session = this.activeTransfers.get(transfer_id);
            if (session) {
                session.status = TRANSFER_STATES.DECLINED;
                this.emit("transfer_state", { transferId: transfer_id, state: session.status, session });
                deleteOutboxTransfer(transfer_id).catch(() => {});
                this.cleanupTransfer(transfer_id);
            }
            return;
        }

        // 7. Remote Cancelled
        if (type === "p2p_transfer_cancel") {
            const session = this.activeTransfers.get(transfer_id);
            if (session) {
                session.status = TRANSFER_STATES.CANCELLED;
                this.emit("transfer_state", { transferId: transfer_id, state: session.status, session });
                this.cleanupTransfer(transfer_id);
            }
            return;
        }

        // 8. Offline Recipient Notification from Server
        if (type === "p2p_transfer_failed" && packet.reason === "RECIPIENT_OFFLINE") {
            const session = this.activeTransfers.get(transfer_id);
            if (session) {
                session.status = TRANSFER_STATES.WAITING_FOR_PEER;
                this.emit("transfer_state", { transferId: transfer_id, state: session.status, session });
                updateOutboxStatus(transfer_id, TRANSFER_STATES.WAITING_FOR_PEER).catch(() => {});
            }
        }
    }

    /**
     * Triggered when DataChannel opens with a peer; streams pending transfers.
     */
    async processPendingTransfersForPeer(peerUserId) {
        const dc = this.dataChannels.get(String(peerUserId));
        if (!dc || dc.readyState !== "open") return;

        for (const [transferId, session] of this.activeTransfers.entries()) {
            if (
                session.role === "sender" &&
                String(session.peerUserId) === String(peerUserId) &&
                (session.status === TRANSFER_STATES.CONNECTING || session.status === TRANSFER_STATES.WAITING_FOR_ACCEPTANCE)
            ) {
                this.streamFileOverDataChannel(session, dc);
            }
        }
    }

    /**
     * Binary streaming loop with flow control / backpressure.
     */
    async streamFileOverDataChannel(session, dc) {
        session.status = TRANSFER_STATES.TRANSFERRING;
        this.emit("transfer_state", { transferId: session.transferId, state: session.status, session });

        const file = session.file;
        const totalChunks = session.totalChunks;
        const chunkSize = session.chunkSize;
        let lastReportTime = Date.now();
        let bytesSentSinceReport = 0;

        for (let i = 0; i < totalChunks; i++) {
            // Check if transfer was aborted
            if (session.status === TRANSFER_STATES.CANCELLED) {
                console.log(`[P2P Engine] Transfer ${session.transferId} cancelled by sender.`);
                return;
            }

            // Slice chunk incrementally from file (zero memory blowup)
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const sliceBlob = file.slice(start, end);
            const rawChunkBuffer = await sliceBlob.arrayBuffer();

            // Encrypt chunk with AES-256-GCM using unique 12-byte IV
            const iv = crypto.getRandomValues(new Uint8Array(12));
            let payloadBuffer = rawChunkBuffer;

            if (session.aesKey) {
                payloadBuffer = await crypto.subtle.encrypt(
                    { name: "AES-GCM", iv },
                    session.aesKey,
                    rawChunkBuffer
                );
            }

            // Pack binary frame
            const frame = packFrame(session.transferId, i, totalChunks, iv, payloadBuffer);

            // Backpressure flow control
            if (dc.bufferedAmount > dc.bufferedAmountLowThreshold) {
                await new Promise((resolve) => {
                    const onLow = () => {
                        dc.removeEventListener("bufferedamountlow", onLow);
                        resolve();
                    };
                    dc.addEventListener("bufferedamountlow", onLow);
                });
            }

            try {
                dc.send(frame);
            } catch (err) {
                console.error("[P2P Engine] DataChannel send failed:", err);
                session.status = TRANSFER_STATES.CONNECTION_LOST;
                this.emit("transfer_state", { transferId: session.transferId, state: session.status, session });
                return;
            }

            session.bytesSent += (end - start);
            bytesSentSinceReport += (end - start);

            const now = Date.now();
            if (now - lastReportTime >= 150 || i === totalChunks - 1) {
                const elapsedSec = (now - lastReportTime) / 1000 || 0.001;
                const speedBps = Math.round(bytesSentSinceReport / elapsedSec);
                const percent = Math.min(Math.round((session.bytesSent / file.size) * 100), 99);

                session.onProgress?.(percent, session.bytesSent, file.size, speedBps);
                this.emit("transfer_progress", {
                    transferId: session.transferId,
                    percent,
                    bytesSent: session.bytesSent,
                    totalBytes: file.size,
                    speedBps
                });

                lastReportTime = now;
                bytesSentSinceReport = 0;
            }
        }

        console.log(`[P2P Engine] Sender finished transmitting ${totalChunks} chunks for ${session.transferId}`);
        session.status = TRANSFER_STATES.VERIFYING;
        this.emit("transfer_state", { transferId: session.transferId, state: session.status, session });
    }

    /**
     * Unpack and decrypt incoming chunk from DataChannel.
     */
    async handleIncomingBinaryFrame(arrayBuffer, peerUserId) {
        try {
            const frame = unpackFrame(arrayBuffer);
            const session = this.activeTransfers.get(frame.transferId);

            if (!session || session.role !== "receiver") {
                return;
            }

            // Decrypt payload
            let decryptedChunk = frame.payload;
            if (session.aesKey) {
                decryptedChunk = await crypto.subtle.decrypt(
                    { name: "AES-GCM", iv: frame.iv },
                    session.aesKey,
                    frame.payload
                );
            }

            session.status = TRANSFER_STATES.TRANSFERRING;
            session.receivedChunks.set(frame.chunkIndex, decryptedChunk);
            session.receivedBytes += decryptedChunk.byteLength;

            const percent = Math.min(Math.round((session.receivedBytes / session.fileSize) * 100), 99);
            this.emit("transfer_progress", {
                transferId: session.transferId,
                percent,
                bytesReceived: session.receivedBytes,
                totalBytes: session.fileSize
            });

            // Check if all chunks have been received
            if (session.receivedChunks.size === session.totalChunks) {
                await this.finalizeIncomingTransfer(session);
            }
        } catch (err) {
            console.error("[P2P Engine] Error unpacking binary frame:", err);
        }
    }

    /**
     * Reconstruct received chunks, verify SHA-256, and save to Dual Storage (Android + Web).
     */
    async finalizeIncomingTransfer(session) {
        session.status = TRANSFER_STATES.VERIFYING;
        this.emit("transfer_state", { transferId: session.transferId, state: session.status, session });

        // Assemble chunks in numerical order
        const orderedParts = [];
        for (let i = 0; i < session.totalChunks; i++) {
            const part = session.receivedChunks.get(i);
            if (!part) {
                console.error(`[P2P Engine] Missing chunk ${i} for ${session.transferId}`);
                session.status = TRANSFER_STATES.INTEGRITY_FAILED;
                this.emit("transfer_state", { transferId: session.transferId, state: session.status, session });
                return;
            }
            orderedParts.push(part);
        }

        const completeBlob = new Blob(orderedParts, { type: session.mimeType || "application/octet-stream" });

        // Verify SHA-256 hash
        const computedHash = await computeSHA256(completeBlob);
        if (session.sha256 && computedHash.toLowerCase() !== session.sha256.toLowerCase()) {
            console.error(`[P2P Engine] SHA-256 mismatch for ${session.transferId}! Expected ${session.sha256}, got ${computedHash}`);
            session.status = TRANSFER_STATES.INTEGRITY_FAILED;
            this.emit("transfer_state", { transferId: session.transferId, state: session.status, session });
            return;
        }

        // Dual storage 1: Save in IndexedDB in-app vault for instant offline rendering
        await saveLocalMedia(session.transferId, completeBlob, {
            name: session.filename,
            type: session.mimeType,
            size: session.fileSize,
            senderId: session.peerUserId
        });

        // Dual storage 2: On Android Capacitor, export to public Pictures/ChatTornado or Download/ChatTornado
        await this.saveToAndroidPublicStorage(completeBlob, session.filename, session.mimeType);

        session.status = TRANSFER_STATES.COMPLETED;
        this.emit("transfer_state", { transferId: session.transferId, state: session.status, session, fileBlob: completeBlob });
        this.emit("transfer_completed", { transferId: session.transferId, fileBlob: completeBlob, session });

        // Acknowledge completion to sender over WebSocket
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: "p2p_transfer_complete",
                receiver_id: session.peerUserId,
                transfer_id: session.transferId
            }));
        }

        console.log(`[P2P Engine] Successfully received and verified ${session.filename} (${session.fileSize} bytes)`);
    }

    /**
     * Save media to Android public directories via Capacitor Filesystem (Pictures/ChatTornado, Download/ChatTornado)
     */
    async saveToAndroidPublicStorage(blob, filename, mimeType) {
        try {
            if (typeof window !== "undefined" && window.Capacitor?.isNativePlatform()) {
                const { Filesystem, Directory } = await import("@capacitor/filesystem");
                const buffer = await blob.arrayBuffer();
                const base64Data = btoa(
                    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
                );

                const subFolder = mimeType.startsWith("image/") ? "Pictures/ChatTornado" : mimeType.startsWith("video/") ? "Movies/ChatTornado" : "Download/ChatTornado";

                try {
                    await Filesystem.mkdir({
                        path: subFolder,
                        directory: Directory.ExternalStorage,
                        recursive: true
                    });
                } catch (e) {}

                await Filesystem.writeFile({
                    path: `${subFolder}/${filename}`,
                    data: base64Data,
                    directory: Directory.ExternalStorage
                });

                console.log(`[P2P Engine] Saved file to Android public storage: ${subFolder}/${filename}`);
            }
        } catch (androidErr) {
            console.warn("[P2P Engine] Capacitor public storage write skipped or failed:", androidErr);
        }
    }

    notifyTransfersForPeer(peerUserId, state, details = {}) {
        for (const [transferId, session] of this.activeTransfers.entries()) {
            if (String(session.peerUserId) === String(peerUserId) && session.status !== TRANSFER_STATES.COMPLETED) {
                session.status = state;
                this.emit("transfer_state", { transferId, state, session, details });
            }
        }
    }

    cleanupTransfer(transferId) {
        const session = this.activeTransfers.get(transferId);
        if (session?.receivedChunks) {
            session.receivedChunks.clear();
        }
        this.activeTransfers.delete(transferId);
    }
}

// Global Singleton Engine Instance
export const p2pEngine = new P2PTransferEngine();
export default p2pEngine;
