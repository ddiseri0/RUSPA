import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientGameState, Move, Card } from '../engine/types';

export function useMultiplayerGame() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    // Only connect when mounting the hook, we will just use same origin for Vite proxy
    const newSocket = io({ path: '/socket.io' });
    
    newSocket.on('connect', () => {
      setPlayerId(newSocket.id || null);
    });

    newSocket.on('game_state', (newState: ClientGameState) => {
      setState(newState);
      setError(null);
    });

    newSocket.on('error', (msg: string) => {
      setError(msg);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const joinRoom = (roomId: string, playerName: string) => {
    if (socket && socket.connected) {
      socket.emit('join_room', { roomId, playerName });
    }
  };

  const submitMove = (playedCard: Card, targetCards: Card[], isRuspa: boolean) => {
    if (socket && socket.connected && playerId) {
      const move: Move = {
        playerId,
        playedCard,
        targetCards,
        isRuspa,
        timestamp: Date.now()
      };
      socket.emit('play_move', move);
    }
  };

  const dubito = () => {
    if (socket && socket.connected) {
      socket.emit('dubito');
    }
  };

  return { socket, state, error, playerId, joinRoom, submitMove, dubito };
}
