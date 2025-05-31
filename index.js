const { addonBuilder } = require('stremio-addon-sdk');
const express = require('express');
const fetch = require('node-fetch');
const m3u8Parser = require('m3u8-parser');

// Initialize Express
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Store configuration (in-memory)
let config = { type: null, url: null, videos: [] };

// Helper to validate M3U
async function validateM3U(url) {
  try {
    const response = await fetch(url, { method: 'GET', timeout: 5000 });
    if (!response.ok) return { valid: false, error: `HTTP ${response.status}` };
    const text = await response.text();
    const parser = new m3u8Parser.Parser();
    parser.push(text);
    parser.end();
    const manifest = parser.manifest;
    if (manifest.segments?.length > 0 || manifest.playlists?.length > 0) {
      return { valid: true };
    }
    return { valid: false, error: 'Invalid M3U: no segments or playlists' };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Helper to validate direct video
async function validateDirect(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
    if (!response.ok) return { valid: false, error: `HTTP ${response.status}` };
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('video') || contentType.includes('application/vnd.apple.mpegurl')) {
      return { valid: true };
    }
    return { valid: false, error: 'Not a video URL' };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Helper to parse M3U
async function parseM3U(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch M3U: ${response.status}`);
    const text = await response.text();
    const parser = new m3u8Parser.Parser();
    parser.push(text);
    parser.end();
    const manifest = parser.manifest;
    const videos = manifest.segments.length > 0
      ? manifest.segments.map((seg, i) => ({
          id: `m3u:${i + 1}`,
          title: seg.title || `Video ${i + 1}`,
          url: seg.uri,
        }))
      : manifest.playlists
        ? manifest.playlists.map((pl, i) => ({
            id: `m3u:${i + 1}`,
            title: pl.attributes?.NAME || `Stream ${i + 1}`,
            url: pl.uri,
          }))
        : [];
    console.log(`Parsed ${videos.length} videos from ${url}`);
    return videos;
  } catch (error) {
    console.error('M3U Parse Error:', error.message);
    return [];
  }
}

// Define addon
const builder = new addonBuilder({
  id: 'org.sidh.m3uaddon',
  version: '1.1.4',
  name: 'M3U & Direct Video Addon',
  description: 'Stremio addon for M3U playlists and direct video links',
  resources: ['catalog', 'meta', 'stream'],
  types: ['movie'],
  catalogs: [
    {
      type: 'movie',
      id: 'm3u-videos',
      name: config.type === 'direct' ? 'Direct Video' : 'M3U Videos',
    },
  ],
  behaviorHints: {
    configurable: true,
    configurationRequired: true,
  },
});

// Homepage with link paste
app.get('/', (req, res) => {
  console.log('Serving /');
  res.send(`
    <html>
      <body>
        <h1>Stremio M3U & Direct Video Addon</h1>
        <h3>Paste M3U Playlist or Direct Video URL</h3>
        <form action="/validate" method="POST">
          <input type="url" name="url" placeholder="Enter URL" required style="width: 300px;"><br>
          <button type="submit">Validate Link</button>
        </form>
      </body>
    </html>
  `);
});

// Validate link endpoint
app.post('/validate', async (req, res) => {
  console.log('POST /validate:', req.body);
  const { url } = req.body;
  if (!url) {
    return res.send(`
      <html>
        <body>
          <h1>Stremio M3U & Direct Video Addon</h1>
          <p style="color: red;">Error: URL is required</p>
          <form action="/validate" method="POST">
            <input type="url" name="url" placeholder="Enter URL" required style="width: 300px;"><br>
            <button type="submit">Validate Link</button>
          </form>
        </body>
      </html>
    `);
  }

  // Try M3U first
  let result = await validateM3U(url);
  let type = 'm3u';
  if (!result.valid) {
    // Try direct video
    result = await validateDirect(url);
    type = 'direct';
  }

  if (result.valid) {
    config.type = type;
    config.url = url;
    if (type === 'm3u') {
      config.videos = await parseM3U(url);
    } else {
      config.videos = [{ id: 'direct:1', title: 'Direct Video', url }];
    }
    const encodedUrl = encodeURIComponent(url);
    res.send(`
      <html>
        <body>
          <h1>Stremio M3U & Direct Video Addon</h1>
          <p style="color: green;">Link is valid (${type === 'm3u' ? 'M3U Playlist' : 'Direct Video'})!</p>
          <p>URL: ${url}</p>
          <a href="/addon/manifest.json?configUrl=${encodedUrl}">
            <button>Install in Stremio</button>
          </a>
          <br><a href="/dashboard">View Dashboard</a>
        </body>
      </html>
    `);
  } else {
    res.send(`
      <html>
        <body>
          <h1>Stremio M3U & Direct Video Addon</h1>
          <p style="color: red;">Error: Invalid link - ${result.error}</p>
          <form action="/validate" method="POST">
            <input type="url" name="url" placeholder="Enter URL" required style="width: 300px;" value="${url}"><br>
            <button type="submit">Validate Link</button>
          </form>
        </body>
      </html>
    `);
  }
});

// Dashboard endpoint
app.get('/dashboard', (req, res) => {
  console.log('Serving /dashboard');
  const videoList = config.videos
    .map((v) => `<li>${v.title}: <a href="${v.url}">${v.url}</a></li>`)
    .join('');
  res.send(`
    <html>
      <body>
        <h1>M3U/Direct Video Dashboard</h1>
        <p>Configured: ${config.type || 'None'} - ${config.url || 'No URL'}</p>
        <h2>Videos</h2>
        <ul>${videoList || '<li>No videos configured</li>'}</ul>
        <a href="/">Back to Home</a>
      </body>
    </html>
  `);
});

// Addon routes
const addonInterface = builder.getInterface();
app.get('/addon/manifest.json', (req, res) => {
  console.log('Serving /addon/manifest.json');
  const configUrl = req.query.configUrl;
  if (configUrl) {
    config.url = decodeURIComponent(configUrl);
    config.type = config.url.includes('.m3u') ? 'm3u' : 'direct';
    if (config.type === 'm3u') {
      parseM3U(config.url).then((videos) => {
        config.videos = videos;
      });
    } else {
      config.videos = [{ id: 'direct:1', title: 'Direct Video', url: config.url }];
    }
  }
  res.json(addonInterface.manifest);
});

app.get('/addon/:resource/:type/:id/:extra?.json', async (req, res) => {
  console.log(`Serving addon route: ${req.path}`);
  const { resource, type, id } = req.params;
  try {
    const response = await addonInterface[resource]({ type, id });
    res.json(response);
  } catch (error) {
    console.error(`Addon error for ${resource}:`, error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Catalog handler
builder.defineCatalogHandler(async ({ type, id }) => {
  console.log(`Catalog request: type=${type}, id=${id}`);
  if (type === 'movie' && id === 'm3u-videos') {
    if (config.type === 'm3u' && config.url) {
      const videos = await parseM3U(config.url);
      config.videos = videos;
      return {
        metas: videos.map((video) => ({
          id: video.id,
          type: 'movie',
          name: video.title,
          poster: 'https://via.placeholder.com/150',
        })),
      };
    } else if (config.type === 'direct' && config.url) {
      config.videos = [{ id: 'direct:1', title: 'Direct Video', url: config.url }];
      return {
        metas: [
          {
            id: 'direct:1',
            type: 'movie',
            name: 'Direct Video',
            poster: 'https://via.placeholder.com/150',
          },
        ],
      };
    }
  }
  return { metas: [] };
});

// Meta handler
builder.defineMetaHandler(async ({ type, id }) => {
  console.log(`Meta request: id=${id}`);
  const video = config.videos.find((v) => v.id === id);
  if (video) {
    return {
      meta: {
        id: video.id,
        type: 'movie',
        name: video.title,
        poster: 'https://via.placeholder.com/150',
      },
    };
  }
  return { meta: {} };
});

// Stream handler
builder.defineStreamHandler(async ({ type, id }) => {
  console.log(`Stream request: id=${id}`);
  const video = config.videos.find((v) => v.id === id);
  if (video) {
    return {
      streams: [{ url: video.url, title: video.title }],
    };
  }
  return { streams: [] };
});

// Start server
const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`Addon server running on port ${PORT}`);
  console.log(`Access home: http://localhost:${PORT}/`);
  console.log(`Access dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`Install in Stremio: http://localhost:${PORT}/addon/manifest.json`);
});
