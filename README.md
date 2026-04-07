# 🎶 IKONOIJOY Song Sorter

Rank songs from **=LOVE**, **≠ME**, **≒JOY**, and **IKONOIJOY** by choosing your favorite — two at a time. Uses merge sort under the hood for efficient pairwise comparison.

## How It Works

1. Select which groups to include
2. Pick your preferred song from each pair — with album art and audio previews to help you decide
3. Get your personalized ranking with romaji titles for Japanese songs
4. Save your top 10 as an image or copy the full ranking to your clipboard

Songs are fetched live from the [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/) — no API key required.

## Adding Member Photos

Place your photo files in `public/members/` named after each member's ID:

```
public/members/elove-1.jpg   ← Otani Emiri
public/members/elove-2.jpg   ← Oba Hana
public/members/nme-1.jpg     ← Ogi Hana
public/members/njoy-1.jpg    ← Aida Jurii
…
```

The app automatically tries to load `members/<id>.jpg` for each member. If the file is missing, a coloured initial placeholder is shown instead. See [`public/members/README.md`](public/members/README.md) for the full ID list.

If you use a different extension (`.png`, `.webp`, etc.), set the `"photo"` field in `public/members.json` to the exact path, e.g. `"members/elove-1.png"`.

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm start
```

## Deployment

Deployed automatically to GitHub Pages via GitHub Actions on every push to `main`. The app is also rebuilt weekly to pick up any new releases.

### Setup

1. Enable GitHub Pages (**Settings → Pages → Source → Deploy from a branch**, select `gh-pages` / `/ (root)`)
2. Push to `main`
