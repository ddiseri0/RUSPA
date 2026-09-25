import React from 'react';
import { Player } from '../types/game';

interface PlayerAvatarProps {
  player: Player;
  isCurrentTurn?: boolean;
  isSelf?: boolean;
  mode?: '1v1' | '2v2';
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  isCurrentTurn = false,
  isSelf = false,
  mode = '1v1',
}) => {
  // Generate a smooth gradient or distinctive avatar color based on seed
  const avatarColors = [
    'from-rose-500 to-orange-400',
    'from-emerald-400 to-teal-600',
    'from-sky-400 to-indigo-600',
    'from-amber-400 to-yellow-600',
  ];
  const colorIndex = (player.seat ?? 0) % avatarColors.length;

  return (
    <div
      className={`
        relative w-28 h-28 sm:w-32 sm:h-32 bg-[#1C1C1E] text-white 
        rounded-3xl p-3 flex flex-col justify-between items-center
        transition-all duration-300 select-none
        ${
          isCurrentTurn
            ? 'ring-2 ring-white shadow-glow-white scale-105'
            : 'border border-zinc-800/60 shadow-xl'
        }
      `}
    >
      {/* Top row: Team indicator or turn badge */}
      <div className="w-full flex items-center justify-between">
        {mode === '2v2' ? (
          <span
            className={`text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full ${
              player.team === 1
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                : 'bg-sky-950/80 text-sky-300 border border-sky-800/40'
            }`}
          >
            S{player.team}
          </span>
        ) : (
          <span className="text-[10px] text-zinc-500 font-mono">
            {isSelf ? 'TU' : 'AVV'}
          </span>
        )}

        {/* Turn Pulse Dot */}
        {isCurrentTurn && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
      </div>

      {/* Avatar Icon / Initial */}
      <div
        className={`
          w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr ${avatarColors[colorIndex]}
          flex items-center justify-center font-bold text-white shadow-md text-sm sm:text-base
        `}
      >
        {player.name.charAt(0).toUpperCase()}
      </div>

      {/* Player Name & Quick Stats */}
      <div className="w-full text-center">
        <p className="text-xs sm:text-sm font-medium text-white truncate max-w-full">
          {player.name}
        </p>
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-400">
          <span>🂠 {player.handCount}</span>
          <span>•</span>
          <span>🏆 {player.score}</span>
        </div>
      </div>
    </div>
  );
};
