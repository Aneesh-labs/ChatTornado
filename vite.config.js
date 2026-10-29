import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    ...(process.env.VITE_HMR_HOST ? {
      ws: {
        host: process.env.VITE_HMR_HOST,
        protocol: 'wss',
      },
    } : {}),
    // Allow tunnel and local domains
    allowedHosts: true,
  },
});
