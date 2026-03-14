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
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@mui") || id.includes("@emotion")) {
            return "mui-vendor";
          }
          if (id.includes("maplibre-gl") || id.includes("@maplibre")) {
            return "maplibre-vendor";
          }
          if (id.includes("@react-three/drei")) {
            return "drei-vendor";
          }
          if (id.includes("@react-three/fiber")) {
            return "fiber-vendor";
          }
          if (id.includes("/three/examples/")) {
            return "three-examples-vendor";
          }
          if (id.includes("/three/")) {
            return "three-core-vendor";
          }
          if (id.includes("leaflet") || id.includes("react-leaflet")) {
            return "leaflet-vendor";
          }
          if (id.includes("react-router")) {
            return "router-vendor";
          }
          if (id.includes("react")) {
            return "react-vendor";
          }
          return "vendor";
        },
      },
    },
  },
});
