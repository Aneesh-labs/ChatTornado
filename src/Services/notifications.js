/**
 * Browser Web Notification Helper for ChatTornado
 * Provides WhatsApp-style heads up notifications on phones & desktops without an app store app.
 */

export async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.warn("Notifications not supported in this browser.");
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }

    return false;
}

export function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("ServiceWorker registered successfully:", registration.scope);
                })
                .catch((err) => {
                    console.error("ServiceWorker registration failed:", err);
                });
        });
    }
}

/**
 * Display a native notification banner on the device
 * @param {string} senderName - Name of the friend
 * @param {string} message - Message snippet or description
 */
export function showMessageNotification(senderName, message) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    // Only notify if document is hidden (user is in another tab or phone is locked)
    if (document.visibilityState === "visible") return;

    let body = message;
    if (message.startsWith("🎤 Voice Message")) {
        body = "🎤 Sent a voice message";
    } else if (message.startsWith("⚡ P2P_MEDIA")) {
        body = "📷 Sent a photo / file";
    } else if (message.startsWith("📎")) {
        body = "📎 Sent an attachment";
    }

    try {
        const notification = new Notification(`🌪️ ${senderName}`, {
            body,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: `chat_${senderName}`,
            renotify: true,
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    } catch (e) {
        console.warn("Could not show notification:", e);
    }
}

export default {
    requestNotificationPermission,
    registerServiceWorker,
    showMessageNotification,
};

