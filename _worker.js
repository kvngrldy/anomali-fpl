export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle API proxy requests
    if (url.pathname.startsWith('/api/')) {
      const fplApiPath = url.pathname.replace('/api/', '');
      const fplApiUrl = `https://fantasy.premierleague.com/api/${fplApiPath}`;

      try {
        const response = await fetch(fplApiUrl, {
          method: request.method,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        // Clone the response and add CORS headers
        const modifiedResponse = new Response(response.body, response);
        modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
        modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        modifiedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');

        return modifiedResponse;
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch from FPL API' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // For all other requests, serve static assets
    return env.ASSETS.fetch(request);
  },
};
