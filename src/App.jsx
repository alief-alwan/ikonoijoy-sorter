import React, { useState, useRef, useCallback, useEffect } from "react";
import Welcome from "./components/Welcome";
import Comparison from "./components/Comparison";
import Results from "./components/Results";
import { mergeSortGenerator, estimateComparisons } from "./utils/mergeSort";
import { initTokenizer, convertToRomaji } from "./utils/romaji";
import "./App.css";

const IDOL_GROUPS = [
  {
    name: "=LOVE",
    searchNames: ["イコールラブ", "=LOVE", "イコラブ"],
    artistNames: ["=LOVE", "イコールラブ"],
  },
  {
    name: "≠ME",
    searchNames: ["ノットイコールミー", "≠ME", "ノイミー"],
    artistNames: ["≠ME", "ノットイコールミー", "ノイミー"],
  },
  {
    name: "≒JOY",
    searchNames: ["ニアリーイコールジョイ", "≒JOY", "ニアジョイ"],
    artistNames: ["≒JOY", "ニアリーイコールジョイ"],
  },
  {
    name: "IKONOIJOY",
    searchNames: ["IKONOIJOY", "イコノイジョイ"],
    artistNames: ["IKONOIJOY", "イコノイジョイ"],
  },
];

const KATAKANA_LIVE_KEYWORDS = ["コンサート", "ツアー", "フェス", "ファーストテイク"];

// Longer words that contain a live keyword but are not live indicators
const KATAKANA_EXCEPTIONS = ["フェスティバル"];

function hasLiveKatakanaKeyword(title) {
  let cleaned = title;
  for (const ex of KATAKANA_EXCEPTIONS) {
    cleaned = cleaned.replaceAll(ex, "");
  }
  return KATAKANA_LIVE_KEYWORDS.some((kw) => cleaned.includes(kw));
}

async function fetchSongsForSearchName(searchName) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchName)}&country=jp&media=music&entity=song&limit=200`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`iTunes API request failed with status ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data.results) ? data.results : [];
}

async function fetchSongsForGroup(group) {
  try {
    const trackArrays = await Promise.all(
      group.searchNames.map((searchName) =>
        fetchSongsForSearchName(searchName).catch((err) => {
          console.warn(`Search failed for "${searchName}":`, err);
          return [];
        })
      )
    );
    const trackMap = new Map();
    for (const track of trackArrays.flat()) {
      if (!trackMap.has(track.trackId)) {
        trackMap.set(track.trackId, track);
      }
    }
    const allNames = [group.name, ...group.artistNames];
    return [...trackMap.values()]
      .filter((track) => {
        const titleLower = track.trackName.toLowerCase();
        const title = track.trackName;
        return (
          !titleLower.includes("off vocal") &&
          !titleLower.includes("instrumental") &&
          !titleLower.includes("inst.") &&
          !titleLower.includes("tv size") &&
          !titleLower.includes("tvサイズ") &&
          !titleLower.includes("full size") &&
          !/\blive\b/.test(titleLower) &&
          !/\bconcert\b/.test(titleLower) &&
          !/\btour\b/.test(titleLower) &&
          !/\bfes\b/.test(titleLower) &&
          !/\bfirst take\b/.test(titleLower) &&
          !hasLiveKatakanaKeyword(title)
        );
      })
      .filter((track) =>
        allNames.some((n) => track.artistName.includes(n))
      )
      .map((track) => ({
        id: track.trackId,
        title: track.trackName,
        group: group.name,
        coverArt: track.artworkUrl100
          ? track.artworkUrl100.replace("100x100bb", "300x300bb")
          : null,
        previewUrl: track.previewUrl,
      }));
  } catch (error) {
    console.error(`Failed to fetch data for ${group.name}:`, error);
    return [];
  }
}

const JAPANESE_CHAR_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

async function addRomajiTitles(songs) {
  try {
    await initTokenizer();
    return Promise.all(
      songs.map(async (song) => {
        if (!JAPANESE_CHAR_RE.test(song.title)) return song;
        const romaji = await convertToRomaji(song.title);
        return { ...song, romajiTitle: romaji };
      })
    );
  } catch {
    return songs;
  }
}

async function fetchAllSongs() {
  const [results] = await Promise.all([
    Promise.all(IDOL_GROUPS.map(fetchSongsForGroup)),
    initTokenizer().catch(() => {}),
  ]);
  const allSongs = results.flat();
  if (allSongs.length === 0) {
    throw new Error("Could not load any songs from iTunes. Please try again later.");
  }
  const uniqueSongs = [];
  const seenSongKeys = new Set();
  for (const song of allSongs) {
    const key = `${song.group}|${song.title.toLowerCase().trim().replace(/\s+/g, " ")}`;
    if (!seenSongKeys.has(key)) {
      seenSongKeys.add(key);
      uniqueSongs.push(song);
    }
  }
  return addRomajiTitles(uniqueSongs);
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function App() {
  const [phase, setPhase] = useState("welcome");
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPair, setCurrentPair] = useState(null);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [userName, setUserName] = useState("");
  const generatorRef = useRef(null);

  useEffect(() => {
    fetchAllSongs()
      .then((data) => setSongs(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const startSorting = useCallback((songsToSort, name) => {
    setUserName(name || "");
    const shuffled = shuffleArray(songsToSort);
    const total = estimateComparisons(shuffled.length);
    setProgress({ current: 0, total });

    const gen = mergeSortGenerator(shuffled);
    generatorRef.current = gen;

    const first = gen.next();
    if (first.done) {
      setResults(first.value);
      setPhase("results");
    } else {
      setCurrentPair(first.value);
      setPhase("sorting");
    }
  }, []);

  const handleChoice = useCallback((choice) => {
    const gen = generatorRef.current;
    const next = gen.next(choice);
    setProgress((prev) => ({ ...prev, current: prev.current + 1 }));

    if (next.done) {
      setResults(next.value);
      setPhase("results");
    } else {
      setCurrentPair(next.value);
    }
  }, []);

  const handleRestart = useCallback(() => {
    setPhase("welcome");
    setCurrentPair(null);
    setResults([]);
    setProgress({ current: 0, total: 0 });
    setUserName("");
  }, []);

  if (loading) {
    return (
      <div className="app">
        <h1 className="app-title">🎶 IKONOIJOY Song Sorter</h1>
        <div className="loading-spinner" />
        <p>Loading songs from iTunes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <h1 className="app-title">🎶 IKONOIJOY Song Sorter</h1>
        <p className="error-message">❌ {error}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <h1 className="app-title">🎶 IKONOIJOY Song Sorter</h1>
      <p className="app-subtitle">=LOVE · ≠ME · ≒JOY</p>

      {phase === "welcome" && <Welcome songs={songs} onStart={startSorting} />}
      {phase === "sorting" && currentPair && (
        <Comparison
          pair={currentPair}
          onChoice={handleChoice}
          progress={progress}
        />
      )}
      {phase === "results" && (
        <Results results={results} userName={userName} onRestart={handleRestart} />
      )}
    </div>
  );
}

export default App;
