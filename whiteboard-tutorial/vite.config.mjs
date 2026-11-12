import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backend = "http://localhost:5000";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "build" },
  server: {
    port: 3000,
    proxy: { "/api": backend, "/socket.io": { target: backend, ws: true } },
  },
});
