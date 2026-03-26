import React, { useState, useMemo } from "react";

const QUICK_MODE_MIN = 5;
const QUICK_MODE_DEFAULT = 20;

function shuffleSample(array, count) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function Welcome({ songs, onStart }) {
  const groups = useMemo(() => [...new Set(songs.map((s) => s.group))], [songs]);
  const [selectedGroups, setSelectedGroups] = useState(new Set(groups));
  const [userName, setUserName] = useState("");
  const [quickMode, setQuickMode] = useState(false);
  const [maxSongs, setMaxSongs] = useState(QUICK_MODE_DEFAULT);

  const toggleGroup = (group) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const selectAll = () => setSelectedGroups(new Set(groups));
  const deselectAll = () => setSelectedGroups(new Set());
  const allSelected = groups.length > 0 && groups.every((g) => selectedGroups.has(g));

  const songsPerGroup = useMemo(() => {
    const counts = {};
    for (const group of groups) {
      counts[group] = songs.filter((s) => s.group === group).length;
    }
    return counts;
  }, [songs, groups]);

  const filteredSongs = songs.filter((s) => selectedGroups.has(s.group));
  const sliderMax = Math.max(QUICK_MODE_MIN, filteredSongs.length);
  const clampedMax = Math.min(maxSongs, filteredSongs.length);

  const handleStart = () => {
    let pool = filteredSongs;
    if (quickMode && filteredSongs.length > maxSongs) {
      pool = shuffleSample(filteredSongs, maxSongs);
    }
    onStart(pool, userName.trim());
  };

  return (
    <div className="welcome">
      <h2>Welcome!</h2>
      <p>
        Rank IKONOIJOY songs by choosing your favorite — two at a time.
      </p>

      <div className="name-input-wrapper">
        <input
          type="text"
          className="name-input"
          placeholder="Enter your name (optional)"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          maxLength={30}
        />
      </div>

      <p>Select which groups to include:</p>

      <div className="select-all-row">
        <button
          className="btn-select-toggle"
          onClick={selectAll}
          disabled={allSelected}
        >
          Select All
        </button>
        <button
          className="btn-select-toggle"
          onClick={deselectAll}
          disabled={selectedGroups.size === 0}
        >
          Deselect All
        </button>
      </div>

      <div className="group-filters">
        {groups.map((group) => (
          <label key={group} className="group-checkbox">
            <input
              type="checkbox"
              checked={selectedGroups.has(group)}
              onChange={() => toggleGroup(group)}
            />
            {group}
            <span className="group-song-count">({songsPerGroup[group]})</span>
          </label>
        ))}
      </div>

      <p className="song-count">
        {quickMode && filteredSongs.length > maxSongs
          ? `${clampedMax} of ${filteredSongs.length} songs will be randomly selected`
          : `${filteredSongs.length} songs selected`}
      </p>

      <div className="quick-mode-section">
        <label className="quick-mode-toggle">
          <input
            type="checkbox"
            checked={quickMode}
            onChange={(e) => setQuickMode(e.target.checked)}
          />
          ⚡ Quick Mode
          <span className="quick-mode-hint">randomly sample a smaller set</span>
        </label>

        {quickMode && (
          <div className="quick-mode-slider-wrapper">
            <span className="slider-label">
              Max songs: <strong>{clampedMax}</strong>
            </span>
            <input
              type="range"
              className="quick-mode-slider"
              min={QUICK_MODE_MIN}
              max={sliderMax}
              value={Math.min(maxSongs, sliderMax)}
              onChange={(e) => setMaxSongs(Number(e.target.value))}
            />
          </div>
        )}
      </div>

      <button
        className="btn-start"
        onClick={handleStart}
        disabled={filteredSongs.length < 2}
      >
        Start Sorting!
      </button>
    </div>
  );
}

export default Welcome;
