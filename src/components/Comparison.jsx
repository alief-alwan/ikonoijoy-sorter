import React from "react";

function Comparison({ pair, onChoice, progress }) {
  const percentage = progress.total
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="comparison">
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${percentage}%` }} />
      </div>
      <p className="progress-text">
        Comparison {progress.current + 1} / ~{progress.total} ({percentage}%)
      </p>

      <h2>Which song do you prefer?</h2>

      <div className="matchup">
        <button className="song-card" onClick={() => onChoice("left")}>
          {pair.left.albumArt && (
            <img
              className="album-art"
              src={pair.left.albumArt}
              alt={pair.left.album}
            />
          )}
          <span className="song-title">{pair.left.title}</span>
          <span className="song-group">{pair.left.group}</span>
          <span className="song-album">{pair.left.album}</span>
        </button>

        <span className="vs">VS</span>

        <button className="song-card" onClick={() => onChoice("right")}>
          {pair.right.albumArt && (
            <img
              className="album-art"
              src={pair.right.albumArt}
              alt={pair.right.album}
            />
          )}
          <span className="song-title">{pair.right.title}</span>
          <span className="song-group">{pair.right.group}</span>
          <span className="song-album">{pair.right.album}</span>
        </button>
      </div>
    </div>
  );
}

export default Comparison;
