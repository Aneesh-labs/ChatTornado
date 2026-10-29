/**
 * IndexedDB Local Vault for ChatTornado Pure P2P Storage & Offline-First Caching
 * Stores heavy photos, documents, P2P media chunks, and offline message queues
 * directly on the device with zero server storage footprint.
 */

const DB_NAME = "ChatTornadoVault";
const DB_VERSION = 2;
const STORE_MEDIA = "p2p_media";
const STORE_MESSAGES = "local_messages";
const STORE_OFFLINE_QUEUE = "offline_queue";

// Memory cache for object URLs to enable instant rendering without waiting for DB disk reads
const blobUrlCache = new Map();

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_MEDIA)) {
                db.createObjectStore(STORE_MEDIA, { keyPath: "id" });
            }

            if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
                const messageStore = db.createObjectStore(STORE_MESSAGES, { keyPath: "id" });
                messageStore.createIndex("conversationId", "conversationId", { unique: false });
                messageStore.createIndex("timestamp", "timestamp", { unique: false });
            }

            if (!db.objectStoreNames.contains(STORE_OFFLINE_QUEUE)) {
                db.createObjectStore(STORE_OFFLINE_QUEUE, { keyPath: "temp_id" });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error("IndexedDB open error:", event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Save a heavy media file (Photo, Document, Large File) into local device storage.
 * @param {string} id - Unique file identifier (e.g. 'p2p_1726231234_abc')
 * @param {Blob|File} blob - Raw binary file data
 * @param {Object} metadata - File metadata (name, type, size, senderId, receiverId)
 */
export async function saveLocalMedia(id, blob, metadata = {}) {
    if (blob) {
        try {
            const url = URL.createObjectURL(blob);
            blobUrlCache.set(id, url);
        } catch (e) {
            console.warn("Could not create object URL for cache:", e);
        }
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_MEDIA, "readwrite");
        const store = tx.objectStore(STORE_MEDIA);

        const record = {
            id,
            blob,
            name: metadata.name || "attachment",
            type: metadata.type || blob.type || "application/octet-stream",
            size: metadata.size || blob.size || 0,
            senderId: metadata.senderId,
            receiverId: metadata.receiverId,
            createdAt: metadata.createdAt || Date.now(),
        };

        const request = store.put(record);

        request.onsuccess = () => resolve(record);
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Retrieve a heavy media file from local storage.
 * @param {string} id - Unique file identifier
 * @returns {Promise<Object|null>}
 */
export async function getLocalMedia(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_MEDIA, "readonly");
        const store = tx.objectStore(STORE_MEDIA);
        const request = store.get(id);

        request.onsuccess = (e) => resolve(e.target.result || null);
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Delete a media file permanently from local device storage (Cascade Wipe).
 * @param {string} id - Unique file identifier
 */
export async function deleteLocalMedia(id) {
    if (blobUrlCache.has(id)) {
        try {
            URL.revokeObjectURL(blobUrlCache.get(id));
        } catch (e) { }
        blobUrlCache.delete(id);
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_MEDIA, "readwrite");
        const store = tx.objectStore(STORE_MEDIA);
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Get object URL for a locally stored media file (for instant rendering in UI without server).
 * @param {string} id - Unique file identifier
 * @returns {Promise<string|null>} Object URL (blob:http://...)
 */
export async function getLocalMediaUrl(id) {
    if (blobUrlCache.has(id)) {
        return blobUrlCache.get(id);
    }
    const record = await getLocalMedia(id);
    if (!record || !record.blob) return null;
    try {
        const url = URL.createObjectURL(record.blob);
        blobUrlCache.set(id, url);
        return url;
    } catch (e) {
        console.warn("Could not create object URL:", e);
        return null;
    }
}

/* ==========================================================================
   OFFLINE-FIRST MESSAGE CACHING & QUEUE
   ========================================================================== */

/**
 * Cache conversation messages in IndexedDB for instant offline-first rendering.
 * @param {string|number} conversationId
 * @param {Array} messages
 */
export async function cacheOfflineMessages(conversationId, messages = []) {
    if (!conversationId || !Array.isArray(messages)) return;
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_MESSAGES, "readwrite");
        const store = tx.objectStore(STORE_MESSAGES);
        
        // Cache the latest 100 messages for this conversation
        const key = `conv_${conversationId}`;
        const record = {
            id: key,
            conversationId: String(conversationId),
            messages: messages.slice(-100),
            cachedAt: Date.now(),
        };
        store.put(record);
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    } catch (err) {
        console.warn("[IndexedDB] Failed to cache messages offline:", err);
    }
}

/**
 * Retrieve cached messages for a conversation when offline.
 * @param {string|number} conversationId
 * @returns {Promise<Array>}
 */
export async function getOfflineMessages(conversationId) {
    if (!conversationId) return [];
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_MESSAGES, "readonly");
            const store = tx.objectStore(STORE_MESSAGES);
            const request = store.get(`conv_${conversationId}`);
            request.onsuccess = (e) => {
                const result = e.target.result;
                resolve(result?.messages || []);
            };
            request.onerror = () => resolve([]);
        });
    } catch (err) {
        console.warn("[IndexedDB] Failed to load offline messages:", err);
        return [];
    }
}

