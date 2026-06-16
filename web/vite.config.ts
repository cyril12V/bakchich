import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3939",
      "/auth": "http://localhost:3939",
      "/c": "http://localhost:3939",
      "/webhooks": "http://localhost:3939",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
