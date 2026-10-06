import React from 'react';

interface CoveredCardIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CoveredCardIcon: React.FC<CoveredCardIconProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-6 h-8',
    md: 'w-8 h-10',
    lg: 'w-11 h-14',
  }[size];

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${sizeMap} ${className}`}>
      {/* Back card (slightly rotated and offset to the left) */}
      <div
        className="absolute w-full h-full rounded-[8px] bg-[#ffffff] border border-black/20 shadow-sm transform -rotate-12 -translate-x-1 -translate-y-0.5 overflow-hidden"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            #000000 0px,
            #000000 1.8px,
            #ffffff 1.8px,
            #ffffff 4.8px
          )`,
        }}
      />
      {/* Front card (rotated to the right) */}
      <div
        className="relative w-full h-full rounded-[8px] bg-[#ffffff] border border-black/25 shadow-md transform rotate-6 overflow-hidden"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            #000000 0px,
            #000000 2px,
            #ffffff 2px,
            #ffffff 5px
          )`,
        }}
      />
    </div>
  );
};
