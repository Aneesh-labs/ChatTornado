import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Centralized Axios Instance Configuration
 */
const ApiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

/**
 * Dynamic Request Interceptor
 * Guarantees runtime token evaluation right before transmission,
 * preventing stale tokens when storage updates.
 */
ApiClient.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/* ==========================================================================
   SERVICE ENDPOINTS
   ========================================================================== */

/**
 * Retrieve list of all available directory users
 */
export const getUsers = () => ApiClient.get("/users");

/**
 * Fetch conversational message streams targeting a specific user ID
 */
export const getMessages = (userId) => ApiClient.get(`/messages/${userId}`);

/**
 * Transmit a new text payload out to a specified recipient thread
 */
export const sendMessage = (receiverId, message, replyTo = null) =>
    ApiClient.post("/messages", {
        receiver_id: receiverId,
        message,
        reply_to: replyTo,
    });

/**
 * Hard delete an individual message entity instance by ID
 */
export const deleteMessage = (messageId) => ApiClient.delete(`/messages/${messageId}`);

/**
 * Attach or update an expression emoji reaction on an existing message block
 */
export const addReaction = (messageId, reaction) =>
    ApiClient.post(`/messages/${messageId}/reaction`, { reaction });

/**
 * Enforce bulk status modifications marking specific message ranges as seen
 */
export const markAsRead = (userId) =>
    ApiClient.post("/messages/read", { user_id: userId });

/**
 * Poll live heartbeat snapshots of currently logged-in actors
 */
export const getOnlineUsers = () => ApiClient.get("/online-users");

export default ApiClient;