import React from 'react';
import { Suit } from '../types/game';

interface SuitIconProps {
  suit: Suit;
  className?: string;
}

export const SuitIcon: React.FC<SuitIconProps> = ({ suit, className = 'w-6 h-6' }) => {
  switch (suit) {
    case 'denari':
      // Monetina Coin: Solid gleaming gold coin with concentric rings and solar notches
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`inline-block select-none ${className}`}
        >
          {/* Outer Gold Rim */}
          <circle cx="12" cy="12" r="10" fill="#F59E0B" />
          {/* Inner Coin Face */}
          <circle cx="12" cy="12" r="8" fill="#FBBF24" />
          {/* Concentric Embossed Ring */}
          <circle cx="12" cy="12" r="5.2" fill="#D97706" />
          {/* Center Shining Core */}
          <circle cx="12" cy="12" r="2.6" fill="#FEF3C7" />
          {/* 4 Cardinal Solar Notches */}
          <rect x="11.2" y="2.5" width="1.6" height="2.2" rx="0.8" fill="#D97706" />
          <rect x="11.2" y="19.3" width="1.6" height="2.2" rx="0.8" fill="#D97706" />
          <rect x="2.5" y="11.2" width="2.2" height="1.6" rx="0.8" fill="#D97706" />
          <rect x="19.3" y="11.2" width="2.2" height="1.6" rx="0.8" fill="#D97706" />
        </svg>
      );

    case 'coppe':
      // Coppe Rosse Scuro: Solid dark red elegant chalice / cup
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`inline-block select-none ${className}`}
        >
          {/* Cup Bowl */}
          <path
            d="M4 3.5h16v3c0 4.4-3.6 8-8 8s-8-3.6-8-8v-3z"
            fill="#B91C1C"
          />
          {/* Top Rim Highlight */}
          <path
            d="M5 4.5h14c0 0.8-0.7 1.5-1.5 1.5h-11C5.7 6 5 5.3 5 4.5z"
            fill="#DC2626"
          />
          {/* Stem */}
          <rect x="10.5" y="13.5" width="3" height="5" rx="1" fill="#991B1B" />
          {/* Base */}
          <path
            d="M7 19.5c0-0.8 0.7-1.5 1.5-1.5h7c0.8 0 1.5 0.7 1.5 1.5v1c0 0.6-0.4 1-1 1H8c-0.6 0-1-0.4-1-1v-1z"
            fill="#7F1D1D"
          />
        </svg>
      );

    case 'spade':
      // Spada Blu: Solid sharp royal blue sword with 3D bevel blade
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`inline-block select-none ${className}`}
        >
          {/* Blade Left Half */}
          <path d="M12 2L8.5 13.5h3.5V2z" fill="#2563EB" />
          {/* Blade Right Half (Highlight) */}
          <path d="M12 2v11.5h3.5L12 2z" fill="#3B82F6" />
          {/* Crossguard */}
          <rect x="6" y="14" width="12" height="2.2" rx="1" fill="#1D4ED8" />
          {/* Grip */}
          <rect x="11" y="16.2" width="2" height="3.8" rx="0.5" fill="#1E40AF" />
          {/* Pommel */}
          <circle cx="12" cy="21.2" r="1.6" fill="#1D4ED8" />
        </svg>
      );

    case 'bastoni':
      // Bastoni: Clava in legno nodosa con spine/nodi (wooden spiked war club)
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`inline-block select-none ${className}`}
        >
          {/* Main Club Body (Dark Shadow Left) */}
          <path
            d="M6.5 4.5C6.5 2.5 8.5 1.5 12 1.5s5.5 1 5.5 3l-1.2 8.5c-0.6 2.5-1.5 4-2.1 4.5v3h-4.4v-3c-0.6-0.5-1.5-2-2.1-4.5L6.5 4.5z"
            fill="#78350F"
          />
          {/* 3D Bevel Right Half (Warm Highlight) */}
          <path
            d="M12 1.5c3.5 0 5.5 1 5.5 3l-1.2 8.5c-0.6 2.5-1.5 4-2.1 4.5v3H12V1.5z"
            fill="#92400E"
          />
          {/* Top Dome Cap Highlight */}
          <ellipse cx="12" cy="3" rx="4.5" ry="1.4" fill="#B45309" />
          {/* Wooden Studs / Spikes (unmistakable Clava spikes) */}
          <polygon points="6,5.5 3.5,6.5 6.2,7.5" fill="#582B0A" />
          <polygon points="18,5.5 20.5,6.5 17.8,7.5" fill="#78350F" />
          <polygon points="6.5,9.5 4,10.5 6.8,11.5" fill="#582B0A" />
          <polygon points="17.5,9.5 20,10.5 17.2,11.5" fill="#78350F" />
          <polygon points="7.2,13.5 5,14.5 7.5,15.5" fill="#582B0A" />
          <polygon points="16.8,13.5 19,14.5 16.5,15.5" fill="#78350F" />
          {/* Handle Leather Grip Wraps */}
          <rect x="9.8" y="17.8" width="4.4" height="1.2" rx="0.4" fill="#3E1A04" />
          <rect x="9.8" y="19.4" width="4.4" height="1.2" rx="0.4" fill="#3E1A04" />
          {/* Pommel Cap */}
          <ellipse cx="12" cy="21.6" rx="3" ry="1.4" fill="#3E1A04" />
          <ellipse cx="12" cy="21.3" rx="2.2" ry="0.9" fill="#78350F" />
        </svg>
      );
  }
};
