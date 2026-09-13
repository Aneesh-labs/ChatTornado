import { saveLocalMedia, getLocalMedia, getLocalMediaUrl, deleteLocalMedia } from "./db";

/**
 * P2P Data Channel & File Transfer Engine
 * Enables zero-server-storage direct browser-to-browser transfers for heavy photos & files.
 */

// Track active WebRTC peer connections keyed by userId
const peerConnections = new Map();
const dataChannels = new Map();
const pendingTransfers = new Map(); // fileId -> { chunks: [], totalChunks, metadata, onProgress, onComplete }

const ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
];

const CHUNK_SIZE = 64 * 1024; // 64 KB chunks for smooth browser streaming

/**
 * Prepare a heavy photo or document for Pure P2P Zero-Server transfer.
 * @param {File} file - The file selected by user
 * @param {number} receiverId - The recipient's user ID
 * @param {WebSocket} socket - Active WebSocket connection
 * @returns {Promise<string>} Message payload to send via chat
 */
export async function prepareP2PFile(file, receiverId, socket) {
    const fileId = `p2p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 1. Save directly into sender's local IndexedDB (zero server upload)
    await saveLocalMedia(fileId, file, {
        name: file.name,
        type: file.type,
        size: file.size,
        receiverId,
    });

    // 2. Format a specialized P2P message packet
    const payload = `⚡ P2P_MEDIA\n${JSON.stringify({
        fileId,
        name: file.name,
        type: file.type,
        size: file.size,
    })}`;

    // 3. Notify receiver via WebSocket that file is available on sender's device
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "p2p_offer",
            receiver_id: receiverId,
            fileId,
            name: file.name,
            size: file.size,
            mimeType: file.type,
        }));
    }

    return payload;
}

/**
 * Request download of a P2P file from sender's device.
 * @param {string} fileId - Unique ID of the file
 * @param {number} senderId - ID of user who holds the file
 * @param {WebSocket} socket - Active WebSocket
 * @param {Function} onProgress - Progress callback (percentage)
 * @param {Function} onComplete - Completion callback (blob)
 */
export async function requestP2PDownload(fileId, senderId, socket, onProgress = () => { }, onComplete = () => { }) {
    // 1. Check if we already have it in local IndexedDB
    const existing = await getLocalMedia(fileId);
    if (existing) {
        onProgress(100);
        onComplete(existing.blob);
        return existing.blob;
    }

    // 2. Register pending transfer
    pendingTransfers.set(fileId, {
        chunks: [],
        receivedBytes: 0,
        totalBytes: 0,
        onProgress,
        onComplete,
    });

    // 3. Send request to peer over signaling
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "p2p_request",
            receiver_id: senderId,
            fileId,
        }));
    }
}

/**
 * Handle incoming P2P signaling messages from WebSocket.
 * @param {Object} data - Packet from WebSocket
 * @param {WebSocket} socket - Active WebSocket connection
 */
export async function handleP2PSignal(data, socket) {
    const { type, sender_id, fileId } = data;

    // A peer is requesting a file that is saved on our device
    if (type === "p2p_request" && fileId) {
        const record = await getLocalMedia(fileId);
        if (!record || !record.blob) {
            console.warn("P2P requested file not found in local vault:", fileId);
            return;
        }

        // Stream the file in chunks to the requester
        const arrayBuffer = await record.blob.arrayBuffer();
        const totalBytes = arrayBuffer.byteLength;
        const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);

        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, totalBytes);
            const chunk = arrayBuffer.slice(start, end);

            // Convert chunk to base64 for safe JSON WebSocket transport
            const base64Chunk = btoa(
                new Uint8Array(chunk).reduce((data, byte) => data + String.fromCharCode(byte), "")
            );

            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: "p2p_chunk",
                    receiver_id: sender_id,
                    fileId,
                    chunkIndex: i,
                    totalChunks,
                    totalBytes,
                    name: record.name,
                    mimeType: record.type,
                    data: base64Chunk,
                }));
            }

            // Yield execution briefly so browser UI stays snappy
            if (i % 10 === 0) {
                await new Promise((r) => setTimeout(r, 5));
            }
        }

        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: "p2p_complete",
                receiver_id: sender_id,
                fileId,
            }));
        }
    }

    // We are receiving a chunk of a file we requested
    if (type === "p2p_chunk" && fileId) {
        const transfer = pendingTransfers.get(fileId);
        if (!transfer) return;

        const { chunkIndex, totalChunks, totalBytes, name, mimeType, data: base64Data } = data;

        // Decode base64 chunk
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        transfer.chunks[chunkIndex] = bytes.buffer;
        transfer.receivedBytes += bytes.length;
        transfer.totalBytes = totalBytes;
        transfer.name = name;
        transfer.mimeType = mimeType;

        const percent = Math.min(Math.round((transfer.receivedBytes / totalBytes) * 100), 99);
        transfer.onProgress?.(percent);
    }

    // File transfer completed
    if (type === "p2p_complete" && fileId) {
        const transfer = pendingTransfers.get(fileId);
        if (!transfer) return;

        const blob = new Blob(transfer.chunks, { type: transfer.mimeType || "application/octet-stream" });

        // Save to receiver's local IndexedDB
        await saveLocalMedia(fileId, blob, {
            name: transfer.name,
            type: transfer.mimeType,
            size: transfer.totalBytes,
            senderId: sender_id,
        });

        transfer.onProgress?.(100);
        transfer.onComplete?.(blob);
        pendingTransfers.delete(fileId);
    }

    // Cascade wipe
    if (type === "p2p_wipe" && fileId) {
        await deleteLocalMedia(fileId);
    }
}

export default {
    prepareP2PFile,
    requestP2PDownload,
    handleP2PSignal,
};

