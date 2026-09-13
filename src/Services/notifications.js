/**
 * Browser Web Notification Helper for ChatTornado
 * Browser Web Notification & Audio Chime Helper for ChatTornado
 * Provides WhatsApp-style heads up notifications on phones & desktops without an app store app.
 */

let audioCtx = null;

/**
 * Synthesizes a clean audio chime (two bell notes) using Web Audio API
 * No external MP3 file needed, 0ms latency, works on all platforms.
 */
export function playNotificationChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        if (!audioCtx) {
            audioCtx = new AudioContext();
        }

        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;

        // Note 1 (E5 - 659 Hz)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.35);

        // Note 2 (B5 - 987 Hz)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(987.77, now + 0.1);
        gain2.gain.setValueAtTime(0.12, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.5);
    } catch (err) {
        console.warn("Audio chime could not play:", err);
    }
}

export async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.warn("Notifications not supported in this browser.");
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission !== "denied") {
    try {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    } catch (e) {
        console.warn("Permission request error:", e);
        return false;
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
 * @param {boolean} force - Whether to show even if window is focused (useful for demos)
 */
export function showMessageNotification(senderName, message) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
export function showMessageNotification(senderName, message, force = false) {
    // 1. Always play the sound chime
    playNotificationChime();

    // Only notify if document is hidden (user is in another tab or phone is locked)
    if (document.visibilityState === "visible") return;
    if (!("Notification" in window)) return;

    // Check if permission is granted
    if (Notification.permission !== "granted") {
        console.warn("Notification permission is not granted:", Notification.permission);
        return;
    }

    // Don't show banner if user is currently focused right inside this window (unless forced for demo)
    if (!force && document.hasFocus() && document.visibilityState === "visible") {
        return;
    }

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
            tag: `chat_${senderName}_${Date.now()}`,
            renotify: true,
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    } catch (e) {
        console.warn("Could not show notification:", e);
        console.warn("Could not show desktop notification:", e);
    }
}

/**
 * Trigger an instant interactive demo notification with chime
 */
export async function triggerDemoNotification() {
    const granted = await requestNotificationPermission();
    playNotificationChime();

    if (granted) {
        showMessageNotification("ChatTornado Demo", "🎉 Notifications are working! Native banner & chime active.", true);
    } else {
        alert("Notification permissions were blocked. Click the lock/settings icon in your browser URL bar to allow notifications.");
    }
}

export default {
    requestNotificationPermission,
    registerServiceWorker,
    showMessageNotification,
    playNotificationChime,
    triggerDemoNotification,
};

