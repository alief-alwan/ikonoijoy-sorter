import React, { useEffect, useCallback } from "react";

const GROUP_COLORS = {
  "=LOVE": "#e94560",
  "≠ME": "#8b5cf6",
  "≒JOY": "#f59e0b",
};

const COLOR_HEX = {
  "Red": "#e74c3c",
  "Yellow": "#f1c40f",
  "Lime Green": "#2ecc71",
  "Coral Pink": "#f08080",
  "Lavender": "#967bb6",
  "Orange": "#e67e22",
  "Sky Blue": "#5bc0de",
  "White": "#ecf0f1",
  "Mint": "#98d8c8",
  "Pink": "#ff69b4",
  "Coral": "#ff7f50",
  "Purple": "#9b59b6",
  "Peach": "#ffcba4",
  "Gold": "#ffd700",
  "Lime": "#b5e550",
  "Light Blue": "#add8e6",
  "Light Pink": "#ffb6c1",
  "Blue": "#3498db",
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

const SAFE_COLOR_RE = /^[a-zA-Z0-9#(),.\s%]+$/;

function safeColor(value) {
  if (!value) return undefined;
  if (COLOR_HEX[value]) return COLOR_HEX[value];
  return SAFE_COLOR_RE.test(value) ? value : undefined;
}

function MemberCard({ member, side, onChoice }) {
  const accentColor =
    member.memberColor
      ? null // use CSS custom property for member's own color
      : GROUP_COLORS[member.group] ?? "#e94560";

  return (
    <div className="member-card-wrapper">
      <button
        className="member-card"
        onClick={() => onChoice(side)}
        style={accentColor ? { "--member-accent": accentColor } : { "--member-accent": GROUP_COLORS[member.group] ?? "#e94560" }}
      >
        <div className="member-card-photo-wrap">
          {member.photo ? (
            <img
              className="member-photo"
              src={member.photo}
              alt={member.romaji}
            />
          ) : (
            <div className="member-photo-placeholder">
              {member.name && member.name !== member.romaji
                ? member.name.charAt(0)
                : member.romaji
                ? member.romaji.charAt(0)
                : "?"}
            </div>
          )}
        </div>

        {member.name && member.name !== member.romaji && (
          <span className="member-name-kanji">{member.name}</span>
        )}
        <span className="member-name-romaji">{member.romaji}</span>
        <span
          className="member-group-badge"
          style={{ backgroundColor: GROUP_COLORS[member.group] ?? "#e94560" }}
        >
          {member.group}
        </span>

        <div className="member-info-table">
          {member.dateOfBirth && (
            <div className="member-info-row">
              <span className="member-info-label">Born</span>
              <span className="member-info-value">{formatDate(member.dateOfBirth)}</span>
            </div>
          )}
          {member.birthplace && (
            <div className="member-info-row">
              <span className="member-info-label">Birthplace</span>
              <span className="member-info-value">{member.birthplace}</span>
            </div>
          )}
          {member.zodiac && (
            <div className="member-info-row">
              <span className="member-info-label">Zodiac</span>
              <span className="member-info-value">{member.zodiac}</span>
            </div>
          )}
          {member.height && (
            <div className="member-info-row">
              <span className="member-info-label">Height</span>
              <span className="member-info-value">{member.height}</span>
            </div>
          )}
          {member.memberColor && (
            <div className="member-info-row">
              <span className="member-info-label">Color</span>
              <span className="member-info-value">
                <span
                  className="member-color-swatch"
                  style={{ backgroundColor: safeColor(member.memberColor) }}
                />
                {member.memberColor}
              </span>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

function MemberComparison({ pair, onChoice, onUndo, canUndo, progress }) {
  const percentage = progress.total
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const handleSkip = useCallback(() => {
    onChoice(Math.random() < 0.5 ? "left" : "right");
  }, [onChoice]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      )
        return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onChoice("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onChoice("right");
      } else if (e.key === " ") {
        e.preventDefault();
        handleSkip();
      } else if (e.key.toLowerCase() === "z" || e.key.toLowerCase() === "u") {
        e.preventDefault();
        if (canUndo) onUndo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onChoice, onUndo, canUndo, handleSkip]);

  return (
    <div className="comparison">
      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-describedby="comparison-progress-text"
        />
      </div>
      <p id="comparison-progress-text" className="progress-text">
        Comparison {progress.current + 1} / ~{progress.total} ({percentage}%)
      </p>

      <h2>Who do you prefer?</h2>

      <div className="matchup">
        <MemberCard member={pair.left} side="left" onChoice={onChoice} />
        <span className="vs">VS</span>
        <MemberCard member={pair.right} side="right" onChoice={onChoice} />
      </div>

      <div className="comparison-actions">
        <button
          className="btn-skip"
          onClick={handleSkip}
          title="Randomly pick one and move on"
        >
          🎲 Skip
        </button>
        <button
          className="btn-undo"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last choice"
        >
          ↩ Undo
        </button>
      </div>

      <p className="keyboard-hint">
        ← → arrow keys to choose &nbsp;·&nbsp; Space to skip &nbsp;·&nbsp; Z to undo
      </p>
    </div>
  );
}

export default MemberComparison;
