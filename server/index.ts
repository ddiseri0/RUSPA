import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import type { GameState, ClientGameState, Move, Card, EsitoAzione } from '../src/engine/types';
import { createDeck, shuffle, isValidCapture, isValidRuspa } from '../src/engine/GameLogic';

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Ruspa Socket Server works.');
});

/**
 * Configurazione orientata alle reti mobili:
 * - Heartbeat 15s/10s: una connessione morta (cambio Wi-Fi/4G) viene rilevata in ~25s
 *   invece dei ~45s predefiniti, accelerando la riconnessione.
 * - Connection State Recovery: dopo una breve disconnessione il client recupera stanze
 *   e pacchetti persi senza rifare il join né ricevere l'intero stato.
 * - Compressione solo oltre 1 KB: i payload di gioco sono piccoli e comprimerli
 *   costerebbe CPU sui dispositivi senza ridurre in modo apprezzabile la banda.
 */
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 15000,
  pingTimeout: 10000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
  perMessageDeflate: { threshold: 1024 },
});

const rooms: Record<string, GameState> = {};
const roomTimers: Record<string, NodeJS.Timeout> = {};
// Indice giocatore → stanza: evita la scansione lineare di tutte le stanze a ogni evento.
const stanzaDelGiocatore = new Map<string, string>();

const FORMATO_ID_GIOCATORE = /^[A-Za-z0-9_-]{1,64}$/;

/** Identità stabile del giocatore, indipendente dal socket.id che cambia a ogni riconnessione. */
function idGiocatore(socket: Socket): string {
  return socket.data.playerId as string;
}

function rispondi(ack: unknown, esito: EsitoAzione) {
  if (typeof ack === 'function') ack(esito);
}

function sanitizeState(gameState: GameState, playerId: string): ClientGameState {
  return {
    roomId: gameState.roomId!,
    board: gameState.board,
    turnOrder: gameState.turnOrder,
    currentTurn: gameState.currentTurn,
    phase: gameState.phase,
    lastActionMessage: gameState.lastActionMessage,
    deckCount: gameState.deck.length,
    lastCaptureBy: gameState.lastCaptureBy,
    version: gameState.version ?? 0,
    pendingMove: gameState.pendingMove
      ? {
          ...gameState.pendingMove,
          playedCard:
            gameState.pendingMove.playerId === playerId || gameState.phase === 'RESOLUTION'
              ? gameState.pendingMove.playedCard
              : { id: 'hidden', suit: 'denari', value: 0 },
        }
      : null,
    players: Object.fromEntries(
      Object.entries(gameState.players).map(([id, p]) => [
        id,
        {
          id: p.id,
          name: p.name,
          handCount: p.hand.length,
          hand: id === playerId || gameState.phase === 'GAME_OVER' ? p.hand : undefined,
          capturedCount: p.captured.length,
          scopa: p.scopa,
        },
      ])
    ),
  };
}

function broadcastState(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;
  room.version = (room.version ?? 0) + 1;
  io.in(roomId)
    .fetchSockets()
    .then(sockets => {
      for (const socket of sockets) {
        const pid = socket.data.playerId as string;
        if (room.players[pid]) {
          socket.emit('game_state', sanitizeState(room, pid));
        }
      }
    });
}

function dealCards(room: GameState) {
  if (room.deck.length === 0) return false;

  // Deal 3 to each
  for (let i = 0; i < 3; i++) {
    for (const pid of room.turnOrder) {
      if (room.deck.length > 0) {
        room.players[pid].hand.push(room.deck.pop()!);
      }
    }
  }
  return true;
}

function initGame(roomId: string) {
  const room = rooms[roomId];
  room.deck = shuffle(createDeck());
  room.board = [];

  // Try to put 4 cards on board
  for (let i = 0; i < 4; i++) {
    room.board.push(room.deck.pop()!);
  }

  dealCards(room);
  room.phase = 'PLAYER_MOVE';
  room.currentTurn = room.turnOrder[0];
  room.lastActionMessage = 'First round started.';
}

function processCapture(room: GameState, move: Move) {
  const player = room.players[move.playerId];

  // Remove captured cards from board
  room.board = room.board.filter(c => !move.targetCards.find(rc => rc.id === c.id));

  // Move captured + played to user capture pile
  player.captured.push(...move.targetCards, move.playedCard);
  room.lastCaptureBy = move.playerId;

  if (move.isRuspa) {
    player.scopa += 1; // Basic ruspa point
  }

  room.lastActionMessage = `${player.name} ha preso carte.`;
}

