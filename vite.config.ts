import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import crossOriginIsolation from "vite-plugin-cross-origin-isolation";

export default defineConfig({
  plugins: [
    vue(),
    crossOriginIsolation(), // dodaje nagłówki COOP/COEP dla wszystkich odpowiedzi
  ],

  server: {
    // Upewnij się, że uruchamiasz serwer przez HTTPS

    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    // Konfiguracja proxy – przekierowuje żądania zaczynające się od /proxy do zewnętrznej domeny
    proxy: {
      "/proxy": {
        target: "http://ipla-e1-78.pluscdn.pl",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy/, ""),
        configure: (proxy) => {
          // Opcjonalnie możesz ustawić dodatkowe nagłówki odpowiedzi
          proxy.on("proxyRes", (proxyRes) => {
            proxyRes.headers["access-control-allow-origin"] = "*";
          });
        },
      },
    },
  },

  optimizeDeps: {
    // Wyłącz optymalizację ffmpeg, żeby uniknąć problemów z bundlowaniem
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },

  build: {
    // Ustaw target na esnext
    target: "esnext",
  },
});
