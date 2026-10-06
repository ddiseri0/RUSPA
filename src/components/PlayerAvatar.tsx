import React from 'react';
import { Player } from '../types/game';
import { resolvePlayerEmoji, getEmoji3DUrl } from '../lib/emojiAvatars';

interface PlayerAvatarProps {
  player: Player;
  isCurrentTurn?: boolean;
  isSelf?: boolean;
  mode?: '1v1' | '2v2';
}

/**
 * Modern 3D / iPhone style Emoji Avatar Face
 */
export const AvatarFace: React.FC<{
  name?: string;
  seed?: string;
  isOpponent?: boolean;
  className?: string;
}> = ({ name = '', seed = '', isOpponent = false, className = 'w-10 h-10' }) => {
  const emoji = resolvePlayerEmoji(seed, name, isOpponent);
  const url3D = getEmoji3DUrl(emoji);

  return (
    <div
      className={`relative rounded-full overflow-hidden select-none shrink-0 bg-[#262626] border border-[#383838] flex items-center justify-center p-1 shadow-inner ${className}`}
    >
      {url3D ? (
        <img
          src={url3D}
          alt={emoji}
          className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            if (target.nextElementSibling) {
              (target.nextElementSibling as HTMLElement).style.display = 'flex';
            }
          }}
        />
      ) : null}
      <span
        className={`text-xl sm:text-2xl leading-none select-none items-center justify-center ${url3D ? 'hidden' : 'flex'}`}
        style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}
      >
        {emoji}
      </span>
    </div>
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
        w-full bg-[#262626] border rounded-2xl px-3.5 py-2.5 flex items-center justify-between shadow-lg select-none transition-all
        ${isCurrentTurn ? 'border-[#e3e700] ring-2 ring-[#e3e700]/50 shadow-[0_0_18px_rgba(227,231,0,0.35)]' : 'border-[#383838]'}
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
          <span className="text-sm font-semibold text-[#f2f2f2] block truncate leading-tight">
            {player.name}
          </span>
          <MiniOpponentCards count={player.handCount ?? 3} />
        </div>
      </div>

      {/* Right: Punti & Scope */}
      <div className="flex items-center gap-4 shrink-0 pl-2">
        {/* Punti */}
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[#d9d9d9] leading-none mb-1">
            PUNTI
          </span>
          <div className="flex items-baseline gap-0.5 leading-none">
            <span className="text-lg font-bold text-[#f2f2f2] leading-none">
              {player.score ?? 0}
            </span>
            <span className="text-xs text-[#d9d9d9]/70 leading-none">
              /21
            </span>
          </div>
        </div>

        {/* Scope */}
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[#d9d9d9] leading-none mb-1">
            SCOPE
          </span>
          <span className={`text-lg font-bold leading-none ${player.scopaCount && player.scopaCount > 0 ? 'text-[#e3e700]' : 'text-[#f2f2f2]'}`}>
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
        bg-[#262626] border rounded-[22px] p-2.5 flex flex-col justify-between shadow-xl select-none mr-0.5 sm:mr-1 transition-all
        ${isCurrentTurn ? 'border-[#e3e700] ring-2 ring-[#e3e700]/50 shadow-[0_0_18px_rgba(227,231,0,0.35)]' : 'border-[#383838]'}
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
          <span className="text-xs font-semibold text-[#f2f2f2] block truncate leading-tight">
            {player.name}
          </span>
          <span className="text-[9px] text-[#d9d9d9] font-medium leading-none block mt-0.5 uppercase tracking-wide">
            TU
          </span>
        </div>
      </div>

      {/* Bottom: Punti & Scope Grid - STRICTLY NO ICONS */}
      <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-[#383838]">
        {/* Punti */}
        <div className="flex flex-col">
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[#d9d9d9] font-semibold leading-none mb-1">
            PUNTI
          </span>
          <div className="flex items-baseline gap-0.5 leading-none">
            <span className="text-sm sm:text-base font-bold text-[#f2f2f2] leading-none">
              {player.score ?? 0}
            </span>
            <span className="text-[9px] text-[#d9d9d9]/70 leading-none">
              /21
            </span>
          </div>
        </div>

        {/* Scope */}
        <div className="flex flex-col items-end">
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[#d9d9d9] font-semibold leading-none mb-1">
            SCOPE
          </span>
          <span className={`text-sm sm:text-base font-bold leading-none ${player.scopaCount && player.scopaCount > 0 ? 'text-[#e3e700]' : 'text-[#f2f2f2]'}`}>
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
        relative w-28 h-28 sm:w-32 sm:h-32 bg-[#262626] text-[#f2f2f2] 
        rounded-3xl p-3 flex flex-col justify-between items-center
        transition-all duration-300 select-none
        ${
          isCurrentTurn
            ? 'ring-2 ring-[#e3e700] shadow-[0_0_20px_rgba(227,231,0,0.4)] scale-105 border-[#e3e700]'
            : 'border border-[#383838] shadow-xl'
        }
      `}
    >
      <div className="w-full flex items-center justify-between">
        {mode === '2v2' ? (
          <span
            className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full bg-[#000000] text-[#e6e6e6] border border-[#383838]"
          >
            S{player.team}
          </span>
        ) : (
          <span className="text-[10px] text-[#d9d9d9] font-mono">
            {isSelf ? 'TU' : 'AVV'}
          </span>
        )}

        {isCurrentTurn && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e3e700] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e3e700]"></span>
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
        <p className="text-xs sm:text-sm font-medium text-[#f2f2f2] truncate max-w-full">
          {player.name}
        </p>
      </div>
    </div>
  );
};
