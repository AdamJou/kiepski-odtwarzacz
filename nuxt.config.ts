import { defineNuxtConfig } from "nuxt/config";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  test: true,

  nitro: {
    serveStatic: true,
  },

  app: {
    baseURL: "/",
    head: {
      title: "Kiepski Odtwarzacz - Świat według Kiepskich",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            'Odtwarzacz odcinków serialu "Świat według Kiepskich" z funkcją przycinania fragmentów.',
        },
        { name: "theme-color", content: "#92400e" }, // Kolor motywu (amber-800)
        { property: "og:title", content: "Kiepski Odtwarzacz" },
        {
          property: "og:description",
          content:
            "Oglądaj i przycinaj ulubione fragmenty Świata według Kiepskich.",
        },
        { property: "og:type", content: "website" },
      ],
      link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
    },
  },

  compatibilityDate: "2025-03-26",

  vite: {
    plugins: [require("@vitejs/plugin-vue")],
  },

  modules: ["@nuxtjs/tailwindcss"],
  css: ["~/assets/css/main.css"],
});
