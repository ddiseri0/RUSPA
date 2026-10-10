import React from 'react';
import { Suit } from '../types/game';

interface SuitIconProps {
  suit: Suit;
  className?: string;
}

export const SuitIcon: React.FC<SuitIconProps> = React.memo(({ suit, className = 'w-5 h-5' }) => {
  switch (suit) {
    case 'denari':
      // Monetina Denari: Concentric rings and central dot (matching reference screenshot)
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`inline-block select-none shrink-0 ${className}`}
        >
          {/* Outer orange/amber ring */}
          <circle cx="12" cy="12" r="10" stroke="#D97706" strokeWidth="2.4" fill="#F59E0B" />
          {/* Inner ring */}
          <circle cx="12" cy="12" r="5.8" stroke="#D97706" strokeWidth="1.8" fill="#FBBF24" />
          {/* Center core */}
          <circle cx="12" cy="12" r="2.2" fill="#D97706" />
        </svg>
      );

    case 'coppe':
      // Coppe: Vibrant solid red chalice with bowl, stem, and base
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`inline-block select-none shrink-0 ${className}`}
        >
          {/* Chalice bowl with flat top */}
          <path d="M3.5 3.5h17v4c0 4.2-3.6 7.5-8.5 7.5s-8.5-3.3-8.5-7.5v-4z" fill="#DC2626" />
          {/* Highlight lip */}
          <path d="M4.5 4.5h15v1.2H4.5z" fill="#EF4444" />
          {/* Stem */}
          <rect x="10.5" y="14" width="3" height="4.5" fill="#B91C1C" />
          {/* Base */}
          <path d="M6 18.5h12v2a1 1 0 01-1 1H7a1 1 0 01-1-1v-2z" fill="#991B1B" />
        </svg>
      );

    case 'bastoni':
      // Bastoni: Dark wood club / clava with branch knots on both sides
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`inline-block select-none shrink-0 ${className}`}
        >
          {/* Main trunk */}
          <path
            d="M10 2.5c0-.8 1-.8 1-.8s1 0 1 .8l.8 6.5c.3 2.5 1 3.5 1 4.5v6.5c0 .6-.4 1-1 1h-2c-.6 0-1-.4-1-1v-6.5c0-1 .7-2 1-4.5L10 2.5z"
            fill="#78350F"
          />
          {/* Left branch knot */}
          <path d="M9.5 8c-2.4 0-3.6 1.5-3.6 2.5s1.4 2 3.6 1.2V8z" fill="#78350F" />
          {/* Right branch knot */}
          <path d="M14 13c2.4 0 3.6 1.4 3.6 2.4s-1.4 2-3.6 1.2v-3.6z" fill="#78350F" />
        </svg>
      );

    case 'spade':
      // Spade: Royal blue curved scimitar blade with guard
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`inline-block select-none shrink-0 ${className}`}
        >
          {/* Blade */}
          <path d="M12 2L8.5 13.5h7L12 2z" fill="#2563EB" />
          {/* Crossguard */}
          <rect x="6" y="14" width="12" height="2.2" rx="1" fill="#1D4ED8" />
          {/* Grip */}
          <rect x="11" y="16.2" width="2" height="3.8" rx="0.5" fill="#1E40AF" />
          {/* Pommel */}
          <circle cx="12" cy="21.2" r="1.6" fill="#1D4ED8" />
        </svg>
      );
  }
});
