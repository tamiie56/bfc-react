interface Props {
  /** beak flaps while the bot is "talking" */
  talking?: boolean;
  className?: string;
}

const INK = "#1b1209";

/** Chicky - full-body cartoon chicken that waves "hi" and blows a flying kiss (flat colours, no gradients). */
export default function Mascot({ talking = false, className }: Props) {
  return (
    <svg
      className={`mascot mascot--full ${talking ? "is-talking" : ""} ${className ?? ""}`}
      viewBox="0 0 140 170"
      role="img"
      aria-label="Chicky the chicken"
    >
      <ellipse cx="70" cy="164" rx="30" ry="4" fill="#000" opacity="0.18" />

      <g className="mascot__bob">
        {/* legs + feet */}
        <g stroke={INK} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M58 138 V157 M58 157 L48 161 M58 157 V163 M58 157 L68 161" strokeWidth="9" />
          <path d="M82 138 V157 M82 157 L72 161 M82 157 V163 M82 157 L92 161" strokeWidth="9" />
        </g>
        <g stroke="#f29a00" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M58 138 V157 M58 157 L48 161 M58 157 V163 M58 157 L68 161" strokeWidth="4" />
          <path d="M82 138 V157 M82 157 L72 161 M82 157 V163 M82 157 L92 161" strokeWidth="4" />
        </g>

        {/* body */}
        <ellipse cx="70" cy="110" rx="38" ry="34" fill="#fff" stroke={INK} strokeWidth="3.5" />
        <ellipse cx="70" cy="114" rx="23" ry="21" fill="#fff1d6" />

        {/* resting wing (left) */}
        <ellipse cx="31" cy="110" rx="11" ry="22" transform="rotate(14 31 110)" fill="#fff" stroke={INK} strokeWidth="3.5" />

        {/* waving / kissing wing (right) */}
        <g className="mascot__wing">
          <ellipse cx="109" cy="110" rx="11" ry="22" transform="rotate(-14 109 110)" fill="#fff" stroke={INK} strokeWidth="3.5" />
        </g>

        {/* comb */}
        <g fill="#e4160a" stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
          <circle cx="57" cy="24" r="9" />
          <circle cx="70" cy="19" r="10" />
          <circle cx="83" cy="24" r="9" />
        </g>

        {/* head */}
        <circle cx="70" cy="58" r="33" fill="#fff" stroke={INK} strokeWidth="3.5" />
        <circle cx="48" cy="64" r="5.5" fill="#ff9d8f" />
        <circle cx="92" cy="64" r="5.5" fill="#ff9d8f" />

        {/* eyes: open (blinks) and happy ^ ^ (while kissing) */}
        <g className="mascot__eyes" fill={INK}>
          <ellipse className="mascot__eye" cx="57" cy="52" rx="4.6" ry="5.6" />
          <ellipse className="mascot__eye" cx="83" cy="52" rx="4.6" ry="5.6" />
        </g>
        <g className="mascot__happy" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
          <path d="M51 53 Q57 45 63 53" />
          <path d="M77 53 Q83 45 89 53" />
        </g>

        {/* wattle + beak */}
        <path d="M65 76 Q70 92 75 76 Z" fill="#e4160a" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path className="mascot__beak-low" d="M62 70 Q70 82 78 70 Z" fill="#f29a00" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M57 62 Q70 56 83 62 Q70 78 57 62 Z" fill="#ffc80a" stroke={INK} strokeWidth="3" strokeLinejoin="round" />

        {/* flying kiss */}
        <g transform="translate(70 76)">
          <g className="mascot__heart">
            <path
              d="M0 -4 C-5 -12 -16 -5 -9 4 L0 13 L9 4 C16 -5 5 -12 0 -4 Z"
              fill="#e4160a"
              stroke={INK}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}

/** Round head-only version for small avatars. */
export function MascotHead({ talking = false }: { talking?: boolean }) {
  return (
    <svg className={`mascot ${talking ? "is-talking" : ""}`} viewBox="8 0 104 112" role="img" aria-label="Chicky">
      <g fill="#e4160a" stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
        <circle cx="46" cy="22" r="12" />
        <circle cx="60" cy="15" r="13" />
        <circle cx="74" cy="22" r="12" />
      </g>
      <circle cx="60" cy="64" r="42" fill="#fff" stroke={INK} strokeWidth="3.5" />
      <circle cx="34" cy="72" r="7" fill="#ff9d8f" />
      <circle cx="86" cy="72" r="7" fill="#ff9d8f" />
      <g fill={INK}>
        <ellipse className="mascot__eye" cx="44" cy="56" rx="5.5" ry="6.5" />
        <ellipse className="mascot__eye" cx="76" cy="56" rx="5.5" ry="6.5" />
      </g>
      <circle cx="46" cy="53.5" r="1.8" fill="#fff" />
      <circle cx="78" cy="53.5" r="1.8" fill="#fff" />
      <path d="M54 82 Q60 104 66 82 Z" fill="#e4160a" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path className="mascot__beak-low" d="M51 76 Q60 90 69 76 Z" fill="#f29a00" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M45 64 Q60 58 75 64 Q60 82 45 64 Z" fill="#ffc80a" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
