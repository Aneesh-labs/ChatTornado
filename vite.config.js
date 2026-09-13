import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

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
    ws: {
      // Use the Cloudflare tunnel URL for WebSocket connections
      // This tells the client to connect to the tunnel instead of localhost
      host: 'distributions-michael-hope-item.trycloudflare.com',
      protocol: 'wss',
    },
    // Allow the Cloudflare domain
    allowedHosts: [
      'distributions-michael-hope-item.trycloudflare.com',
      '.trycloudflare.com',
    ],
  },
})