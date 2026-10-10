import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientGameState, Move, Card, EsitoAzione } from '../engine/types';

/**
 * Parametri di rete calibrati per reti mobili instabili:
 * - WebSocket diretto (niente handshake HTTP long-polling + upgrade: 2-3 RTT in meno),
 *   con ripiego automatico sul polling se il WebSocket è bloccato da proxy/operatore.
 * - Riconnessione illimitata con backoff esponenziale 0.5s → 10s e jitter del 50%,
 *   per evitare tempeste di riconnessioni sincronizzate dopo un cambio Wi-Fi/4G.
 */
const OPZIONI_SOCKET = {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  tryAllTransports: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 10000,
  randomizationFactor: 0.5,
  timeout: 8000,
} as const;

const TIMEOUT_ACK_MS = 5000;
const CHIAVE_ID_GIOCATORE = 'ruspa_socket_player_id';

export type StatoConnessione = 'connesso' | 'riconnessione' | 'disconnesso';

function generaTokenSicuro(prefisso: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefisso}_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;
  }
  return `${prefisso}_${Date.now().toString(36)}`;
}

function ottieniIdGiocatoreStabile(): string {
  let id = sessionStorage.getItem(CHIAVE_ID_GIOCATORE);
  if (!id) {
    id = generaTokenSicuro('sck');
    sessionStorage.setItem(CHIAVE_ID_GIOCATORE, id);
  }
  return id;
}

function generaIdMossa(): string {
  return generaTokenSicuro('mov');
}

export function useMultiplayerGame() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  // L'identità non coincide più con socket.id (che cambia a ogni riconnessione):
  // il server mantiene posto e mano del giocatore anche dopo un cambio di rete.
  const [playerId] = useState<string>(ottieniIdGiocatoreStabile);
  const [connectionStatus, setConnectionStatus] = useState<StatoConnessione>('disconnesso');

  const statoConfermatoRef = useRef<ClientGameState | null>(null);
  const ultimaStanzaRef = useRef<{ roomId: string; playerName: string } | null>(null);
  const azioneInVoloRef = useRef(false);

  useEffect(() => {
    // Only connect when mounting the hook, we will just use same origin for Vite proxy
    const newSocket = io({
      ...OPZIONI_SOCKET,
      transports: [...OPZIONI_SOCKET.transports],
      auth: { playerId },
    });

    newSocket.on('connect', () => {
      setConnectionStatus('connesso');
      // Se il server non ha potuto ripristinare la sessione, si rientra nella stanza in modo idempotente.
      if (!newSocket.recovered && ultimaStanzaRef.current) {
        newSocket.emit('join_room', ultimaStanzaRef.current);
      }
    });

    newSocket.on('disconnect', reason => {
      // Disconnessione volontaria del server: la riconnessione automatica non scatta da sola.
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
      setConnectionStatus(newSocket.active ? 'riconnessione' : 'disconnesso');
    });

    newSocket.io.on('reconnect_attempt', () => setConnectionStatus('riconnessione'));

    newSocket.on('game_state', (newState: ClientGameState) => {
      const corrente = statoConfermatoRef.current;
      // Scarta stati obsoleti consegnati fuori ordine (es. buffer di una connessione precedente).
      if (corrente?.roomId === newState.roomId && newState.version < corrente.version) {
        return;
      }
      statoConfermatoRef.current = newState;
      azioneInVoloRef.current = false;
      setState(newState);
      setError(null);
    });

    newSocket.on('error', (msg: string) => {
      setError(msg);
    });

    // Al ritorno della rete o dell'app in primo piano si salta l'attesa del backoff.
    const riconnettiSubito = () => {
      if (!newSocket.connected) newSocket.connect();
    };
    const gestisciVisibilita = () => {
      if (document.visibilityState === 'visible') riconnettiSubito();
    };
    window.addEventListener('online', riconnettiSubito);
    document.addEventListener('visibilitychange', gestisciVisibilita);

    setSocket(newSocket);

    return () => {
      window.removeEventListener('online', riconnettiSubito);
      document.removeEventListener('visibilitychange', gestisciVisibilita);
      newSocket.removeAllListeners();
      newSocket.io.removeAllListeners();
      newSocket.close();
    };
  }, [playerId]);

  /** Ripristina l'ultimo stato confermato dal server e richiede una risincronizzazione. */
  const annullaOttimismo = useCallback(
    (messaggio: string) => {
      azioneInVoloRef.current = false;
      setState(statoConfermatoRef.current);
      setError(messaggio);
      socket?.emit('sync_request');
    },
    [socket]
  );

  const joinRoom = useCallback(
    (roomId: string, playerName: string) => {
      ultimaStanzaRef.current = { roomId, playerName };
      // Socket.io bufferizza l'evento se la connessione non è ancora aperta.
      socket?.emit('join_room', { roomId, playerName });
    },
    [socket]
  );

  /**
   * Optimistic UI: la carta lascia subito la mano e la finestra di sfida si apre localmente;
   * il server conferma via ack. In caso di rifiuto o timeout si ripristina lo stato confermato.
   */
  const submitMove = useCallback(
    (playedCard: Card, targetCards: Card[], isRuspa: boolean) => {
      const corrente = statoConfermatoRef.current;
      if (!socket || !corrente || azioneInVoloRef.current) return;
      if (corrente.currentTurn !== playerId || corrente.phase !== 'PLAYER_MOVE') return;

      const move: Move = {
        playerId,
        playedCard,
        targetCards,
        isRuspa,
        timestamp: Date.now(),
        moveId: generaIdMossa(),
      };

      const mioGiocatore = corrente.players[playerId];
      const manoAggiornata = (mioGiocatore?.hand || []).filter(c => c.id !== playedCard.id);
      azioneInVoloRef.current = true;
      setState({
        ...corrente,
        phase: 'CHALLENGE_WINDOW',
        pendingMove: move,
        players: mioGiocatore
          ? {
              ...corrente.players,
              [playerId]: {
                ...mioGiocatore,
                hand: manoAggiornata,
                handCount: manoAggiornata.length,
              },
            }
          : corrente.players,
      });

      socket
        .timeout(TIMEOUT_ACK_MS)
        .emit('play_move', move, (err: Error | null, esito?: EsitoAzione) => {
          if (err) {
            annullaOttimismo('Connessione lenta: mossa non confermata, riprova.');
          } else if (!esito?.ok) {
            annullaOttimismo(esito?.error || 'Mossa rifiutata dal server');
          }
        });
    },
    [socket, playerId, annullaOttimismo]
  );

  const dubito = useCallback(() => {
    const corrente = statoConfermatoRef.current;
    if (!socket || !corrente || azioneInVoloRef.current) return;
    if (corrente.phase !== 'CHALLENGE_WINDOW') return;

    azioneInVoloRef.current = true;
    setState({ ...corrente, phase: 'RESOLUTION' });

    socket.timeout(TIMEOUT_ACK_MS).emit('dubito', (err: Error | null, esito?: EsitoAzione) => {
      if (err) {
        annullaOttimismo('Connessione lenta: Dubito non confermato.');
      } else if (!esito?.ok) {
        annullaOttimismo(esito?.error || 'Dubito rifiutato dal server');
      }
    });
  }, [socket, annullaOttimismo]);

  return { socket, state, error, playerId, connectionStatus, joinRoom, submitMove, dubito };
}
