import React, { useEffect, useCallback } from "react";

function SongCard({ song, side, onChoice }) {
  return (
    <div className="song-card-wrapper">
      <button className="song-card" onClick={() => onChoice(side)}>
        {song.coverArt && (
          <img
            className="album-art"
            src={song.coverArt}
            alt={song.title}
          />
        )}
        <span className="song-title">{song.title}</span>
        {song.romajiTitle && (
          <span className="song-romaji">{song.romajiTitle}</span>
        )}
        <span className="song-group">{song.group}</span>
      </button>
      {song.previewUrl && (
        <audio
          className="preview-audio"
          src={song.previewUrl}
          controls
          preload="none"
          aria-label={`Preview: ${song.title}`}
        />
      )}
    </div>
  );
}

function Comparison({ pair, onChoice, onUndo, canUndo, progress }) {
  const percentage = progress.total
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const handleSkip = useCallback(() => {
    onChoice(Math.random() < 0.5 ? "left" : "right");
  }, [onChoice]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
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

      <h2>Which song do you prefer?</h2>

      <div className="matchup">
        <SongCard song={pair.left} side="left" onChoice={onChoice} />
        <span className="vs">VS</span>
        <SongCard song={pair.right} side="right" onChoice={onChoice} />
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

export default Comparison;
