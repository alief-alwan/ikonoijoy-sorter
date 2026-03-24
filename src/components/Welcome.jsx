import React, { useState } from "react";

function Welcome({ songs, onStart }) {
  const groups = [...new Set(songs.map((s) => s.group))];
  const [selectedGroups, setSelectedGroups] = useState(new Set(groups));

  const toggleGroup = (group) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const filteredSongs = songs.filter((s) => selectedGroups.has(s.group));

  return (
    <div className="welcome">
      <h2>Welcome!</h2>
      <p>
        Rank IKONOIJOY songs by choosing your favorite — two at a time.
        <br />
        Select which groups to include:
      </p>

      <div className="group-filters">
        {groups.map((group) => (
          <label key={group} className="group-checkbox">
            <input
              type="checkbox"
              checked={selectedGroups.has(group)}
              onChange={() => toggleGroup(group)}
            />
            {group}
          </label>
        ))}
      </div>

      <p className="song-count">{filteredSongs.length} songs selected</p>

      <button
        className="btn-start"
        onClick={() => onStart(filteredSongs)}
        disabled={filteredSongs.length < 2}
      >
        Start Sorting!
      </button>
    </div>
  );
}

export default Welcome;
