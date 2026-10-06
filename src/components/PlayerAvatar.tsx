import React from 'react';
import { Player } from '../types/game';

interface PlayerAvatarProps {
  player: Player;
  isCurrentTurn?: boolean;
  isSelf?: boolean;
  mode?: '1v1' | '2v2';
}

/**
 * High-fidelity illustrated vector avatar matching the reference screenshot Memojis
 */
export const AvatarFace: React.FC<{
  name?: string;
  seed?: string;
  isOpponent?: boolean;
  className?: string;
}> = ({ name = '', seed = '', isOpponent = false, className = 'w-10 h-10' }) => {
  // Determine avatar style:
  // Giocatore 8 (opponent) -> bearded man
  // Giocatore 3 (user) -> mustache man
  const isBearded = isOpponent || name.includes('8') || (!name.includes('3') && (seed.charCodeAt(0) % 2 === 0));

  if (isBearded) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`rounded-full overflow-hidden select-none shrink-0 ${className}`}
      >
        {/* Dark background circle */}
        <circle cx="50" cy="50" r="50" fill="#202227" />
        {/* Black T-shirt collar/shoulders */}
        <path d="M12 96 C24 78, 76 78, 88 96 Z" fill="#121316" />
        {/* Neck */}
        <rect x="42" y="62" width="16" height="15" fill="#E2A985" rx="3" />
        {/* Head base */}
        <ellipse cx="50" cy="48" rx="23" ry="26" fill="#F2BCA0" />
        {/* Ears */}
        <circle cx="26" cy="48" r="5.5" fill="#E2A985" />
        <circle cx="74" cy="48" r="5.5" fill="#E2A985" />
        {/* Hair */}
        <path d="M26 42 C26 22, 74 22, 74 42 C74 26, 68 18, 50 18 C32 18, 26 26, 26 42 Z" fill="#241914" />
        <path d="M30 30 C40 20, 60 20, 70 28 C64 23, 44 23, 30 30 Z" fill="#3B2820" />
        {/* Eyes */}
        <ellipse cx="40" cy="45" rx="2.5" ry="3" fill="#241914" />
        <ellipse cx="60" cy="45" rx="2.5" ry="3" fill="#241914" />
        {/* Eyebrows */}
        <path d="M36 39 Q41 38 45 40" stroke="#241914" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <path d="M55 40 Q59 38 64 39" stroke="#241914" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        {/* Nose */}
        <path d="M49 44 L49 52 Q50 54 52 53" stroke="#CF916E" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        {/* Full beard */}
        <path d="M32 50 C32 72, 68 72, 68 50 C68 56, 63 60, 50 60 C37 60, 32 56, 32 50 Z" fill="#241914" />
        {/* Mustache */}
        <path d="M41 55 Q50 58 59 55 Q50 61 41 55 Z" fill="#1A120E" />
        {/* Smile */}
        <path d="M46 58 Q50 61 54 58" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </svg>
    );
  }

  // Mustache man (Giocatore 3 / User style)
  return (
    <svg
      viewBox="0 0 100 100"
      className={`rounded-full overflow-hidden select-none shrink-0 ${className}`}
    >
      {/* Dark background circle */}
      <circle cx="50" cy="50" r="50" fill="#202227" />
      {/* Black T-shirt collar/shoulders */}
      <path d="M12 96 C24 78, 76 78, 88 96 Z" fill="#121316" />
      {/* Neck */}
      <rect x="42" y="62" width="16" height="15" fill="#E8B28F" rx="3" />
      {/* Head base */}
      <ellipse cx="50" cy="48" rx="22" ry="25" fill="#F8C7A8" />
      {/* Ears */}
      <circle cx="27" cy="48" r="5" fill="#E8B28F" />
      <circle cx="73" cy="48" r="5" fill="#E8B28F" />
      {/* Hair */}
      <path d="M27 42 C27 20, 73 20, 73 42 C73 24, 66 19, 50 19 C34 19, 27 24, 27 42 Z" fill="#1C1C1E" />
      {/* Eyes */}
      <ellipse cx="41" cy="45" rx="2.5" ry="3" fill="#1C1C1E" />
      <ellipse cx="59" cy="45" rx="2.5" ry="3" fill="#1C1C1E" />
      {/* Eyebrows */}
      <path d="M37 39 Q42 37 46 40" stroke="#1C1C1E" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M54 40 Q58 37 63 39" stroke="#1C1C1E" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* Nose */}
      <path d="M50 44 L49 51 Q50 53 52 52" stroke="#D19270" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {/* Smile */}
      <path d="M44 58 Q50 63 56 58" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Mustache */}
      <path d="M39 54 Q45 51 50 53 Q55 51 61 54 Q55 59 50 56 Q45 59 39 54 Z" fill="#1A1A1A" />
    </svg>
  );
};

/**
 * Mini overlapping white card backs with diagonal slashes (///)
 * Matches the opponent's hand count representation from the screenshot.
 */
