// server/index.ts
import { createServer } from "http";
import { Server } from "socket.io";

// src/engine/GameLogic.ts
var SUITS = ["denari", "coppe", "spade", "bastoni"];
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let value = 1; value <= 10; value++) {
      deck.push({
        id: `${suit}-${value}`,
        suit,
        value,
        isSettebello: suit === "denari" && value === 7
      });
    }
  }
  return deck;
}
function shuffle(deck) {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}
function isValidCapture(playedValue, targetValues) {
  if (targetValues.length === 0)
    return false;
  const sum = targetValues.reduce((a, b) => a + b, 0);
  return sum === playedValue;
}
function isValidRuspa(playedValue, targetCount, boardCount) {
  return playedValue === 1 && targetCount === boardCount;
}

// server/index.ts
var httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Ruspa Socket Server works.");
});
var io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
var rooms = {};
var roomTimers = {};
function sanitizeState(gameState, playerId) {
  return {
    roomId: gameState.roomId,
    board: gameState.board,
    turnOrder: gameState.turnOrder,
    currentTurn: gameState.currentTurn,
    phase: gameState.phase,
    lastActionMessage: gameState.lastActionMessage,
    deckCount: gameState.deck.length,
    lastCaptureBy: gameState.lastCaptureBy,
    pendingMove: gameState.pendingMove ? {
      ...gameState.pendingMove,
      playedCard: gameState.pendingMove.playerId === playerId || gameState.phase === "RESOLUTION" ? gameState.pendingMove.playedCard : { id: "hidden", suit: "denari", value: 0 }
    } : null,
    players: Object.fromEntries(
      Object.entries(gameState.players).map(([id, p]) => [
        id,
        {
          id: p.id,
          name: p.name,
          handCount: p.hand.length,
          hand: id === playerId || gameState.phase === "GAME_OVER" ? p.hand : void 0,
          capturedCount: p.captured.length,
          scopa: p.scopa
        }
      ])
    )
  };
}
function broadcastState(roomId) {
  const room = rooms[roomId];
  if (!room)
    return;
  io.to(roomId).socketsJoin(roomId);
  io.in(roomId).fetchSockets().then((sockets) => {
    for (const socket of sockets) {
      if (room.players[socket.id]) {
        socket.emit("game_state", sanitizeState(room, socket.id));
      }
    }
  });
}
function dealCards(room) {
  if (room.deck.length === 0)
    return false;
  for (let i = 0; i < 3; i++) {
    for (const pid of room.turnOrder) {
      if (room.deck.length > 0) {
        room.players[pid].hand.push(room.deck.pop());
      }
    }
  }
  return true;
}
function initGame(roomId) {
  const room = rooms[roomId];
  room.deck = shuffle(createDeck());
  room.board = [];
  for (let i = 0; i < 4; i++) {
    room.board.push(room.deck.pop());
  }
  dealCards(room);
  room.phase = "PLAYER_MOVE";
  room.currentTurn = room.turnOrder[0];
  room.lastActionMessage = "First round started.";
}
function processCapture(room, move) {
  const player = room.players[move.playerId];
  room.board = room.board.filter((c) => !move.targetCards.find((rc) => rc.id === c.id));
  player.captured.push(...move.targetCards, move.playedCard);
  room.lastCaptureBy = move.playerId;
  if (move.isRuspa) {
    player.scopa += 1;
  }
  room.lastActionMessage = `${player.name} ha preso carte.`;
}
function checkNextRound(room) {
  const allHandsEmpty = room.turnOrder.every((pid) => room.players[pid].hand.length === 0);
  if (allHandsEmpty) {
    if (room.deck.length > 0) {
      dealCards(room);
      room.lastActionMessage += " Nuove carte distribuite.";
    } else {
      if (room.lastCaptureBy && room.board.length > 0) {
        room.players[room.lastCaptureBy].captured.push(...room.board);
        room.board = [];
      }
      room.phase = "GAME_OVER";
      room.lastActionMessage += " Partita terminata!";
      return;
    }
  }
  room.phase = "PLAYER_MOVE";
  room.currentTurn = room.turnOrder.find((id) => id !== room.currentTurn) || room.turnOrder[0];
}
function resolvePendingMove(roomId) {
  const room = rooms[roomId];
  if (!room || !room.pendingMove)
    return;
  const move = room.pendingMove;
  const player = room.players[move.playerId];
  if (move.targetCards.length > 0) {
    processCapture(room, move);
  } else {
    room.board.push(move.playedCard);
    room.lastActionMessage = `${player.name} ha scartato una carta.`;
  }
  player.hand = player.hand.filter((c) => c.id !== move.playedCard.id);
  room.pendingMove = null;
  checkNextRound(room);
  broadcastState(roomId);
}
function handleDubito(roomId, accuserId) {
  const room = rooms[roomId];
  if (!room || !room.pendingMove || room.phase !== "CHALLENGE_WINDOW")
    return;
  clearTimeout(roomTimers[roomId]);
  room.phase = "RESOLUTION";
  const move = room.pendingMove;
  const player = room.players[move.playerId];
  const accuser = room.players[accuserId];
  player.hand = player.hand.filter((c) => c.id !== move.playedCard.id);
  const playedValue = move.playedCard.value;
  const targetValues = move.targetCards.map((c) => c.value);
  const isCaptureValid = move.targetCards.length === 0 ? true : isValidCapture(playedValue, targetValues);
  const isRuspaClaimedAndValid = move.isRuspa ? isValidRuspa(playedValue, targetValues.length, room.board.length) : true;
  const isValid = isCaptureValid && isRuspaClaimedAndValid;
  if (isValid) {
    if (move.targetCards.length > 0) {
      processCapture(room, move);
    } else {
      room.board.push(move.playedCard);
    }
    player.scopa += 1;
    room.lastActionMessage = `DUBITO errato di ${accuser.name}! ${player.name} guadagna 1 punto bonus.`;
  } else {
    room.board.push(move.playedCard);
    if (move.isRuspa) {
      const isAsso = playedValue === 1;
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
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.on("join_room", ({ roomId, playerName }) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = {
        roomId,
        board: [],
        players: {},
        turnOrder: [],
        currentTurn: "",
        phase: "IDLE",
        pendingMove: null,
        lastActionMessage: "Waiting for opponent...",
        deck: [],
        lastCaptureBy: null
      };
    }
    const room = rooms[roomId];
    if (room.turnOrder.length >= 2 && !room.turnOrder.includes(socket.id)) {
      socket.emit("error", "Room is full");
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
    if (room.turnOrder.length === 2 && room.phase === "IDLE") {
      initGame(roomId);
    }
    broadcastState(roomId);
  });
  socket.on("play_move", (move) => {
    const roomId = Object.keys(rooms).find((r) => rooms[r].turnOrder.includes(socket.id));
    if (!roomId)
      return;
    const room = rooms[roomId];
    if (room.currentTurn !== socket.id || room.phase !== "PLAYER_MOVE")
      return;
    room.pendingMove = move;
    room.phase = "CHALLENGE_WINDOW";
    room.lastActionMessage = `${room.players[socket.id].name} ha giocato...`;
    broadcastState(roomId);
    roomTimers[roomId] = setTimeout(() => {
      resolvePendingMove(roomId);
    }, 5e3);
  });
  socket.on("dubito", () => {
    const roomId = Object.keys(rooms).find((r) => rooms[r].turnOrder.includes(socket.id));
    if (!roomId)
      return;
    const room = rooms[roomId];
    if (room.phase !== "CHALLENGE_WINDOW" || room.pendingMove?.playerId === socket.id)
      return;
    handleDubito(roomId, socket.id);
  });
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
var PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
