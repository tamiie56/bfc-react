interface Props {
  /** beak flaps while the bot is "talking" */
  talking?: boolean;
  className?: string;
}

/** Chicky - an original flat-colour chicken mascot (no gradients). */
export default function Mascot({ talking = false, className }: Props) {
  return (
    <svg
      className={`mascot ${talking ? "is-talking" : ""} ${className ?? ""}`}
      viewBox="8 0 104 112"
      role="img"
      aria-label="Chicky the chicken"
    >
      {/* comb */}
      <g fill="#e4160a" stroke="#1b1209" strokeWidth="3.5" strokeLinejoin="round">
        <circle cx="46" cy="22" r="12" />
        <circle cx="60" cy="15" r="13" />
        <circle cx="74" cy="22" r="12" />
      </g>
      {/* head */}
      <circle cx="60" cy="64" r="42" fill="#fff" stroke="#1b1209" strokeWidth="3.5" />
      {/* cheeks */}
      <circle cx="34" cy="72" r="7" fill="#ff9d8f" />
      <circle cx="86" cy="72" r="7" fill="#ff9d8f" />
      {/* eyes */}
      <g className="mascot__eyes" fill="#1b1209">
        <ellipse className="mascot__eye" cx="44" cy="56" rx="5.5" ry="6.5" />
        <ellipse className="mascot__eye" cx="76" cy="56" rx="5.5" ry="6.5" />
      </g>
      <circle cx="46" cy="53.5" r="1.8" fill="#fff" />
      <circle cx="78" cy="53.5" r="1.8" fill="#fff" />
      {/* wattle */}
      <path d="M54 82 Q60 104 66 82 Z" fill="#e4160a" stroke="#1b1209" strokeWidth="3" strokeLinejoin="round" />
      {/* beak */}
      <path className="mascot__beak-low" d="M51 76 Q60 90 69 76 Z" fill="#f29a00" stroke="#1b1209" strokeWidth="3" strokeLinejoin="round" />
      <path d="M45 64 Q60 58 75 64 Q60 82 45 64 Z" fill="#ffc80a" stroke="#1b1209" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
