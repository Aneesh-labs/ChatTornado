export function createWebSocket() {

    const token =
        sessionStorage.getItem(
            "token"
        )

    if (!token)
        return null

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const url = new URL(apiUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    url.search = new URLSearchParams({ token }).toString();
    return new WebSocket(url.toString());

}