/**
 * Queue an outgoing message in IndexedDB if the client is offline.
 * @param {Object} messagePayload
 */
export async function queueOfflineMessage(messagePayload) {
    if (!messagePayload || !messagePayload.temp_id) return;
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_OFFLINE_QUEUE, "readwrite");
        const store = tx.objectStore(STORE_OFFLINE_QUEUE);
        store.put({
            ...messagePayload,
            queuedAt: Date.now(),
        });
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    } catch (err) {
        console.warn("[IndexedDB] Failed to queue offline message:", err);
    }
}

/**
 * Retrieve all pending messages queued while offline.
 * @returns {Promise<Array>}
 */
export async function getOfflineQueue() {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_OFFLINE_QUEUE, "readonly");
            const store = tx.objectStore(STORE_OFFLINE_QUEUE);
            const request = store.getAll();
            request.onsuccess = (e) => resolve(e.target.result || []);
            request.onerror = () => resolve([]);
        });
    } catch (err) {
        console.warn("[IndexedDB] Failed to read offline queue:", err);
        return [];
    }
}

/**
 * Remove a sent message from the offline queue.
 * @param {string} tempId
 */
export async function removeOfflineQueuedMessage(tempId) {
    if (!tempId) return;
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_OFFLINE_QUEUE, "readwrite");
        const store = tx.objectStore(STORE_OFFLINE_QUEUE);
        store.delete(tempId);
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    } catch (err) {
        console.warn("[IndexedDB] Failed to remove queued message:", err);
    }
}

/**
 * Flush all offline queued messages via the provided send function upon reconnection.
 * @param {Function} sendFn
 */
export async function flushOfflineQueue(sendFn) {
    if (typeof sendFn !== "function") return 0;
    const queued = await getOfflineQueue();
    let sentCount = 0;
    for (const msg of queued) {
        try {
            const success = await sendFn(msg.message, msg);
            if (success !== false) {
                await removeOfflineQueuedMessage(msg.temp_id);
                sentCount++;
            }
        } catch (err) {
            console.warn("[IndexedDB] Failed to flush queued message:", err);
        }
    }
    return sentCount;
}

/**
 * Clear all local media & cached messages from IndexedDB (Emergency Wipe).
 */
export async function clearVault() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const stores = [STORE_MEDIA, STORE_MESSAGES, STORE_OFFLINE_QUEUE].filter(s => db.objectStoreNames.contains(s));
        const tx = db.transaction(stores, "readwrite");
        stores.forEach(s => tx.objectStore(s).clear());
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
    });
}

export default {
    saveLocalMedia,
    getLocalMedia,
    deleteLocalMedia,
    getLocalMediaUrl,
    cacheOfflineMessages,
    getOfflineMessages,
    queueOfflineMessage,
    getOfflineQueue,
    removeOfflineQueuedMessage,
    flushOfflineQueue,
    clearVault,
};
