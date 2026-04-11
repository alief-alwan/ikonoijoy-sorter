import React, { useState, useRef, useCallback, useEffect } from "react";
import html2canvas from "html2canvas";
import MemberPhoto from "./MemberPhoto";

const MEDAL = ["🥇", "🥈", "🥉"];

const GROUP_COLORS = {
  "=LOVE": "#e94560",
  "≠ME": "#8b5cf6",
  "≒JOY": "#f59e0b",
};

function cleanRomaji(romaji) {
  return (romaji || "").replace(/\s*[\(\[].*?[\)\]]/g, "").trim();
}

function MemberResults({ results, userName, onRestart, onSortAgain, onFullRestart }) {
  const [expanded, setExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState("idle");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveAllStatus, setSaveAllStatus] = useState("idle");
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
  const displayResults = expanded ? results : results.slice(0, INITIAL_COUNT);

  const handleCopy = useCallback(async () => {
    const text = results
      .map(
        (member, i) =>
          `#${i + 1} ${cleanRomaji(member.romaji)} — ${member.group}`
      )
      .join("\n");
    let success = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        success = true;
      }
    } catch {
      /* fall through */
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
      link.download = `${userName ? `${userName}s-` : "my-"}top-10-members.png`;
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
      const canvas = await html2canvas(allImageRef.current, {
        backgroundColor: "#1a1a2e",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `${userName ? `${userName}s-` : "my-"}full-member-ranking.png`;
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
      <h2>🏆 {userName ? `${userName}'s Member Ranking` : "Your Member Ranking"}</h2>

      {/* ── Top 3 Podium ── */}
      {results.length >= 3 && (
        <div className="podium">
          {[1, 0, 2].map((idx) => {
            const member = results[idx];
            const groupColor = GROUP_COLORS[member.group] ?? "#e94560";
            return (
              <div
                key={member.id}
                className={`podium-item podium-${idx + 1}`}
                style={{ "--podium-accent": groupColor }}
              >
                <span className="podium-medal">{MEDAL[idx]}</span>
                <MemberPhoto
                  member={member}
                  imgClassName="podium-art member-podium-photo"
                  placeholderClassName="member-podium-placeholder"
                  placeholderStyle={{ backgroundColor: groupColor }}
                />
                <span className="podium-title">{cleanRomaji(member.romaji)}</span>
                <span className="podium-group" style={{ color: groupColor }}>
                  {member.group}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Saveable Top 10 Card ── */}
      <div className="save-card" ref={imageRef}>
        <h3 className="save-card-title">
          🏆 {userName ? `${userName}'s Top 10 Members` : "My Top 10 Members"}
        </h3>
        <ol className="save-card-list">
          {results.slice(0, 10).map((member, index) => {
            const groupColor = GROUP_COLORS[member.group] ?? "#e94560";
            return (
              <li key={member.id} className="save-card-item">
                <span className="save-card-rank">
                  {index < 3 ? MEDAL[index] : `#${index + 1}`}
                </span>
                <MemberPhoto
                  member={member}
                  imgClassName="save-card-art member-save-photo"
                  placeholderClassName="member-save-placeholder"
                  placeholderStyle={{ backgroundColor: groupColor }}
                />
                <div className="save-card-info">
                  <span className="save-card-song">{cleanRomaji(member.romaji)}</span>
                  <span className="save-card-group" style={{ color: groupColor }}>
                    {member.group}
                  </span>
                </div>
              </li>
            );
          })}
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
        {displayResults.map((member, index) => {
          const groupColor = GROUP_COLORS[member.group] ?? "#e94560";
          return (
            <li
              key={member.id}
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
              <MemberPhoto
                member={member}
                imgClassName="result-album-art member-result-photo"
                placeholderClassName="member-result-placeholder"
                placeholderStyle={{ backgroundColor: groupColor }}
              />
              <div className="result-info">
                <span className="song-title">{cleanRomaji(member.romaji)}</span>
                <span className="song-meta" style={{ color: groupColor }}>
                  {member.group}
                  {member.memberColor ? ` · ${member.memberColor}` : ""}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {showExpand && (
        <button
          className="btn-expand"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded
            ? "Show Less ▲"
            : `Show All ${results.length} Members ▼`}
        </button>
      )}

      <div className="restart-actions">
        <button className="btn-restart" onClick={onRestart}>
          🏠 Change Selection
        </button>
        <button className="btn-sort-again" onClick={onSortAgain}>
          🔄 Sort Again (Same Pool)
        </button>
        {onFullRestart && (
          <button className="btn-back" onClick={onFullRestart}>
            ← Sort Members / Songs
          </button>
        )}
      </div>

      {/* ── Hidden Full-Ranking Card for Image Export ── */}
      {(() => {
        const CELL_W = 100;
        const CELL_H = 110;
        const GAP = 8;
        const PAD_X = 24;
        const TOP_COUNT = Math.min(10, results.length);
        const TOP_COLS = 5;
        const rest = results.slice(TOP_COUNT);
        const restRows = rest.length > 0 ? Math.max(2, Math.ceil(Math.sqrt(rest.length * (9 / 16)))) : 0;
        const restCols = rest.length > 0 ? Math.ceil(rest.length / restRows) : 0;
        const TOP_CELL_W = 150;
        const restGridW = restCols * CELL_W + Math.max(0, restCols - 1) * GAP;
        const topGridW = TOP_COLS * TOP_CELL_W + (TOP_COLS - 1) * GAP;
        const cardWidth = Math.max(topGridW, restGridW) + PAD_X * 2;
        return (
          <div
            className="save-all-card"
            ref={allImageRef}
            aria-hidden="true"
            style={{ width: cardWidth }}
          >
            <h3 className="save-all-card-title">
              🏆 {userName ? `${userName}'s Full Member Ranking` : "My Full Member Ranking"}
            </h3>
            {/* ── Top 10 Showcase ── */}
            <div className="save-all-showcase">
              <h4 className="save-all-showcase-heading">⭐ Top 10</h4>
              <ol className="save-all-showcase-grid">
                {results.slice(0, TOP_COUNT).map((member, index) => {
                  const groupColor = GROUP_COLORS[member.group] ?? "#e94560";
                  return (
                    <li
                      key={member.id}
                      className={[
                        "save-all-showcase-item",
                        index < 3 && "save-all-showcase-top3",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="save-all-showcase-rank">
                        {index < 3 ? MEDAL[index] : `#${index + 1}`}
                      </span>
                      <MemberPhoto
                        member={member}
                        imgClassName="save-all-showcase-art member-save-all-showcase-photo"
                        placeholderClassName="member-save-all-showcase-placeholder"
                        placeholderStyle={{ backgroundColor: groupColor }}
                      />
                      <span className="save-all-showcase-name">{cleanRomaji(member.romaji)}</span>
                      <span className="save-all-showcase-group" style={{ color: groupColor }}>
                        {member.group}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
            {/* ── Remaining Members ── */}
            {rest.length > 0 && (
              <>
                <h4 className="save-all-rest-heading">Remaining Members</h4>
                <ol className="save-all-card-grid" start={TOP_COUNT + 1}
                  style={{
                    gridTemplateRows: `repeat(${restRows}, minmax(${CELL_H}px, auto))`,
                    gridTemplateColumns: `repeat(${restCols}, ${CELL_W}px)`,
                  }}
                >
                  {rest.map((member, index) => {
                    const groupColor = GROUP_COLORS[member.group] ?? "#e94560";
                    return (
                      <li key={member.id} className="save-all-card-item">
                        <span className="save-all-rank">#{TOP_COUNT + index + 1}</span>
                        <MemberPhoto
                          member={member}
                          imgClassName="save-all-art member-save-all-photo"
                          placeholderClassName="member-save-all-placeholder"
                          placeholderStyle={{ backgroundColor: groupColor }}
                        />
                        <span className="save-all-song">{cleanRomaji(member.romaji)}</span>
                        <span className="save-all-group">{member.group}</span>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export default MemberResults;
