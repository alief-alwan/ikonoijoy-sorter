import React, { useState, useRef, useCallback, useEffect } from "react";
import Welcome from "./components/Welcome";
import Comparison from "./components/Comparison";
import Results from "./components/Results";
import { mergeSortGenerator, estimateComparisons } from "./utils/mergeSort";
import "./App.css";

const IDOL_GROUPS = [
  { name: "=LOVE", searchName: "イコールラブ" },
  { name: "≠ME", searchName: "ノットイコールミー" },
  { name: "≒JOY", searchName: "ニアリーイコールジョイ" },
];

function katakanaWord(word) {
  return new RegExp(`(?:^|[^ァ-ヶー])${word}(?![ァ-ヶー])`);
}

const KATAKANA_FILTERS = [
  katakanaWord("コンサート"),
  katakanaWord("ツアー"),
  katakanaWord("フェス"),
  katakanaWord("ファーストテイク"),
];

async function fetchSongsForGroup(group) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(group.searchName)}&country=jp&media=music&entity=song&limit=200`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`iTunes API request failed with status ${response.status} for group ${group.name}`);
    }
    const data = await response.json();
    const tracks = Array.isArray(data.results) ? data.results : [];
    return tracks
      .filter((track) => {
        const titleLower = track.trackName.toLowerCase();
        const title = track.trackName;
        return (
          !titleLower.includes("off vocal") &&
          !titleLower.includes("instrumental") &&
          !titleLower.includes("inst.") &&
          !/\blive\b/.test(titleLower) &&
          !/\bconcert\b/.test(titleLower) &&
          !/\btour\b/.test(titleLower) &&
          !/\bfes\b/.test(titleLower) &&
          !/\bfirst take\b/.test(titleLower) &&
          !KATAKANA_FILTERS.some((re) => re.test(title))
        );
      })
      .filter(
        (track) =>
          track.artistName.includes(group.name) ||
          track.artistName.includes(group.searchName)
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

async function fetchAllSongs() {
  const results = await Promise.all(IDOL_GROUPS.map(fetchSongsForGroup));
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
  return uniqueSongs;
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
  const generatorRef = useRef(null);

  useEffect(() => {
    fetchAllSongs()
      .then((data) => setSongs(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const startSorting = useCallback((songsToSort) => {
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
        <Results results={results} onRestart={handleRestart} />
      )}
    </div>
  );
}

export default App;
