# 🎶 IKONOIJOY Song Sorter

Rank songs from **=LOVE**, **≠ME**, and **≒JOY** by choosing your favorite — two at a time. Uses merge sort under the hood for efficient pairwise comparison.

## How It Works

1. Select which groups to include
2. Pick your preferred song from each pair
3. Get your personalized ranking with album art and Spotify links

## Development

```bash
# Install dependencies
npm install

# Fetch songs from Spotify (requires env vars)
SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=xxx npm run fetch-songs

# Start dev server
npm start
```

## Deployment

Deployed automatically to GitHub Pages via GitHub Actions on every push to `main`.

Songs are refreshed weekly from the Spotify API.

### Setup

1. Create a [Spotify Developer App](https://developer.spotify.com/dashboard)
2. Add secrets to your repo (**Settings → Secrets → Actions**):
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
3. Enable GitHub Pages (**Settings → Pages → Source → Deploy from a branch**, select `gh-pages` / `/ (root)`)
4. Push to `main`
