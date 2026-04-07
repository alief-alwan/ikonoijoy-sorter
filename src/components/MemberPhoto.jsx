import React, { useState } from "react";

function romajiSlug(romaji) {
  return (romaji || "").toLowerCase().replace(/\s+/g, "_");
}

function buildCandidates(member) {
  const slug = romajiSlug(member.romaji);
  const candidates = [];
  if (slug) candidates.push(`members/${slug}.jpg`);
  candidates.push(`members/${member.id}.jpg`);
  if (member.photo) candidates.push(member.photo);
  return candidates;
}

function MemberPhoto({ member, imgClassName, placeholderClassName, placeholderStyle }) {
  const candidates = buildCandidates(member);
  const [index, setIndex] = useState(0);
  const displayName =
    member.name && member.name !== member.romaji ? member.name : member.romaji || "";
  const label = displayName.charAt(0) || "?";

  if (index >= candidates.length) {
    return (
      <div className={placeholderClassName} style={placeholderStyle}>
        {label}
      </div>
    );
  }

  return (
    <img
      className={imgClassName}
      src={candidates[index]}
      alt={member.romaji || member.name}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

export default MemberPhoto;
