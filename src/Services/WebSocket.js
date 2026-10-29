/**
 * WebSocket Connection Factory for ChatTornado
 * Supports ultra-fast Go Realtime Engine (port 8080) and Python FastAPI (port 8000)
 * with automatic zero-fallback transparent failover.
 */

export function createWebSocket(attempt = 0) {
    const token = sessionStorage.getItem("token");
    if (!token) return null;

    const realtimeEngineUrl = import.meta.env.VITE_REALTIME_ENGINE_URL;
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

    // Determine target server:
    // If REALTIME_ENGINE_URL is configured, prioritize it on even attempts (0, 2, 4...)
    // and fallback to standard FastAPI on odd attempts (1, 3, 5...) for zero-failure resilience.
    let target = apiUrl;
    if (realtimeEngineUrl && attempt % 2 === 0) {
        target = realtimeEngineUrl;
    }

    try {
        const url = new URL(target);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        url.pathname = "/ws";
        url.search = new URLSearchParams({ token }).toString();
        return new WebSocket(url.toString());
    } catch {
        // Safe fallback to API URL
        try {
            const fallbackUrl = new URL(apiUrl);
            fallbackUrl.protocol = fallbackUrl.protocol === "https:" ? "wss:" : "ws:";
            fallbackUrl.pathname = "/ws";
            fallbackUrl.search = new URLSearchParams({ token }).toString();
            return new WebSocket(fallbackUrl.toString());
        } catch {
            return null;
        }
    }
}

export default createWebSocket;
