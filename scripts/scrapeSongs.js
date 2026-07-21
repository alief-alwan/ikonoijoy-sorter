#!/usr/bin/env node
/**
 * Scrapes IKONOIJOY-related song data from the iTunes Lookup API and saves
 * it as public/songs.json.
 *
 * Run automatically via the prebuild / prestart npm scripts.
 *
 * Each group's iTunes `artistId` is hardcoded below (resolved manually via
 * the Apple Music web player / iTunes search JSON) rather than resolved by
 * fuzzy-matching an artist name search, since name-based resolution was
 * occasionally matching the wrong artist entirely.
 *
 * For each configured artistId, the script:
 *   1. Does a direct lookup?id={artistId}&entity=song (fast, but capped at
 *      200 results per request).
 *   2. Walks every album/single via lookup?id={artistId}&entity=album, then
 *      lookup?id={collectionId}&entity=song per collection, to catch any
 *      tracks beyond the 200-track cap in step 1 (a single release is
 *      virtually never >200 tracks).
 *   3. Drops any track whose reported artistId doesn't match the configured
 *      one (guards against compilation/various-artist contamination).
 */

const fs = require("fs");
const path = require("path");

const OUT_FILE = path.resolve(__dirname, "../public/songs.json");
const LIMIT = 200; // iTunes Lookup API hard cap per request
const MAX_RETRIES = 3;
const REQUEST_DELAY_MS = 150; // be polite to the API between lookups

// ── Group config ─────────────────────────────────────────────────────────
// artistId = the numeric iTunes/Apple Music artist ID for this group.
// Find it from an artist's Apple Music page URL, e.g.:
//   https://music.apple.com/jp/artist/%3Dlove/1441420870 → artistId 1441420870
// or by manually inspecting https://itunes.apple.com/search?term=NAME&entity=musicArtist
const IDOL_GROUPS = [
    {
        name: "=LOVE",
        artistId: 1273762750,
    },
    {
        name: "≠ME",
        artistId: 1477023494,
    },
    {
        name: "≒JOY",
        artistId: 1631260593,
    },
    {
        name: "IKONOIJOY",
        artistId: 1633045397,
    },
];

const KATAKANA_LIVE_KEYWORDS = ["コンサート", "ツアー", "フェス", "フェスティテイク"];
const KATAKANA_EXCEPTIONS = ["フェスティバル"];

function hasLiveKatakanaKeyword(title) {
    let cleaned = title;
    for (const ex of KATAKANA_EXCEPTIONS) {
        cleaned = cleaned.replaceAll(ex, "");
    }
    return KATAKANA_LIVE_KEYWORDS.some((kw) => cleaned.includes(kw));
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

// ── HTTP helper with retry ──────────────────────────────────────────────
async function fetchJsonWithRetry(url, label) {
    let lastErr;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }
            return await response.json();
        } catch (e) {
            lastErr = e;
            console.warn(`  Attempt ${attempt}/${MAX_RETRIES} failed for ${label}: ${e.message}`);
            if (attempt < MAX_RETRIES) {
                await sleep(500 * attempt);
            }
        }
    }
    throw lastErr;
}

// ── Artist ID resolution (now just a config passthrough) ────────────────
function resolveArtistId(group) {
    if (!group.artistId) {
        console.warn(`  ⚠️  No artistId configured for ${group.name}; skipping.`);
        return null;
    }
    console.log(`  Using configured artistId ${group.artistId} for ${group.name}`);
    return group.artistId;
}

// ── Discography lookup ──────────────────────────────────────────────────
async function fetchCollectionsForArtist(artistId) {
    const url = `https://itunes.apple.com/lookup?id=${artistId}&country=jp&entity=album&limit=${LIMIT}`;
    const data = await fetchJsonWithRetry(url, `album lookup for artistId ${artistId}`);
    const results = Array.isArray(data.results) ? data.results : [];
    return results.filter((r) => r.wrapperType === "collection");
}

async function fetchTracksForCollection(collectionId) {
    const url = `https://itunes.apple.com/lookup?id=${collectionId}&country=jp&entity=song&limit=${LIMIT}`;
    const data = await fetchJsonWithRetry(url, `song lookup for collectionId ${collectionId}`);
    const results = Array.isArray(data.results) ? data.results : [];
    if (results.length >= LIMIT) {
        console.warn(`    ⚠️  collectionId ${collectionId} returned the max ${LIMIT} tracks — possibly truncated.`);
    }
    return results.filter((r) => r.wrapperType === "track");
}

async function fetchTracksDirectForArtist(artistId) {
    const url = `https://itunes.apple.com/lookup?id=${artistId}&country=jp&entity=song&limit=${LIMIT}`;
    const data = await fetchJsonWithRetry(url, `direct song lookup for artistId ${artistId}`);
    const results = Array.isArray(data.results) ? data.results : [];
    if (results.length >= LIMIT) {
        console.warn(`  ⚠️  direct song lookup for artistId ${artistId} returned the max ${LIMIT} tracks — likely truncated; relying on per-album lookups to fill the gap.`);
    }
    return results.filter((r) => r.wrapperType === "track");
}

