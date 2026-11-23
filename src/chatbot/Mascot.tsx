interface Props {
  /** beak flaps while the bot is "talking" */
  talking?: boolean;
  className?: string;
}

const INK = "#1b1209";
const RED = "#e4160a";

/** The rooster's head. With `kiss` it also gets the happy "^ ^" eyes and the flying heart. */
function Head({ kiss = false }: { kiss?: boolean }) {
  return (
    <>
      {/* comb */}
      <g fill={RED} stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
        <circle cx="64" cy="28" r="8" />
        <circle cx="74" cy="19" r="10" />
        <circle cx="87" cy="19" r="10" />
        <circle cx="97" cy="28" r="8" />
      </g>
      <circle cx="80" cy="56" r="28" fill="#fff" stroke={INK} strokeWidth="3.5" />
      <circle cx="57" cy="62" r="4.5" fill="#ff9d8f" />
      <circle cx="103" cy="62" r="4.5" fill="#ff9d8f" />

      {/* eyes */}
      <g className={kiss ? "mascot__eyes" : undefined}>
        <ellipse cx="68" cy="47" rx="6" ry="7.5" fill="#fff" stroke={INK} strokeWidth="2" />
        <ellipse cx="92" cy="47" rx="6" ry="7.5" fill="#fff" stroke={INK} strokeWidth="2" />
        <g className="mascot__look" fill={INK}>
          <ellipse className="mascot__eye" cx="68" cy="48" rx="3.2" ry="4.4" />
          <ellipse className="mascot__eye" cx="92" cy="48" rx="3.2" ry="4.4" />
        </g>
        <g fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round">
          <path d="M60 37 Q68 32 75 37" />
          <path d="M85 37 Q92 32 100 37" />
        </g>
      </g>
      {kiss && (
        <g className="mascot__happy" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
          <path d="M62 49 Q68 41 74 49" />
          <path d="M86 49 Q92 41 98 49" />
        </g>
      )}

      {/* wattle + beak */}
      <path d="M74 76 Q80 98 86 76 Z" fill={RED} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path className="mascot__beak-low" d="M69 67 Q80 83 91 67 Z" fill="#f29a00" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M63 58 Q80 50 97 58 Q80 78 63 58 Z" fill="#ffc80a" stroke={INK} strokeWidth="3" strokeLinejoin="round" />

      {kiss && (
        <g transform="translate(80 74)">
          <g className="mascot__heart">
            <path
              d="M0 -4 C-5 -12 -16 -5 -9 4 L0 13 L9 4 C16 -5 5 -12 0 -4 Z"
              fill={RED}
              stroke={INK}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </g>
        </g>
      )}
    </>
  );
}

const FEATHERS = [
  { a: 16, fill: "#c20d00", tip: 62 },
  { a: 38, fill: RED, tip: 58 },
  { a: 60, fill: "#c20d00", tip: 64 },
  { a: 80, fill: RED, tip: 74 },
];

/**
 * Chicky - an original full-body cartoon rooster (flat colours, no gradients).
 * Idle: breathing, head sway, swishing tail, irregular blinks. Every ~9s: waves "hi", then blows a flying kiss.
 */
export default function Mascot({ talking = false, className }: Props) {
  return (
    <svg
      className={`mascot mascot--full ${talking ? "is-talking" : ""} ${className ?? ""}`}
      viewBox="0 0 180 222"
      role="img"
      aria-label="Chicky the rooster"
    >
      <ellipse cx="80" cy="213" rx="36" ry="5" fill="#000" opacity="0.18" />

      {/* tail feathers (behind the body) */}
      {FEATHERS.map((f, i) => (
        <g key={f.a} transform={`rotate(${f.a} 108 152)`}>
          <g className={`mascot__tail mascot__tail--${i + 1}`}>
            <path
              d={`M108 152 C96 130 96 ${f.tip + 30} 112 ${f.tip} C126 ${f.tip + 30} 124 130 108 152 Z`}
              fill={f.fill}
              stroke={INK}
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <path d={`M108 150 Q110 ${f.tip + 40} 112 ${f.tip + 12}`} fill="none" stroke="#8f0a00" strokeWidth="2" strokeLinecap="round" />
          </g>
        </g>
      ))}

      {/* legs + feet */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g stroke={INK} strokeWidth="11">
          <path d="M68 172 V204 M68 204 L52 211 M68 204 V212 M68 204 L84 211" />
          <path d="M94 172 V204 M94 204 L78 211 M94 204 V212 M94 204 L110 211" />
        </g>
        <g stroke="#f29a00" strokeWidth="5.5">
          <path d="M68 172 V204 M68 204 L52 211 M68 204 V212 M68 204 L84 211" />
          <path d="M94 172 V204 M94 204 L78 211 M94 204 V212 M94 204 L110 211" />
        </g>
      </g>

      <g className="mascot__breathe">
        {/* body + neck */}
        <path
          d="M60 72 C58 90 40 96 38 124 C36 156 54 178 80 178 C106 178 124 156 122 124 C120 96 102 90 100 72 Z"
          fill="#fff"
          stroke={INK}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <g fill="none" stroke="#e2d6c6" strokeWidth="2.5" strokeLinecap="round">
          <path d="M62 112 Q68 120 74 112 Q80 120 86 112 Q92 120 98 112" />
          <path d="M58 130 Q65 138 72 130 Q80 138 88 130 Q95 138 102 130" />
          <path d="M64 148 Q72 156 80 148 Q88 156 96 148" />
        </g>

        {/* resting wing */}
        <path
          d="M46 100 C32 106 26 126 30 150 L36 146 L40 154 L46 146 L52 152 C56 130 54 110 46 100 Z"
          fill="#fff"
          stroke={INK}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        <g className="mascot__neck">
          <g className="mascot__head">
            <Head kiss />
          </g>
        </g>

        {/* waving / kissing wing - drawn last so it passes in front of the face */}
        <g className="mascot__wing">
          <path
            d="M114 100 C128 106 134 126 130 150 L124 146 L120 154 L114 146 L108 152 C104 130 106 110 114 100 Z"
            fill="#fff"
            stroke={INK}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}

/** Round head-only version for small avatars. */
export function MascotHead({ talking = false }: { talking?: boolean }) {
  return (
    <svg className={`mascot ${talking ? "is-talking" : ""}`} viewBox="46 4 68 90" role="img" aria-label="Chicky">
      <Head />
    </svg>
  );
}
