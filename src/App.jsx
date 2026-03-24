import React, { useState, useRef, useCallback, useEffect } from "react";
import Welcome from "./components/Welcome";
import Comparison from "./components/Comparison";
import Results from "./components/Results";
import { mergeSortGenerator, estimateComparisons } from "./utils/mergeSort";
import "./App.css";

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
    async function fetchSongs() {
      try {
        setLoading(true);
        const res = await fetch(`${process.env.PUBLIC_URL}/songs.json`);
        if (!res.ok) throw new Error("Failed to load songs");
        const data = await res.json();
        setSongs(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSongs();
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
        <p>Loading songs from Spotify...</p>
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
