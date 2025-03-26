import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    proxy: {
      "/ffmpeg": {
        target: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.4/dist/esm",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ffmpeg/, ""),
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  build: {
    target: "esnext",
  },
  resolve: {
    alias: {
      "@ffmpeg/core": "@ffmpeg/core/dist/esm",
    },
  },
});
