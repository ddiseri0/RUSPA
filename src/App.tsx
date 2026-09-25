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

  // Play covered card move
  const handlePlayMove = async (move: Move) => {
    if (!currentRoom) return;
    try {
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
