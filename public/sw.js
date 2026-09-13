// Service Worker for ChatTornado Web Push Notifications
// Handles background notification popups even when tab/browser is minimized.

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const title = data.title || "ChatTornado";
        const options = {
            body: data.body || "New message received",
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            vibrate: [100, 50, 100],
            data: {
                url: data.url || "/",
            },
        };

        event.waitUntil(self.registration.showNotification(title, options));
    } catch (err) {
        console.error("Push notification error:", err);
    }
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url && "focus" in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data?.url || "/");
            }
        })
    );
});

