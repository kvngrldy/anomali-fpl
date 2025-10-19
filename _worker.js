export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle API proxy requests
    if (url.pathname.startsWith("/api/")) {
      const fplApiPath = url.pathname.replace("/api/", "");
      const fplApiUrl = `https://fantasy.premierleague.com/api/${fplApiPath}`;

      // Create a cache key based on the URL
      const cacheKey = new Request(fplApiUrl, request);
      const cache = caches.default;

      // Check if we have a cached response
      let response = await cache.match(cacheKey);

      if (!response) {
        // No cached response, fetch from FPL API
        try {
          response = await fetch(fplApiUrl, {
            method: request.method,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          });

          // Clone the response before caching
          const responseToCache = response.clone();

          // Add cache headers (5 minutes = 300 seconds)
          const cachedResponse = new Response(
            responseToCache.body,
            responseToCache,
          );
          cachedResponse.headers.set("Cache-Control", "public, max-age=300");

          // Store in cache (don't await, let it happen in background)
          ctx.waitUntil(cache.put(cacheKey, cachedResponse));
        } catch (error) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch from FPL API" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      // Clone the response and add CORS headers
      const modifiedResponse = new Response(response.body, response);
      modifiedResponse.headers.set("Access-Control-Allow-Origin", "*");
      modifiedResponse.headers.set(
        "Access-Control-Allow-Methods",
        "GET, OPTIONS",
      );
      modifiedResponse.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type",
      );
      modifiedResponse.headers.set("Cache-Control", "public, max-age=300");

      return modifiedResponse;
    }

    // For all other requests, serve static assets
    return env.ASSETS.fetch(request);
  },
};
