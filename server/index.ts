import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import type { GameState, ClientGameState, Move } from '../src/engine/types';
import { createDeck, shuffle, isValidCapture, isValidRuspa } from '../src/engine/GameLogic';

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Ruspa Socket Server works.');
});

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms: Record<string, GameState> = {};
const roomTimers: Record<string, NodeJS.Timeout> = {};

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
    pendingMove: gameState.pendingMove ? {
      ...gameState.pendingMove,
      playedCard: gameState.pendingMove.playerId === playerId || gameState.phase === 'RESOLUTION' 
        ? gameState.pendingMove.playedCard 
        : { id: 'hidden', suit: 'denari', value: 0 }
    } : null,
    players: Object.fromEntries(
      Object.entries(gameState.players).map(([id, p]) => [
        id,
        {
          id: p.id,
          name: p.name,
          handCount: p.hand.length,
          hand: id === playerId || gameState.phase === 'GAME_OVER' ? p.hand : undefined,
          capturedCount: p.captured.length,
          scopa: p.scopa
        }
      ])
    )
  };
}

function broadcastState(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;
  io.to(roomId).socketsJoin(roomId); // Ensure they are in the room just in case
  io.in(roomId).fetchSockets().then(sockets => {
    for (const socket of sockets) {
      if (room.players[socket.id]) {
        socket.emit('game_state', sanitizeState(room, socket.id));
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
  
  const isCaptureValid = move.targetCards.length === 0 ? true : isValidCapture(playedValue, targetValues);
  const isRuspaClaimedAndValid = move.isRuspa ? isValidRuspa(playedValue, targetValues.length, room.board.length) : true;
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

io.on('connection', (socket: Socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', ({ roomId, playerName }) => {
    socket.join(roomId);

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
        lastCaptureBy: null
      };
    }
    
    const room = rooms[roomId];
    
    if (room.turnOrder.length >= 2 && !room.turnOrder.includes(socket.id)) {
      socket.emit('error', 'Room is full');
      return;
    }

    if (!room.turnOrder.includes(socket.id)) {
      room.players[socket.id] = {
        id: socket.id,
        name: playerName,
        hand: [],
        captured: [],
        scopa: 0
      };
      room.turnOrder.push(socket.id);
    }

    if (room.turnOrder.length === 2 && room.phase === 'IDLE') {
      initGame(roomId);
    }

    broadcastState(roomId);
  });

  socket.on('play_move', (move: Move) => {
    // Find room the player is in
    const roomId = Object.keys(rooms).find(r => rooms[r].turnOrder.includes(socket.id));
    if (!roomId) return;
    
    const room = rooms[roomId];
    if (room.currentTurn !== socket.id || room.phase !== 'PLAYER_MOVE') return;

    room.pendingMove = move;
    room.phase = 'CHALLENGE_WINDOW';
    room.lastActionMessage = `${room.players[socket.id].name} ha giocato...`;
    
    broadcastState(roomId);

    // 5 seconds challenge window
    roomTimers[roomId] = setTimeout(() => {
      resolvePendingMove(roomId);
    }, 5000);
  });

  socket.on('dubito', () => {
    const roomId = Object.keys(rooms).find(r => rooms[r].turnOrder.includes(socket.id));
    if (!roomId) return;
    
    const room = rooms[roomId];
    if (room.phase !== 'CHALLENGE_WINDOW' || room.pendingMove?.playerId === socket.id) return;

    handleDubito(roomId, socket.id);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Cleanup if needed, simplified for this POC
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
