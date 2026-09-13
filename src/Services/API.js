import axios from "axios";

const API = axios.create({
    // Empty in production behind a reverse proxy; configurable for LAN development.
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

export default API;