function checkNextRound(room: GameState) {
  const allHandsEmpty = room.turnOrder.every(pid => room.players[pid].hand.length === 0);

  if (allHandsEmpty) {
    if (room.deck.length > 0) {
      dealCards(room);
      room.lastActionMessage += ' Nuove carte distribuite.';
    } else {
      // Game Over, give remaining board to last capture
      if (room.lastCaptureBy && room.board.length > 0) {
        room.players[room.lastCaptureBy].captured.push(...room.board);
        room.board = [];
      }
      room.phase = 'GAME_OVER';
      room.lastActionMessage += ' Partita terminata!';
      return;
    }
  }
  room.phase = 'PLAYER_MOVE';
  // next player
  room.currentTurn = room.turnOrder.find(id => id !== room.currentTurn) || room.turnOrder[0];
}

function resolvePendingMove(roomId: string) {
  const room = rooms[roomId];
  if (!room || !room.pendingMove) return;

  const move = room.pendingMove;
  const player = room.players[move.playerId];

  if (move.targetCards.length > 0) {
    processCapture(room, move);
  } else {
    // Just a discard
    room.board.push(move.playedCard);
    room.lastActionMessage = `${player.name} ha scartato una carta.`;
  }

  // Remove from hand
  player.hand = player.hand.filter(c => c.id !== move.playedCard.id);

  room.pendingMove = null;
  checkNextRound(room);
  broadcastState(roomId);
}

function handleDubito(roomId: string, accuserId: string) {
  const room = rooms[roomId];
  if (!room || !room.pendingMove || room.phase !== 'CHALLENGE_WINDOW') return;

  clearTimeout(roomTimers[roomId]);
  room.phase = 'RESOLUTION';

  const move = room.pendingMove;
  const player = room.players[move.playerId];
  const accuser = room.players[accuserId];

  // Remove the card from player hand anyway as it was played
  player.hand = player.hand.filter(c => c.id !== move.playedCard.id);

  const playedValue = move.playedCard.value;
  const targetValues = move.targetCards.map(c => c.value);

  const isCaptureValid =
    move.targetCards.length === 0 ? true : isValidCapture(playedValue, targetValues);
  const isRuspaClaimedAndValid = move.isRuspa
    ? isValidRuspa(playedValue, targetValues.length, room.board.length)
    : true;
  const isValid = isCaptureValid && isRuspaClaimedAndValid;

  if (isValid) {
    // DUBITO ERRATO
    if (move.targetCards.length > 0) {
      processCapture(room, move);
    } else {
      room.board.push(move.playedCard);
    }
    // penalty: player gets +1 scopa
    player.scopa += 1;
    room.lastActionMessage = `DUBITO errato di ${accuser.name}! ${player.name} guadagna 1 punto bonus.`;
  } else {
    // DUBITO CORRETTO (BLUFF)
    // forced discard
    room.board.push(move.playedCard);

    // Penalties
    if (move.isRuspa) {
      const isAsso = playedValue === 1; // Asso
      if (isAsso) {
        accuser.scopa += 2;
        room.lastActionMessage = `DUBITO corretto di ${accuser.name} contro Asso! +2 punti. Carta scartata.`;
      } else {
        accuser.scopa += 1;
        room.lastActionMessage = `DUBITO corretto di ${accuser.name}! +1 punto. Carta scartata.`;
      }
    } else {
      room.lastActionMessage = `DUBITO corretto di ${accuser.name}! Bluff sventato, carta scartata.`;
    }
  }

  room.pendingMove = null;
  checkNextRound(room);
  broadcastState(roomId);
}

const IN_SVILUPPO = process.env.NODE_ENV !== 'production';
function registra(...argomenti: unknown[]) {
  if (IN_SVILUPPO) console.warn(...argomenti);
}

io.use((socket, next) => {
  const richiesto = (socket.handshake.auth as { playerId?: unknown } | undefined)?.playerId;
  socket.data.playerId =
    typeof richiesto === 'string' && FORMATO_ID_GIOCATORE.test(richiesto) ? richiesto : socket.id;
  next();
});

