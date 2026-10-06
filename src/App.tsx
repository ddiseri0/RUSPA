import { useState, useEffect } from 'react';
import { RoomState, Move, GameMode, Player } from './types/game';
import { getOrCreatePlayerUser } from './lib/firebase';
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
import { GameBoard } from './components/GameBoard';
import { McpDebugPanel } from './components/McpDebugPanel';
import { registerWebMcpBridge } from './lib/webMcpBridge';

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ uid: string } | null>(null);
  const [playerName, setPlayerName] = useState(() => {
    const saved = sessionStorage.getItem('ruspa_player_name');
    if (saved) return saved;
    const defaultName = 'Giocatore ' + Math.floor(1 + Math.random() * 9);
    sessionStorage.setItem('ruspa_player_name', defaultName);
    return defaultName;
  });
  const [currentRoom, setCurrentRoom] = useState<RoomState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Anonymous Firebase Auth / User
  useEffect(() => {
    getOrCreatePlayerUser().then((user) => {
      setCurrentUser(user);
    });
  }, []);

  // Save player name to session storage
  const handleUpdatePlayerName = (name: string) => {
    setPlayerName(name);
    sessionStorage.setItem('ruspa_player_name', name);
  };

  // Subscribe to room changes when currentRoom has an ID
  useEffect(() => {
    if (!currentRoom?.roomId) return;

    const unsubscribe = subscribeToRoom(
      currentRoom.roomId,
      (updatedRoom) => {
        setCurrentRoom(updatedRoom);
      },
      (err) => {
        setErrorMessage(`Errore sincronizzazione: ${err.message}`);
      }
    );

    return () => unsubscribe();
  }, [currentRoom?.roomId]);

  // Create room
  const handleCreateRoom = async (mode: GameMode) => {
    if (!currentUser) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const hostPlayer: Player = {
        id: currentUser.uid,
        name: playerName.trim() || 'Giocatore 1',
        avatarSeed: currentUser.uid,
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
      setCurrentRoom(newRoom);
      setIsLoading(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore nella creazione della stanza');
      setIsLoading(false);
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
        avatarSeed: currentUser.uid,
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
      setCurrentRoom(joinedRoom);
      setIsLoading(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Errore durante l'accesso alla stanza");
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
    } catch (err: any) {
      setErrorMessage(err.message || "Errore durante l'avvio della partita");
      setIsLoading(false);
    }
  };

  // Play card move with optimistic local hand update
  const handlePlayMove = async (move: Move) => {
    if (!currentRoom) return;
    try {
      // Aggiornamento ottimistico immediato: la carta scompare all'istante dalla mano
      const currentHand = currentRoom.privateHands?.[move.playerId] || [];
      const updatedHand = currentHand.filter((c) => c.id !== move.playedCard.id);
      const optimisticBoard = move.isDiscardFaceUp
        ? [...currentRoom.board, move.playedCard]
        : currentRoom.board;

      setCurrentRoom({
        ...currentRoom,
        board: optimisticBoard,
        privateHands: {
          ...(currentRoom.privateHands || {}),
          [move.playerId]: updatedHand,
        },
      });

      await submitCoveredMove(currentRoom.roomId, currentRoom, move);
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore nella giocata della carta');
    }
  };

  // Dubito / Pass vote
  const handleDubitoVote = async (vote: 'DUBITO' | 'PASSA') => {
    if (!currentRoom || !currentUser) return;
    try {
      await submitDubitoVote(currentRoom.roomId, currentRoom, currentUser.uid, vote);
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore durante la votazione');
    }
  };

  // Continue to next manche (or game over) from end-of-manche summary
  const handleContinueManche = async () => {
    if (!currentRoom || !currentUser) return;
    try {
      await continueFromMancheSummary(currentRoom.roomId, currentRoom, currentUser.uid);
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore durante la continuazione della manche');
    }
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
      const ace = botHand.find((c) => c.value === 1);
      if (ace && board.length > 0) {
        const move: Move = {
          playerId: botId,
          playerName: botPlayer?.name || 'Giocatore 8',
          playedCard: ace,
          targetCardIds: board.map((c) => c.id),
          isRuspa: true,
          isDiscardFaceUp: false,
          timestamp: Date.now(),
        };
        await handlePlayMove(move);
        return;
      }

      // 2. Presa Singola (Regola prioritaria ufficiale Scopa)
      for (const card of botHand) {
        const matchingBoardCard = board.find((c) => c.value === card.value);
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
      !currentRoom.dubitoState
    ) {
      return;
    }

    const { dubitoState } = currentRoom;
    const botIds = Object.keys(currentRoom.players).filter((id) => id.startsWith('bot_'));
    const pendingBot = botIds.find(
      (id) =>
        currentRoom.players[id]?.team === dubitoState.targetTeam &&
        !dubitoState.votes[id]
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
        console.warn('Bot vote error:', err);
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

  // Leave room
  const handleLeaveRoom = async () => {
    if (currentRoom && currentUser) {
      try {
        await leaveRoom(currentRoom.roomId, currentRoom, currentUser.uid);
      } catch (err) {
        console.warn('Error leaving room:', err);
      }
    }
    setCurrentRoom(null);
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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-white border-t-transparent animate-spin" />
          <span className="text-xs uppercase tracking-widest text-zinc-500">
            Connessione a RUSPA...
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentRoom && currentRoom.phase && currentRoom.phase !== 'LOBBY' && currentRoom.players ? (
        <GameBoard
          room={currentRoom}
          currentUserId={currentUser.uid}
          onPlayMove={handlePlayMove}
          onDubitoVote={handleDubitoVote}
          onContinueManche={handleContinueManche}
          onLeaveRoom={handleLeaveRoom}
        />
      ) : (
        <LobbyView
          currentRoom={currentRoom}
          currentUser={currentUser}
          playerName={playerName}
          setPlayerName={handleUpdatePlayerName}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onStartMatch={handleStartMatch}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      )}
      <McpDebugPanel />
    </>
  );
}
