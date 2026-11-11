import React, { useState, useRef, useCallback, useEffect } from "react";
import Welcome from "./components/Welcome";
import ModeSelect from "./components/ModeSelect";
import MemberWelcome from "./components/MemberWelcome";
import Comparison from "./components/Comparison";
import MemberComparison from "./components/MemberComparison";
import Results from "./components/Results";
import MemberResults from "./components/MemberResults";
import { mergeSortGenerator, estimateComparisons } from "./utils/mergeSort";
import "./App.css";

async function fetchAllSongs() {
    // public/songs.json is generated at build time by scripts/scrapeSongs.js
    // (filtering, dedupe and romaji are all done there).
    const response = await fetch("./songs.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Could not load song data. Please try again later.");
    const data = await response.json();
    if (!Array.isArray(data.songs) || data.songs.length === 0) {
        throw new Error("Could not load any songs. Please try again later.");
    }
    return data.songs;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

async function fetchMembers() {
    fetch("./members.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Could not load member data.");
    const data = await response.json();
    return Array.isArray(data.members) ? data.members : [];
}

// ── Save/resume progress ─────────────────────────────────────────────────
const SAVE_KEY = "ikonoijoySorterProgress";
const SAVE_VERSION = 1;

function computeDataChecksum(items) {
    // Cheap order-independent checksum: detects whether the underlying
    // songs/members list has changed since the save was made (e.g. after a
    // rescrape), so a stale save can be discarded instead of causing a
    // mismatched replay.
    return items.reduce(
        (sum, item) => sum + String(item.id).length + (item.id !== undefined ? 1 : 0),
        items.length
    );
}

function saveProgress(state) {
    try {
        localStorage.setItem(
            SAVE_KEY,
            JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), ...state })
        );
    } catch (e) {
        console.warn("Failed to save progress:", e);
    }
}

function loadProgress() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed.version !== SAVE_VERSION) return null;
        return parsed;
    } catch {
        return null;
    }
}

function clearProgress() {
    try {
        localStorage.removeItem(SAVE_KEY);
    } catch {
        // ignore
    }
}

