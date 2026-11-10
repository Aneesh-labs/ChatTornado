/**
 * Native Android & Capacitor Mobile Integration
 * Handles:
 * - Hardware Back Button navigation & exit
 * - Immersive dark Status Bar styling
 * - Virtual Keyboard resizing behavior
 * - Safe Area insets
 */

export async function setupNativeMobileIntegration() {
    if (typeof window === "undefined" || !window.Capacitor?.isNativePlatform()) {
        return () => {};
    }

    try {
        const { App } = await import("@capacitor/app");
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        const { Keyboard } = await import("@capacitor/keyboard");

        // 1. Status Bar Setup
        try {
            await StatusBar.setStyle({ style: Style.Dark });
            await StatusBar.setBackgroundColor({ color: "#090c14" });
            await StatusBar.setOverlaysWebView({ overlay: false });
        } catch (e) {
            console.warn("[NativeMobile] StatusBar config warning:", e);
        }

        // 2. Virtual Keyboard behavior
        try {
            await Keyboard.setAccessoryBarVisible({ isVisible: false });
        } catch (e) {
            console.warn("[NativeMobile] Keyboard config warning:", e);
        }

        // 3. Native Back Button handling
        const backListener = await App.addListener("backButton", ({ canGoBack }) => {
            // Check if any modal or lightboxes are open
            const closeButtons = document.querySelectorAll("[data-close-modal], .modal-backdrop, [aria-label='Close']");
            if (closeButtons && closeButtons.length > 0) {
                // Let modal close first
                const topModal = closeButtons[closeButtons.length - 1];
                topModal.click();
                return;
            }

            // Check if inside a chat conversation on mobile
            const backChatBtn = document.querySelector("[aria-label='Back to conversations']");
            if (backChatBtn && window.innerWidth < 1024) {
                backChatBtn.click();
                return;
            }

            if (canGoBack) {
                window.history.back();
            } else {
                App.exitApp();
            }
        });

        return () => {
            backListener.remove();
        };
    } catch (err) {
        console.warn("[NativeMobile] Capacitor mobile setup failed or skipped:", err);
        return () => {};
    }
}
