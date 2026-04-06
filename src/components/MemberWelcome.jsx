import React, { useState, useMemo } from "react";

const GROUP_COLORS = {
  "=LOVE": "#e94560",
  "≠ME": "#8b5cf6",
  "≒JOY": "#f59e0b",
};

function MemberWelcome({ members, onStart, onBack }) {
  const groups = useMemo(
    () => [...new Set(members.map((m) => m.group))],
    [members]
  );
  const [selectedGroups, setSelectedGroups] = useState(new Set(groups));
  const [userName, setUserName] = useState("");

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

  const membersPerGroup = useMemo(() => {
    const counts = {};
    for (const m of members) {
      counts[m.group] = (counts[m.group] || 0) + 1;
    }
    return counts;
  }, [members]);

  const filteredMembers = members.filter((m) => selectedGroups.has(m.group));

  const handleStart = () => {
    onStart(filteredMembers, userName.trim());
  };

  return (
    <div className="welcome">
      <h2>Member Sorter</h2>
      <p>Rank IKONOIJOY members by choosing your favourite — two at a time.</p>

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
            <span style={{ color: GROUP_COLORS[group] }}>{group}</span>
            <span className="group-song-count">
              ({membersPerGroup[group]} members)
            </span>
          </label>
        ))}
      </div>

      <p className="song-count">{filteredMembers.length} members selected</p>

      <button
        className="btn-start"
        onClick={handleStart}
        disabled={filteredMembers.length < 2}
      >
        Start Sorting!
      </button>

      <button className="btn-back" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}

export default MemberWelcome;
