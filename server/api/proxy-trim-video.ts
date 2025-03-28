import { defineEventHandler, getQuery, setHeader, createError } from "h3";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const url = query.url;

  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return createError({ statusCode: 400, statusMessage: "Invalid URL" });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return createError({
        statusCode: response.status,
        statusMessage: response.statusText,
      });
    }

    const contentType = response.headers.get("content-type") || "video/mp4";
    const buffer = await response.arrayBuffer();

    setHeader(event, "Content-Type", contentType);
    setHeader(event, "Access-Control-Allow-Origin", "*");

    return new Uint8Array(buffer);
  } catch (err) {
    console.error("[proxy-trim-video] Błąd:", err);
    return createError({ statusCode: 500, statusMessage: "Proxy Error" });
  }
});
