import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { RoomState, Move, GameMode, Player } from './types/game';
import { getOrCreatePlayerUser } from './lib/firebase';
import { registraAvviso } from './lib/registro';
import {
  createRoom,
  joinRoom,
  subscribeToRoom,
  startMatch,
  submitCoveredMove,
  submitDubitoVote,
  leaveRoom,
  continueFromMancheSummary,
} from './services/firestoreSync';
import { LobbyView } from './components/LobbyView';
import { registerWebMcpBridge } from './lib/webMcpBridge';

// Il tavolo (con modali e animazioni) è un chunk separato: la lobby si avvia senza scaricarlo.
const caricaGameBoard = () => import('./components/GameBoard');
const GameBoard = lazy(() => caricaGameBoard().then(m => ({ default: m.GameBoard })));

// Identità segnaposto mostrata durante l'idratazione Auth (le azioni restano disabilitate).
const UTENTE_IN_ATTESA = { uid: '' };

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ uid: string } | null>(null);
  const [playerName, setPlayerName] = useState(() => {
    const saved = sessionStorage.getItem('ruspa_player_name');
    if (saved) return saved;
    const defaultName = 'Giocatore ' + Math.floor(1 + Math.random() * 9);
    sessionStorage.setItem('ruspa_player_name', defaultName);
    return defaultName;
  });
  const [playerEmoji, setPlayerEmoji] = useState(() => {
    const saved = sessionStorage.getItem('ruspa_player_emoji');
    if (saved) return saved;
    return '🥳';
  });
  const [currentRoom, setCurrentRoom] = useState<RoomState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ultimo stato ricevuto dalla sorgente autorevole (snapshot Firestore o risposta del servizio):
  // è il punto di ripristino in caso di rifiuto di un aggiornamento ottimistico.
  const stanzaConfermataRef = useRef<RoomState | null>(null);
  // Blocchi per azione: impediscono invii duplicati (doppio tap) mentre la rete è lenta.
  const azioniInCorsoRef = useRef<Set<string>>(new Set());

  const impostaStanzaConfermata = useCallback((room: RoomState | null) => {
    stanzaConfermataRef.current = room;
    azioniInCorsoRef.current.clear();
    setCurrentRoom(room);
  }, []);

  /**
   * Optimistic UI: applica subito lo stato previsto, invia l'azione in background e,
   * in caso di rifiuto, ripristina l'ultimo stato confermato (non quello precedente all'azione,
   * per non sovrascrivere snapshot più recenti arrivati nel frattempo).
   */
  const eseguiAzioneOttimistica = async (
    chiave: string,
    statoOttimistico: RoomState | null,
    azione: () => Promise<void>,
    messaggioErrore: string
  ): Promise<void> => {
    if (azioniInCorsoRef.current.has(chiave)) return;
    azioniInCorsoRef.current.add(chiave);
    if (statoOttimistico) setCurrentRoom(statoOttimistico);
    try {
      await azione();
    } catch (err) {
      if (stanzaConfermataRef.current) setCurrentRoom(stanzaConfermataRef.current);
      setErrorMessage(err instanceof Error && err.message ? err.message : messaggioErrore);
    } finally {
      azioniInCorsoRef.current.delete(chiave);
    }
  };

  // Idratazione Auth non bloccante: la UI viene renderizzata subito, le azioni di rete
  // restano disabilitate finché l'identità non è disponibile (cache IndexedDB o login anonimo).
  useEffect(() => {
    let attivo = true;
    void getOrCreatePlayerUser()
      .then(user => {
        if (attivo) setCurrentUser(user);
      })
      .catch(() => {});
    return () => {
      attivo = false;
    };
  }, []);

  // Save player name to session storage
  const handleUpdatePlayerName = (name: string) => {
    setPlayerName(name);
    sessionStorage.setItem('ruspa_player_name', name);
  };

  // Save player emoji to session storage
  const handleUpdatePlayerEmoji = (emoji: string) => {
    setPlayerEmoji(emoji);
    sessionStorage.setItem('ruspa_player_emoji', emoji);
  };

  // Subscribe to room changes when currentRoom has an ID
  useEffect(() => {
    if (!currentRoom?.roomId) return;

    const unsubscribe = subscribeToRoom(
      currentRoom.roomId,
      updatedRoom => {
        impostaStanzaConfermata(updatedRoom);
      },
      err => {
        setErrorMessage(`Errore sincronizzazione: ${err.message}`);
      }
    );

    return () => unsubscribe();
  }, [currentRoom?.roomId, impostaStanzaConfermata]);

  // Create room
  const handleCreateRoom = async (mode: GameMode) => {
    if (!currentUser) return null;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const hostPlayer: Player = {
        id: currentUser.uid,
        name: playerName.trim() || 'Giocatore 1',
        avatarSeed: playerEmoji,
        team: 1,
        seat: 0,
        isReady: true,
        handCount: 0,
        capturedCount: 0,
        scopaCount: 0,
        score: 0,
        isHost: true,
      };

      const newRoom = await createRoom(hostPlayer, mode);
      impostaStanzaConfermata(newRoom);
      setIsLoading(false);
      return newRoom;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore nella creazione della stanza';
      setErrorMessage(msg);
      setIsLoading(false);
      return null;
    }
  };

  // Join room
  const handleJoinRoom = async (code: string) => {
    if (!currentUser) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const joiningPlayer: Player = {
        id: currentUser.uid,
        name: playerName.trim() || 'Ospite',
        avatarSeed: playerEmoji,
        team: 2,
        seat: 1,
        isReady: true,
        handCount: 0,
        capturedCount: 0,
        scopaCount: 0,
        score: 0,
      };

      const joinedRoom = await joinRoom(code, joiningPlayer);
      if (!joinedRoom) {
        setErrorMessage('Stanza non trovata. Controlla il codice e riprova.');
        setIsLoading(false);
        return;
      }
      impostaStanzaConfermata(joinedRoom);
      setIsLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Errore durante l'accesso alla stanza";
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  // Start match
  const handleStartMatch = async () => {
    if (!currentRoom) return;
    setIsLoading(true);
    try {
      await startMatch(currentRoom.roomId, currentRoom);
      setIsLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Errore durante l'avvio della partita";
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  // Play card move with optimistic local hand update
  const handlePlayMove = async (move: Move) => {
    if (!currentRoom) return;
    // Aggiornamento ottimistico immediato: la carta scompare all'istante dalla mano
    // e, se scartata scoperta, compare subito sul tavolo.
    const currentHand = currentRoom.privateHands?.[move.playerId] || [];
    const updatedHand = currentHand.filter(c => c.id !== move.playedCard.id);
    const optimisticBoard = move.isDiscardFaceUp
      ? [...currentRoom.board, move.playedCard]
      : currentRoom.board;
    const giocatore = currentRoom.players[move.playerId];

    const statoOttimistico: RoomState = {
      ...currentRoom,
      board: optimisticBoard,
      players: giocatore
        ? {
            ...currentRoom.players,
            [move.playerId]: { ...giocatore, handCount: updatedHand.length },
          }
        : currentRoom.players,
      privateHands: {
        ...(currentRoom.privateHands || {}),
        [move.playerId]: updatedHand,
      },
    };

    // Blocco per giocatore: una sola mossa in volo finché non arriva lo snapshot di conferma.
    await eseguiAzioneOttimistica(
      `mossa:${move.playerId}`,
      statoOttimistico,
      () => submitCoveredMove(currentRoom.roomId, currentRoom, move),
      'Errore nella giocata della carta'
    );
  };

  // Dubito / Pass vote
  const handleDubitoVote = async (vote: 'DUBITO' | 'PASSA') => {
    if (!currentRoom || !currentUser) return;
    const { dubitoState } = currentRoom;
    // Il voto si riflette subito sui pulsanti (disabilitati), eliminando i doppi tap
    // che con latenza elevata potevano risolvere due volte la stessa contestazione.
    const statoOttimistico: RoomState | null = dubitoState
      ? {
          ...currentRoom,
          dubitoState: {
            ...dubitoState,
            votes: { ...dubitoState.votes, [currentUser.uid]: vote },
          },
        }
      : null;

    await eseguiAzioneOttimistica(
      `voto:${currentUser.uid}:${dubitoState?.move.timestamp ?? 0}`,
      statoOttimistico,
      () => submitDubitoVote(currentRoom.roomId, currentRoom, currentUser.uid, vote),
      'Errore durante la votazione'
    );
  };

  // Continue to next manche (or game over) from end-of-manche summary
  const handleContinueManche = async () => {
    if (!currentRoom || !currentUser) return;
    const detail = currentRoom.mancheDetail;
    const statoOttimistico: RoomState | null = detail
      ? {
          ...currentRoom,
          mancheDetail: {
            ...detail,
            readyPlayers: { ...detail.readyPlayers, [currentUser.uid]: true },
          },
        }
      : null;

    await eseguiAzioneOttimistica(
      `manche:${currentUser.uid}:${detail?.mancheNumber ?? 0}`,
      statoOttimistico,
      () => continueFromMancheSummary(currentRoom.roomId, currentRoom, currentUser.uid),
      'Errore durante la continuazione della manche'
    );
  };

  // Automated Bot Move handler for bot turns
  useEffect(() => {
    if (
      !currentRoom ||
      currentRoom.phase !== 'PLAYER_TURN' ||
      !currentRoom.currentTurnPlayerId ||
      !currentRoom.currentTurnPlayerId.startsWith('bot_')
    ) {
      return;
    }

    const timer = setTimeout(async () => {
      const botId = currentRoom.currentTurnPlayerId;
      const botHand = currentRoom.privateHands?.[botId] || [];
      if (botHand.length === 0) return;

      const botPlayer = currentRoom.players[botId];
      const board = currentRoom.board || [];

      // 1. Asso -> Ruspa sul tavolo
      const ace = botHand.find(c => c.value === 1);
      if (ace && board.length > 0) {
        const move: Move = {
          playerId: botId,
          playerName: botPlayer?.name || 'Giocatore 8',
          playedCard: ace,
          targetCardIds: board.map(c => c.id),
          isRuspa: true,
          isDiscardFaceUp: false,
          timestamp: Date.now(),
        };
        await handlePlayMove(move);
        return;
      }

      // 2. Presa Singola (Regola prioritaria ufficiale Scopa)
      for (const card of botHand) {
        const matchingBoardCard = board.find(c => c.value === card.value);
        if (matchingBoardCard) {
          const isDeclaredScopa = board.length === 1;
          const move: Move = {
            playerId: botId,
            playerName: botPlayer?.name || 'Giocatore 8',
            playedCard: card,
            targetCardIds: [matchingBoardCard.id],
            isRuspa: false,
            isDiscardFaceUp: false,
            isDeclaredScopa,
            timestamp: Date.now(),
          };
          await handlePlayMove(move);
          return;
        }
      }

      // 3. Presa a Somma (2 o più carte a terra)
      for (const card of botHand) {
        // Somma di 2 carte
        for (let i = 0; i < board.length; i++) {
          for (let j = i + 1; j < board.length; j++) {
            if (board[i].value + board[j].value === card.value) {
              const targetCardIds = [board[i].id, board[j].id];
              const isDeclaredScopa = board.length === 2;
              const move: Move = {
                playerId: botId,
                playerName: botPlayer?.name || 'Giocatore 8',
                playedCard: card,
                targetCardIds,
                isRuspa: false,
                isDiscardFaceUp: false,
                isDeclaredScopa,
                timestamp: Date.now(),
              };
              await handlePlayMove(move);
              return;
            }
          }
        }

        // Somma di 3 carte
        for (let i = 0; i < board.length; i++) {
          for (let j = i + 1; j < board.length; j++) {
            for (let k = j + 1; k < board.length; k++) {
              if (board[i].value + board[j].value + board[k].value === card.value) {
                const targetCardIds = [board[i].id, board[j].id, board[k].id];
                const isDeclaredScopa = board.length === 3;
                const move: Move = {
                  playerId: botId,
                  playerName: botPlayer?.name || 'Giocatore 8',
                  playedCard: card,
                  targetCardIds,
                  isRuspa: false,
                  isDiscardFaceUp: false,
                  isDeclaredScopa,
                  timestamp: Date.now(),
                };
                await handlePlayMove(move);
                return;
              }
            }
          }
        }
      }

      // 4. Nessuna presa possibile -> Scarto a terra scoperto
      const discardCard = botHand[0];
      const move: Move = {
        playerId: botId,
        playerName: botPlayer?.name || 'Giocatore 8',
        playedCard: discardCard,
        targetCardIds: [],
        isRuspa: false,
        isDiscardFaceUp: true,
        timestamp: Date.now(),
      };
      await handlePlayMove(move);
    }, 1200);

    return () => clearTimeout(timer);
  }, [currentRoom]);

  // Automated Bot Dubito Vote handler
  useEffect(() => {
    if (
      !currentRoom ||
      currentRoom.phase !== 'DUBITO_WINDOW' ||
      !currentRoom.dubitoState ||
      currentRoom.dubitoState.status === 'RESOLVED'
    ) {
      return;
    }

    const { dubitoState } = currentRoom;
    const botIds = Object.keys(currentRoom.players).filter(id => id.startsWith('bot_'));
    const pendingBot = botIds.find(
      id => currentRoom.players[id]?.team === dubitoState.targetTeam && !dubitoState.votes[id]
    );

    if (!pendingBot) return;

    const timer = setTimeout(async () => {
      try {
        const isScopa =
          Boolean(dubitoState.move.isDeclaredScopa) ||
          (!dubitoState.move.isRuspa &&
            dubitoState.move.targetCardIds.length === currentRoom.board.length &&
            currentRoom.board.length > 0);
        const isRuspa = Boolean(dubitoState.move.isRuspa);

        // Intelligenza di voto del Bot:
        // - Su Scopa: dubita con alta probabilità (65%) per sfidare e consentire il momento SCOPAE
        // - Su Ruspa: dubita con alta probabilità (65%) per smascherare bluff
        // - Su presa normale: dubita casualmente (25%)
        let botVote: 'DUBITO' | 'PASSA' = 'PASSA';
        const rand = Math.random();
        if (isScopa) {
          botVote = rand < 0.65 ? 'DUBITO' : 'PASSA';
        } else if (isRuspa) {
          botVote = rand < 0.65 ? 'DUBITO' : 'PASSA';
        } else {
          botVote = rand < 0.25 ? 'DUBITO' : 'PASSA';
        }

        await submitDubitoVote(currentRoom.roomId, currentRoom, pendingBot, botVote);
      } catch (err) {
        registraAvviso('Bot vote error:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentRoom]);

  // Register WebMCP bridge for agent automation and testing
  useEffect(() => {
    registerWebMcpBridge({
      currentUser,
      playerName,
      currentRoom,
      onCreateRoom: handleCreateRoom,
      onJoinRoom: handleJoinRoom,
      onStartMatch: handleStartMatch,
      onPlayMove: handlePlayMove,
      onDubitoVote: handleDubitoVote,
    });
  }, [currentUser, playerName, currentRoom]);

  // Prefetch del chunk del tavolo nei momenti di inattività: l'ingresso in partita
  // non deve attendere il download su rete cellulare.
  useEffect(() => {
    const avviaPrefetch = () => {
      void caricaGameBoard();
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(avviaPrefetch, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(avviaPrefetch, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Leave room
  const handleLeaveRoom = async () => {
    if (currentRoom && currentUser) {
      try {
        await leaveRoom(currentRoom.roomId, currentRoom, currentUser.uid);
      } catch (err) {
        registraAvviso('Error leaving room:', err);
      }
    }
    impostaStanzaConfermata(null);
  };

  // If player closes tab during active match, automatically conclude match
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (
        currentRoom &&
        currentRoom.phase &&
        currentRoom.phase !== 'LOBBY' &&
        currentRoom.phase !== 'GAME_OVER' &&
        currentUser
      ) {
        const payload = JSON.stringify({ playerId: currentUser.uid });
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(`/__api/rooms/${currentRoom.roomId}/leave`, payload);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentRoom, currentUser]);

  const schermataCaricamento = (
    <div className="h-[100dvh] w-full bg-black flex items-center justify-center text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-white border-t-transparent animate-spin" />
        <span className="text-xs uppercase tracking-widest text-zinc-500">
          Caricamento tavolo da gioco...
        </span>
      </div>
    </div>
  );

  return (
    <>
      {currentUser && currentRoom?.phase && currentRoom.phase !== 'LOBBY' && currentRoom.players ? (
        <Suspense fallback={schermataCaricamento}>
          <GameBoard
            room={currentRoom}
            currentUserId={currentUser.uid}
            onPlayMove={handlePlayMove}
            onDubitoVote={handleDubitoVote}
            onContinueManche={handleContinueManche}
            onLeaveRoom={handleLeaveRoom}
          />
        </Suspense>
      ) : (
        <LobbyView
          currentRoom={currentRoom}
          currentUser={currentUser ?? UTENTE_IN_ATTESA}
          playerName={playerName}
          setPlayerName={handleUpdatePlayerName}
          playerEmoji={playerEmoji}
          setPlayerEmoji={handleUpdatePlayerEmoji}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onStartMatch={handleStartMatch}
          onLeaveRoom={handleLeaveRoom}
          isLoading={isLoading}
          isConnecting={!currentUser}
          errorMessage={errorMessage}
        />
      )}
    </>
  );
}