async function fetchSongsForGroup(group) {
    const artistId = resolveArtistId(group);
    if (!artistId) {
        return [];
    }

    const trackMap = new Map();

    // 1. Direct artist song lookup (fast, but capped at 200).
    try {
        const directTracks = await fetchTracksDirectForArtist(artistId);
        for (const t of directTracks) trackMap.set(t.trackId, t);
        console.log(`  Direct lookup: ${directTracks.length} track(s)`);
    } catch (e) {
        console.warn(`  Direct song lookup failed: ${e.message}`);
    }

    await sleep(REQUEST_DELAY_MS);

    // 2. Per-album lookups to catch anything beyond the 200-track cap above.
    let collections = [];
    try {
        collections = await fetchCollectionsForArtist(artistId);
        console.log(`  Found ${collections.length} album/single collection(s)`);
    } catch (e) {
        console.warn(`  Album lookup failed: ${e.message}`);
    }

    let newFromAlbums = 0;
    for (const collection of collections) {
        try {
            await sleep(REQUEST_DELAY_MS);
            const tracks = await fetchTracksForCollection(collection.collectionId);
            for (const t of tracks) {
                if (!trackMap.has(t.trackId)) {
                    trackMap.set(t.trackId, t);
                    newFromAlbums++;
                }
            }
        } catch (e) {
            console.warn(`  Track lookup failed for "${collection.collectionName}": ${e.message}`);
        }
    }
    console.log(`  Per-album lookups contributed ${newFromAlbums} additional track(s)`);

    // Sanity check: confirm every track's artistId actually matches, since a
    // collection lookup can occasionally include compilation/various-artist
    // tracks that aren't truly this artist.
    const mismatched = [...trackMap.values()].filter((t) => t.artistId !== artistId);
    if (mismatched.length > 0) {
        console.warn(`  ⚠️  ${mismatched.length} track(s) had a mismatched artistId and were dropped:`);
        for (const t of mismatched) {
            console.warn(`     - "${t.trackName}" (artist: ${t.artistName}, artistId: ${t.artistId})`);
            trackMap.delete(t.trackId);
        }
    }

    // ── Filtering (keyword rules only — artist identity is already guaranteed) ──
    const rejectedByKeyword = [];
    const filtered = [...trackMap.values()].filter((track) => {
        const titleLower = track.trackName.toLowerCase();
        const title = track.trackName;
        const isKeywordExcluded =
            titleLower.includes("off vocal") ||
            titleLower.includes("instrumental") ||
            titleLower.includes("inst.") ||
            titleLower.includes("tv size") ||
            titleLower.includes("tvサイズ") ||
            titleLower.includes("full size") ||
            /\blive\b/.test(titleLower) ||
            /\bconcert\b/.test(titleLower) ||
            /\btour\b/.test(titleLower) ||
            /\bfes\b/.test(titleLower) ||
            /\bfirst take\b/.test(titleLower) ||
            hasLiveKatakanaKeyword(title);

        if (isKeywordExcluded) {
            rejectedByKeyword.push(title);
            return false;
        }
        return true;
    });

    if (rejectedByKeyword.length > 0) {
        console.log(`  ℹ️  ${rejectedByKeyword.length} track(s) rejected due to keyword filters for ${group.name}.`);
    }

    return filtered.map((track) => ({
        id: track.trackId,
        title: track.trackName,
        group: group.name,
        coverArt: track.artworkUrl100
            ? track.artworkUrl100.replace("100x100bb", "300x300bb")
            : null,
        previewUrl: track.previewUrl,
    }));
}

function dedupeSongs(allSongs) {
    const uniqueSongs = [];
    const seenSongKeys = new Set();
    for (const song of allSongs) {
        const key = `${song.group}|${song.title.toLowerCase().trim().replace(/\s+/g, " ")}`;
        if (!seenSongKeys.has(key)) {
            seenSongKeys.add(key);
            uniqueSongs.push(song);
        }
    }
    return uniqueSongs;
}

async function main() {
    console.log("🔍 Scraping IKONOIJOY song data from the iTunes Lookup API (fixed artistId) …");
    let allSongs = [];
    let scraped = false;

    try {
        for (const group of IDOL_GROUPS) {
            console.log(`Fetching ${group.name} …`);
            const songs = await fetchSongsForGroup(group);
            console.log(`  ${group.name}: ${songs.length} song(s) kept after filtering`);
            allSongs.push(...songs);
            await sleep(REQUEST_DELAY_MS);
        }
        if (allSongs.length > 0) {
            scraped = true;
        } else {
            console.warn("⚠️  No songs scraped from iTunes.");
        }
    } catch (e) {
        console.warn(`⚠️  Song scrape failed: ${e.message}`);
    }

    if (!scraped) {
        if (fs.existsSync(OUT_FILE)) {
            console.log("ℹ️  Using existing public/songs.json.");
            return;
        }
        console.warn("⚠️  No existing public/songs.json and scrape failed; writing empty file.");
    }

    const uniqueSongs = dedupeSongs(allSongs);

    const output = {
        scraped: scraped ? new Date().toISOString() : null,
        source: scraped ? "itunes.apple.com (lookup by fixed artistId)" : "fallback",
        songs: uniqueSongs,
    };
    fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), "utf8");
    console.log(`💾 Saved ${uniqueSongs.length} songs to public/songs.json`);
}

main().catch((e) => {
    console.error("Fatal scrape error:", e);
    process.exit(0); // Don't fail the build
});