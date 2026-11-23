import React from 'react';

interface PebbleLogoProps {
  className?: string;
}

export const PebbleLogo: React.FC<PebbleLogoProps> = ({ className = 'w-full max-w-[380px] h-auto' }) => {
  return (
    <svg
      viewBox="0 0 420 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Pebble"
    >
      {/* Subtle tiny animated sprout creature perched above the second B */}
      <g transform="translate(212, 8)">
        {/* Stem & twin leaves */}
        <path
          d="M22 24 C22 14, 15 10, 8 11 C10 19, 16 22, 22 24 Z"
          fill="#52B788"
          stroke="#141B20"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M22 24 C24 12, 33 7, 39 10 C37 18, 29 22, 22 24 Z"
          fill="#74C69D"
          stroke="#141B20"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {/* Cozy pebble body peeking over letter */}
        <path
          d="M6 38 C6 25, 13 20, 22 20 C31 20, 38 25, 38 38 Z"
          fill="#EAE4D7"
          stroke="#141B20"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        {/* Expressive eyes & rosy cheek */}
        <circle cx="16" cy="31" r="2.2" fill="#182026" />
        <circle cx="28" cy="31" r="2.2" fill="#182026" />
        <ellipse cx="11.5" cy="34" rx="2.4" ry="1.3" fill="#E86A33" opacity="0.65" />
        <ellipse cx="32.5" cy="34" rx="2.4" ry="1.3" fill="#E86A33" opacity="0.65" />
        <path
          d="M20 33.5 Q22 35.8 24 33.5"
          stroke="#182026"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* Bespoke geometric display wordmark */}
      <g>
        {/* Warm offset architectural drop shadow */}
        <text
          x="10"
          y="108"
          fontFamily="'Bricolage Grotesque', sans-serif"
          fontWeight="700"
          fontSize="84"
          letterSpacing="-0.03em"
          fill="#0E1418"
        >
          PEBBLE
        </text>
        {/* Main cream wordmark */}
        <text
          x="6"
          y="104"
          fontFamily="'Bricolage Grotesque', sans-serif"
          fontWeight="700"
          fontSize="84"
          letterSpacing="-0.03em"
          fill="#F4F1EA"
          stroke="#141B20"
          strokeWidth="2"
          paintOrder="stroke"
        >
          PEBBLE
        </text>
      </g>

      {/* Minimalist persimmon underline accent bar */}
      <rect x="8" y="116" width="112" height="5" rx="2.5" fill="#E86A33" />
      <rect x="128" y="116" width="24" height="5" rx="2.5" fill="#52B788" />
    </svg>
  );
};

interface PebbleIconProps {
  className?: string;
}

export const PebbleIcon: React.FC<PebbleIconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <rect x="1" y="1" width="30" height="30" rx="8" fill="#1F2B32" stroke="#364752" strokeWidth="1.5" />
    <path d="M16 11 C16 6, 11.5 5, 9 6.5 C10 10, 13 11, 16 11 Z" fill="#52B788" />
    <path d="M16 11 C17.5 5.5, 22 4.5, 24 7 C22.5 10.5, 19 11.5, 16 11 Z" fill="#74C69D" />
    <ellipse cx="16" cy="19.5" rx="8.5" ry="7" fill="#EAE4D7" />
    <circle cx="13" cy="18.8" r="1.35" fill="#182026" />
    <circle cx="19" cy="18.8" r="1.35" fill="#182026" />
    <circle cx="10.8" cy="20.6" r="1.2" fill="#E86A33" opacity="0.65" />
    <circle cx="21.2" cy="20.6" r="1.2" fill="#E86A33" opacity="0.65" />
    <path d="M14.8 20.8 Q16 22 17.2 20.8" stroke="#182026" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
