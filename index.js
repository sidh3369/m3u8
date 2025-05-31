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
  version: '1.1.3',
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

// Root route to test server
app.get('/', (req, res) => {
  console.log('Serving /');
  res.send('Stremio M3U Addon is running. Visit /configure to set up or /dashboard to view videos.');
});

// Configuration endpoint
app.get('/configure', (req, res) => {
  console.log('Serving /configure');
  res.send(`
    <html>
      <body>
        <h1>Configure M3U or Direct Video Addon</h1>
        <form action="/configure" method="POST">
          <label>
            <input type="radio" name="type" value="m3u" required> M3U Playlist URL
          </label><br>
          <label>
            <input type="radio" name="type" value="direct"> Direct Video URL
          </label><br>
          <input type="url" name="url" placeholder="Enter URL" required style="width: 300px;"><br>
          <button type="submit">Save</button>
        </form>
      </body>
    </html>
  `);
});

app.post('/configure', async (req, res) => {
  console.log('POST /configure:', req.body);
  const { type, url } = req.body;
  if (!type || !url) {
    return res.status(400).send('Type and URL are required');
  }
  config.type = type;
  config.url = url;
  if (type === 'm3u') {
    config.videos = await parseM3U(url);
  } else {
    config.videos = [{ id: 'direct:1', title: 'Direct Video', url }];
  }
  res.send('Configuration saved! Check Stremio or <a href="/dashboard">Dashboard</a>.');
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
        <a href="/configure">Configure Addon</a>
      </body>
    </html>
  `);
});

// Mount addon routes on /addon
const addonInterface = builder.getInterface();
app.get('/addon/manifest.json', (req, res) => {
  console.log('Serving /addon/manifest.json');
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

// Start server
const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`Addon server running on port ${PORT}`);
  console.log(`Access configure: http://localhost:${PORT}/configure`);
  console.log(`Access dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`Install in Stremio: http://localhost:${PORT}/addon/manifest.json`);
});
