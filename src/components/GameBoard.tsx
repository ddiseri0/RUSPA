import React, { useState } from 'react';
import { RoomState, Card, Move } from '../types/game';
import { CardView } from './CardView';
import { CardBack } from './CardBack';
import { PlayerTopPill, PlayerSquareCard } from './PlayerAvatar';
import { DubitoModal } from './DubitoModal';
import { ScopaeAnimation } from './ScopaeAnimation';
import { getCardLabel } from '../engine/scopaRules';

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
  const [dismissedScopaeTimestamp, setDismissedScopaeTimestamp] = useState<number | null>(null);

  if (!room || !room.players || !room.players[currentUserId]) {
    return (
      <div className="h-[100dvh] w-full bg-black flex items-center justify-center text-white">
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

  const currentSelectedSum = selectedBoardCards.reduce((acc, c) => acc + c.value, 0);

  // Toggle selection of target cards on the board (somma max 10)
  const toggleBoardCard = (card: Card) => {
    if (!isMyTurn) return;
    const isAlreadySelected = selectedBoardCards.some((c) => c.id === card.id);
    if (isAlreadySelected) {
      setSelectedBoardCards(selectedBoardCards.filter((c) => c.id !== card.id));
    } else {
      // In Scopa la somma delle carte prese da terra non può mai superare 10
      const currentSum = selectedBoardCards.reduce((acc, c) => acc + c.value, 0);
      if (currentSum + card.value > 10) {
        return;
      }
      setSelectedBoardCards([...selectedBoardCards, card]);
    }
  };

  const isAce = selectedHandCard?.value === 1;

  // 1. Gioca Ruspa (Asso o Bluff diretto senza conferme)
  const handlePlayRuspa = () => {
    if (!selectedHandCard || !isMyTurn) return;
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
    setSelectedHandCard(null);
    setSelectedBoardCards([]);
  };

  // 2. Gioca Presa (Normale o Dichiara Scopa)
  const handlePlayCapture = () => {
    if (!selectedHandCard || !isMyTurn || selectedBoardCards.length === 0) return;

    const isDeclaredScopa =
      room.board.length > 0 && selectedBoardCards.length === room.board.length;

    // Regola Ufficiale: Priorità Presa Singola per prese parziali
    const cartaSingolaPresente = room.board.some((c) => c.value === selectedHandCard.value);
    if (!isDeclaredScopa && cartaSingolaPresente && selectedBoardCards.length > 1) {
      alert(
        `Regola Ufficiale: È presente a terra una carta di valore ${selectedHandCard.value} (${getCardLabel(
          selectedHandCard.value
        )}). La presa della carta singola è obbligatoria rispetto alla somma!`
      );
      return;
    }

    const move: Move = {
      playerId: currentUserId,
      playerName: currentUser?.name || 'Giocatore',
      playedCard: selectedHandCard,
      targetCardIds: selectedBoardCards.map((c) => c.id),
      isRuspa: false,
      isDiscardFaceUp: false,
      isDeclaredScopa,
      timestamp: Date.now(),
    };
    onPlayMove(move);
    setSelectedHandCard(null);
    setSelectedBoardCards([]);
  };

  // 3. Scarta a terra (scoperta)
  const handlePlayDiscard = () => {
    if (!selectedHandCard || !isMyTurn) return;
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
    setSelectedHandCard(null);
    setSelectedBoardCards([]);
  };

  // Opponent player for top pill
  const otherPlayers = Object.values(room.players).filter((p) => p.id !== currentUserId);
  const primaryOpponent = otherPlayers[0] || {
    id: 'opp_8',
    name: 'Giocatore 8',
    avatarSeed: 'opp_8',
    handCount: 3,
    score: 0,
    scopaCount: 0,
    team: 2,
    seat: 1,
    isReady: true,
    capturedCount: 0,
  };

  const hasSelectedCard = Boolean(selectedHandCard && isMyTurn);
  const isAllBoardSelected =
    room.board.length > 0 && selectedBoardCards.length === room.board.length;

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-black text-white flex flex-col justify-between p-3 sm:p-5 md:p-6 select-none overflow-hidden font-sans">
      
      {/* TOP SECTION: Responsive Header & Opponent Card */}
      <div className="w-full max-w-4xl mx-auto flex flex-col shrink-0">
        
        {/* Navigation Header */}
        <div className="w-full flex items-center justify-between px-1 py-1">
          {/* Back Button `<` */}
          <button
            onClick={() => {
              if (room.phase !== 'GAME_OVER') {
                const confirmLeave = window.confirm(
                  'Sei sicuro di voler abbandonare la partita?'
                );
                if (!confirmLeave) return;
              }
              onLeaveRoom();
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1C1C1E] border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors active:scale-95 shrink-0 cursor-pointer"
            title="Esci"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-300"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Center Title & Subtitle */}
          <div className="flex flex-col items-center text-center">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
              Scopa
            </h1>
            <span className="text-[11px] sm:text-xs text-zinc-500 font-medium leading-tight">
              Stanza {room.code || '2YQUM8'} · Manche {room.mancheNumber || 1}
            </span>
          </div>

          {/* Right Deck Pill */}
          <div className="px-3.5 py-1.5 rounded-full bg-[#1C1C1E] border border-zinc-800 font-mono text-xs sm:text-sm font-semibold text-zinc-400 shrink-0">
            {room.deckRemaining ?? 30}/40
          </div>
        </div>

        {/* Opponent Card (Giocatore 8 in alto) */}
        <div className="w-full mt-2 sm:mt-3">
          <PlayerTopPill
            player={primaryOpponent}
            isCurrentTurn={room.currentTurnPlayerId === primaryOpponent.id}
          />
        </div>
      </div>

      {/* CARTE SUL TAVOLO (BOARD) CENTRATE ARMONICAMENTE SULL'ASSE VERTICALE */}
      <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col items-center justify-center my-auto px-2 relative min-h-0">
        {/* Table section label */}
        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3 select-none">
          TAVOLO
        </span>

        {/* Cards on the Board in clean horizontal alignment */}
        <div className="flex items-center justify-center gap-2.5 sm:gap-4 md:gap-5 w-full flex-wrap">
          {room.pendingMove && (
            <div className="relative z-50 flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-rose-400 font-semibold uppercase tracking-wider">
                Coperta
              </span>
              <CardBack size="md" isPendingDoubt />
            </div>
          )}

          {room.board.length === 0 && !room.pendingMove ? (
            <div className="text-xs sm:text-sm text-zinc-600 uppercase tracking-widest py-8">
              Tavolo vuoto
            </div>
          ) : (
            room.board.map((card) => {
              const isTargeted = selectedBoardCards.some((c) => c.id === card.id);
              const exceedsTenIfAdded = !isTargeted && (currentSelectedSum + card.value > 10);

              return (
                <div key={card.id} className="relative transition-all duration-200">
                  <CardView
                    card={card}
                    targetSelected={isTargeted}
                    onClick={() => toggleBoardCard(card)}
                    disabled={!isMyTurn || exceedsTenIfAdded}
                    size="md"
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Status Pill: "• Tocca a te · Scegli una carta" */}
        <div className="mt-4 sm:mt-5 px-4 sm:px-5 py-1.5 rounded-full bg-[#182310] border border-[#2e401b] flex items-center justify-center shadow-sm select-none">
          <span className="text-xs sm:text-sm font-medium text-[#C6EF68] tracking-wide">
            • {isMyTurn ? 'Tocca a te · Scegli una carta' : `Turno di ${primaryOpponent.name} · In attesa`}
          </span>
        </div>
      </div>

      {/* RIGA AZIONI DINAMICA: NESSUNA DUPLICAZIONE, SOLO LE AZIONI APPLICABILI */}
      <div className="w-full max-w-2xl mx-auto px-2 flex items-center justify-center gap-3 my-2 z-20 shrink-0 min-h-[48px]">
        {hasSelectedCard && (
          isAce ? (
            /* 1. SELEZIONATO UN ASSO: L'Asso può fare solo Ruspa. Unico pulsante presente! */
            <button
              onClick={handlePlayRuspa}
              className="py-3 px-8 rounded-full font-bold text-xs sm:text-sm tracking-wide bg-amber-400 text-black hover:bg-amber-300 shadow-glow-gold active:scale-95 transition-all cursor-pointer"
            >
              Ruspa
            </button>
          ) : isAllBoardSelected ? (
            /* 2. TUTTE LE CARTE A TERRA SELEZIONATE: Unico pulsante presente è 'Dichiara Scopa' */
            <button
              onClick={handlePlayCapture}
              className="py-3 px-8 rounded-full font-bold text-xs sm:text-sm tracking-wide bg-[#C6EF68] text-black hover:bg-[#b5dc52] shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              Dichiara Scopa
            </button>
          ) : selectedBoardCards.length > 0 ? (
            /* 3. ALMENO UNA CARTA A TERRA SELEZIONATA: La ruspa sparisce, unico tasto è 'Prendi Carta' */
            <button
              onClick={handlePlayCapture}
              className="py-3 px-8 rounded-full font-bold text-xs sm:text-sm tracking-wide bg-white text-black hover:bg-zinc-200 shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              Prendi {selectedBoardCards.length > 1 ? `${selectedBoardCards.length} Carte` : 'Carta'}
            </button>
          ) : (
            /* 4. NESSUNA CARTA A TERRA SELEZIONATA: Scarta a terra oppure Bluffa Ruspa (esegue subito al click) */
            <>
              <button
                onClick={handlePlayDiscard}
                className="py-3 px-7 rounded-full font-bold text-xs sm:text-sm tracking-wide bg-white text-black hover:bg-zinc-200 shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                Scarta a terra
              </button>
              <button
                onClick={handlePlayRuspa}
                className="py-3 px-6 rounded-full font-medium text-xs sm:text-sm tracking-wide bg-[#1C1C1E] text-zinc-300 border border-zinc-700 hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
              >
                Bluffa Ruspa
              </button>
            </>
          )
        )}
      </div>

      {/* BOTTOM SECTION: MANO GIOCATORE (BOTTOM-LEFT) & CARD QUADRATA GIOCATORE 3 (BOTTOM-RIGHT) */}
      <div className="w-full max-w-4xl mx-auto flex items-end justify-between px-1 pb-1 pt-1 gap-3 relative shrink-0">
        
        {/* MANO DEL GIOCATORE (BOTTOM-LEFT, INGRANDITA FINO AL BORDO SINISTRO) */}
        <div className="flex-1 flex items-end -space-x-3 sm:-space-x-4 md:-space-x-2 overflow-visible pl-0.5">
          {userHand.map((card, idx) => {
            const isSelected = selectedHandCard?.id === card.id;
            // Fan rotation: left card -3.5deg, middle 0deg, right +3.5deg
            const rotationAngle = (idx - 1) * 3.5;

            return (
              <div
                key={card.id}
                style={{ zIndex: isSelected ? 35 : 10 + idx }}
                className="relative transition-all duration-200"
              >
                <CardView
                  card={card}
                  selected={isSelected}
                  rotation={rotationAngle}
                  onClick={() => {
                    if (!isMyTurn) return;
                    if (isSelected) {
                      setSelectedHandCard(null);
                      setSelectedBoardCards([]);
                    } else {
                      setSelectedHandCard(card);
                    }
                  }}
                  disabled={!isMyTurn}
                  size="lg"
                />
              </div>
            );
          })}
        </div>

        {/* CARD QUADRATA GIOCATORE 3 (BOTTOM-RIGHT, ZERO ICONE) */}
        <PlayerSquareCard
          player={currentUser}
          isCurrentTurn={room.currentTurnPlayerId === currentUserId}
        />
      </div>

      {/* Celebratory SCOPAE Animation (+2 Points) */}
      {room.scopaeEvent && room.scopaeEvent.timestamp !== dismissedScopaeTimestamp && (
        <ScopaeAnimation
          event={room.scopaeEvent}
          currentUserId={currentUserId}
          onDismiss={() => {
            if (room.scopaeEvent) {
              setDismissedScopaeTimestamp(room.scopaeEvent.timestamp);
            }
          }}
        />
      )}

      {/* Dubito Modal during challenge window (10s timer, no icons, focused on target cards) */}
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

      {/* Victory / Game Over Modal */}
      {(room.phase === 'GAME_OVER' || room.winner) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
          <div className="w-full max-w-md bg-[#1C1C1E] border border-amber-500/40 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
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
                <span className="font-semibold text-zinc-300 block mb-1">
                  Riepilogo Ultima Manche:
                </span>
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
              className="w-full py-3.5 px-6 rounded-full bg-white text-black font-bold text-sm hover:bg-zinc-200 active:scale-95 transition-all shadow-lg cursor-pointer"
            >
              Torna alla Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
