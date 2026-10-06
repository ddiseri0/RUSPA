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
  currentUserId,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(true);
  const isWinner = event.winnerId === currentUserId;

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 4500);

    return () => clearTimeout(timer);
  }, [event.timestamp, onDismiss]);

  if (!visible) return null;

  return (
    <div
      onClick={() => {
        setVisible(false);
        onDismiss?.();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none cursor-pointer"
    >
      {/* Background Shockwave Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full border-2 border-lime-400/40 animate-shockwave-1" />
        <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full border-2 border-amber-400/40 animate-shockwave-2" />
      </div>

      {/* Pop-in Celebration Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm sm:max-w-md bg-[#1C1C1E] border border-lime-400/50 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden animate-scopae-pop z-10"
      >
        {/* Subtle Top Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-lime-400 to-emerald-400" />

        {/* Header Tag */}
        <div className="mb-2 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-lime-400 animate-ping" />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-lime-300">
            Momento Speciale · Doppio Punto
          </span>
        </div>

        {/* Big Impactful Title: SCOPAE! */}
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight my-2 bg-gradient-to-br from-amber-300 via-lime-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(198,239,104,0.4)]">
          SCOPAE!
        </h1>

        {/* Big Score Badge */}
        <div className="px-5 py-1.5 rounded-full bg-lime-400/15 border border-lime-400/40 my-2">
          <span className="text-xl sm:text-2xl font-black text-[#C6EF68] tracking-wider">
            +2 PUNTI
          </span>
        </div>

        {/* Explanation message */}
        <p className="text-xs sm:text-sm text-zinc-300 font-medium mt-2 mb-4 max-w-xs">
          {isWinner ? (
            <span>
              Hai fatto <strong className="text-white">Scopa</strong> e l&apos;avversario ha <strong className="text-rose-400">dubitato a torto</strong>!
            </span>
          ) : (
            <span>
              <strong className="text-white">{event.winnerName}</strong> ha fatto <strong className="text-white">Scopa</strong> e il tuo Dubito era errato!
            </span>
          )}
        </p>

        {/* Point Breakdown Card */}
        <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 flex flex-col gap-2 text-xs text-left mb-5">
          <div className="flex items-center justify-between text-zinc-300">
            <span>Presa Scopa Legittima</span>
            <span className="font-bold text-amber-300 font-mono">+1 pt</span>
          </div>
          <div className="flex items-center justify-between text-zinc-300">
            <span>Dubito Avversario Fallito</span>
            <span className="font-bold text-rose-300 font-mono">+1 pt</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800 font-bold text-white">
            <span className="uppercase tracking-wider text-[11px] text-zinc-400">Totale Assegnato</span>
            <span className="text-[#C6EF68] font-mono text-sm font-black">+2 PUNTI</span>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
          className="w-full py-3 px-6 rounded-full bg-white text-black font-bold text-xs sm:text-sm hover:bg-zinc-200 active:scale-95 transition-all shadow-lg cursor-pointer"
        >
          Continua
        </button>
      </div>
    </div>
  );
};
