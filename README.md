# Stremio M3U & Direct Video Addon

A Stremio addon to parse M3U playlists or play direct video links, with a configuration interface and dashboard.

## Setup

1. **Deploy to Render**:
   - Create a Web Service on Render.com.
   - Link to `https://github.com/sidh3369/m3u8`.
   - Settings:
     - Runtime: Node
     - Build Command: `npm install`
     - Start Command: `npm start`
   - Deploy.

2. **Configure Addon**:
   - Access `https://your-render-app.onrender.com/configure`.
   - Enter an M3U URL (e.g., `https://raw.githubusercontent.com/sidh3369/m3u_bot/main/1.m3u`) or direct video URL (e.g., `http://example.com/video.mp4`).
   - Save.

3. **Install in Stremio**:
   - In Stremio, go to Addons > Community Addons.
   - Add URL: `https://your-render-app.onrender.com/manifest.json`.
   - Install.

4. **View Dashboard**:
   - Visit `https://your-render-app.onrender.com/dashboard`.

## Notes
- M3U files must be publicly accessible.
- Direct links should be playable (e.g., `.mp4`, `.m3u8`).
- Check logs in Render for errors.
