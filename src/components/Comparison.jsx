import React from "react";

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

function Comparison({ pair, onChoice, progress }) {
  const percentage = progress.total
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

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
    </div>
  );
}

export default Comparison;