io.on('connection', (socket: Socket) => {
  const pid = idGiocatore(socket);
  registra('User connected:', pid, socket.recovered ? '(sessione ripristinata)' : '');

  socket.on('join_room', (payload: { roomId?: unknown; playerName?: unknown }, ack?: unknown) => {
    const roomId = typeof payload?.roomId === 'string' ? payload.roomId.slice(0, 64) : '';
    const playerName =
      typeof payload?.playerName === 'string' ? payload.playerName.slice(0, 32) : 'Giocatore';
    if (!roomId) {
      rispondi(ack, { ok: false, error: 'Stanza non valida' });
      return;
    }

    if (!rooms[roomId]) {
      rooms[roomId] = {
        roomId,
        board: [],
        players: {},
        turnOrder: [],
        currentTurn: '',
        phase: 'IDLE',
        pendingMove: null,
        lastActionMessage: 'Waiting for opponent...',
        deck: [],
        lastCaptureBy: null,
        version: 0,
        lastMoveId: null,
      };
    }

    const room = rooms[roomId];

    if (room.turnOrder.length >= 2 && !room.turnOrder.includes(pid)) {
      socket.emit('error', 'Room is full');
      rispondi(ack, { ok: false, error: 'Room is full' });
      return;
    }

    socket.join(roomId);
    stanzaDelGiocatore.set(pid, roomId);

    // Rientro dopo una riconnessione: posto, mano e punteggio restano invariati.
    if (!room.turnOrder.includes(pid)) {
      room.players[pid] = {
        id: pid,
        name: playerName,
        hand: [],
        captured: [],
        scopa: 0,
      };
      room.turnOrder.push(pid);
    }

    if (room.turnOrder.length === 2 && room.phase === 'IDLE') {
      initGame(roomId);
    }

    rispondi(ack, { ok: true });
    broadcastState(roomId);
  });

  socket.on('sync_request', () => {
    const roomId = stanzaDelGiocatore.get(pid);
    const room = roomId ? rooms[roomId] : undefined;
    if (room && room.players[pid]) {
      socket.emit('game_state', sanitizeState(room, pid));
    }
  });

  socket.on('play_move', (move: Move, ack?: unknown) => {
    const roomId = stanzaDelGiocatore.get(pid);
    const room = roomId ? rooms[roomId] : undefined;
    if (!roomId || !room) {
      rispondi(ack, { ok: false, error: 'Stanza non trovata' });
      return;
    }

    // Reinvio della stessa mossa dopo un timeout di rete: già applicata, si conferma.
    if (move?.moveId && room.lastMoveId === move.moveId) {
      rispondi(ack, { ok: true });
      return;
    }

    if (room.currentTurn !== pid || room.phase !== 'PLAYER_MOVE') {
      rispondi(ack, { ok: false, error: 'Non è il tuo turno' });
      return;
    }

    // Le carte vengono risolte sullo stato del server: il client non può inventarne di nuove.
    const player = room.players[pid];
    const cartaGiocata = player.hand.find(c => c.id === move?.playedCard?.id);
    const bersagli = Array.isArray(move?.targetCards) ? move.targetCards : [];
    const carteBersaglio = bersagli
      .map(t => room.board.find(c => c.id === t?.id))
      .filter((c): c is Card => Boolean(c));
    if (!cartaGiocata || carteBersaglio.length !== bersagli.length) {
      rispondi(ack, { ok: false, error: 'Mossa non valida' });
      return;
    }

    room.pendingMove = {
      playerId: pid,
      playedCard: cartaGiocata,
      targetCards: carteBersaglio,
      isRuspa: Boolean(move.isRuspa),
      timestamp: Date.now(),
      moveId: move.moveId,
    };
    room.lastMoveId = move.moveId ?? null;
    room.phase = 'CHALLENGE_WINDOW';
    room.lastActionMessage = `${player.name} ha giocato...`;

    rispondi(ack, { ok: true });
    broadcastState(roomId);

    // 5 seconds challenge window
    clearTimeout(roomTimers[roomId]);
    roomTimers[roomId] = setTimeout(() => {
      delete roomTimers[roomId];
      resolvePendingMove(roomId);
    }, 5000);
  });

  socket.on('dubito', (ack?: unknown) => {
    const roomId = stanzaDelGiocatore.get(pid);
    const room = roomId ? rooms[roomId] : undefined;
    if (!roomId || !room) {
      rispondi(ack, { ok: false, error: 'Stanza non trovata' });
      return;
    }
    if (room.phase !== 'CHALLENGE_WINDOW' || room.pendingMove?.playerId === pid) {
      rispondi(ack, { ok: false, error: 'Finestra di sfida chiusa' });
      return;
    }

    rispondi(ack, { ok: true });
    handleDubito(roomId, pid);
  });

  socket.on('disconnect', reason => {
    // Il giocatore resta nella stanza: potrà rientrare con la stessa identità.
    registra('User disconnected:', pid, reason);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  registra(`Server listening on port ${PORT}`);
});
