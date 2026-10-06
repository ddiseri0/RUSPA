import React, { useEffect, useState } from 'react';

interface ScopaeAnimationProps {
  event: {
    winnerId: string;
    winnerName: string;
    points: 2;
    timestamp: number;
  };
  currentUserId: string;
  onDismiss?: () => void;
}

export const ScopaeAnimation: React.FC<ScopaeAnimationProps> = ({
  event,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 2500);

    return () => clearTimeout(timer);
  }, [event.timestamp, onDismiss]);

  if (!visible) return null;

  return (
    <div
      onClick={() => {
        setVisible(false);
        onDismiss?.();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm select-none cursor-pointer animate-fadeIn"
    >
      <div className="relative flex flex-col items-center justify-center p-6 animate-scopae-pop">
        {/* Animated sparkling stars around the word */}
        <span className="absolute -top-10 -left-8 text-3xl sm:text-5xl animate-bounce text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]">
          ✨
        </span>
        <span className="absolute -top-12 right-2 text-3xl sm:text-4xl animate-pulse text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.9)]">
          ⭐
        </span>
        <span className="absolute -bottom-8 -left-10 text-3xl sm:text-4xl animate-pulse text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.9)]">
          🌟
        </span>
        <span className="absolute -bottom-10 right-0 text-3xl sm:text-5xl animate-bounce text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.9)]">
          ✨
        </span>
        <span className="absolute top-1/2 -left-14 -translate-y-1/2 text-2xl sm:text-3xl text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]">
          ⭐
        </span>
        <span className="absolute top-1/2 -right-14 -translate-y-1/2 text-2xl sm:text-3xl text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]">
          ⭐
        </span>

        {/* Word SCOPEE in striking golden/yellow styling */}
        <div className="relative flex items-center gap-3 sm:gap-4">
          <span className="text-4xl sm:text-6xl text-amber-300 animate-pulse">✨</span>
          <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-yellow-600 drop-shadow-[0_0_40px_rgba(245,158,11,0.85)] font-sans">
            SCOPEE
          </h1>
          <span className="text-4xl sm:text-6xl text-amber-300 animate-pulse">✨</span>
        </div>

        {/* Subtle gold points badge */}
        <span className="mt-3 text-sm sm:text-lg font-black text-amber-300 tracking-widest uppercase font-mono drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">
          ★ +2 PUNTI ★
        </span>
      </div>
    </div>
  );
};
