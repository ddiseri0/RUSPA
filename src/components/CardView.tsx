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
  rotation?: number;
}

const suitColorMap: Record<Suit, string> = {
  denari: 'text-[#D97706]',
  coppe: 'text-[#DC2626]',
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
  rotation = 0,
}) => {
  const displayValue = card.value;
  const suitColor = suitColorMap[card.suit];

  const sizeClasses = {
    sm: 'w-[52px] h-[72px] p-1.5 rounded-[12px]',
    md: 'w-[68px] sm:w-[74px] h-[94px] sm:h-[102px] p-2 rounded-[16px]',
    lg: 'w-[84px] sm:w-[94px] h-[120px] sm:h-[132px] p-2 sm:p-2.5 rounded-[18px]',
  }[size];

  const valueTextSize = {
    sm: 'text-base font-extrabold',
    md: 'text-2xl font-black',
    lg: 'text-3xl font-black',
  }[size];

  const suitIconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      style={{
        transform: selected
          ? 'translateY(-22px) scale(1.02) rotate(0deg)'
          : targetSelected
          ? 'translateY(-8px) scale(1.02)'
          : `rotate(${rotation}deg)`,
        fontFamily: "'Outfit', 'Plus Jakarta Sans', -apple-system, sans-serif",
      }}
      className={`
        relative select-none shrink-0
        ${disabled ? 'bg-[#d9d9d9] cursor-not-allowed' : 'bg-[#f2f2f2]'}
        shadow-[-3px_4px_14px_rgba(0,0,0,0.35)]
        border border-black/[0.08]
        transition-all duration-200 
        overflow-hidden
        ${sizeClasses}
        ${!disabled && onClick ? 'cursor-pointer hover:shadow-[-5px_8px_20px_rgba(0,0,0,0.4)]' : ''}
        ${selected ? 'ring-3 ring-[#e3e700] shadow-[0_0_25px_rgba(227,231,0,0.85)] z-30' : ''}
        ${targetSelected ? 'ring-3 ring-[#e3e700] shadow-[0_0_20px_rgba(227,231,0,0.8)]' : ''}
      `}
    >
      {/* Top-Left: Number / Rank with Suit Icon directly underneath */}
      <div className={`absolute top-1.5 left-2 sm:top-2 sm:left-2 flex flex-col items-center ${disabled ? 'opacity-85 filter grayscale-[30%]' : ''}`}>
        <span className={`${valueTextSize} ${suitColor} leading-none tracking-tight block select-none`}>
          {displayValue}
        </span>
        <div className="mt-1">
          <SuitIcon suit={card.suit} className={suitIconSize} />
        </div>
      </div>

      {/* Bottom-Right: Second Suit Icon */}
      <div className={`absolute bottom-1.5 right-2 sm:bottom-2 sm:right-2 flex items-center justify-center ${disabled ? 'opacity-85 filter grayscale-[30%]' : ''}`}>
        <SuitIcon suit={card.suit} className={suitIconSize} />
      </div>

      {/* Settebello badge in Top-Right if applicable */}
      {card.isSettebello && (
        <div className="absolute top-1.5 right-1.5 bg-[#000000] text-[#e3e700] text-[8px] font-black px-1.5 py-0.5 rounded-full shadow border border-[#e3e700]/60 uppercase tracking-wider">
          ★ 7B
        </div>
      )}
    </div>
  );
};
