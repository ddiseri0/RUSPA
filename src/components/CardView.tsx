import React from 'react';
import { Card, Suit } from '../types/game';
import { SuitIcon } from './SuitIcon';

interface CardViewProps {
  card: Card;
  selected?: boolean;
  targetSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const suitColorMap: Record<Suit, string> = {
  denari: 'text-amber-500',
  coppe: 'text-[#B91C1C]',
  spade: 'text-[#2563EB]',
  bastoni: 'text-[#78350F]',
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  selected = false,
  targetSelected = false,
  onClick,
  disabled = false,
  size = 'md',
}) => {
  const displayValue = card.value === 1 ? 'A' : card.value;
  const suitColor = suitColorMap[card.suit];

  // Proportions: Compact, shorter squircle cards (optimized for mobile & delicate overlapping)
  const sizeClasses = {
    sm: 'w-[52px] h-[72px] p-1.5 rounded-[12px]',
    md: 'w-[68px] sm:w-[78px] h-[94px] sm:h-[108px] p-2 rounded-[16px] sm:rounded-[18px]',
    lg: 'w-[82px] sm:w-[94px] h-[114px] sm:h-[130px] p-2.5 rounded-[18px] sm:rounded-[22px]',
  }[size];

  const valueTextSize = {
    sm: 'text-sm font-black',
    md: 'text-xl sm:text-2xl font-black',
    lg: 'text-2xl sm:text-3xl font-black',
  }[size];

  const suitIconSize = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4.5 h-4.5 sm:w-5 h-5',
    lg: 'w-6 h-6 sm:w-7 h-7',
  }[size];

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        relative select-none bg-white shrink-0
        shadow-[-5px_4px_16px_rgba(0,0,0,0.35),0_8px_20px_rgba(0,0,0,0.2)]
        border border-black/[0.04]
        transition-all duration-200 
        overflow-hidden
        ${sizeClasses}
        ${!disabled && onClick ? 'cursor-pointer hover:-translate-y-2.5 hover:shadow-[-8px_8px_24px_rgba(0,0,0,0.45),0_12px_28px_rgba(0,0,0,0.3)]' : ''}
        ${selected ? '-translate-y-2.5 sm:-translate-y-3.5 ring-3 ring-white shadow-[-8px_10px_28px_rgba(255,255,255,0.25),0_14px_32px_rgba(0,0,0,0.45)] scale-105' : ''}
        ${targetSelected ? '-translate-y-2.5 ring-3 ring-rose-500 shadow-[-6px_10px_28px_rgba(244,63,94,0.4),0_12px_28px_rgba(0,0,0,0.4)] scale-102' : ''}
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
      `}
      style={{
        fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* Top-Left: Number / Rank (Aligned cleanly in top-left corner) */}
      <div className={`absolute top-1.5 left-2 sm:top-2 sm:left-2.5 ${suitColor} leading-none text-left`}>
        <span className={`${valueTextSize} leading-none tracking-tight block select-none`}>
          {displayValue}
        </span>
      </div>

      {/* Bottom-Left: Suit Icon (Aligned cleanly in bottom-left corner) */}
      <div className="absolute bottom-1.5 left-2 sm:bottom-2 sm:left-2.5 flex items-center justify-center">
        <SuitIcon suit={card.suit} className={suitIconSize} />
      </div>

      {/* Settebello gold badge in Top-Right */}
      {card.isSettebello && (
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-amber-400 text-black text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full shadow border border-amber-300 uppercase tracking-wider">
          ★ 7B
        </div>
      )}
    </div>
  );
};
