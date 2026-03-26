import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import html2canvas from "html2canvas";

const MEDAL = ["🥇", "🥈", "🥉"];

function generateFunFacts(results) {
  const facts = [];
  if (results.length === 0) return facts;

  const top = results[0];
  facts.push(`Your #1 song is "${top.title}" from ${top.group}!`);

  const topN = (n) => results.slice(0, Math.min(n, results.length));

  // Top 3 same group
  const top3 = topN(3);
  if (top3.length === 3) {
    const groups3 = new Set(top3.map((s) => s.group));
    if (groups3.size === 1) {
      facts.push(
        `Your entire podium is ${top3[0].group} — you're a true fan! 🎤`
      );
    }
  }

  // Group counts in top 10
  const top10 = topN(10);
  const groupCounts = {};
  for (const song of top10) {
    groupCounts[song.group] = (groupCounts[song.group] || 0) + 1;
  }

  const dominant = Object.entries(groupCounts).sort((a, b) => b[1] - a[1])[0];
  if (dominant && dominant[1] >= 2) {
    facts.push(
      `${dominant[0]} leads your top 10 with ${dominant[1]} song${dominant[1] > 1 ? "s" : ""}!`
    );
  }

  // How many groups in top 5
  const top5 = topN(5);
  const groups5 = new Set(top5.map((s) => s.group));
  if (groups5.size === top5.length && top5.length >= 3) {
    facts.push("Your top 5 features great variety across groups! 🌈");
  }

  // Overall group distribution
  const totalCounts = {};
  for (const song of results) {
    totalCounts[song.group] = (totalCounts[song.group] || 0) + 1;
  }
  const totalEntries = Object.entries(totalCounts).sort(
    (a, b) => b[1] - a[1]
  );
  if (totalEntries.length > 1) {
    const [topGroup, topCount] = totalEntries[0];
    const pct = Math.round((topCount / results.length) * 100);
    if (pct >= 40) {
      facts.push(
        `${topGroup} makes up ${pct}% of all songs you ranked — clearly a favorite!`
      );
    }
  }

  // Bottom-ranked surprise
  if (results.length >= 10) {
    const lastSong = results[results.length - 1];
    facts.push(
      `"${lastSong.title}" came in last at #${results.length}. Better luck next time! 😅`
    );
  }

  return facts;
}

function GroupDistribution({ results }) {
  const distribution = useMemo(() => {
    const counts = {};
    for (const song of results) {
      counts[song.group] = (counts[song.group] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([group, count]) => ({
        group,
        count,
        pct: Math.round((count / results.length) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [results]);

  return (
    <div className="group-distribution">
      <h3>📊 Group Distribution</h3>
      <div className="distribution-bars">
        {distribution.map(({ group, count, pct }) => (
          <div key={group} className="distribution-row">
            <span className="distribution-label">{group}</span>
            <div className="distribution-track">
              <div
                className="distribution-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="distribution-value">
              {count} ({pct}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Results({ results, onRestart }) {
  const [expanded, setExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState("idle"); // idle | copied | failed
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | failed
  const imageRef = useRef(null);
  const copyTimerRef = useRef(null);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(copyTimerRef.current);
      clearTimeout(saveTimerRef.current);
    };
  }, []);

  const INITIAL_COUNT = 10;
  const showExpand = results.length > INITIAL_COUNT;
  const displayResults = expanded
    ? results
    : results.slice(0, INITIAL_COUNT);

  const funFacts = useMemo(() => generateFunFacts(results), [results]);

  const handleCopy = useCallback(async () => {
    const text = results
      .map(
        (song, i) =>
          `#${i + 1} ${song.title}${song.romajiTitle ? ` (${song.romajiTitle})` : ""} — ${song.group}`
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyStatus("idle"), 2000);
  }, [results]);

  const handleSaveImage = useCallback(async () => {
    if (!imageRef.current || saveStatus === "saving") return;
    setSaveStatus("saving");
    try {
      const canvas = await html2canvas(imageRef.current, {
        backgroundColor: "#1a1a2e",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = "my-top-10.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      setSaveStatus("idle");
    } catch {
      setSaveStatus("failed");
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }, [saveStatus]);

  return (
    <div className="results">
      <h2>🏆 Your Ranking</h2>

      {/* ── Top 3 Podium ── */}
      {results.length >= 3 && (
        <div className="podium">
          {[1, 0, 2].map((idx) => {
            const song = results[idx];
            return (
              <div key={song.id} className={`podium-item podium-${idx + 1}`}>
                <span className="podium-medal">{MEDAL[idx]}</span>
                {song.coverArt && (
                  <img
                    className="podium-art"
                    src={song.coverArt}
                    alt={song.title}
                  />
                )}
                <span className="podium-title">{song.title}</span>
                <span className="podium-group">{song.group}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Fun Facts ── */}
      {funFacts.length > 0 && (
        <div className="fun-facts">
          <h3>✨ Fun Facts</h3>
          <ul>
            {funFacts.map((fact, i) => (
              <li key={i}>{fact}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Group Distribution ── */}
      <GroupDistribution results={results} />

      {/* ── Saveable Top 10 Card ── */}
      <div className="save-card" ref={imageRef}>
        <h3 className="save-card-title">🏆 My Top 10</h3>
        <ol className="save-card-list">
          {results.slice(0, 10).map((song, index) => (
            <li key={song.id} className="save-card-item">
              <span className="save-card-rank">
                {index < 3 ? MEDAL[index] : `#${index + 1}`}
              </span>
              {song.coverArt && (
                <img
                  className="save-card-art"
                  src={song.coverArt}
                  alt={song.title}
                />
              )}
              <div className="save-card-info">
                <span className="save-card-song">{song.title}</span>
                <span className="save-card-group">{song.group}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="results-actions">
        <button
          className="btn-action"
          onClick={handleSaveImage}
          disabled={saveStatus === "saving"}
        >
          {saveStatus === "saving"
            ? "Saving…"
            : saveStatus === "failed"
              ? "❌ Save Failed"
              : "📸 Save Top 10 as Image"}
        </button>
        <button className="btn-action" onClick={handleCopy}>
          {copyStatus === "copied"
            ? "✅ Copied!"
            : copyStatus === "failed"
              ? "❌ Copy Failed"
              : "📋 Copy Results"}
        </button>
      </div>

      {/* ── Full Ranking List ── */}
      <h3 className="full-ranking-heading">Full Ranking</h3>
      <ol className="results-list">
        {displayResults.map((song, index) => (
          <li
            key={song.id}
            className={[
              "result-item",
              index < 3 && "result-top3",
              index < 5 && "result-top5",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="rank">
              {index < 3 ? MEDAL[index] : `#${index + 1}`}
            </span>
            {song.coverArt && (
              <img
                className="result-album-art"
                src={song.coverArt}
                alt={song.title}
              />
            )}
            <div className="result-info">
              <span className="song-title">{song.title}</span>
              {song.romajiTitle && (
                <span className="song-romaji">{song.romajiTitle}</span>
              )}
              <span className="song-meta">{song.group}</span>
            </div>
            {song.previewUrl && (
              <audio
                className="preview-audio"
                src={song.previewUrl}
                controls
                preload="none"
                aria-label={`Preview: ${song.title}`}
              />
            )}
          </li>
        ))}
      </ol>

      {showExpand && (
        <button
          className="btn-expand"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded
            ? "Show Less ▲"
            : `Show All ${results.length} Songs ▼`}
        </button>
      )}

      <button className="btn-restart" onClick={onRestart}>
        Sort Again
      </button>
    </div>
  );
}

export default Results;
