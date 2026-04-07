import React, { useEffect, useCallback } from "react";
import MemberPhoto from "./MemberPhoto";

const GROUP_COLORS = {
  "=LOVE": "#e94560",
  "≠ME": "#8b5cf6",
  "≒JOY": "#f59e0b",
};

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
          <MemberPhoto
            member={member}
            imgClassName="member-photo"
            placeholderClassName="member-photo-placeholder"
          />
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

        <div className="member-info-badges">
          {member.memberColor && (
            <span className="member-badge member-color-badge">
              🎨 {member.memberColor}
            </span>
          )}
          {member.dateOfBirth && (
            <span className="member-badge">
              🎂 {member.dateOfBirth}
            </span>
          )}
          {member.birthplace && (
            <span className="member-badge">📍 {member.birthplace}</span>
          )}
          {member.height && (
            <span className="member-badge">📏 {member.height}</span>
          )}
          {member.bloodType && (
            <span className="member-badge">🩸 Type {member.bloodType}</span>
          )}
          {member.zodiac && (
            <span className="member-badge">✨ {member.zodiac}</span>
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
