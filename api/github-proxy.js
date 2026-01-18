module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Referrer-Policy');

  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get the path from query parameter
    const { path } = req.query;

    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    const githubUrl = `https://raw.githubusercontent.com/${path}`;

    const fetchOptions = {
      method: req.method === 'OPTIONS' ? 'GET' : req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    };

    // Copy relevant headers from original request
    if (req.headers['content-type']) {
      fetchOptions.headers = fetchOptions.headers || {};
      fetchOptions.headers['Content-Type'] = 
        Array.isArray(req.headers['content-type']) 
          ? req.headers['content-type'][0]
          : req.headers['content-type'];
    }

    // Forward body for POST, PUT, PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method || 'GET') && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(githubUrl, fetchOptions);

    // Copy headers from the target response
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Get response body
    const buffer = await response.arrayBuffer();
    res.status(response.status).send(Buffer.from(buffer));
  } catch (error) {
    console.error('[GitHub proxy error]:', error);
    res.status(500).json({
      error: 'Failed to fetch from GitHub',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
