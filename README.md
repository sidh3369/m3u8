# IPTV Stremio Addon

This Stremio addon streams from a single URL: https://example.com/1.m3u

## Demo

Try the addon with Greek TV channels:


## Features

- Wide range of IPTV channels
- Configurable channel filtering (languages, countries, categories)
- Caching for improved performance
- Proxy support for stream verification
- Configurable fetch timeout

## Configuration

Configure the addon using these environment variables:

- `PORT`: Server port (default: 3000)
- `FETCH_INTERVAL`: Channel info fetch interval in milliseconds (default: 86400000, 1 day)
- `INCLUDE_LANGUAGES`: Languages to include (comma-separated, default: all)
- `INCLUDE_COUNTRIES`: Countries to include (comma-separated, default: 'GR')
- `EXCLUDE_LANGUAGES`: Languages to exclude (comma-separated, default: none)
- `EXCLUDE_COUNTRIES`: Countries to exclude (comma-separated, default: none)
- `EXCLUDE_CATEGORIES`: Categories to exclude (comma-separated, default: none)
- `PROXY_URL`: Proxy server URL for stream verification (default: none)
- `FETCH_TIMEOUT`: Fetch timeout in milliseconds (default: 10000, 10 seconds)

## Local Setup

1. Ensure Node.js v14.0.0+ is installed.

2. Clone the repository:
   ```
   git clone https://github.com/your-username/iptv-stremio-addon.git
   cd iptv-stremio-addon
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Configure environment variables (optional):
   Create a `.env` file or set variables in your terminal.

5. Start the server:
   ```
   npm start
   ```
   For development mode with auto-restart:
   ```
   npm run dev
   ```

6. Access the addon at `http://localhost:3000/manifest.json`

7. Add to Stremio:
   ```
   http://localhost:3000/manifest.json
   ```
   Use your local IP instead of `localhost` for network-wide access.



3. Access at `http://localhost:3000/manifest.json`

## Proxy Configuration

Set `PROXY_URL` for stream verification:

- SOCKS proxy: `PROXY_URL=socks5://127.0.0.1:9150`
- HTTP proxy: `PROXY_URL=http://127.0.0.1:8080`

Ensure your proxy is reliable and fast for optimal performance.

## Timeout Settings

Set `FETCH_TIMEOUT` for fetch operations (in milliseconds):
