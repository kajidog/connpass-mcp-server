import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
    // Ensure the build is optimized for production
    minify: "esbuild",
    sourcemap: false,
  },
  server: {
    port: 3000,
  },
});
