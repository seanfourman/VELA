import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import localSkyServicesPlugin from "./scripts/vite/localSkyServicesPlugin.js";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localSkyServicesPlugin()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
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
          if (id.includes("react")) {
            return "react-vendor";
          }
          return "vendor";
        },
      },
    },
  },
});
