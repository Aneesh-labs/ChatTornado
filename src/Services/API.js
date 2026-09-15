import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";
console.log("[API INIT] Configured baseURL:", baseURL, "| window.location.origin:", typeof window !== "undefined" ? window.location.origin : "server");

const API = axios.create({
    baseURL: baseURL,
});

// Request Logger
API.interceptors.request.use(
    (config) => {
        const fullUrl = (config.baseURL ? config.baseURL.replace(/\/+$/, '') : '') + (config.url ? (config.url.startsWith('/') ? config.url : '/' + config.url) : '');
        console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${fullUrl}`, {
            headers: config.headers,
            params: config.params,
            data: config.data
        });
        return config;
    },
    (error) => {
        console.error("[API REQUEST ERROR]", error);
        return Promise.reject(error);
    }
);

// Response Logger
API.interceptors.response.use(
    (response) => {
        console.log(`[API RESPONSE SUCCESS] ${response.status} ${response.config.url}`, response.data);
        return response;
    },
    (error) => {
        console.error(`[API RESPONSE ERROR]`, {
            message: error.message,
            code: error.code,
            name: error.name,
            config: {
                url: error.config?.url,
                baseURL: error.config?.baseURL,
                method: error.config?.method,
            },
            response: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data,
                headers: error.response.headers
            } : null,
            request: error.request ? "Request object exists (no response received or network/CORS error)" : null
        });
        return Promise.reject(error);
    }
);

export default API;
