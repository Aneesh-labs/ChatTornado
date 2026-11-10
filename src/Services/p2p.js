/**
 * P2P WebRTC DataChannel & Media Engine Adapter
 * Wraps p2pTransferEngine for seamless backwards-compatibility across the app.
 * ZERO SERVER STORAGE:
 * All binary transfers occur directly between peer devices via WebRTC DataChannels.
 */

import p2pEngine, { TRANSFER_STATES, DEFAULT_ICE_SERVERS, CHUNK_SIZE } from "./webrtc/p2pTransferEngine";
import { saveLocalMedia, getLocalMedia, getLocalMediaUrl, deleteLocalMedia } from "./db";

export { p2pEngine, TRANSFER_STATES, DEFAULT_ICE_SERVERS, CHUNK_SIZE };

/**
 * Prepare and initiate a P2P zero-server file transfer.
 */
export async function prepareP2PFile(file, receiverId, socket) {
    if (socket) {
        const myUserId = sessionStorage.getItem("user_id") || "me";
        p2pEngine.init(socket, myUserId);
    }

    const session = await p2pEngine.sendFile(file, receiverId);

    const payload = `⚡ P2P_MEDIA\n${JSON.stringify({
        transferId: session.transferId,
        fileId: session.transferId,
        filename: session.filename,
        name: session.filename,
        mimeType: session.mimeType,
        type: session.mimeType,
        fileSize: session.fileSize,
        size: session.fileSize,
        sha256: session.sha256,
        mediaType: session.mediaType
    })}`;

    return payload;
}

/**
 * Request download / accept a P2P file transfer.
 */
export async function requestP2PDownload(fileId, senderId, socket, onProgress = () => {}, onComplete = () => {}) {
    // 1. Check local IndexedDB first
    const existing = await getLocalMedia(fileId);
    if (existing?.blob) {
        onProgress(100);
        onComplete(existing.blob);
        return existing.blob;
    }

    if (socket) {
        const myUserId = sessionStorage.getItem("user_id") || "me";
        p2pEngine.init(socket, myUserId);
    }

    // Subscribe to transfer events
    const unsub = p2pEngine.subscribe((event, data) => {
        if (data?.transferId === fileId) {
            if (event === "transfer_progress") {
                onProgress(data.percent || 0);
            } else if (event === "transfer_completed") {
                onProgress(100);
                if (data.fileBlob) onComplete(data.fileBlob);
                unsub();
            } else if (data.state === TRANSFER_STATES.COMPLETED) {
                getLocalMedia(fileId).then((rec) => {
                    if (rec?.blob) {
                        onProgress(100);
                        onComplete(rec.blob);
                        unsub();
                    }
                });
            }
        }
    });

    await p2pEngine.acceptTransfer(fileId);
}

/**
 * Handle incoming P2P signaling messages from WebSocket.
 */
export async function handleP2PSignal(data, socket) {
    if (socket) {
        const myUserId = sessionStorage.getItem("user_id") || "me";
        p2pEngine.init(socket, myUserId);
    }
    await p2pEngine.handleSignal(data);
}

export default {
    p2pEngine,
    prepareP2PFile,
    requestP2PDownload,
    handleP2PSignal,
    TRANSFER_STATES
};
