const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const ARTIST_IDS = {
  "=LOVE": "48NRmDl3hJxtb1r36VkzUq",
  "≠ME": "3lIhMwj2wGFV2oGSsAb8qG",
  "≒JOY": "0CXdxGaAia8vQLHVRFXW8a",
};

async function getToken() {
  const creds = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Spotify auth failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function fetchAllPages(url, token) {
  const items = [];
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Spotify API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    items.push(...data.items);
    url = data.next;
  }
  return items;
}

async function main() {
  console.log("🔑 Authenticating with Spotify...");
  const token = await getToken();

  const allSongs = [];
  const seen = new Set();

  for (const [group, artistId] of Object.entries(ARTIST_IDS)) {
    console.log(`📀 Fetching albums for ${group}...`);
    const albums = await fetchAllPages(
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&market=JP&limit=50`,
      token
    );
    console.log(`   Found ${albums.length} albums/singles`);

    for (const album of albums) {
      const tracks = await fetchAllPages(
        `https://api.spotify.com/v1/albums/${album.id}/tracks?market=JP&limit=50`,
        token
      );

      for (const track of tracks) {
        const key = track.name.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const images = Array.isArray(album.images) ? album.images : [];
        const firstImage = images[0] || null;
        const lastImage = images.length ? images[images.length - 1] : null;

        allSongs.push({
          id: track.id,
          title: track.name,
          group,
          album: album.name,
          albumArt: firstImage?.url || null,
          albumArtSmall: lastImage?.url || null,
          previewUrl: track.preview_url || null,
          spotifyUrl: track.external_urls?.spotify || null,
          releaseDate: album.release_date,
        });
      }
    }
  }

  allSongs.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

  const outputPath = path.join(__dirname, "..", "public", "songs.json");
  fs.writeFileSync(outputPath, JSON.stringify(allSongs, null, 2));
  console.log(`\n✅ Wrote ${allSongs.length} songs to ${outputPath}`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
