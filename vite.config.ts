import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const apiProxy = process.env.VITE_API_PROXY;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    ...(apiProxy
      ? {
          proxy: {
            "/api": {
              target: apiProxy,
              changeOrigin: true,
            },
          },
        }
      : {}),
  },
});
