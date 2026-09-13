let socket = null;

const API_BASE =
    import.meta.env.VITE_API_URL ||
    `${window.location.protocol}//${window.location.host}`;

const WS_URL = `${API_BASE.replace(/^http/, "ws")}/ws`;

export const connectWebSocket = (handlers = {}) => {
    if (socket) {
        socket.close();
        socket = null;
    }

    const token = sessionStorage.getItem("token");

    if (!token) {
        console.error("No authentication token found.");
        return null;
    }

    socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

    socket.onopen = () => {
        handlers.onOpen?.();
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handlers.onMessage?.(data);
        } catch (err) {
            console.error("WebSocket Parse Error:", err);
        }
    };

    socket.onerror = (error) => {
        handlers.onError?.(error);
    };

    socket.onclose = (event) => {
        handlers.onClose?.(event);
    };

    return socket;
};

export const disconnectWebSocket = () => {
    if (socket) {
        socket.close();
        socket = null;
    }
};

export const getSocket = () => socket;

export const isConnected = () =>
    socket && socket.readyState === WebSocket.OPEN;

export const sendSocketMessage = (payload) => {
    if (!isConnected()) return false;

    socket.send(JSON.stringify(payload));
    return true;
};

export const sendMessage = ({
    receiverId,
    message,
    tempId = null,
}) => {
    return sendSocketMessage({
        receiver_id: receiverId,
        message,
        temp_id: tempId,
    });
};

export const sendTyping = (receiverId) => {
    return sendSocketMessage({
        type: "typing",
        receiver_id: receiverId,
    });
};