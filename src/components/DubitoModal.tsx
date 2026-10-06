import React, { useEffect, useState } from 'react';
import { DubitoState, Player, Card, GameMode } from '../types/game';
import { CardBack } from './CardBack';
import { CardView } from './CardView';

interface DubitoModalProps {
  dubitoState: DubitoState;
  currentUserId: string;
  players: Record<string, Player>;
  boardCards: Card[];
  mode: GameMode;
  onVote: (vote: 'DUBITO' | 'PASSA') => void;
}

export const DubitoModal: React.FC<DubitoModalProps> = ({
  dubitoState,
  currentUserId,
  players,
  boardCards,
  mode,
  onVote,
}) => {
  const [timeLeft, setTimeLeft] = useState(10);
  const mover = players[dubitoState.initiatorId];
  const user = players[currentUserId];
  const isOpponent = user && user.team === dubitoState.targetTeam;
  const userVote = dubitoState.votes[currentUserId];

  const autoVotedRef = React.useRef(false);

  // Targeted cards
  const targetedCards = dubitoState.move.isRuspa
    ? boardCards
    : boardCards.filter((c) => dubitoState.move.targetCardIds.includes(c.id));

  const isDeclaredScopa =
    Boolean(dubitoState.move.isDeclaredScopa) ||
    (!dubitoState.move.isRuspa &&
      targetedCards.length === boardCards.length &&
      boardCards.length > 0);

  useEffect(() => {
    const interval = setInterval(() => {
      const remainingMs = dubitoState.expiresAt - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(remainingSec);
      if (remainingMs <= 0 && isOpponent && !userVote && !autoVotedRef.current) {
        autoVotedRef.current = true;
        onVote('PASSA');
      }
    }, 150);

    return () => clearInterval(interval);
  }, [dubitoState.expiresAt, isOpponent, userVote, onVote]);

  const opposingPlayers = Object.values(players).filter(
    (p) => p.team === dubitoState.targetTeam
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-md bg-[#1C1C1E] border border-zinc-800 rounded-3xl p-5 sm:p-7 flex flex-col items-center shadow-2xl relative overflow-hidden">
        {/* Countdown Bar (10s timer) */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-800">
          <div
            className="h-full bg-rose-500 transition-all duration-200 ease-linear"
            style={{ width: `${Math.min(100, Math.max(0, (timeLeft / 10) * 100))}%` }}
          />
        </div>

        {/* Minimal Header with Timer */}
        <div className="flex items-center justify-between w-full mb-3 pt-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            DUBITO
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 font-mono text-xs font-bold text-rose-400">
            {timeLeft}s
          </span>
        </div>

        {/* Essential Statement */}
        <div className="text-center mb-5">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {mover ? mover.name : 'Avversario'}
            </h2>
            {isDeclaredScopa && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#C6EF68]/20 border border-[#C6EF68]/50 text-[#C6EF68] text-[11px] font-black uppercase tracking-wider">
                Dichiara Scopa!
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {dubitoState.move.isRuspa
              ? 'Dichiara Ruspa: prende tutto il tavolo'
              : isDeclaredScopa
              ? `Dichiara Scopa prendendo tutte le ${targetedCards.length} carte a terra!`
              : targetedCards.length > 0
              ? `Dichiara la presa di ${targetedCards.length} ${targetedCards.length === 1 ? 'carta' : 'carte'}`
              : 'Gioca a terra coperta'}
          </p>
        </div>

        {/* Cards Focus: Played Covered Card & Target Cards */}
        <div className="w-full bg-zinc-950/70 border border-zinc-850 rounded-2xl p-4 my-2 flex items-center justify-around gap-4">
          {/* Carta Giocata (Coperta) */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 mb-2">
              Giocata
            </span>
            <div className="scale-95 sm:scale-100">
              <CardBack size="md" isPendingDoubt />
            </div>
          </div>

          {/* Freccia o separatore */}
          <div className="text-zinc-600 font-mono text-sm">
            ➔
          </div>

          {/* Carte che vuole prendere */}
          <div className="flex flex-col items-center min-w-0">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 mb-2">
              Presa Dichiarata
            </span>
            <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-[200px]">
              {targetedCards.length === 0 ? (
                <span className="text-xs text-zinc-600 italic">Nessuna</span>
              ) : (
                targetedCards.map((c) => (
                  <CardView key={c.id} card={c} size="sm" />
                ))
              )}
            </div>
          </div>
        </div>

        {/* 2v2 Team Voting status */}
        {mode === '2v2' && (
          <div className="w-full bg-zinc-900/60 rounded-xl p-2.5 my-3 flex items-center justify-around text-xs border border-zinc-800">
            {opposingPlayers.map((p) => {
              const vote = dubitoState.votes[p.id];
              return (
                <div key={p.id} className="flex items-center gap-1.5">
                  <span className="text-zinc-300 text-xs font-medium">{p.name}:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                      vote === 'DUBITO'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : vote === 'PASSA'
                        ? 'bg-zinc-800 text-zinc-400'
                        : 'bg-zinc-800/60 text-zinc-500 animate-pulse'
                    }`}
                  >
                    {vote ? vote : 'Attesa...'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Decision Buttons for Opponent */}
        {isOpponent ? (
          <div className="w-full grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={() => onVote('DUBITO')}
              disabled={Boolean(userVote)}
              className={`
                py-3.5 px-4 rounded-full font-bold text-sm transition-all shadow-lg active:scale-95
                bg-rose-600 hover:bg-rose-500 text-white
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              {userVote === 'DUBITO' ? 'Dubitato' : 'DUBITO'}
            </button>

            <button
              onClick={() => onVote('PASSA')}
              disabled={Boolean(userVote)}
              className={`
                py-3.5 px-4 rounded-full font-semibold text-sm transition-all active:scale-95
                bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              {userVote === 'PASSA' ? 'Passato' : 'PASSA'}
            </button>
          </div>
        ) : (
          <div className="mt-4 py-3 px-4 bg-zinc-900/60 rounded-2xl text-xs text-zinc-400 text-center w-full">
            In attesa della decisione degli avversari...
          </div>
        )}
      </div>
    </div>
  );
};
