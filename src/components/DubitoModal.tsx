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
  const [timeLeft, setTimeLeft] = useState(7);
  const mover = players[dubitoState.initiatorId];
  const user = players[currentUserId];
  const isOpponent = user && user.team === dubitoState.targetTeam;
  const userVote = dubitoState.votes[currentUserId];

  // Targeted cards
  const targetedCards = boardCards.filter((c) =>
    dubitoState.move.targetCardIds.includes(c.id)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const remainingMs = dubitoState.expiresAt - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(remainingSec);
      if (remainingMs <= 0 && isOpponent && !userVote) {
        onVote('PASSA');
      }
    }, 200);

    return () => clearInterval(interval);
  }, [dubitoState.expiresAt, isOpponent, userVote, onVote]);

  // Teammates in 2v2
  const opposingPlayers = Object.values(players).filter(
    (p) => p.team === dubitoState.targetTeam
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-lg bg-[#1C1C1E] border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
        {/* Countdown Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-800">
          <div
            className="h-full bg-rose-500 transition-all duration-300 ease-linear"
            style={{ width: `${Math.min(100, Math.max(0, (timeLeft / 7) * 100))}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between w-full mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Finestra di Verifica
          </span>
          <span className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-mono text-sm font-bold text-white">
            {timeLeft}s
          </span>
        </div>

        {/* Scopa Prize Badge (Requirement 5: Dubito = Scopa) */}
        <div className="mb-4 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2 shadow-sm">
          <span className="text-base">✨</span>
          <span>In palio: <strong className="text-amber-200 uppercase font-black tracking-wider">+1 SCOPA</strong> per chi vince la sfida!</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-normal tracking-tight text-white mb-2">
          {mover ? mover.name : 'Avversario'} ha giocato una carta coperta!
        </h2>
        <p className="text-sm text-zinc-400 mb-6">
          {dubitoState.move.isRuspa
            ? '🔥 Ha dichiarato un ASSO RUSPA: prende tutto il tavolo!'
            : targetedCards.length > 0
            ? `Ha dichiarato la presa di ${targetedCards.length} carta/e a terra.`
            : 'Ha calato la carta a terra senza prese.'}
        </p>

        {/* Visual of Played Card Face Down + Targeted Cards */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-4 w-full">
          <div className="flex flex-col items-center">
            <span className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wider">
              Carta Giocata
            </span>
            <CardBack size="md" isPendingDoubt />
          </div>

          {targetedCards.length > 0 && (
            <div className="flex flex-col items-center">
              <span className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wider">
                Carte Bersaglio
              </span>
              <div className="flex items-center gap-2 flex-wrap justify-center max-w-[220px]">
                {targetedCards.map((c) => (
                  <CardView key={c.id} card={c} size="sm" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2v2 Team Voting status */}
        {mode === '2v2' && (
          <div className="w-full bg-zinc-900/80 rounded-2xl p-3 my-4 flex items-center justify-around text-xs border border-zinc-800/80">
            {opposingPlayers.map((p) => {
              const vote = dubitoState.votes[p.id];
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-zinc-300 font-medium">{p.name}:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                      vote === 'DUBITO'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : vote === 'PASSA'
                        ? 'bg-zinc-800 text-zinc-400'
                        : 'bg-zinc-800/50 text-zinc-500 animate-pulse'
                    }`}
                  >
                    {vote ? vote : 'In attesa...'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Buttons for Opponent */}
        {isOpponent ? (
          <div className="w-full flex flex-col sm:flex-row items-center gap-3 mt-4">
            <button
              onClick={() => onVote('DUBITO')}
              disabled={Boolean(userVote)}
              className={`
                w-full flex-1 py-4 px-6 rounded-full font-bold text-base transition-all duration-200
                bg-white text-black shadow-lg hover:bg-zinc-200 active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              {userVote === 'DUBITO' ? 'Hai Dubitato!' : 'DUBITO! (Sfida per la Scopa)'}
            </button>

            <button
              onClick={() => onVote('PASSA')}
              disabled={Boolean(userVote)}
              className={`
                w-full sm:w-auto py-4 px-8 rounded-full font-medium text-sm transition-all duration-200
                bg-zinc-900 text-zinc-300 hover:bg-zinc-800 active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              {userVote === 'PASSA' ? 'Passato' : 'Passa'}
            </button>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-zinc-900/60 rounded-2xl text-xs text-zinc-400">
            In attesa della decisione degli avversari...
          </div>
        )}
      </div>
    </div>
  );
};