export const MiniOpponentCards: React.FC<{ count?: number }> = ({ count = 3 }) => {
  const cardCount = Math.max(1, count);
  return (
    <div className="flex items-center -space-x-1 mt-0.5 select-none">
      {Array.from({ length: Math.min(6, cardCount) }).map((_, i) => (
        <div
          key={i}
          className="w-3.5 h-5 bg-white rounded-[2.5px] border border-black/10 shadow-sm relative overflow-hidden flex items-center justify-center shrink-0"
          style={{ transform: `rotate(${(i - 1) * 3}deg)` }}
        >
          <svg viewBox="0 0 16 22" className="w-full h-full p-0.5 text-zinc-400">
            <line x1="2" y1="20" x2="8" y2="2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="7" y1="20" x2="13" y2="2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      ))}
    </div>
  );
};

/**
 * Top Opponent Pill (Giocatore 8 in alto)
 * Replicates the exact styling of the top player pill from the reference screenshot.
 */
export const PlayerTopPill: React.FC<{
  player: Player;
  isCurrentTurn?: boolean;
}> = ({ player, isCurrentTurn = false }) => {
  return (
    <div
      className={`
        w-full bg-[#1C1C1E] border rounded-2xl px-3.5 py-2.5 flex items-center justify-between shadow-lg select-none transition-all
        ${isCurrentTurn ? 'border-zinc-700 ring-1 ring-zinc-700/60' : 'border-zinc-800/60'}
      `}
    >
      {/* Left: Avatar + Name + Mini Hand Cards */}
      <div className="flex items-center gap-2.5 min-w-0">
        <AvatarFace
          name={player.name}
          seed={player.avatarSeed || player.id}
          isOpponent={true}
          className="w-10 h-10"
        />
        <div className="min-w-0">
          <span className="text-sm font-semibold text-white block truncate leading-tight">
            {player.name}
          </span>
          <MiniOpponentCards count={player.handCount ?? 3} />
        </div>
      </div>

      {/* Right: Punti & Scope */}
      <div className="flex items-center gap-4 shrink-0 pl-2">
        {/* Punti */}
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500 leading-none mb-1">
            PUNTI
          </span>
          <div className="flex items-baseline gap-0.5 leading-none">
            <span className="text-lg font-bold text-white leading-none">
              {player.score ?? 0}
            </span>
            <span className="text-xs text-zinc-500 leading-none">
              /21
            </span>
          </div>
        </div>

        {/* Scope */}
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500 leading-none mb-1">
            SCOPE
          </span>
          <span className="text-lg font-bold text-[#C6EF68] leading-none">
            {player.scopaCount ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Bottom-Right Square Card for Player 3 (Requirement 4)
 * Square format, same information (avatar, name, points, scope).
 * STRICTLY NO ICONS ("NON USARE ICONE").
 */
export const PlayerSquareCard: React.FC<{
  player: Player;
  isCurrentTurn?: boolean;
}> = ({ player, isCurrentTurn = false }) => {
  return (
    <div
      className={`
        w-[114px] h-[114px] sm:w-[124px] sm:h-[124px] shrink-0 aspect-square
        bg-[#1C1C1E] border rounded-[22px] p-2.5 flex flex-col justify-between shadow-xl select-none mr-0.5 sm:mr-1 transition-all
        ${isCurrentTurn ? 'border-zinc-700 ring-1 ring-zinc-700/60' : 'border-zinc-800/80'}
      `}
    >
      {/* Top: Avatar + Player Name */}
      <div className="flex items-center gap-2 min-w-0">
        <AvatarFace
          name={player.name}
          seed={player.avatarSeed || player.id}
          isOpponent={false}
          className="w-9 h-9 sm:w-10 sm:h-10 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-white block truncate leading-tight">
            {player.name}
          </span>
          <span className="text-[9px] text-zinc-500 font-medium leading-none block mt-0.5 uppercase tracking-wide">
            TU
          </span>
        </div>
      </div>

      {/* Bottom: Punti & Scope Grid - STRICTLY NO ICONS */}
      <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-zinc-800/70">
        {/* Punti */}
        <div className="flex flex-col">
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-zinc-500 font-semibold leading-none mb-1">
            PUNTI
          </span>
          <div className="flex items-baseline gap-0.5 leading-none">
            <span className="text-sm sm:text-base font-bold text-white leading-none">
              {player.score ?? 0}
            </span>
            <span className="text-[9px] text-zinc-500 leading-none">
              /21
            </span>
          </div>
        </div>

        {/* Scope */}
        <div className="flex flex-col items-end">
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-zinc-500 font-semibold leading-none mb-1">
            SCOPE
          </span>
          <span className="text-sm sm:text-base font-bold text-[#C6EF68] leading-none">
            {player.scopaCount ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Legacy PlayerAvatar kept for LobbyView and general compatibility
 */
export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  isCurrentTurn = false,
  isSelf = false,
  mode = '1v1',
}) => {
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

        {isCurrentTurn && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
      </div>

      <AvatarFace
        name={player.name}
        seed={player.avatarSeed || player.id}
        isOpponent={!isSelf}
        className="w-11 h-11"
      />

      <div className="w-full text-center">
        <p className="text-xs sm:text-sm font-medium text-white truncate max-w-full">
          {player.name}
        </p>
      </div>
    </div>
  );
};
