import { defineNuxtConfig } from "nuxt/config";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },

  nitro: {
    preset: "vercel",
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
        { name: "theme-color", content: "#15803d" }, // Kolor motywu (green-700)
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

  modules: ["@nuxtjs/tailwindcss"],
  css: ["~/assets/css/main.css"],
  compatibilityDate: "2025-03-28",
});