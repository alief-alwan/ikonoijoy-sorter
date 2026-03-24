import React from "react";

function Results({ results, onRestart }) {
  return (
    <div className="results">
      <h2>🏆 Your Ranking</h2>

      <ol className="results-list">
        {results.map((song, index) => (
          <li key={song.id} className="result-item">
            <span className="rank">#{index + 1}</span>
            {song.albumArtSmall && (
              <img
                className="result-album-art"
                src={song.albumArtSmall}
                alt={song.album}
              />
            )}
            <div className="result-info">
              <span className="song-title">{song.title}</span>
              <span className="song-meta">
                {song.group} · {song.album}
              </span>
            </div>
            {song.spotifyUrl && (
              <a
                className="spotify-link"
                href={song.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Spotify"
              >
                🎧
              </a>
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
