import React from "react";

function Results({ results, onRestart }) {
  return (
    <div className="results">
      <h2>🏆 Your Ranking</h2>

      <ol className="results-list">
        {results.map((song, index) => (
          <li key={song.id} className="result-item">
            <span className="rank">#{index + 1}</span>
            {song.coverArt && (
              <img
                className="result-album-art"
                src={song.coverArt}
                alt={song.title}
              />
            )}
            <div className="result-info">
              <span className="song-title">{song.title}</span>
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

      <button className="btn-restart" onClick={onRestart}>
        Sort Again
      </button>
    </div>
  );
}

export default Results;
