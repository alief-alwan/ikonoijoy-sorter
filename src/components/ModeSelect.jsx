import React from "react";

function ModeSelect({ onSelectMode }) {
  return (
    <div className="mode-select">
      <h2>What would you like to sort?</h2>
      <p className="mode-select-subtitle">
        Choose a category to begin ranking.
      </p>

      <div className="mode-cards">
        <button
          className="mode-card"
          onClick={() => onSelectMode("members")}
        >
          <span className="mode-card-icon">🌸</span>
          <span className="mode-card-title">Members</span>
          <span className="mode-card-desc">
            Rank your favourite IKONOIJOY members from all three groups.
          </span>
        </button>

        <button
          className="mode-card"
          onClick={() => onSelectMode("songs")}
        >
          <span className="mode-card-icon">🎶</span>
          <span className="mode-card-title">Songs</span>
          <span className="mode-card-desc">
            Rank your favourite IKONOIJOY songs fetched from iTunes.
          </span>
        </button>
      </div>
    </div>
  );
}

export default ModeSelect;
