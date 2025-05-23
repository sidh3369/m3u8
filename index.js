// VOD Playlist Addon for Stremio
const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const express = require("express");

const PORT = process.env.PORT || 3000;
const VOD_PLAYLIST_URL = "https://app.rcsfacility.com/1.m3u"; // Your video playlist URL

// Manifest
const manifest = {
    id: "org.vodplaylist",
    version: "1.0.0",
    name: "SID VOD Playlist",
    description: "Watch your personal video playlist",
    resources: ["catalog", "meta", "stream"],
    types: ["movie"],
    catalogs: [
        {
            type: "SID",
            id: "vod-playlist",
            name: "My VOD Playlist",
            extra: []
        }
    ],
    idPrefixes: ["vod-"],
    logo: "https://dl.strem.io/addon-logo.png",
    icon: "https://dl.strem.io/addon-logo.png",
    background: "https://dl.strem.io/addon-background.jpg",
    behaviorHints: {
        configurable: true,
        configurationRequired: false
    }
};

const addon = new addonBuilder(manifest);

const axios = require("axios");

// Helper to parse .m3u playlist
async function fetchPlaylist(playlistUrl) {
    try {
        // Add cache-busting parameter to always fetch the latest playlist
        const urlWithNoCache = (playlistUrl || VOD_PLAYLIST_URL) + ((playlistUrl || VOD_PLAYLIST_URL).includes('?') ? '&' : '?') + 't=' + Date.now();
        const res = await axios.get(urlWithNoCache);
        const lines = res.data.split(/\r?\n/);
        let metas = [];
        let currentMeta = {};
        let idCounter = 1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("#EXTINF:")) {
                const info = line.substring(8).split(",");
                currentMeta = {
                    id: `vod-${idCounter}`,
                    name: info[1] ? info[1].trim() : `Video ${idCounter}`,
                    type: "movie",
                    poster: "https://dl.strem.io/addon-logo.png",
                    background: "https://dl.strem.io/addon-background.jpg",
                    description: info[1] ? info[1].trim() : `Video ${idCounter}`
                };
            } else if (line && !line.startsWith("#")) {
                if (currentMeta.id) {
                    currentMeta.url = line;
                    metas.push(currentMeta);
                    idCounter++;
                    currentMeta = {};
                }
            }
        }
        return metas;
    } catch (e) {
        return [];
    }
}

// Catalog: List all videos from playlist
addon.defineCatalogHandler(async (args = {}) => {
    const playlistUrl = args.extra && args.extra.playlist ? args.extra.playlist : undefined;
    const metas = await fetchPlaylist(playlistUrl);
    return { metas };
});

// Meta: Details about each video
addon.defineMetaHandler(async ({ id, extra = {} }) => {
    const playlistUrl = extra.playlist;
    const metas = await fetchPlaylist(playlistUrl);
    const meta = metas.find(m => m.id === id);
    return { meta: meta || {} };
});

// Stream: Direct link to each video
addon.defineStreamHandler(async ({ id, extra = {} }) => {
    const playlistUrl = extra.playlist;
    const metas = await fetchPlaylist(playlistUrl);
    const meta = metas.find(m => m.id === id);
    if (meta && meta.url) {
        return { streams: [{ url: meta.url, title: meta.name }] };
    }
    return { streams: [] }; 
});

// Express fallback for manifest.json and configure UI
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the configuration page
app.get('/configure', (req, res) => {
    res.send(`
        <h1>SID VOD Playlist v1.0.0</h1>
        <p>Watch your personal video playlist</p>
        <p>This addon has more:</p>
        <ul>
            <li>Movies</li>
            <li>TV Shows</li>
            <li>Documentaries</li>
        </ul>
        <form action="/update-playlist" method="post" enctype="multipart/form-data">
            <label for="playlist">Enter M3U Link:</label>
            <input type="text" name="playlist" id="playlist" placeholder="M3U Link">
            <p>OR</p>
            <label for="file">Upload M3U File:</label>
            <input type="file" name="file" id="file" accept=".m3u">
            <button type="submit">Save</button>
        </form>
    `);
});

// Handle playlist updates
app.post('/update-playlist', (req, res) => {
    const playlist = req.body.playlist;
    // Save the playlist link for later use
    res.redirect('/');
});
app.get("/manifest.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(manifest);
});

// Simple configure page for playlist URL
app.get("/configure", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`
        <html>
        <head><title>Configure Playlist</title></head>
        <body>
            <h2>Configure Playlist URL</h2>
            <form method="GET" action="/manifest.json">
                <label for="playlist">Playlist URL (.m3u):</label>
                <input type="text" id="playlist" name="playlist" value="" style="width:400px" />
                <button type="submit">Save &amp; Use</button>
            </form>
            <p>After submitting, add the addon again in Stremio using the new manifest URL with the playlist parameter.</p>
        </body>
        </html>
    `);
});

// Serve the add-on
serveHTTP(addon.getInterface(), { server: app, path: "/manifest.json", port: PORT });