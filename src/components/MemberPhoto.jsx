import React, { useState } from "react";

function MemberPhoto({ member, imgClassName, placeholderClassName, placeholderStyle }) {
  const [failed, setFailed] = useState(false);
  const src = member.photo || `members/${member.id}.jpg`;
  const label =
    (member.name && member.name !== member.romaji
      ? member.name
      : member.romaji || ""
    ).charAt(0) || "?";

  if (failed) {
    return (
      <div className={placeholderClassName} style={placeholderStyle}>
        {label}
      </div>
    );
  }

  return (
    <img
      className={imgClassName}
      src={src}
      alt={member.romaji || member.name}
      onError={() => setFailed(true)}
    />
  );
}

export default MemberPhoto;
