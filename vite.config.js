import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      ".trycloudflare.com",
      ".ngrok-free.app",
      ".ngrok.io",
      "localhost",
    ],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5152",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Only split libraries that never touch React. Anything that reads React at module
        // scope (@react-three/fiber, react-leaflet, MUI, react-router) has to stay in
        // Rollup's automatic chunks: forcing those into named chunks can strand the shared
        // CommonJS interop helper in a chunk that React itself imports, which makes the two
        // chunks circular and leaves React undefined when the dependent chunk evaluates.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/three/")) {
            return "three-vendor";
          }
          if (id.includes("/maplibre-gl/")) {
            return "maplibre-vendor";
          }
          if (id.includes("/leaflet/")) {
            return "leaflet-vendor";
          }
        },
      },
    },
  },
});
