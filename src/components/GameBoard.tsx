import React, { useState } from 'react';
import { RoomState, Card, Move } from '../types/game';
import { CardView } from './CardView';
import { CardBack } from './CardBack';
import { PlayerAvatar } from './PlayerAvatar';
import { ScoreBoard } from './ScoreBoard';
import { DubitoModal } from './DubitoModal';

interface GameBoardProps {
  room: RoomState;
  currentUserId: string;
  onPlayMove: (move: Move) => void;
  onDubitoVote: (vote: 'DUBITO' | 'PASSA') => void;
  onLeaveRoom: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  room,
  currentUserId,
  onPlayMove,
  onDubitoVote,
  onLeaveRoom,
}) => {
  const [selectedHandCard, setSelectedHandCard] = useState<Card | null>(null);
  const [selectedBoardCards, setSelectedBoardCards] = useState<Card[]>([]);
  const [isRuspaDeclared, setIsRuspaDeclared] = useState(false);

  if (!room || !room.players || !room.players[currentUserId]) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-white border-t-transparent animate-spin" />
          <span className="text-xs uppercase tracking-widest text-zinc-500">
            Caricamento tavolo da gioco...
          </span>
        </div>
      </div>
    );
  }

  const currentUser = room.players[currentUserId];
  const userHand = room.privateHands?.[currentUserId] || [];
  const isMyTurn = room.currentTurnPlayerId === currentUserId && room.phase === 'PLAYER_TURN';

  // Toggle selection of target cards on the board
  const toggleBoardCard = (card: Card) => {
    if (!isMyTurn) return;
    if (selectedBoardCards.find((c) => c.id === card.id)) {
      setSelectedBoardCards(selectedBoardCards.filter((c) => c.id !== card.id));
    } else {
      setSelectedBoardCards([...selectedBoardCards, card]);
    }
  };

  const isAce = selectedHandCard?.value === 1;
  const isRuspaActive = Boolean(isAce || isRuspaDeclared);

  // Submit move
  const handleConfirmMove = () => {
    if (!selectedHandCard || !isMyTurn) return;

    if (isRuspaActive) {
      // Requirement 3: L'Asso funge SEMPRE da Ruspa (pulisce il tavolo) ed è coperto in automatico.
      // O Bluff Ruspa: Carta diversa dall'Asso con toggle attivo.
      const move: Move = {
        playerId: currentUserId,
        playerName: currentUser?.name || 'Giocatore',
        playedCard: selectedHandCard,
        targetCardIds: room.board.map((c) => c.id),
        isRuspa: true,
        isDiscardFaceUp: false,
        timestamp: Date.now(),
      };
      onPlayMove(move);
    } else if (selectedBoardCards.length > 0) {
      // Requirement 2: Presa Normale (coperta con Dubito)
      const move: Move = {
        playerId: currentUserId,
        playerName: currentUser?.name || 'Giocatore',
        playedCard: selectedHandCard,
        targetCardIds: selectedBoardCards.map((c) => c.id),
        isRuspa: false,
        isDiscardFaceUp: false,
        timestamp: Date.now(),
      };
      onPlayMove(move);
    } else {
      // Requirement 2: Giocata a terra (Scarto)
      // Se un giocatore gioca una carta solo per lasciarla a terra (senza prendere nulla),
      // la carta NON deve essere coperta. Viene mostrata a faccia in su e NON attiva la meccanica del "Dubito".
      const move: Move = {
        playerId: currentUserId,
        playerName: currentUser?.name || 'Giocatore',
        playedCard: selectedHandCard,
        targetCardIds: [],
        isRuspa: false,
        isDiscardFaceUp: true,
        timestamp: Date.now(),
      };
      onPlayMove(move);
    }

    // Reset local selection
    setSelectedHandCard(null);
    setSelectedBoardCards([]);
    setIsRuspaDeclared(false);
  };

  // Other players list
  const otherPlayers = Object.values(room.players).filter((p) => p.id !== currentUserId);

  return (
    <div className="h-screen max-h-screen bg-black text-white flex flex-col justify-between p-3 sm:p-5 pb-5 select-none relative overflow-hidden">
      {/* Top Bar: Room Code & Scoreboard */}
      <header className="w-full flex flex-col gap-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
              STANZA: {room.code}
            </span>
            <span className="text-xs text-zinc-500 hidden sm:inline">
              {room.mode === '2v2' ? '2v2 Squadre' : '1v1 Singolo'}
            </span>
          </div>

          <button
            onClick={() => {
              if (room.phase !== 'GAME_OVER') {
                const confirmLeave = window.confirm(
                  'Sei sicuro di voler abbandonare la partita? L\'avversario vincerà a tavolino.'
                );
                if (!confirmLeave) return;
              }
              onLeaveRoom();
            }}
            className="text-xs text-zinc-400 hover:text-white px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
          >
            Esci
          </button>
        </div>

        {/* Big Typography Scoreboard */}
        <ScoreBoard
          players={room.players}
          mode={room.mode}
          deckRemaining={room.deckRemaining}
          capturedPiles={room.capturedPiles}
          mancheNumber={room.mancheNumber}
        />
      </header>

      {/* Opponents Grid Area */}
      <div className="w-full flex items-center justify-center gap-4 py-2 flex-wrap">
        {otherPlayers.map((player) => (
          <PlayerAvatar
            key={player.id}
            player={player}
            isCurrentTurn={room.currentTurnPlayerId === player.id}
            mode={room.mode}
          />
        ))}
      </div>

      {/* Center Table Area (Absolute Black Felt with minimal glow) */}
      <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col items-center justify-center relative my-1 min-h-0">
        {/* Status Action Banner */}
        <div className="mb-2 px-3 py-1 rounded-full bg-[#1C1C1E]/80 border border-zinc-800/80 text-[11px] sm:text-xs text-zinc-300 text-center max-w-md backdrop-blur-sm truncate">
          {room.lastActionMessage || 'Partita in corso'}
        </div>

        {/* Table Cards with delicate overlap and shadow from right to left */}
        <div className="flex items-center justify-center -space-x-3 sm:-space-x-4 min-h-[96px] sm:min-h-[120px] p-2 sm:p-3 rounded-2xl sm:rounded-3xl bg-zinc-950/60 border border-zinc-900 w-full max-w-xl">
          {room.pendingMove && (
            <div className="relative z-50 flex flex-col items-center gap-0.5 mr-2">
              <span className="text-[9px] text-rose-400 font-semibold uppercase tracking-wider">
                Coperta
              </span>
              <CardBack size="md" isPendingDoubt />
            </div>
          )}
          {room.board.length === 0 && !room.pendingMove ? (
            <div className="text-xs text-zinc-600 uppercase tracking-widest py-6">
              Tavolo vuoto
            </div>
          ) : (
            room.board.map((card, idx) => {
              const isTargeted = selectedBoardCards.some((c) => c.id === card.id);
              const baseZIndex = 10 + idx;
              return (
                <div
                  key={card.id}
                  style={{ zIndex: isTargeted ? 50 : baseZIndex }}
                  className="relative transition-all duration-200"
                >
                  <CardView
                    card={card}
                    targetSelected={isTargeted}
                    onClick={() => toggleBoardCard(card)}
                    disabled={!isMyTurn}
                    size="md"
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Turn Guide Label */}
        <div className="mt-1.5 text-center">
          {isMyTurn ? (
            <span className="text-[11px] sm:text-xs font-semibold text-emerald-400 uppercase tracking-wider animate-pulse">
              ● Tocca a te: seleziona una carta dalla tua mano
            </span>
          ) : (
            <span className="text-[11px] sm:text-xs text-zinc-500 uppercase tracking-wider">
              Turno di {room.players[room.currentTurnPlayerId]?.name || 'Avversario'}
            </span>
          )}
        </div>
      </main>

      {/* Bottom Area: Controls & Player Hand */}
      <footer className="w-full max-w-2xl mx-auto flex flex-col items-center gap-2 sm:gap-3 shrink-0">
        {/* Action Controls when it's player's turn */}
        {isMyTurn && selectedHandCard && (
          <div className="flex items-center gap-2 sm:gap-2.5 w-full justify-center flex-wrap animate-fadeIn">
            {/* If Ace: Show badge that it is inherently Ruspa */}
            {isAce ? (
              <div className="px-3.5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                <span>⚡</span>
                <span>Asso: Ruspa Automatica</span>
              </div>
            ) : (
              /* If not Ace: Bluff Ruspa Toggle Button (Requirement 3: a prova di stupido) */
              <button
                onClick={() => {
                  setIsRuspaDeclared(!isRuspaDeclared);
                  setSelectedBoardCards([]);
                }}
                className={`
                  px-3.5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md active:scale-95
                  ${
                    isRuspaDeclared
                      ? 'bg-amber-400 text-black shadow-glow-gold'
                      : 'bg-zinc-900 text-zinc-300 border border-zinc-700 hover:bg-zinc-800'
                  }
                `}
              >
                <span>🔥</span>
                <span>{isRuspaDeclared ? 'Bluff Ruspa ATTIVO' : 'Bluffa Ruspa'}</span>
              </button>
            )}

            {/* Main Play Confirmation Button */}
            <button
              onClick={handleConfirmMove}
              className={`
                px-5 sm:px-7 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm active:scale-95 transition-all shadow-xl flex items-center gap-1.5
                ${
                  isRuspaActive
                    ? 'bg-amber-400 text-black hover:bg-amber-300 shadow-glow-gold'
                    : selectedBoardCards.length > 0
                    ? 'bg-white text-black hover:bg-zinc-200'
                    : 'bg-zinc-200 text-black hover:bg-white border border-zinc-400'
                }
              `}
            >
              {isAce ? (
                <>
                  <span>⚡</span>
                  <span>Gioca Asso (Ruspa Coperta)</span>
                </>
              ) : isRuspaDeclared ? (
                <>
                  <span>🔥</span>
                  <span>Gioca come Ruspa (Bluff Coperto)</span>
                </>
              ) : selectedBoardCards.length > 0 ? (
                <span>Prendi {selectedBoardCards.length} Carte (Coperta)</span>
              ) : (
                <>
                  <span>⬇</span>
                  <span>Scarta a Terra (Scoperta)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Hand Cards with delicate overlap and realistic shadow from right to left */}
        <div className="flex items-center justify-center -space-x-3 sm:-space-x-4 pb-1 sm:pb-2 pt-2.5 sm:pt-3.5 px-3">
          {userHand.map((card, idx) => {
            const isSelected = selectedHandCard?.id === card.id;
            const baseZIndex = 10 + idx;
            return (
              <div
                key={card.id}
                style={{ zIndex: isSelected ? 50 : baseZIndex }}
                className="relative transition-all duration-200"
              >
                <CardView
                  card={card}
                  selected={isSelected}
                  onClick={() => {
                    if (!isMyTurn) return;
                    if (isSelected) {
                      setSelectedHandCard(null);
                      setIsRuspaDeclared(false);
                    } else {
                      setSelectedHandCard(card);
                      if (card.value === 1) {
                        setIsRuspaDeclared(false);
                      }
                    }
                  }}
                  disabled={!isMyTurn}
                  size="lg"
                />
              </div>
            );
          })}
        </div>
      </footer>

      {/* Dubito Modal during challenge window */}
      {room.phase === 'DUBITO_WINDOW' && room.dubitoState && (
        <DubitoModal
          dubitoState={room.dubitoState}
          currentUserId={currentUserId}
          players={room.players}
          boardCards={room.board}
          mode={room.mode}
          onVote={onDubitoVote}
        />
      )}

      {/* Victory / Game Over Modal (Requirement 5: Vittoria a 21 punti) */}
      {(room.phase === 'GAME_OVER' || room.winner) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
          <div className="w-full max-w-md bg-[#1C1C1E] border border-amber-500/40 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
            <span className="text-5xl mb-3 animate-bounce">🏆</span>
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-1">
              Partita Conclusa
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
              {room.lastActionMessage?.includes('abbandonato')
                ? 'Vittoria per Abbandono!'
                : 'Vittoria a 21 Punti!'}
            </h2>
            <div className="w-full p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 my-4 flex flex-col items-center gap-1">
              <span className="text-xs text-zinc-400 uppercase tracking-wider">
                {room.mode === '2v2' ? 'Squadra Vincitrice' : 'Vincitore'}
              </span>
              <span className="text-xl font-bold text-amber-300">
                {room.winner?.winnerNames.join(' & ') || 'Vincitore'}
              </span>
              <span className="text-sm font-mono text-zinc-300 mt-1">
                Punteggio: <strong className="text-white text-base">{room.winner?.score || 0}</strong> pt
              </span>
            </div>

            {room.lastActionMessage && (
              <div className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs text-center mb-4">
                {room.lastActionMessage}
              </div>
            )}

            {room.lastMancheSummary && room.lastMancheSummary.length > 0 && (
              <div className="w-full text-left text-xs text-zinc-400 bg-zinc-950/60 p-3 rounded-xl border border-zinc-900 mb-4 space-y-1">
                <span className="font-semibold text-zinc-300 block mb-1">Riepilogo Ultima Manche:</span>
                {room.lastMancheSummary.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-amber-400">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={onLeaveRoom}
              className="w-full py-3.5 px-6 rounded-full bg-white text-black font-bold text-sm hover:bg-zinc-200 active:scale-95 transition-all shadow-lg"
            >
              Torna alla Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
