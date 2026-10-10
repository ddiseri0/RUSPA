import React, { useEffect, useState } from 'react';
import { DubitoState, Player, Card, GameMode } from '../types/game';
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

  // Targeted cards from table
  const targetedCards = React.useMemo(() => {
    return dubitoState.move.isRuspa
      ? boardCards
      : boardCards.filter(c => dubitoState.move.targetCardIds.includes(c.id));
  }, [dubitoState.move.isRuspa, dubitoState.move.targetCardIds, boardCards]);

  const cardsSum = React.useMemo(
    () => targetedCards.reduce((acc, c) => acc + c.value, 0),
    [targetedCards]
  );

  const isDeclaredScopa =
    Boolean(dubitoState.move.isDeclaredScopa) ||
    (!dubitoState.move.isRuspa &&
      targetedCards.length === boardCards.length &&
      boardCards.length > 0);

  const onVoteRef = React.useRef(onVote);
  onVoteRef.current = onVote;
  const userVoteRef = React.useRef(userVote);
  userVoteRef.current = userVote;
  const isOpponentRef = React.useRef(isOpponent);
  isOpponentRef.current = isOpponent;

  // 10s voting countdown
  useEffect(() => {
    setTimeLeft(10);
    autoVotedRef.current = false;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isOpponentRef.current && !userVoteRef.current && !autoVotedRef.current) {
            autoVotedRef.current = true;
            onVoteRef.current('PASSA');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [dubitoState.initiatorId, dubitoState.move?.timestamp]);

  const opposingPlayers = React.useMemo(
    () => Object.values(players).filter(p => p.team === dubitoState.targetTeam),
    [players, dubitoState.targetTeam]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-md bg-[#262626] border border-[#383838] rounded-3xl p-5 sm:p-7 flex flex-col items-center shadow-2xl relative overflow-hidden">
        {/* Countdown Bar (10s timer) */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#000000]">
          <div
            className="h-full bg-[#e3e700] shadow-[0_0_10px_#e3e700] transition-all duration-200 ease-linear"
            style={{ width: `${Math.min(100, Math.max(0, (timeLeft / 10) * 100))}%` }}
          />
        </div>

        {/* Minimal Header with Timer */}
        <div className="flex items-center justify-between w-full mb-3 pt-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#d9d9d9]">
            DUBITO
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#000000] border border-[#383838] font-mono text-xs font-bold text-[#e3e700]">
            {timeLeft}s
          </span>
        </div>

        {/* Essential Statement */}
        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-lg sm:text-xl font-bold text-[#f2f2f2] tracking-tight">
              {mover ? mover.name : 'Avversario'}
            </h2>
            {isDeclaredScopa && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#000000] border border-[#e3e700]/70 text-[#e3e700] text-[11px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(227,231,0,0.3)]">
                ★ Dichiara Scopa!
              </span>
            )}
          </div>
          <p className="text-xs text-[#d9d9d9]">
            {dubitoState.move.isRuspa
              ? 'Dichiara Ruspa: spazza tutte le carte a terra!'
              : isDeclaredScopa
                ? `Dichiara Scopa prendendo tutte le ${targetedCards.length} carte a terra!`
                : targetedCards.length === 1
                  ? 'Dichiara la presa di questa carta dal tavolo:'
                  : 'Dichiara la presa di queste carte dal tavolo:'}
          </p>
        </div>

        {/* FOCUS: SOLO LE CARTE DA PRENDERE DA TERRA, MOSTRATE IN GRANDE */}
        <div className="w-full bg-[#000000]/70 border border-[#383838] rounded-2xl p-4 sm:p-5 my-2 flex flex-col items-center justify-center shadow-inner">
          <div className="flex items-center justify-between w-full mb-3 px-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#d9d9d9]">
              {dubitoState.move.isRuspa ? 'Tutto il Tavolo (Ruspa)' : 'Carte da prendere da terra'}
            </span>
            {targetedCards.length > 1 && !dubitoState.move.isRuspa && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#262626] border border-[#383838] text-[#f2f2f2]">
                Somma: <strong className="text-[#e3e700] font-mono text-sm">{cardsSum}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap py-1">
            {targetedCards.length === 0 ? (
              <span className="text-sm text-[#d9d9d9]/70 italic py-4">
                Nessuna carta a terra selezionata
              </span>
            ) : (
              targetedCards.map(c => (
                <div key={c.id} className="relative transition-all duration-200 hover:scale-105">
                  <CardView
                    card={c}
                    size={
                      targetedCards.length <= 2 ? 'lg' : targetedCards.length <= 3 ? 'md' : 'sm'
                    }
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2v2 Team Voting status */}
        {mode === '2v2' && (
          <div className="w-full bg-[#000000]/50 rounded-xl p-2.5 my-3 flex items-center justify-around text-xs border border-[#383838]">
            {opposingPlayers.map(p => {
              const vote = dubitoState.votes[p.id];
              return (
                <div key={p.id} className="flex items-center gap-1.5">
                  <span className="text-[#f2f2f2] text-xs font-medium">{p.name}:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                      vote === 'DUBITO'
                        ? 'bg-[#000000] text-[#e3e700] border border-[#e3e700]'
                        : vote === 'PASSA'
                          ? 'bg-[#262626] text-[#d9d9d9] border border-[#383838]'
                          : 'bg-[#000000]/40 text-[#d9d9d9]/60 animate-pulse'
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
                py-3.5 px-4 rounded-full font-bold text-sm transition-all shadow-[0_0_20px_rgba(227,231,0,0.4)] active:scale-95
                bg-[#e3e700] hover:bg-[#d4d800] text-[#000000] cursor-pointer
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
                bg-[#000000] hover:bg-[#1a1a1a] text-[#f2f2f2] border border-[#383838] cursor-pointer
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              {userVote === 'PASSA' ? 'Passato' : 'PASSA'}
            </button>
          </div>
        ) : (
          <div className="mt-4 py-3 px-4 bg-[#000000]/50 border border-[#383838] rounded-2xl text-xs text-[#d9d9d9] text-center w-full">
            In attesa della decisione degli avversari...
          </div>
        )}
      </div>
    </div>
  );
};
