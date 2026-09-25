import React from 'react';
import { Player, GameMode, Card } from '../types/game';
import { computeScopaStats } from '../engine/scopaRules';

interface ScoreBoardProps {
  players: Record<string, Player>;
  mode: GameMode;
  deckRemaining: number;
  capturedPiles?: Record<string, Card[]>;
  mancheNumber?: number;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  players,
  mode,
  deckRemaining,
  capturedPiles = {},
  mancheNumber = 1,
}) => {
  const playerList = Object.values(players);

  // Group by team
  const team1Players = playerList.filter((p) => p.team === 1);
  const team2Players = playerList.filter((p) => p.team === 2);

  const team1Cards: Card[] = [];
  team1Players.forEach((p) => {
    if (capturedPiles[p.id]) {
      team1Cards.push(...capturedPiles[p.id]);
    }
  });

  const team2Cards: Card[] = [];
  team2Players.forEach((p) => {
    if (capturedPiles[p.id]) {
      team2Cards.push(...capturedPiles[p.id]);
    }
  });

  const stats1 = computeScopaStats(team1Cards);
  const stats2 = computeScopaStats(team2Cards);

  const team1Scope = team1Players.reduce((acc, p) => acc + (p.scopaCount || 0), 0);
  const team2Scope = team2Players.reduce((acc, p) => acc + (p.scopaCount || 0), 0);

  const team1TotalScore = team1Players.reduce((acc, p) => acc + (p.score || 0), 0);
  const team2TotalScore = team2Players.reduce((acc, p) => acc + (p.score || 0), 0);

  const hasOpponent = team2Players.length > 0;
  const team1Name = mode === '2v2' ? 'Squadra 1' : team1Players[0]?.name || 'Giocatore 1';
  const team2Name = mode === '2v2'
    ? (hasOpponent ? 'Squadra 2' : 'In attesa...')
    : (team2Players[0]?.name || 'In attesa avversario...');

  // Compare Primiera leader
  const p1LeadsPrimiera = stats1.primieraScore > stats2.primieraScore && stats1.primieraScore > 0;
  const p2LeadsPrimiera = stats2.primieraScore > stats1.primieraScore && stats2.primieraScore > 0;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-[#1C1C1E]/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-zinc-800/80 shadow-2xl select-none">
      {/* Top Level: Prominent Scope Counter & Total Points */}
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Team 1 Scope & Score */}
        <div className="flex-1 flex flex-col items-start min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400 truncate max-w-[100px] sm:max-w-[160px]">
              {team1Name}
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500">
              Tot: <strong className="text-zinc-200">{team1TotalScore}</strong>/21 pt
            </span>
          </div>

          {/* MAXIMUM PROMINENCE: Scope Counter */}
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight drop-shadow-sm flex items-center gap-1">
              <span>✨</span>
              <span>{team1Scope}</span>
            </span>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-300/90">
              {team1Scope === 1 ? 'Scopa' : 'Scope'}
            </span>
          </div>
        </div>

        {/* Center Badge: Deck Remaining & Manche */}
        <div className="flex flex-col items-center justify-center px-1.5 sm:px-3 shrink-0">
          <div className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center shadow-inner">
            <span className="text-[11px] sm:text-xs font-mono font-bold text-white tracking-widest leading-none">
              {deckRemaining} <span className="text-[9px] font-normal text-zinc-400">/ 40</span>
            </span>
            <span className="text-[8px] uppercase tracking-wider text-zinc-400 mt-0.5">
              Mazzo
            </span>
          </div>
          <span className="text-[9px] text-zinc-400 mt-0.5 uppercase tracking-widest font-mono">
            Manche {mancheNumber}
          </span>
        </div>

        {/* Team 2 Scope & Score */}
        <div className="flex-1 flex flex-col items-end text-right min-w-0">
          <div className="flex items-center gap-1.5 justify-end flex-wrap">
            <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500">
              Tot: <strong className="text-zinc-200">{team2TotalScore}</strong>/21 pt
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400 truncate max-w-[100px] sm:max-w-[160px]">
              {team2Name}
            </span>
          </div>

          {/* MAXIMUM PROMINENCE: Scope Counter */}
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-300/90">
              {team2Scope === 1 ? 'Scopa' : 'Scope'}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight drop-shadow-sm flex items-center gap-1">
              <span>{team2Scope}</span>
              <span>✨</span>
            </span>
          </div>
        </div>
      </div>

      {/* Subito Sotto: Real-Time Classic Scopa Points (Settebello, Primiera, Denari, Carte) */}
      <div className="w-full pt-1.5 border-t border-zinc-800/80 grid grid-cols-2 gap-1 sm:gap-3 text-[9px] sm:text-[10px]">
        {/* Team 1 Live Stats */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-start">
          {/* Settebello */}
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5 ${
              stats1.hasSettebello
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 animate-pulse'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            ★ 7B: {stats1.hasSettebello ? 'Preso' : '—'}
          </span>

          {/* Primiera / Settanta */}
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-full font-mono ${
              p1LeadsPrimiera
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 font-bold'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            70: {stats1.primieraScore}
          </span>

          {/* Denari */}
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-full font-mono ${
              stats1.denariCount > 5
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            🪙 {stats1.denariCount}/10
          </span>

          {/* Carte */}
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-full font-mono ${
              stats1.cardsCount > 20
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            🂠 {stats1.cardsCount}/40
          </span>
        </div>

        {/* Team 2 Live Stats */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
          {/* Carte */}
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-full font-mono ${
              stats2.cardsCount > 20
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            🂠 {stats2.cardsCount}/40
          </span>

          {/* Denari */}
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-full font-mono ${
              stats2.denariCount > 5
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            🪙 {stats2.denariCount}/10
          </span>

          {/* Primiera / Settanta */}
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-full font-mono ${
              p2LeadsPrimiera
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 font-bold'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            70: {stats2.primieraScore}
          </span>

          {/* Settebello */}
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5 ${
              stats2.hasSettebello
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 animate-pulse'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            ★ 7B: {stats2.hasSettebello ? 'Preso' : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
