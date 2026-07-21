import React, { useState, useRef, useCallback, useEffect } from "react";
import Welcome from "./components/Welcome";
import ModeSelect from "./components/ModeSelect";
import MemberWelcome from "./components/MemberWelcome";
import Comparison from "./components/Comparison";
import MemberComparison from "./components/MemberComparison";
import Results from "./components/Results";
import MemberResults from "./components/MemberResults";
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

const KATAKANA_LIVE_KEYWORDS = ["コンサート", "ツアー", "フェス", "フェスティテイク"];

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

async function fetchAllSongs() {
    // Prefer the pre-scraped static file (generated at build time by
    // scripts/scrapeSongs.js), which isn't subject to the iTunes API's
    // 200-result-per-query cap the way a single live client-side scrape is,
    // and logs any misses during the build instead of silently dropping songs.
    try {
        const response = await fetch("./songs.json");
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.songs) && data.songs.length > 0) {
                return addRomajiTitles(data.songs);
            }
        }
    } catch {
        // fall through to live scrape
    }

    const [results] = await Promise.all([
        Promise.all(IDOL_GROUPS.map(fetchSongsForGroup)),
        initTokenizer().catch(() => { }),
    ]);
    const allSongs = results.flat();
    if (allSongs.length === 0) {
        throw new Error("Could not load any songs from iTunes. Please try again later.");
    }
    const uniqueSongs = dedupeSongs(allSongs);
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

async function fetchMembers() {
    const response = await fetch("./members.json");
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