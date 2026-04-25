// NVB Birkenfeld GmbH — Logo-Recreation als SVG (basierend auf nvbir.de Branding)

export function NvbLogo({
  height = 40,
  showWordmark = true,
}: {
  height?: number;
  showWordmark?: boolean;
}) {
  // Aspect ratio ~3.5:1 fuer Wordmark, ~1:1 fuer Mark only
  const aspect = showWordmark ? 3.5 : 1;
  const width = height * aspect;

  return (
    <svg
      viewBox={`0 0 ${showWordmark ? 280 : 80} 80`}
      height={height}
      width={width}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="NVB Birkenfeld GmbH"
    >
      {/* NVB letters (blue) */}
      <text
        x="0"
        y="44"
        fontFamily="'Inter Tight', system-ui, sans-serif"
        fontSize="36"
        fontWeight="700"
        fill="#1e3a5f"
        letterSpacing="-0.5"
      >
        NVB
      </text>

      {/* Road symbol (3 perspective lines like highway) */}
      <g transform="translate(80, 16)">
        {/* Outer left line */}
        <path
          d="M 6 40 Q 18 30 36 26 L 38 28 Q 22 32 10 42 Z"
          fill="#1e3a5f"
        />
        {/* Center dashed line */}
        <path
          d="M 18 38 L 22 36 M 26 33 L 30 31 M 32 29 L 36 28"
          stroke="#9ca3af"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Outer right line */}
        <path
          d="M 14 46 Q 28 36 42 32 L 44 34 Q 30 38 18 48 Z"
          fill="#9ca3af"
          opacity="0.7"
        />
      </g>

      {showWordmark && (
        <>
          {/* Birkenfeld */}
          <text
            x="138"
            y="38"
            fontFamily="'Inter Tight', system-ui, sans-serif"
            fontSize="30"
            fontWeight="500"
            fill="#6b7280"
            letterSpacing="-0.3"
          >
            Birkenfeld
          </text>

          {/* GmbH */}
          <text
            x="248"
            y="56"
            fontFamily="'Inter Tight', system-ui, sans-serif"
            fontSize="14"
            fontWeight="500"
            fill="#9ca3af"
            letterSpacing="0.2"
          >
            GmbH
          </text>

          {/* Underlines (left + right) */}
          <line x1="0" y1="68" x2="68" y2="68" stroke="#1e3a5f" strokeWidth="1" />
          <line x1="138" y1="68" x2="276" y2="68" stroke="#9ca3af" strokeWidth="1" />
        </>
      )}
    </svg>
  );
}

// Compact mark-only Version (fuer Sidebar collapsed, Avatar etc.)
export function NvbMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 80 80"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="80" height="80" rx="14" fill="#1e3a5f" />
      <text
        x="40"
        y="50"
        textAnchor="middle"
        fontFamily="'Inter Tight', system-ui, sans-serif"
        fontSize="28"
        fontWeight="700"
        fill="#ffffff"
        letterSpacing="-0.5"
      >
        NVB
      </text>
      <line x1="20" y1="60" x2="60" y2="60" stroke="#d97706" strokeWidth="2" />
    </svg>
  );
}
