import React from 'react';

interface CardBackProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isPendingDoubt?: boolean;
}

export const CardBack: React.FC<CardBackProps> = React.memo(
  ({ size = 'md', className = '', isPendingDoubt = false }) => {
    const sizeClasses = {
      sm: 'w-[52px] h-[72px] p-1 rounded-[12px]',
      md: 'w-[68px] sm:w-[78px] h-[94px] sm:h-[108px] p-1.5 rounded-[16px] sm:rounded-[18px]',
      lg: 'w-[82px] sm:w-[94px] h-[114px] sm:h-[130px] p-2 rounded-[18px] sm:rounded-[22px]',
    }[size];

    return (
      <div
        className={`
        relative select-none bg-[#262626] border border-[#383838] shrink-0
        shadow-2xl transition-all duration-300
        flex items-center justify-center overflow-hidden
        ${sizeClasses}
        ${isPendingDoubt ? 'ring-2 ring-[#e3e700] shadow-[0_0_20px_rgba(227,231,0,0.7)] animate-pulse' : ''}
        ${className}
      `}
      >
        {/* Matte micro-grid pattern */}
        <div
          className="absolute inset-1.5 rounded-xl border border-[#383838] flex items-center justify-center"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(242,242,242,0.08) 1px, transparent 0)',
            backgroundSize: '10px 10px',
          }}
        >
          {/* Subtle Central Monogram */}
          <div className="flex flex-col items-center justify-center opacity-70">
            <div className="w-6 h-6 rounded-full border border-[#d9d9d9]/40 flex items-center justify-center mb-0.5">
              <span className="text-[9px] font-black tracking-widest text-[#f2f2f2]">R</span>
            </div>
            <span className="text-[7px] font-medium tracking-[0.2em] text-[#d9d9d9] uppercase">
              RUSPA
            </span>
          </div>
        </div>
      </div>
    );
  }
);
