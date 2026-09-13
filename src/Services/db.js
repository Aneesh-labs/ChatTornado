/**
 * IndexedDB Local Vault for ChatTornado Pure P2P Storage
 * Stores heavy photos, documents, and P2P media chunks directly on the device.
 * Zero server storage footprint.
 */

const DB_NAME = "ChatTornadoVault";
const DB_VERSION = 1;
const STORE_MEDIA = "p2p_media";
const STORE_MESSAGES = "local_messages";

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
    const record = await getLocalMedia(id);
    if (!record || !record.blob) return null;
    return URL.createObjectURL(record.blob);
}

/**
 * Clear all local media from IndexedDB (Emergency Wipe).
 */
export async function clearVault() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_MEDIA, STORE_MESSAGES], "readwrite");
        tx.objectStore(STORE_MEDIA).clear();
        tx.objectStore(STORE_MESSAGES).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
    });
}

export default {
    saveLocalMedia,
    getLocalMedia,
    deleteLocalMedia,
    getLocalMediaUrl,
    clearVault,
};