function App() {
    // "mode" tracks whether we are sorting songs or members (null = not chosen yet)
    const [sortMode, setSortMode] = useState(null); // null | "songs" | "members"
    const [phase, setPhase] = useState("welcome"); // welcome | sorting | results
    const [songs, setSongs] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPair, setCurrentPair] = useState(null);
    const [results, setResults] = useState([]);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [userName, setUserName] = useState("");
    const [canUndo, setCanUndo] = useState(false);
    const [resumeAvailable, setResumeAvailable] = useState(null); // null | saved-state object
    const generatorRef = useRef(null);
    const shuffledItemsRef = useRef([]);
    const choiceHistoryRef = useRef([]);
    const sortPoolRef = useRef([]);

    useEffect(() => {
        Promise.all([
            fetchAllSongs(),
            fetchMembers().catch(() => []), // members are best-effort
        ])
            .then(([songData, memberData]) => {
                setSongs(songData);
                setMembers(memberData);

                const saved = loadProgress();
                if (saved) {
                    const currentItems = saved.sortMode === "songs" ? songData : memberData;
                    const checksumMatches = computeDataChecksum(currentItems) === saved.dataChecksum;
                    if (checksumMatches) {
                        setResumeAvailable(saved);
                    } else {
                        clearProgress(); // underlying data changed; the save is no longer valid
                    }
                }
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const persistCurrentState = useCallback(
        (overrides = {}) => {
            const itemsForChecksum = sortMode === "songs" ? songs : members;
            saveProgress({
                sortMode,
                phase,
                userName,
                dataChecksum: computeDataChecksum(itemsForChecksum),
                sortPool: sortPoolRef.current,
                shuffledItems: shuffledItemsRef.current,
                choiceHistory: choiceHistoryRef.current,
                results,
                ...overrides,
            });
        },
        [sortMode, phase, userName, songs, members, results]
    );

    const startSorting = useCallback((itemsToSort, name) => {
        setUserName(name || "");
        sortPoolRef.current = itemsToSort;
        const shuffled = shuffleArray(itemsToSort);
        shuffledItemsRef.current = shuffled;
        choiceHistoryRef.current = [];
        const total = estimateComparisons(shuffled.length);
        setProgress({ current: 0, total });
        setCanUndo(false);

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
        choiceHistoryRef.current.push(choice);
        const gen = generatorRef.current;
        const next = gen.next(choice);
        setProgress((prev) => ({ ...prev, current: prev.current + 1 }));
        setCanUndo(true);

        if (next.done) {
            setResults(next.value);
            setPhase("results");
            persistCurrentState({ phase: "results", results: next.value });
        } else {
            setCurrentPair(next.value);
            persistCurrentState({ phase: "sorting" });
        }
    }, [persistCurrentState]);

    const handleUndo = useCallback(() => {
        const history = choiceHistoryRef.current;
        if (history.length === 0) return;

        const newHistory = history.slice(0, -1);
        choiceHistoryRef.current = newHistory;

        const gen = mergeSortGenerator(shuffledItemsRef.current);
        generatorRef.current = gen;

        // Advance generator to the first comparison pair before replaying choices
        let pair = gen.next();
        for (const choice of newHistory) {
            pair = gen.next(choice);
        }

        setCurrentPair(pair.value);
        setProgress((prev) => ({ ...prev, current: Math.max(0, prev.current - 1) }));
        setCanUndo(newHistory.length > 0);
        persistCurrentState({ phase: "sorting" });
    }, [persistCurrentState]);

    const handleSortAgain = useCallback(() => {
        startSorting(sortPoolRef.current, userName);
    }, [startSorting, userName]);

    const handleRestart = useCallback(() => {
        clearProgress();
        setPhase("welcome");
        setCurrentPair(null);
        setResults([]);
        setProgress({ current: 0, total: 0 });
        setUserName("");
        setCanUndo(false);
        shuffledItemsRef.current = [];
        choiceHistoryRef.current = [];
    }, []);

    const handleFullRestart = useCallback(() => {
        clearProgress();
        setSortMode(null);
        handleRestart();
    }, [handleRestart]);

    const resumeSession = useCallback(() => {
        const saved = resumeAvailable;
        if (!saved) return;

        setSortMode(saved.sortMode);
        setUserName(saved.userName || "");
        sortPoolRef.current = saved.sortPool;
        shuffledItemsRef.current = saved.shuffledItems;
        choiceHistoryRef.current = saved.choiceHistory;

        if (saved.phase === "results") {
            setResults(saved.results);
            setPhase("results");
        } else {
            const gen = mergeSortGenerator(saved.shuffledItems);
            generatorRef.current = gen;
            let pair = gen.next();
            for (const choice of saved.choiceHistory) {
                pair = gen.next(choice);
            }
            setCurrentPair(pair.value);
            setProgress({
                current: saved.choiceHistory.length,
                total: estimateComparisons(saved.shuffledItems.length),
            });
            setCanUndo(saved.choiceHistory.length > 0);
            setPhase("sorting");
        }
        setResumeAvailable(null);
    }, [resumeAvailable]);

    const dismissResume = useCallback(() => {
        clearProgress();
        setResumeAvailable(null);
    }, []);

    if (loading) {
        return (
            <div className="app">
                <img className="app-logo" src="logo.png" alt="IKONOIJOY Sorter" />
                <div className="loading-spinner" />
                <p>Loading data…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="app">
                <img className="app-logo" src="logo.png" alt="IKONOIJOY Sorter" />
                <p className="error-message">❌ {error}</p>
            </div>
        );
    }

    return (
        <div className="app">
            <img className="app-logo" src="logo.png" alt="IKONOIJOY Sorter" />
            <p className="app-subtitle">=LOVE · ≠ME · ≒JOY</p>

            {/* ── Resume prompt ── */}
            {resumeAvailable && sortMode === null && (
                <div className="resume-banner">
                    <p>You have an unfinished {resumeAvailable.sortMode} sort in progress.</p>
                    <button onClick={resumeSession}>Continue</button>
                    <button onClick={dismissResume}>Start Over</button>
                </div>
            )}

            {/* ── Mode selection ── */}
            {sortMode === null && !resumeAvailable && (
                <ModeSelect onSelectMode={setSortMode} />
            )}

            {/* ── Songs flow ── */}
            {sortMode === "songs" && phase === "welcome" && (
                <Welcome
                    songs={songs}
                    onStart={startSorting}
                    onBack={() => setSortMode(null)}
                />
            )}
            {sortMode === "songs" && phase === "sorting" && currentPair && (
                <Comparison
                    pair={currentPair}
                    onChoice={handleChoice}
                    onUndo={handleUndo}
                    canUndo={canUndo}
                    progress={progress}
                />
            )}
            {sortMode === "songs" && phase === "results" && (
                <Results
                    results={results}
                    userName={userName}
                    onRestart={handleRestart}
                    onSortAgain={handleSortAgain}
                    onFullRestart={handleFullRestart}
                />
            )}

            {/* ── Members flow ── */}
            {sortMode === "members" && phase === "welcome" && (
                <MemberWelcome
                    members={members}
                    onStart={startSorting}
                    onBack={() => setSortMode(null)}
                />
            )}
            {sortMode === "members" && phase === "sorting" && currentPair && (
                <MemberComparison
                    pair={currentPair}
                    onChoice={handleChoice}
                    onUndo={handleUndo}
                    canUndo={canUndo}
                    progress={progress}
                />
            )}
            {sortMode === "members" && phase === "results" && (
                <MemberResults
                    results={results}
                    userName={userName}
                    onRestart={handleRestart}
                    onSortAgain={handleSortAgain}
                    onFullRestart={handleFullRestart}
                />
            )}
        </div>
    );
}

export default App;
