import React, { useState, useRef, useCallback, useEffect } from "react";
import html2canvas from "html2canvas";

const MEDAL = ["🥇", "🥈", "🥉"];

function Results({ results, userName, onRestart, onSortAgain }) {
  const [expanded, setExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState("idle"); // idle | copied | failed
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | failed
  const [saveAllStatus, setSaveAllStatus] = useState("idle"); // idle | saving | failed
  const imageRef = useRef(null);
  const allImageRef = useRef(null);
  const copyTimerRef = useRef(null);
  const saveTimerRef = useRef(null);
  const saveAllTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(copyTimerRef.current);
      clearTimeout(saveTimerRef.current);
      clearTimeout(saveAllTimerRef.current);
    };
  }, []);

  const INITIAL_COUNT = 10;
  const showExpand = results.length > INITIAL_COUNT;
  const displayResults = expanded
    ? results
    : results.slice(0, INITIAL_COUNT);

  const handleCopy = useCallback(async () => {
    const text = results
      .map(
        (song, i) =>
          `#${i + 1} ${song.title}${song.romajiTitle ? ` (${song.romajiTitle})` : ""} — ${song.group}`
      )
      .join("\n");
    let success = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        success = true;
      }
    } catch {
      /* fall through to fallback */
    }
    if (!success) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("aria-hidden", "true");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        success = false;
      }
    }
    setCopyStatus(success ? "copied" : "failed");
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
      link.download = `${userName ? `${userName}s-` : "my-"}top-10.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setSaveStatus("idle");
    } catch {
      setSaveStatus("failed");
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }, [saveStatus, userName]);

  const handleSaveAllImage = useCallback(async () => {
    if (!allImageRef.current || saveAllStatus === "saving") return;
    setSaveAllStatus("saving");
    try {
      // scale 3 × 720px CSS height = 2160px output height; width auto-sizes to content
      const canvas = await html2canvas(allImageRef.current, {
        backgroundColor: "#1a1a2e",
        scale: 3,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `${userName ? `${userName}s-` : "my-"}full-ranking.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setSaveAllStatus("idle");
    } catch {
      setSaveAllStatus("failed");
      clearTimeout(saveAllTimerRef.current);
      saveAllTimerRef.current = setTimeout(() => setSaveAllStatus("idle"), 2000);
    }
  }, [saveAllStatus, userName]);

  return (
    <div className="results">
      <h2>🏆 {userName ? `${userName}'s Ranking` : "Your Ranking"}</h2>

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

      {/* ── Saveable Top 10 Card ── */}
      <div className="save-card" ref={imageRef}>
        <h3 className="save-card-title">🏆 {userName ? `${userName}'s Top 10` : "My Top 10"}</h3>
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
        <button
          className="btn-action"
          onClick={handleSaveAllImage}
          disabled={saveAllStatus === "saving"}
        >
          {saveAllStatus === "saving"
            ? "Saving…"
            : saveAllStatus === "failed"
              ? "❌ Save Failed"
              : "🖼️ Save All Results as Image"}
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
      <ol className={`results-list${expanded ? " results-list--expanded" : ""}`}>
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

      <div className="restart-actions">
        <button className="btn-restart" onClick={onRestart}>
          🏠 Change Selection
        </button>
        <button className="btn-sort-again" onClick={onSortAgain}>
          🔄 Sort Again (Same Pool)
        </button>
      </div>

      {/* ── Hidden Full-Ranking Card for Image Export (720px tall, auto width) ── */}
      {(() => {
        // Fix the number of rows so the card height stays at 720px;
        // columns (and therefore width) grow to fit all songs.
        const CELL_W = 130; // px width per grid cell
        const GAP = 8;      // px gap between cells
        const PAD_X = 24;   // px horizontal padding on each side
        const allRows = Math.max(2, Math.ceil(Math.sqrt(results.length * (9 / 16))));
        const allCols = Math.ceil(results.length / allRows);
        const cardWidth = allCols * CELL_W + (allCols - 1) * GAP + PAD_X * 2;
        return (
          <div
            className="save-all-card"
            ref={allImageRef}
            aria-hidden="true"
            style={{ width: cardWidth }}
          >
            <h3 className="save-all-card-title">
              🏆 {userName ? `${userName}'s Full Ranking` : "My Full Ranking"}
            </h3>
            <ol
              className="save-all-card-grid"
              style={{
                gridTemplateRows: `repeat(${allRows}, 1fr)`,
                gridTemplateColumns: `repeat(${allCols}, ${CELL_W}px)`,
              }}
            >
              {results.map((song, index) => (
                <li
                  key={song.id}
                  className={[
                    "save-all-card-item",
                    index < 3 && "save-all-top3",
                    index >= 3 && index < 5 && "save-all-top5",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="save-all-rank">
                    {index < 3 ? MEDAL[index] : `#${index + 1}`}
                  </span>
                  {song.coverArt && (
                    <img
                      className="save-all-art"
                      src={song.coverArt}
                      alt={song.title}
                    />
                  )}
                  <span className="save-all-song">{song.title}</span>
                  <span className="save-all-group">{song.group}</span>
                </li>
              ))}
            </ol>
          </div>
        );
      })()}
    </div>
  );
}

export default Results;
